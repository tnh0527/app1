from __future__ import annotations

from datetime import timedelta

from dateutil.rrule import rrulestr
from django.db import transaction
from django.utils import timezone

from .models import Calendar, Event, EventOccurrence, Reminder


def get_or_create_default_calendar(user) -> Calendar:
    calendar = Calendar.objects.filter(owner=user, is_default=True).first()
    if calendar:
        return calendar
    return Calendar.objects.create(
        owner=user, name="Default", timezone="UTC", is_default=True
    )


def _event_duration(event: Event) -> timedelta:
    duration = event.end_at - event.start_at
    if duration.total_seconds() <= 0:
        return timedelta(minutes=30)
    return duration


@transaction.atomic
def regenerate_occurrences(
    event: Event,
    *,
    window_start,
    window_end,
    reminder_minutes_before: int | None = None,
):
    # Simple approach: wipe & recreate occurrences in the window.
    # (Keeps logic predictable and works fine for small/medium datasets.)
    EventOccurrence.objects.filter(
        event=event,
        start_at__gte=window_start,
        start_at__lte=window_end,
    ).delete()

    duration = _event_duration(event)

    starts: list = []
    if event.rrule:
        # Use dtstart argument so tz-aware datetimes stay tz-aware.
        r = rrulestr(event.rrule, dtstart=event.start_at)
        starts = list(r.between(window_start, window_end, inc=True))
    else:
        if window_start <= event.start_at <= window_end:
            starts = [event.start_at]

    occurrences = []
    for start_at in starts:
        end_at = start_at + duration
        occurrences.append(
            EventOccurrence(event=event, start_at=start_at, end_at=end_at)
        )

    EventOccurrence.objects.bulk_create(occurrences, ignore_conflicts=True)

    if reminder_minutes_before is not None and reminder_minutes_before >= 0:
        occs = EventOccurrence.objects.filter(
            event=event, start_at__in=[o.start_at for o in occurrences]
        )
        reminders = []
        for occ in occs:
            trigger_at = occ.start_at - timedelta(minutes=reminder_minutes_before)
            reminders.append(
                Reminder(
                    occurrence=occ,
                    minutes_before=reminder_minutes_before,
                    trigger_at=trigger_at,
                )
            )
        Reminder.objects.bulk_create(reminders)


def default_generation_window(event: Event):
    now = timezone.now()
    start = now - timedelta(days=31)
    end = now + timedelta(days=366)
    if event.recurrence_until:
        end = min(end, event.recurrence_until)
    return start, end
