from rest_framework import serializers
from auth_app.models import User
from datetime import datetime


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "username",
            "email",
            "city",
            "state",
            "birthdate",
            "profile_pic",
        ]

    def validate(self, attrs):
        errors = {}
        for field in self.fields:
            if field in attrs and not attrs[field]:
                errors[field] = "Field cannot be empty."
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def validate_birthdate(self, value):
        if isinstance(value, int):
            value = datetime.fromtimestamp(value / 1000).date()
        return value
