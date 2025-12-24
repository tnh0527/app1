from django.urls import path
from .views import profile, profile_pic

urlpatterns = [
    path("edit-profile/", profile, name="edit-profile"),
    path("profile-pic/", profile_pic, name="profile-pic"),
]
