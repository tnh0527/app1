from django.urls import path
from .views import schedule

urlpatterns = [
    path("schedule/", schedule, name="schedule"),
]
