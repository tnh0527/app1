from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    # Keep User focused on identity/auth.
    # Profile details live in profile_app.Profile.
    email = models.EmailField(unique=True)
    email_verified = models.BooleanField(default=False, help_text="Whether email has been verified")
    
    # Google OAuth linking
    google_id = models.CharField(max_length=255, blank=True, null=True, unique=True, help_text="Google user ID (sub)")
    google_linked_at = models.DateTimeField(blank=True, null=True, help_text="When Google account was linked")
    
    # Password tracking for Google-only accounts
    has_usable_password = models.BooleanField(default=True, help_text="False if account was created via Google without password")

    def __str__(self):
        return self.username
