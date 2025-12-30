from django.apps import AppConfig


class SubscriptionsAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'subscriptions_app'
    verbose_name = 'Subscriptions'
    
    def ready(self):
        # Import signals if needed
        pass
