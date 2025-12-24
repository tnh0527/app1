from django.db import models
from django.conf import settings


class Event(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=100)
    date = models.DateTimeField()

    def __str__(self):
        return self.title
