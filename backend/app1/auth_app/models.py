from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    birthdate = models.DateField(null=True, blank=True)
    profile_pic = models.CharField(max_length=150, null=True, blank=True)

    def __str__(self):
        return self.username
