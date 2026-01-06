from django.apps import AppConfig


class ScheduleAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'schedule_app'
    def ready(self):
        # Import signal handlers to enforce immutable events
        try:
            from . import signals  # noqa: F401
        except Exception:
            # Fail silently to avoid import-time errors during migrations
            pass
