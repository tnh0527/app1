from django.db.models.signals import post_save
from django.dispatch import receiver
from auth_app.models import User
from .models import Profile


@receiver(post_save, sender=User)
def create_profile_for_user(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)


@receiver(post_save, sender=Profile)
def ensure_birthday_event(sender, instance, **kwargs):
    """Create or update a system (immutable) recurring birthday event when a profile has a birthdate.

    The event is created on the user's default calendar (created if missing), marked
    as `is_immutable=True` and set to recur yearly via an RRULE.
    """
    # Delay import to avoid circular imports at module import time
    if instance.birthdate is None:
        return

    from schedule_app.models import Calendar, Event
    from datetime import datetime
    from django.utils import timezone as dj_timezone

    user = instance.user

    # Ensure there is a default calendar
    calendar = Calendar.objects.filter(owner=user, is_default=True).first()
    if not calendar:
        calendar = Calendar.objects.create(owner=user, name="Default", is_default=True)

    # Use a generic, user-facing title with an emoji
    title = "🎂 Your Birthday!"

    # Find existing system birthday event by title and owner
    event = Event.objects.filter(calendar__owner=user, is_immutable=True, title=title).first()

    # Use birthdate's year for the master event; recurrence handles yearly occurrences
    birth = instance.birthdate
    # Create timezone-aware datetime using UTC to avoid naive datetime warnings
    start_dt = dj_timezone.make_aware(
        datetime(birth.year, birth.month, birth.day, 0, 0),
        timezone=dj_timezone.utc
    )
    end_dt = start_dt

    from schedule_app.services import default_generation_window, regenerate_occurrences

    if event:
        event.start_at = start_dt
        event.end_at = end_dt
        event.all_day = True
        event.rrule = "FREQ=YEARLY"
        # Set a multi-stop gradient color for birthday events
        event.color = "linear-gradient(90deg, #ff0000, #0000ff, #800080, #ff69b4)"
        event.save()
    else:
        event = Event.objects.create(
            calendar=calendar,
            title=title,
            start_at=start_dt,
            end_at=end_dt,
            all_day=True,
            rrule="FREQ=YEARLY",
            is_immutable=True,
            color="linear-gradient(90deg, #ff0000, #0000ff, #800080, #ff69b4)",
        )

    # Ensure occurrences are generated so the UI can display the birthday
    window_start, window_end = default_generation_window(event)
    regenerate_occurrences(event, window_start=window_start, window_end=window_end)
