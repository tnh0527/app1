from rest_framework import serializers

from .models import Profile


class ProfileSerializer(serializers.Serializer):
    # User fields
    username = serializers.CharField(required=False)
    email = serializers.EmailField(required=False)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)

    # Professional Information
    career_title = serializers.CharField(required=False, allow_blank=True)
    company = serializers.CharField(required=False, allow_blank=True)
    bio = serializers.CharField(required=False, allow_blank=True)

    # Contact Information
    phone_number = serializers.CharField(required=False, allow_blank=True)
    website = serializers.URLField(required=False, allow_blank=True)

    # Social Links
    linkedin = serializers.URLField(required=False, allow_blank=True)
    github = serializers.URLField(required=False, allow_blank=True)
    instagram = serializers.URLField(required=False, allow_blank=True)

    # Location Information
    city = serializers.CharField(required=False, allow_blank=True)
    state = serializers.CharField(required=False, allow_blank=True)
    street_address = serializers.CharField(required=False, allow_blank=True)
    zip_code = serializers.CharField(required=False, allow_blank=True)
    country = serializers.CharField(required=False, allow_blank=True)

    # Personal Information
    birthdate = serializers.DateField(required=False, allow_null=True)
    profile_pic = serializers.CharField(required=False, allow_blank=True)

    def to_representation(self, instance):
        # instance is a User
        user = instance
        profile, _ = Profile.objects.get_or_create(user=user)
        return {
            # User fields
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
            "username": user.username,
            "email": user.email,
            # Professional Information
            "career_title": getattr(profile, "career_title", "") or "",
            "company": getattr(profile, "company", "") or "",
            "bio": getattr(profile, "bio", "") or "",
            # Contact Information
            "phone_number": getattr(profile, "phone_number", "") or "",
            "website": getattr(profile, "website", "") or "",
            # Social Links
            "linkedin": getattr(profile, "linkedin", "") or "",
            "github": getattr(profile, "github", "") or "",
            "instagram": getattr(profile, "instagram", "") or "",
            # Location Information
            "city": getattr(profile, "city", "") or "",
            "state": getattr(profile, "state", "") or "",
            "street_address": getattr(profile, "street_address", "") or "",
            "zip_code": getattr(profile, "zip_code", "") or "",
            "country": getattr(profile, "country", "") or "United States",
            # Personal Information
            "birthdate": getattr(profile, "birthdate", None),
            "profile_pic": getattr(profile, "profile_pic", "") or "",
            # Computed fields
            "full_name": f"{user.first_name} {user.last_name}".strip() or user.username,
            "location": ", ".join(filter(None, [
                getattr(profile, "city", ""),
                getattr(profile, "state", ""),
                getattr(profile, "country", "")
            ])),
            "member_since": user.date_joined.strftime("%B %Y") if user.date_joined else "",
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
            # Professional
            "career_title",
            "company",
            "bio",
            # Contact
            "phone_number",
            "website",
            # Social
            "linkedin",
            "github",
            "instagram",
            # Location
            "city",
            "state",
            "street_address",
            "zip_code",
            "country",
            # Personal
            "birthdate",
            "profile_pic",
        ]
        for field in profile_fields:
            if field in validated_data:
                setattr(profile, field, validated_data[field])
        profile.save()

        return user
