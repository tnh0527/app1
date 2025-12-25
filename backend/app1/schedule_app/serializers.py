from rest_framework import serializers

from .models import Event, EventOccurrence, Reminder


class EventCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    start_at = serializers.DateTimeField()
    end_at = serializers.DateTimeField()
    all_day = serializers.BooleanField(default=False)
    timezone = serializers.CharField(required=False, allow_blank=True)

    # Recurrence inputs (optional)
    recurrence_freq = serializers.ChoiceField(
        choices=["DAILY", "WEEKLY", "MONTHLY"], required=False
    )
    recurrence_interval = serializers.IntegerField(required=False, min_value=1)
    recurrence_until = serializers.DateTimeField(required=False)

    # In-app reminder (optional)
    reminder_minutes_before = serializers.IntegerField(required=False, min_value=0)

    def validate(self, attrs):
        if attrs["end_at"] <= attrs["start_at"]:
            raise serializers.ValidationError({"end_at": "Must be after start_at."})
        return attrs


class OccurrenceSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source="event.title", read_only=True)
    event_id = serializers.IntegerField(source="event.id", read_only=True)

    class Meta:
        model = EventOccurrence
        fields = ["id", "event_id", "title", "start_at", "end_at", "is_cancelled"]


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
