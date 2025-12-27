from django.conf import settings
from django.db import models


class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )

    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    street_address = models.CharField(max_length=255, blank=True)
    zip_code = models.CharField(max_length=20, blank=True)
    birthdate = models.DateField(null=True, blank=True)
    profile_pic = models.CharField(max_length=150, blank=True)

    def __str__(self):
        return f"Profile({self.user_id})"
