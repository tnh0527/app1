from django.conf import settings
from django.db import models


class Calendar(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="calendars"
    )
    name = models.CharField(max_length=100)
    timezone = models.CharField(max_length=64, default="UTC")
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "name"], name="uniq_calendar_owner_name"
            )
        ]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_default:
            Calendar.objects.filter(owner=self.owner).exclude(id=self.id).update(
                is_default=False
            )

    def __str__(self):
        return f"{self.owner_id}:{self.name}"


class Event(models.Model):
    calendar = models.ForeignKey(
        Calendar, on_delete=models.CASCADE, related_name="events"
    )

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    all_day = models.BooleanField(default=False)
    timezone = models.CharField(max_length=64, default="UTC")

    # RFC5545-ish rule fragment, e.g. "FREQ=WEEKLY;INTERVAL=1"
    rrule = models.TextField(blank=True)
    recurrence_until = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class EventOccurrence(models.Model):
    event = models.ForeignKey(
        Event, on_delete=models.CASCADE, related_name="occurrences"
    )
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    is_cancelled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["start_at"]),
            models.Index(fields=["event", "start_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["event", "start_at"], name="uniq_occurrence_event_start"
            )
        ]

    def __str__(self):
        return f"{self.event_id}@{self.start_at.isoformat()}"


class Reminder(models.Model):
    occurrence = models.ForeignKey(
        EventOccurrence, on_delete=models.CASCADE, related_name="reminders"
    )
    minutes_before = models.PositiveIntegerField(default=0)
    trigger_at = models.DateTimeField()
    fired_at = models.DateTimeField(null=True, blank=True)
    dismissed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["trigger_at"]),
        ]

    def __str__(self):
        return f"Reminder({self.id})"
