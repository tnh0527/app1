import re
from rest_framework import serializers

from .models import Profile


class ProfileSerializer(serializers.Serializer):
    # User fields
    username = serializers.CharField(required=False, max_length=30)
    email = serializers.EmailField(required=False, max_length=254)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=50)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=50)

    # Professional Information
    career_title = serializers.CharField(required=False, allow_blank=True, max_length=100)
    company = serializers.CharField(required=False, allow_blank=True, max_length=100)
    bio = serializers.CharField(required=False, allow_blank=True, max_length=500)

    # Contact Information
    phone_number = serializers.CharField(required=False, allow_blank=True, max_length=20)
    website = serializers.URLField(required=False, allow_blank=True, max_length=200)

    # Social Links
    linkedin = serializers.URLField(required=False, allow_blank=True, max_length=200)
    github = serializers.URLField(required=False, allow_blank=True, max_length=200)
    instagram = serializers.URLField(required=False, allow_blank=True, max_length=200)

    # Location Information
    city = serializers.CharField(required=False, allow_blank=True, max_length=100)
    state = serializers.CharField(required=False, allow_blank=True, max_length=100)
    street_address = serializers.CharField(required=False, allow_blank=True, max_length=200)
    zip_code = serializers.CharField(required=False, allow_blank=True, max_length=20)
    country = serializers.CharField(required=False, allow_blank=True, max_length=100)

    # Personal Information
    birthdate = serializers.DateField(required=False, allow_null=True)
    profile_pic = serializers.CharField(required=False, allow_blank=True)

    # Validation patterns
    NAME_PATTERN = re.compile(r"^[a-zA-Z\s\-']*$")
    USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9_.]*$")
    PHONE_PATTERN = re.compile(r"^[0-9\s\-()+ ]*$")
    CITY_PATTERN = re.compile(r"^[a-zA-Z\s\-'.]*$")
    STATE_PATTERN = re.compile(r"^[a-zA-Z\s\-']*$")
    ZIP_PATTERN = re.compile(r"^[a-zA-Z0-9\s\-]*$")
    ADDRESS_PATTERN = re.compile(r"^[a-zA-Z0-9\s\-.,#'/()]*$")
    CAREER_PATTERN = re.compile(r"^[a-zA-Z0-9\s\-&.,/'()]*$")

    def validate_first_name(self, value):
        if value and not self.NAME_PATTERN.match(value):
            raise serializers.ValidationError(
                "Only letters, spaces, hyphens, and apostrophes allowed"
            )
        return value

    def validate_last_name(self, value):
        if value and not self.NAME_PATTERN.match(value):
            raise serializers.ValidationError(
                "Only letters, spaces, hyphens, and apostrophes allowed"
            )
        return value

    def validate_username(self, value):
        if value and not self.USERNAME_PATTERN.match(value):
            raise serializers.ValidationError(
                "Only letters, numbers, underscores, and periods allowed"
            )
        return value

    def validate_phone_number(self, value):
        if value and not self.PHONE_PATTERN.match(value):
            raise serializers.ValidationError(
                "Only numbers and phone characters allowed"
            )
        return value

    def validate_city(self, value):
        if value and not self.CITY_PATTERN.match(value):
            raise serializers.ValidationError(
                "Only letters, spaces, hyphens, and apostrophes allowed"
            )
        return value

    def validate_state(self, value):
        if value and not self.STATE_PATTERN.match(value):
            raise serializers.ValidationError(
                "Only letters, spaces, and hyphens allowed"
            )
        return value

    def validate_zip_code(self, value):
        if value and not self.ZIP_PATTERN.match(value):
            raise serializers.ValidationError(
                "Only letters, numbers, spaces, and hyphens allowed"
            )
        return value

    def validate_street_address(self, value):
        if value and not self.ADDRESS_PATTERN.match(value):
            raise serializers.ValidationError(
                "Only letters, numbers, and address characters allowed"
            )
        return value

    def validate_career_title(self, value):
        if value and not self.CAREER_PATTERN.match(value):
            raise serializers.ValidationError(
                "Only letters, numbers, and common punctuation allowed"
            )
        return value

    def validate_company(self, value):
        if value and not self.CAREER_PATTERN.match(value):
            raise serializers.ValidationError(
                "Only letters, numbers, and common punctuation allowed"
            )
        return value

    def validate_linkedin(self, value):
        if value and "linkedin.com" not in value:
            raise serializers.ValidationError("Please enter a valid LinkedIn URL")
        return value

    def validate_github(self, value):
        if value and "github.com" not in value:
            raise serializers.ValidationError("Please enter a valid GitHub URL")
        return value

    def validate_instagram(self, value):
        if value and "instagram.com" not in value:
            raise serializers.ValidationError("Please enter a valid Instagram URL")
        return value

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
