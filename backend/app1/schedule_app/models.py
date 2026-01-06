from django.conf import settings
from django.db import models


class Calendar(models.Model):
    """User calendar container - supports multiple calendars per user."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="calendars"
    )
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=255, default="teal")  # Theme color for calendar
    timezone = models.CharField(max_length=64, default="UTC")
    is_default = models.BooleanField(default=False)
    is_visible = models.BooleanField(default=True)  # Toggle visibility in UI
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "name"], name="uniq_calendar_owner_name"
            )
        ]
        ordering = ["-is_default", "name"]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_default:
            Calendar.objects.filter(owner=self.owner).exclude(id=self.id).update(
                is_default=False
            )

    def __str__(self):
        return f"{self.owner_id}:{self.name}"


class EventCategory(models.Model):
    """Reusable event categories/tags for organization (3NF compliant)."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="event_categories",
    )
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=255, default="teal")
    icon = models.CharField(max_length=50, blank=True)  # Icon identifier
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Event categories"
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "name"], name="uniq_category_owner_name"
            )
        ]
        ordering = ["name"]

    def __str__(self):
        return self.name


class Event(models.Model):
    """Master event record - defines the base event properties."""

    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("urgent", "Urgent"),
    ]

    calendar = models.ForeignKey(
        Calendar, on_delete=models.CASCADE, related_name="events"
    )
    category = models.ForeignKey(
        EventCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events",
    )

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=255, blank=True)  # Event location/venue

    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    all_day = models.BooleanField(default=False)
    timezone = models.CharField(max_length=64, default="UTC")

    # Event styling
    color = models.CharField(max_length=255, default="teal")
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, blank=True)

    # RFC5545-ish rule fragment, e.g. "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR"
    rrule = models.TextField(blank=True)
    recurrence_until = models.DateTimeField(null=True, blank=True)
    # System flag: prevent deletion/modification by users for system-generated events
    is_immutable = models.BooleanField(default=False)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["calendar", "start_at"]),
            models.Index(fields=["priority"]),
        ]
        ordering = ["start_at"]

    def __str__(self):
        return self.title

    def delete(self, *args, **kwargs):
        if getattr(self, "is_immutable", False):
            raise ValueError("Cannot delete an immutable system event")
        return super().delete(*args, **kwargs)


class EventOccurrence(models.Model):
    """Individual occurrence of an event - supports recurring events with exceptions."""

    event = models.ForeignKey(
        Event, on_delete=models.CASCADE, related_name="occurrences"
    )
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()

    # Override fields for individual occurrence customization (exception handling)
    title_override = models.CharField(max_length=200, blank=True)
    description_override = models.TextField(blank=True)
    location_override = models.CharField(max_length=255, blank=True)

    is_cancelled = models.BooleanField(default=False)
    is_modified = models.BooleanField(
        default=False
    )  # True if this occurrence differs from master

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["start_at"]),
            models.Index(fields=["event", "start_at"]),
            models.Index(fields=["is_cancelled"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["event", "start_at"], name="uniq_occurrence_event_start"
            )
        ]
        ordering = ["start_at"]

    @property
    def effective_title(self):
        """Return override title if set, else master event title."""
        return self.title_override or self.event.title

    @property
    def effective_description(self):
        """Return override description if set, else master event description."""
        return self.description_override or self.event.description

    @property
    def effective_location(self):
        """Return override location if set, else master event location."""
        return self.location_override or self.event.location

    def __str__(self):
        return f"{self.event_id}@{self.start_at.isoformat()}"


class ReminderTemplate(models.Model):
    """Reminder configuration for an event - defines when reminders trigger.

    Separated from Reminder to follow 3NF: templates define the rule,
    Reminder instances are created per occurrence.
    """

    event = models.ForeignKey(
        Event, on_delete=models.CASCADE, related_name="reminder_templates"
    )
    minutes_before = models.PositiveIntegerField(default=15)

    # Notification preferences
    notify_email = models.BooleanField(default=False)
    notify_push = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["event", "minutes_before"], name="uniq_reminder_event_minutes"
            )
        ]
        ordering = ["minutes_before"]

    def __str__(self):
        return f"Reminder: {self.minutes_before}min before {self.event.title}"


class Reminder(models.Model):
    """Actual reminder instance per occurrence - tracks delivery state."""

    occurrence = models.ForeignKey(
        EventOccurrence, on_delete=models.CASCADE, related_name="reminders"
    )
    template = models.ForeignKey(
        ReminderTemplate, on_delete=models.CASCADE, related_name="instances", null=True
    )

    minutes_before = models.PositiveIntegerField(default=0)
    trigger_at = models.DateTimeField()

    # Delivery tracking
    fired_at = models.DateTimeField(null=True, blank=True)
    dismissed_at = models.DateTimeField(null=True, blank=True)
    snoozed_until = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["trigger_at"]),
            models.Index(fields=["fired_at"]),
        ]

    @property
    def is_due(self):
        """Check if reminder should trigger now."""
        from django.utils import timezone

        now = timezone.now()
        return (
            self.trigger_at <= now
            and self.fired_at is None
            and self.dismissed_at is None
            and (self.snoozed_until is None or self.snoozed_until <= now)
        )

    def __str__(self):
        return f"Reminder({self.id})"


class EventAttachment(models.Model):
    """File attachments for events (3NF - separate table for 1:N relationship)."""

    event = models.ForeignKey(
        Event, on_delete=models.CASCADE, related_name="attachments"
    )
    file = models.FileField(upload_to="event_attachments/%Y/%m/")
    filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100, blank=True)
    file_size = models.PositiveIntegerField(default=0)  # Size in bytes

    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.filename} ({self.event.title})"
