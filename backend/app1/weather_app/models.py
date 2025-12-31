from django.db import models
from django.conf import settings


class WeatherCode(models.Model):
    code = models.IntegerField(unique=True)
    description = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.code}: {self.description}"


class SavedLocation(models.Model):
    """Stores user's saved weather locations"""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_locations",
    )
    name = models.CharField(max_length=255, help_text="Display name for the location")
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    is_primary = models.BooleanField(default=False, help_text="Primary/home location")
    order = models.PositiveIntegerField(
        default=0, help_text="Display order in the list"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "-is_primary", "name"]
        unique_together = ["user", "name"]  # Prevent duplicate location names per user
        verbose_name = "Saved Location"
        verbose_name_plural = "Saved Locations"

    def __str__(self):
        return f"{self.name} ({self.user.username})"

    def save(self, *args, **kwargs):
        # If this location is set as primary, unset other primary locations for this user
        if self.is_primary:
            SavedLocation.objects.filter(user=self.user, is_primary=True).exclude(
                pk=self.pk
            ).update(is_primary=False)
        super().save(*args, **kwargs)
