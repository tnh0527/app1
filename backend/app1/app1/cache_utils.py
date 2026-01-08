"""
Redis Cache Utilities for Django

Provides reusable decorators and helpers for caching API responses and function results.
Designed to work with django-redis and reduce external API/database calls.
"""

import hashlib
import json
import logging
import functools
from typing import Any, Callable, Optional, Union

from django.conf import settings
from django.core.cache import cache
from django.http import HttpRequest
from rest_framework.response import Response
from rest_framework.request import Request

logger = logging.getLogger(__name__)

# Default TTL if not specified (15 minutes)
DEFAULT_TTL = 900


def generate_cache_key(*args, prefix: str = "nexus", **kwargs) -> str:
    """
    Generate a stable cache key from arguments.
    
    Args:
        *args: Positional arguments to include in key
        prefix: Key prefix for namespacing
        **kwargs: Keyword arguments to include in key
    
    Returns:
        MD5 hash-based cache key
    """
    # Build key components
    key_parts = [prefix]
    
    # Add positional args
    for arg in args:
        if arg is not None:
            key_parts.append(str(arg))
    
    # Add sorted kwargs for consistency
    for key in sorted(kwargs.keys()):
        val = kwargs[key]
        if val is not None:
            key_parts.append(f"{key}={val}")
    
    # Join and hash
    key_string = ":".join(key_parts)
    return hashlib.md5(key_string.encode()).hexdigest()


def get_request_cache_key(
    request: Union[HttpRequest, Request],
    prefix: str = "api",
    include_user: bool = False,
    include_params: bool = True,
    param_whitelist: Optional[list] = None,
) -> str:
    """
    Generate a cache key from a Django/DRF request.
    
    Args:
        request: HTTP request object
        prefix: Key prefix
        include_user: Include user ID in key (for user-specific caching)
        include_params: Include query parameters
        param_whitelist: Only include these params (None = all)
    
    Returns:
        Cache key string
    """
    key_parts = [prefix, request.path]
    
    # Include user ID for personalized caches
    if include_user and hasattr(request, 'user') and request.user.is_authenticated:
        key_parts.append(f"user:{request.user.id}")
    
    # Include query parameters
    if include_params:
        params = request.query_params if hasattr(request, 'query_params') else request.GET
        param_items = []
        for key, value in sorted(params.items()):
            if param_whitelist is None or key in param_whitelist:
                param_items.append(f"{key}={value}")
        if param_items:
            key_parts.append("&".join(param_items))
    
    key_string = ":".join(key_parts)
    return hashlib.md5(key_string.encode()).hexdigest()


