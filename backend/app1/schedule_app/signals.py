from django.db.models.signals import pre_delete
from django.dispatch import receiver
from django.core.exceptions import PermissionDenied

from .models import Event


@receiver(pre_delete, sender=Event)
def prevent_immutable_event_delete(sender, instance, **kwargs):
    if getattr(instance, "is_immutable", False):
        raise PermissionDenied("Cannot delete an immutable system event")
