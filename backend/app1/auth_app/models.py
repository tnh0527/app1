from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    # Keep User focused on identity/auth.
    # Profile details live in profile_app.Profile.
    email = models.EmailField(unique=True)

    def __str__(self):
        return self.username