def cached_result(
    ttl: int = DEFAULT_TTL,
    prefix: str = "func",
    key_func: Optional[Callable] = None,
):
    """
    Decorator to cache function results.
    
    Args:
        ttl: Time to live in seconds
        prefix: Cache key prefix
        key_func: Custom function to generate cache key from args/kwargs
    
    Usage:
        @cached_result(ttl=300, prefix="weather")
        def get_weather(lat, lng):
            # expensive operation
            return weather_data
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                cache_key = generate_cache_key(
                    func.__module__,
                    func.__name__,
                    *args,
                    prefix=prefix,
                    **kwargs
                )
            
            # Try to get from cache
            cached = cache.get(cache_key)
            if cached is not None:
                logger.debug(f"Cache HIT: {cache_key[:20]}... (func: {func.__name__})")
                return cached
            
            # Cache miss - call function
            logger.debug(f"Cache MISS: {cache_key[:20]}... (func: {func.__name__})")
            result = func(*args, **kwargs)
            
            # Store in cache
            if result is not None:
                cache.set(cache_key, result, ttl)
                logger.debug(f"Cache SET: {cache_key[:20]}... TTL={ttl}s")
            
            return result
        
        # Attach cache utilities to the wrapper
        wrapper.cache_key = lambda *a, **kw: (
            key_func(*a, **kw) if key_func 
            else generate_cache_key(func.__module__, func.__name__, *a, prefix=prefix, **kw)
        )
        wrapper.invalidate = lambda *a, **kw: cache.delete(wrapper.cache_key(*a, **kw))
        
        return wrapper
    return decorator


def cached_api_view(
    ttl: int = DEFAULT_TTL,
    key_prefix: str = "api",
    include_user: bool = False,
    param_whitelist: Optional[list] = None,
    cache_headers: bool = True,
):
    """
    Decorator for caching DRF APIView GET responses.
    
    Args:
        ttl: Time to live in seconds
        key_prefix: Cache key prefix
        include_user: Include user ID in cache key
        param_whitelist: Only include these query params in key
        cache_headers: Add Cache-Control headers to response
    
    Usage:
        class WeatherView(APIView):
            @cached_api_view(ttl=300, key_prefix="weather")
            def get(self, request):
                return Response(data)
    """
    def decorator(view_method: Callable) -> Callable:
        @functools.wraps(view_method)
        def wrapper(self, request, *args, **kwargs):
            # Generate cache key from request
            cache_key = get_request_cache_key(
                request,
                prefix=key_prefix,
                include_user=include_user,
                param_whitelist=param_whitelist,
            )
            
            # Try to get from cache
            cached = cache.get(cache_key)
            if cached is not None:
                logger.info(f"API Cache HIT: {key_prefix}:{cache_key[:12]}...")
                response = Response(cached['data'], status=cached.get('status', 200))
                if cache_headers:
                    response['Cache-Control'] = f'public, max-age={ttl}'
                    response['X-Cache'] = 'HIT'
                return response
            
            # Cache miss - call view
            logger.info(f"API Cache MISS: {key_prefix}:{cache_key[:12]}...")
            response = view_method(self, request, *args, **kwargs)
            
            # Only cache successful GET responses
            if response.status_code == 200:
                cache_data = {
                    'data': response.data,
                    'status': response.status_code,
                }
                cache.set(cache_key, cache_data, ttl)
                logger.debug(f"API Cache SET: {key_prefix}:{cache_key[:12]}... TTL={ttl}s")
            
            # Add cache headers
            if cache_headers:
                response['Cache-Control'] = f'public, max-age={ttl}'
                response['X-Cache'] = 'MISS'
            
            return response
        
        return wrapper
    return decorator


class CacheableMixin:
    """
    Mixin for DRF ViewSets to add caching to list and retrieve actions.
    
    Configuration via class attributes:
        cache_ttl: TTL in seconds (default: 300)
        cache_prefix: Key prefix (default: model name)
        cache_list: Whether to cache list action (default: True)
        cache_retrieve: Whether to cache retrieve action (default: True)
        cache_per_user: Cache per-user for list (default: True)
    
    Usage:
        class AccountViewSet(CacheableMixin, viewsets.ModelViewSet):
            cache_ttl = 300
            cache_prefix = "accounts"
    """
    cache_ttl = 300
    cache_prefix = None
    cache_list = True
    cache_retrieve = True
    cache_per_user = True
    
    def _get_cache_prefix(self):
        """Get cache prefix, defaulting to model name."""
        if self.cache_prefix:
            return self.cache_prefix
        if hasattr(self, 'queryset') and self.queryset is not None:
            return self.queryset.model.__name__.lower()
        return 'viewset'
    
    def _get_list_cache_key(self, request):
        """Generate cache key for list action."""
        return get_request_cache_key(
            request,
            prefix=f"{self._get_cache_prefix()}:list",
            include_user=self.cache_per_user,
        )
    
    def _get_retrieve_cache_key(self, request, pk):
        """Generate cache key for retrieve action."""
        key_parts = [self._get_cache_prefix(), "detail", str(pk)]
        if self.cache_per_user and request.user.is_authenticated:
            key_parts.append(f"user:{request.user.id}")
        return generate_cache_key(*key_parts)
    
    def list(self, request, *args, **kwargs):
        if not self.cache_list:
            return super().list(request, *args, **kwargs)
        
        cache_key = self._get_list_cache_key(request)
        cached = cache.get(cache_key)
        
        if cached is not None:
            logger.info(f"ViewSet Cache HIT: {self._get_cache_prefix()}:list")
            return Response(cached)
        
        response = super().list(request, *args, **kwargs)
        
        if response.status_code == 200:
            cache.set(cache_key, response.data, self.cache_ttl)
            logger.debug(f"ViewSet Cache SET: {self._get_cache_prefix()}:list TTL={self.cache_ttl}s")
        
        return response
    
    def retrieve(self, request, *args, **kwargs):
        if not self.cache_retrieve:
            return super().retrieve(request, *args, **kwargs)
        
        pk = kwargs.get('pk') or args[0] if args else None
        cache_key = self._get_retrieve_cache_key(request, pk)
        cached = cache.get(cache_key)
        
        if cached is not None:
            logger.info(f"ViewSet Cache HIT: {self._get_cache_prefix()}:detail:{pk}")
            return Response(cached)
        
        response = super().retrieve(request, *args, **kwargs)
        
        if response.status_code == 200:
            cache.set(cache_key, response.data, self.cache_ttl)
            logger.debug(f"ViewSet Cache SET: {self._get_cache_prefix()}:detail:{pk} TTL={self.cache_ttl}s")
        
        return response
    
    def invalidate_list_cache(self, request=None):
        """
        Invalidate list cache. Call after create/update/delete.
        If request is provided, invalidates for that user.
        """
        if request and self.cache_per_user and request.user.is_authenticated:
            # Invalidate user-specific list cache
            pattern = f"{self._get_cache_prefix()}:list:user:{request.user.id}*"
            self._delete_pattern(pattern)
        else:
            # Invalidate all list caches for this viewset
            pattern = f"{self._get_cache_prefix()}:list*"
            self._delete_pattern(pattern)
    
    def invalidate_detail_cache(self, pk, request=None):
        """Invalidate detail cache for a specific object."""
        cache_key = self._get_retrieve_cache_key(request, pk) if request else generate_cache_key(
            self._get_cache_prefix(), "detail", str(pk)
        )
        cache.delete(cache_key)
    
    def _delete_pattern(self, pattern):
        """Delete all keys matching pattern (Redis only)."""
        try:
            # django-redis supports delete_pattern
            if hasattr(cache, 'delete_pattern'):
                cache.delete_pattern(f"*{pattern}")
            else:
                logger.warning("Cache backend does not support pattern deletion")
        except Exception as e:
            logger.error(f"Failed to delete cache pattern {pattern}: {e}")
    
    def perform_create(self, serializer):
        super().perform_create(serializer)
        self.invalidate_list_cache(self.request)
    
    def perform_update(self, serializer):
        super().perform_update(serializer)
        self.invalidate_list_cache(self.request)
        self.invalidate_detail_cache(serializer.instance.pk, self.request)
    
    def perform_destroy(self, instance):
        pk = instance.pk
        super().perform_destroy(instance)
        self.invalidate_list_cache(self.request)
        self.invalidate_detail_cache(pk, self.request)


def invalidate_cache_key(key: str) -> bool:
    """
    Delete a specific cache key.
    
    Args:
        key: Cache key to delete
    
    Returns:
        True if deleted, False otherwise
    """
    try:
        cache.delete(key)
        logger.info(f"Cache invalidated: {key}")
        return True
    except Exception as e:
        logger.error(f"Failed to invalidate cache key {key}: {e}")
        return False


def invalidate_cache_pattern(pattern: str) -> int:
    """
    Delete all cache keys matching a pattern (Redis only).
    
    Args:
        pattern: Pattern to match (e.g., "weather:*")
    
    Returns:
        Number of keys deleted
    """
    try:
        if hasattr(cache, 'delete_pattern'):
            return cache.delete_pattern(f"*{pattern}*")
        else:
            logger.warning("Cache backend does not support pattern deletion")
            return 0
    except Exception as e:
        logger.error(f"Failed to invalidate cache pattern {pattern}: {e}")
        return 0


def get_cache_stats() -> dict:
    """
    Get cache statistics (Redis only).
    
    Returns:
        Dict with cache stats or empty dict if not available
    """
    try:
        client = cache.client.get_client()
        info = client.info()
        return {
            'connected': True,
            'used_memory': info.get('used_memory_human', 'N/A'),
            'keys': client.dbsize(),
            'hits': info.get('keyspace_hits', 0),
            'misses': info.get('keyspace_misses', 0),
            'hit_rate': (
                round(info.get('keyspace_hits', 0) / 
                      max(info.get('keyspace_hits', 0) + info.get('keyspace_misses', 0), 1) * 100, 2)
            ),
        }
    except Exception as e:
        logger.error(f"Failed to get cache stats: {e}")
        return {'connected': False, 'error': str(e)}


def warm_cache(key: str, data: Any, ttl: int = DEFAULT_TTL) -> bool:
    """
    Pre-populate cache with data.
    
    Args:
        key: Cache key
        data: Data to cache
        ttl: Time to live in seconds
    
    Returns:
        True if successful
    """
    try:
        cache.set(key, data, ttl)
        logger.info(f"Cache warmed: {key}")
        return True
    except Exception as e:
        logger.error(f"Failed to warm cache {key}: {e}")
        return False
