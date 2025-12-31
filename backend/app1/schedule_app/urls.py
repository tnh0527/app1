from django.urls import path

from .views import dismiss_reminder, due_reminders, schedule

urlpatterns = [
    path("schedule/", schedule, name="schedule"),
    path("schedule/<int:pk>/", schedule, name="schedule_detail"),
    path("reminders/due/", due_reminders, name="due_reminders"),
    path(
        "reminders/<int:reminder_id>/dismiss/",
        dismiss_reminder,
        name="dismiss_reminder",
    ),
]
