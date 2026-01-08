"""
Cache management command for Django + Redis.

Provides utilities to view, clear, and manage the Redis cache.

Usage:
    python manage.py cache_manage stats       - Show cache statistics
    python manage.py cache_manage clear       - Clear all cache
    python manage.py cache_manage clear -p weather  - Clear weather-related cache
    python manage.py cache_manage keys -p weather   - List keys matching pattern
"""

from django.core.management.base import BaseCommand, CommandError
from django.core.cache import cache
from app1.cache_utils import get_cache_stats, invalidate_cache_pattern


class Command(BaseCommand):
    help = 'Manage Redis cache: view stats, clear cache, list keys'

    def add_arguments(self, parser):
        parser.add_argument(
            'action',
            type=str,
            choices=['stats', 'clear', 'keys', 'info'],
            help='Action to perform: stats, clear, keys, or info'
        )
        parser.add_argument(
            '-p', '--pattern',
            type=str,
            default='',
            help='Pattern to match for clear/keys operations (e.g., "weather", "financials")'
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Skip confirmation prompt for destructive operations'
        )

    def handle(self, *args, **options):
        action = options['action']
        pattern = options['pattern']
        confirm = options['confirm']

        if action == 'stats':
            self._show_stats()
        elif action == 'info':
            self._show_info()
        elif action == 'clear':
            self._clear_cache(pattern, confirm)
        elif action == 'keys':
            self._list_keys(pattern)
        else:
            raise CommandError(f'Unknown action: {action}')

    def _show_stats(self):
        """Display cache statistics."""
        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Cache Statistics ===\n'))
        
        stats = get_cache_stats()
        
        if not stats.get('connected', False):
            self.stdout.write(self.style.ERROR(f"Cache not connected: {stats.get('error', 'Unknown error')}"))
            return
        
        self.stdout.write(f"  Connected: {self.style.SUCCESS('Yes')}")
        self.stdout.write(f"  Memory Used: {stats.get('used_memory', 'N/A')}")
        self.stdout.write(f"  Total Keys: {stats.get('keys', 0)}")
        self.stdout.write(f"  Cache Hits: {stats.get('hits', 0)}")
        self.stdout.write(f"  Cache Misses: {stats.get('misses', 0)}")
        self.stdout.write(f"  Hit Rate: {stats.get('hit_rate', 0)}%")
        self.stdout.write('')

    def _show_info(self):
        """Display cache configuration info."""
        from django.conf import settings
        
        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Cache Configuration ===\n'))
        
        cache_settings = settings.CACHES.get('default', {})
        self.stdout.write(f"  Backend: {cache_settings.get('BACKEND', 'N/A')}")
        self.stdout.write(f"  Location: {cache_settings.get('LOCATION', 'N/A')}")
        self.stdout.write(f"  Default TTL: {cache_settings.get('TIMEOUT', 'N/A')} seconds")
        self.stdout.write(f"  Key Prefix: {cache_settings.get('KEY_PREFIX', 'N/A')}")
        
        self.stdout.write(self.style.MIGRATE_HEADING('\n=== TTL Configuration ===\n'))
        
        cache_ttl = getattr(settings, 'CACHE_TTL', {})
        for key, value in sorted(cache_ttl.items()):
            self.stdout.write(f"  {key}: {value}s ({value // 60}m)")
        
        self.stdout.write('')

    def _clear_cache(self, pattern, confirm):
        """Clear cache entries."""
        if pattern:
            if not confirm:
                answer = input(f'Clear all cache keys matching "*{pattern}*"? [y/N]: ')
                if answer.lower() != 'y':
                    self.stdout.write(self.style.WARNING('Aborted.'))
                    return
            
            count = invalidate_cache_pattern(pattern)
            self.stdout.write(self.style.SUCCESS(f'Cleared {count} cache keys matching "{pattern}"'))
        else:
            if not confirm:
                answer = input('Clear ALL cache entries? This cannot be undone. [y/N]: ')
                if answer.lower() != 'y':
                    self.stdout.write(self.style.WARNING('Aborted.'))
                    return
            
            try:
                cache.clear()
                self.stdout.write(self.style.SUCCESS('All cache cleared successfully.'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Failed to clear cache: {e}'))

    def _list_keys(self, pattern):
        """List cache keys matching pattern."""
        try:
            # Get Redis client for key listing
            client = cache.client.get_client()
            
            search_pattern = f"*{pattern}*" if pattern else "*"
            keys = list(client.scan_iter(match=search_pattern, count=100))
            
            self.stdout.write(self.style.MIGRATE_HEADING(f'\n=== Cache Keys ({len(keys)} found) ===\n'))
            
            if not keys:
                self.stdout.write('  No keys found.')
            else:
                # Sort and display keys (limit to first 100)
                for key in sorted(keys[:100]):
                    key_str = key.decode() if isinstance(key, bytes) else key
                    # Try to get TTL
                    try:
                        ttl = client.ttl(key)
                        ttl_str = f"{ttl}s" if ttl > 0 else "no expiry"
                    except Exception:
                        ttl_str = "unknown"
                    
                    self.stdout.write(f"  {key_str} (TTL: {ttl_str})")
                
                if len(keys) > 100:
                    self.stdout.write(f'\n  ... and {len(keys) - 100} more keys')
            
            self.stdout.write('')
            
        except AttributeError:
            self.stdout.write(self.style.ERROR(
                'Key listing is only available with Redis backend. '
                'Current backend does not support key iteration.'
            ))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Failed to list keys: {e}'))
