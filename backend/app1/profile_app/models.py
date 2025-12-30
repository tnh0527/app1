from django.conf import settings
from django.db import models


class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )

    # Professional Information
    career_title = models.CharField(max_length=100, blank=True, help_text="e.g., Software Engineer")
    company = models.CharField(max_length=100, blank=True, help_text="Current company/organization")
    bio = models.TextField(max_length=500, blank=True, help_text="Short biography")

    # Contact Information
    phone_number = models.CharField(max_length=20, blank=True)
    website = models.URLField(max_length=200, blank=True, help_text="Personal website URL")

    # Social Links
    linkedin = models.URLField(max_length=200, blank=True)
    github = models.URLField(max_length=200, blank=True)
    instagram = models.URLField(max_length=200, blank=True)

    # Location Information
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    street_address = models.CharField(max_length=255, blank=True)
    zip_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True, default="United States")

    # Personal Information
    birthdate = models.DateField(null=True, blank=True)
    profile_pic = models.CharField(max_length=150, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        verbose_name = "Profile"
        verbose_name_plural = "Profiles"

    def __str__(self):
        return f"Profile({self.user.username})"

    @property
    def full_name(self):
        return f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username

    @property
    def location(self):
        parts = [self.city, self.state, self.country]
        return ", ".join(filter(None, parts))
