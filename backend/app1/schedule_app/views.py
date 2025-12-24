from rest_framework.decorators import api_view
from django.contrib.auth.decorators import login_required
from .models import Event
from .serializers import EventSerializer
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime


@login_required
@api_view(["GET", "POST", "DELETE"])
def schedule(request):
    if request.method == "GET":
        user_events = Event.objects.filter(user=request.user)
        serializer = EventSerializer(user_events, many=True)

        # Create separate birthday events for a 4-year period (2 years before and 2 years after)
        birthdate = request.user.birthdate
        current_year = datetime.now().year

        birthday_events = []

        for year_offset in range(
            -2, 3
        ):  # This will create events for 2 years before and 2 years after
            # Create a birthday date with the same month and day but adjusted for the year
            birthday_this_year = birthdate.replace(year=current_year + year_offset)

            # Set the time to 05:00:00 and convert to ISO format with 'Z' for UTC
            birthday_event = (
                datetime(
                    birthday_this_year.year,
                    birthday_this_year.month,
                    birthday_this_year.day,
                    5,
                    0,
                    0,
                ).isoformat()
                + "Z"
            )
            birthday_events.append(
                {
                    "id": 9999999
                    + year_offset,  # Unique ID for each event, can adjust as needed
                    "title": "Your Birthday",
                    "date": birthday_event,
                }
            )

        # Combine user events with birthday events
        events_with_birthdate = list(serializer.data) + birthday_events

        return Response(events_with_birthdate, status=status.HTTP_200_OK)

    if request.method == "POST":
        serializer = EventSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(
                {"msg": "Event successfully added!"}, status=status.HTTP_201_CREATED
            )
        return Response(
            {"error": "Missing required info. Unable to add event."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if request.method == "DELETE":
        event_id = request.data.get("event_id")
        try:
            event_to_delete = Event.objects.get(id=event_id, user=request.user)
            event_to_delete.delete()
            return Response(
                {"msg": "Event successfully delete!"}, status=status.HTTP_200_OK
            )
        except Event.DoesNotExist:
            return Response(
                {"error": f"No event found with id {event_id}."},
                status=status.HTTP_404_NOT_FOUND,
            )
