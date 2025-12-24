from django.db import models

class WeatherCode(models.Model):
    code = models.IntegerField(unique=True)
    description = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.code}: {self.description}"
