"""
Cache Middleware for HTTP Response Optimization

Provides:
- Automatic Cache-Control headers based on endpoint patterns
- GZip compression for responses
- ETag support for conditional requests
"""

import hashlib
import logging
from django.conf import settings
from django.utils.cache import patch_vary_headers
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class CacheHeadersMiddleware(MiddlewareMixin):
    """
    Middleware to add appropriate Cache-Control headers based on endpoint patterns.
    
    Rules:
    - GET requests to /api/ endpoints: Add cache headers based on configuration
    - Non-GET requests: no-store
    - User-specific data: private caching
    - Public data: public caching
    """
    
    # Path patterns and their cache settings
    # Format: (path_prefix, is_user_specific, max_age_seconds)
    CACHE_RULES = [
        # Weather (public, can be shared)
        ('/api/weather/', False, 300),  # 5 min
        ('/api/place/', False, 3600),   # 1 hour
        
        # Financials (user-specific, private)
        ('/api/financials/', True, 60),  # 1 min
        
        # Subscriptions (user-specific, private)  
        ('/api/subscriptions/', True, 60),  # 1 min
        
        # Travel (user-specific, private)
        ('/api/travel/', True, 120),  # 2 min
        
        # Profile (user-specific, private)
        ('/profile/', True, 60),  # 1 min
        
        # Events/Calendar (user-specific, private)
        ('/events/', True, 60),  # 1 min
    ]
    
    # Paths that should never be cached
    NO_CACHE_PATHS = [
        '/auth/',
        '/admin/',
        '/api/proxy/',  # Proxy endpoints - let origin decide
    ]
    
    def process_response(self, request, response):
        """Add cache headers to response if applicable."""
        
        # Skip if not a GET/HEAD request
        if request.method not in ('GET', 'HEAD'):
            response['Cache-Control'] = 'no-store'
            return response
        
        # Skip if already has Cache-Control
        if response.has_header('Cache-Control'):
            return response
        
        path = request.path
        
        # Check no-cache paths first
        for no_cache_path in self.NO_CACHE_PATHS:
            if path.startswith(no_cache_path):
                response['Cache-Control'] = 'no-store, no-cache'
                return response
        
        # Check if error response - don't cache errors
        if response.status_code >= 400:
            response['Cache-Control'] = 'no-store'
            return response
        
        # Find matching cache rule
        for path_prefix, is_user_specific, max_age in self.CACHE_RULES:
            if path.startswith(path_prefix):
                if is_user_specific:
                    response['Cache-Control'] = f'private, max-age={max_age}'
                else:
                    response['Cache-Control'] = f'public, max-age={max_age}'
                
                # Add Vary header for proper caching
                patch_vary_headers(response, ['Accept', 'Accept-Encoding'])
                return response
        
        # Default: no caching for unmatched paths
        response['Cache-Control'] = 'no-store'
        return response


class ETagMiddleware(MiddlewareMixin):
    """
    Add ETag headers for conditional GET requests.
    
    This allows clients to make conditional requests using If-None-Match,
    reducing bandwidth when content hasn't changed.
    """
    
    # Only add ETags to these content types
    ETAG_CONTENT_TYPES = [
        'application/json',
        'text/html',
        'text/plain',
    ]
    
    # Maximum response size to calculate ETag (avoid hashing huge responses)
    MAX_ETAG_SIZE = 1024 * 1024  # 1MB
    
    def process_response(self, request, response):
        """Add ETag header if applicable."""
        
        # Only for successful GET responses
        if request.method != 'GET' or response.status_code != 200:
            return response
        
        # Check content type
        content_type = response.get('Content-Type', '')
        if not any(ct in content_type for ct in self.ETAG_CONTENT_TYPES):
            return response
        
        # Skip if already has ETag
        if response.has_header('ETag'):
            return response
        
        # Skip streaming responses
        if response.streaming:
            return response
        
        # Skip large responses
        content = response.content
        if len(content) > self.MAX_ETAG_SIZE:
            return response
        
        # Generate ETag from content
        etag = f'"{hashlib.md5(content).hexdigest()}"'
        response['ETag'] = etag
        
        # Check If-None-Match header
        if_none_match = request.META.get('HTTP_IF_NONE_MATCH')
        if if_none_match and if_none_match == etag:
            # Content hasn't changed - return 304
            response.status_code = 304
            response.content = b''
            # Remove Content-Length for 304 responses
            if 'Content-Length' in response:
                del response['Content-Length']
        
        return response
