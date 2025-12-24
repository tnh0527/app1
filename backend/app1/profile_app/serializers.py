from rest_framework import serializers
from auth_app.models import User


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
