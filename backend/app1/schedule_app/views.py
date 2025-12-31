from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Event, EventOccurrence, Reminder
from .serializers import EventCreateSerializer, OccurrenceSerializer, ReminderSerializer
from .services import (
    default_generation_window,
    get_or_create_default_calendar,
    regenerate_occurrences,
)


@api_view(["GET", "POST", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def schedule(request, pk=None):
    """
    Handle calendar events CRUD operations.

    GET: List occurrences within date range
    POST: Create new event
    PUT: Update existing event (requires pk or event_id in body)
    DELETE: Delete event or occurrence
    """
    user = request.user
    calendar = get_or_create_default_calendar(user)

    if request.method == "GET":
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        qs = EventOccurrence.objects.filter(
            event__calendar=calendar, is_cancelled=False
        )

        if start:
            qs = qs.filter(start_at__gte=start)
        if end:
            qs = qs.filter(start_at__lte=end)

        qs = qs.select_related("event").order_by("start_at")
        return Response(
            OccurrenceSerializer(qs, many=True).data, status=status.HTTP_200_OK
        )

    if request.method == "POST":
        serializer = EventCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        tz = data.get("timezone") or "UTC"

        event = Event.objects.create(
            calendar=calendar,
            title=data["title"],
            description=data.get("description", ""),
            location=data.get("location", ""),
            start_at=data["start_at"],
            end_at=data["end_at"],
            all_day=data.get("all_day", False),
            timezone=tz,
            color=data.get("color", "teal"),
            priority=data.get("priority", ""),
        )

        freq = data.get("recurrence_freq")
        interval = data.get("recurrence_interval") or 1
        until = data.get("recurrence_until")
        if freq:
            event.rrule = f"FREQ={freq};INTERVAL={interval}"
            event.recurrence_until = until
            event.save(update_fields=["rrule", "recurrence_until"])

        reminder_minutes = data.get("reminder_minutes_before")

        window_start, window_end = default_generation_window(event)
        regenerate_occurrences(
            event,
            window_start=window_start,
            window_end=window_end,
            reminder_minutes_before=reminder_minutes,
        )

        # Return occurrences in the month of the created event to make UI refresh simple.
        month_start = event.start_at.replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        month_end = (month_start + timedelta(days=40)).replace(day=1) - timedelta(
            seconds=1
        )
        occs = (
            EventOccurrence.objects.filter(
                event__calendar=calendar,
                is_cancelled=False,
                start_at__gte=month_start,
                start_at__lte=month_end,
            )
            .select_related("event")
            .order_by("start_at")
        )
        return Response(
            OccurrenceSerializer(occs, many=True).data, status=status.HTTP_201_CREATED
        )

    if request.method == "PUT":
        # Get event ID from URL parameter or request body
        event_id = pk or request.data.get("event_id")
        if not event_id:
            return Response(
                {"error": "Event ID is required for update."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            event = Event.objects.get(id=event_id, calendar=calendar)
        except Event.DoesNotExist:
            return Response(
                {"error": f"No event found with id {event_id}."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = EventCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # Update event fields
        event.title = data["title"]
        event.description = data.get("description", "")
        event.location = data.get("location", "")
        event.start_at = data["start_at"]
        event.end_at = data["end_at"]
        event.all_day = data.get("all_day", False)
        event.timezone = data.get("timezone") or "UTC"
        event.color = data.get("color", "teal")
        event.priority = data.get("priority", "")

        # Update recurrence if changed
        freq = data.get("recurrence_freq")
        interval = data.get("recurrence_interval") or 1
        until = data.get("recurrence_until")

        if freq:
            event.rrule = f"FREQ={freq};INTERVAL={interval}"
            event.recurrence_until = until
        else:
            event.rrule = ""
            event.recurrence_until = None

        event.save()

        # Regenerate occurrences with updated event data
        reminder_minutes = data.get("reminder_minutes_before")
        window_start, window_end = default_generation_window(event)
        regenerate_occurrences(
            event,
            window_start=window_start,
            window_end=window_end,
            reminder_minutes_before=reminder_minutes,
        )

        # Return updated occurrences
        month_start = event.start_at.replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        month_end = (month_start + timedelta(days=40)).replace(day=1) - timedelta(
            seconds=1
        )
        occs = (
            EventOccurrence.objects.filter(
                event__calendar=calendar,
                is_cancelled=False,
                start_at__gte=month_start,
                start_at__lte=month_end,
            )
            .select_related("event")
            .order_by("start_at")
        )
        return Response(
            OccurrenceSerializer(occs, many=True).data, status=status.HTTP_200_OK
        )

    if request.method == "DELETE":
        occurrence_id = request.data.get("occurrence_id")
        event_id = request.data.get("event_id")

        if occurrence_id:
            try:
                occ = EventOccurrence.objects.select_related("event").get(
                    id=occurrence_id, event__calendar=calendar
                )
            except EventOccurrence.DoesNotExist:
                return Response(
                    {"error": f"No occurrence found with id {occurrence_id}."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # If non-recurring, delete the whole event. Otherwise cancel just this instance.
            if not occ.event.rrule:
                occ.event.delete()
            else:
                occ.is_cancelled = True
                occ.save(update_fields=["is_cancelled"])
            return Response({"msg": "Deleted."}, status=status.HTTP_200_OK)

        if event_id:
            try:
                event = Event.objects.get(id=event_id, calendar=calendar)
            except Event.DoesNotExist:
                return Response(
                    {"error": f"No event found with id {event_id}."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            event.delete()
            return Response({"msg": "Deleted."}, status=status.HTTP_200_OK)

        return Response(
            {"error": "Provide occurrence_id or event_id."},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def due_reminders(request):
    user = request.user
    calendar = get_or_create_default_calendar(user)
    now = timezone.now()
    qs = (
        Reminder.objects.filter(
            occurrence__event__calendar=calendar,
            dismissed_at__isnull=True,
            trigger_at__lte=now,
        )
        .select_related("occurrence", "occurrence__event")
        .order_by("trigger_at")
    )
    return Response(ReminderSerializer(qs, many=True).data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def dismiss_reminder(request, reminder_id: int):
    user = request.user
    calendar = get_or_create_default_calendar(user)
    try:
        reminder = Reminder.objects.select_related("occurrence__event").get(
            id=reminder_id, occurrence__event__calendar=calendar
        )
    except Reminder.DoesNotExist:
        return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    reminder.dismissed_at = timezone.now()
    reminder.save(update_fields=["dismissed_at"])
    return Response({"msg": "Dismissed."}, status=status.HTTP_200_OK)
