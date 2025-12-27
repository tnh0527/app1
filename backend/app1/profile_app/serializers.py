from rest_framework import serializers

from .models import Profile


class ProfileSerializer(serializers.Serializer):
    # User fields
    username = serializers.CharField(required=False)
    email = serializers.EmailField(required=False)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)

    # Profile fields
    city = serializers.CharField(required=False, allow_blank=True)
    state = serializers.CharField(required=False, allow_blank=True)
    street_address = serializers.CharField(required=False, allow_blank=True)
    zip_code = serializers.CharField(required=False, allow_blank=True)
    birthdate = serializers.DateField(required=False, allow_null=True)
    profile_pic = serializers.CharField(required=False, allow_blank=True)

    def to_representation(self, instance):
        # instance is a User
        user = instance
        profile, _ = Profile.objects.get_or_create(user=user)
        return {
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
            "username": user.username,
            "email": user.email,
            "city": getattr(profile, "city", "") or "",
            "state": getattr(profile, "state", "") or "",
            "street_address": getattr(profile, "street_address", "") or "",
            "zip_code": getattr(profile, "zip_code", "") or "",
            "birthdate": getattr(profile, "birthdate", None),
            "profile_pic": getattr(profile, "profile_pic", "") or "",
        }

    def update(self, instance, validated_data):
        user = instance
        profile, _ = Profile.objects.get_or_create(user=user)

        # Update User fields
        user_fields = ["username", "email", "first_name", "last_name"]
        for field in user_fields:
            if field in validated_data:
                setattr(user, field, validated_data[field])
        user.save()

        # Update Profile fields
        profile_fields = [
            "city",
            "state",
            "street_address",
            "zip_code",
            "birthdate",
            "profile_pic",
        ]
        for field in profile_fields:
            if field in validated_data:
                setattr(profile, field, validated_data[field])
        profile.save()

        return user
