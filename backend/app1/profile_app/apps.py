from django.apps import AppConfig


class ProfileAppConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "profile_app"

    def ready(self):
        # Register signals
        from . import signals  # noqa: F401
