from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta

from .models import Event, EventOccurrence, Reminder


class EventCreateSerializer(serializers.Serializer):
    """Serializer for creating and updating events with comprehensive validation."""

    title = serializers.CharField(max_length=200, min_length=2)
    description = serializers.CharField(
        required=False, allow_blank=True, default="", max_length=2000
    )
    start_at = serializers.DateTimeField()
    end_at = serializers.DateTimeField()
    all_day = serializers.BooleanField(default=False)
    timezone = serializers.CharField(required=False, allow_blank=True, max_length=64)

    # Event styling
    color = serializers.CharField(required=False, default="teal", max_length=20)
    priority = serializers.ChoiceField(
        choices=["", "low", "medium", "high", "urgent"],
        required=False,
        allow_blank=True,
        default="",
    )
    location = serializers.CharField(
        required=False, allow_blank=True, default="", max_length=255
    )

    # Recurrence inputs (optional)
    recurrence_freq = serializers.ChoiceField(
        choices=["DAILY", "WEEKLY", "MONTHLY"], required=False, allow_null=True
    )
    recurrence_interval = serializers.IntegerField(
        required=False, min_value=1, max_value=365
    )
    recurrence_until = serializers.DateTimeField(required=False, allow_null=True)

    # In-app reminder (optional)
    reminder_minutes_before = serializers.IntegerField(
        required=False, min_value=0, max_value=20160
    )  # Max 2 weeks

    def validate_title(self, value):
        """Validate title is not just whitespace."""
        stripped = value.strip()
        if not stripped:
            raise serializers.ValidationError("Title cannot be empty or whitespace.")
        return stripped

    def validate_start_at(self, value):
        """Validate start date is within acceptable range."""
        now = timezone.now()
        max_past = now - timedelta(days=365)
        max_future = now + timedelta(days=365 * 5)

        if value < max_past:
            raise serializers.ValidationError(
                "Event cannot be more than 1 year in the past."
            )
        if value > max_future:
            raise serializers.ValidationError(
                "Event cannot be more than 5 years in the future."
            )
        return value

    def validate_color(self, value):
        """Validate color is alphanumeric or a valid hex code."""
        if value:
            stripped = value.strip().lower()
            # Allow named colors or hex codes
            if not (
                stripped.isalnum()
                or (stripped.startswith("#") and len(stripped) in [4, 7])
            ):
                raise serializers.ValidationError("Invalid color format.")
            return stripped
        return value

    def validate(self, attrs):
        """Cross-field validation."""
        start_at = attrs.get("start_at")
        end_at = attrs.get("end_at")
        all_day = attrs.get("all_day", False)
        recurrence_freq = attrs.get("recurrence_freq")
        recurrence_until = attrs.get("recurrence_until")
        recurrence_interval = attrs.get("recurrence_interval", 1)

        # End must be after start
        if end_at and start_at:
            if end_at <= start_at:
                raise serializers.ValidationError(
                    {"end_at": "End time must be after start time."}
                )

            # For non all-day events, ensure reasonable duration (max 30 days)
            if not all_day:
                duration = end_at - start_at
                if duration > timedelta(days=30):
                    raise serializers.ValidationError(
                        {"end_at": "Event duration cannot exceed 30 days."}
                    )

        # Recurrence validation
        if recurrence_freq:
            if recurrence_until and start_at:
                if recurrence_until <= start_at:
                    raise serializers.ValidationError(
                        {"recurrence_until": "Recurrence end must be after start date."}
                    )
                # Max recurrence period of 2 years
                max_recur = start_at + timedelta(days=365 * 2)
                if recurrence_until > max_recur:
                    raise serializers.ValidationError(
                        {"recurrence_until": "Recurrence cannot extend beyond 2 years."}
                    )

        return attrs


class OccurrenceSerializer(serializers.ModelSerializer):
    """Serializer for event occurrences with full event details."""

    title = serializers.CharField(source="event.title", read_only=True)
    event_id = serializers.IntegerField(source="event.id", read_only=True)
    description = serializers.CharField(source="event.description", read_only=True)
    color = serializers.CharField(source="event.color", read_only=True)
    priority = serializers.CharField(source="event.priority", read_only=True)
    all_day = serializers.BooleanField(source="event.all_day", read_only=True)
    location = serializers.CharField(source="event.location", read_only=True)
    is_recurring = serializers.SerializerMethodField()
    rrule = serializers.CharField(source="event.rrule", read_only=True)

    class Meta:
        model = EventOccurrence
        fields = [
            "id",
            "event_id",
            "title",
            "description",
            "start_at",
            "end_at",
            "is_cancelled",
            "color",
            "priority",
            "all_day",
            "location",
            "is_recurring",
            "rrule",
        ]

    def get_is_recurring(self, obj):
        """Check if the parent event has a recurrence rule."""
        return bool(obj.event.rrule)


class ReminderSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source="occurrence.event.title", read_only=True)
    occurrence_start_at = serializers.DateTimeField(
        source="occurrence.start_at", read_only=True
    )

    class Meta:
        model = Reminder
        fields = [
            "id",
            "title",
            "occurrence_start_at",
            "minutes_before",
            "trigger_at",
            "fired_at",
            "dismissed_at",
        ]
