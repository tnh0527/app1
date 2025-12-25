from rest_framework import serializers


class ProfileSerializer(serializers.Serializer):
    # User fields
    username = serializers.CharField(required=False)
    email = serializers.EmailField(required=False)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)

    # Profile fields
    city = serializers.CharField(required=False, allow_blank=True)
    state = serializers.CharField(required=False, allow_blank=True)
    birthdate = serializers.DateField(required=False, allow_null=True)
    profile_pic = serializers.CharField(required=False, allow_blank=True)

    def to_representation(self, instance):
        # instance is a User
        user = instance
        profile = getattr(user, "profile", None)
        return {
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
            "username": user.username,
            "email": user.email,
            "city": getattr(profile, "city", "") or "",
            "state": getattr(profile, "state", "") or "",
            "birthdate": getattr(profile, "birthdate", None),
            "profile_pic": getattr(profile, "profile_pic", "") or "",
        }

    def update(self, instance, validated_data):
        user = instance
        profile = user.profile

        for field in ["username", "email", "first_name", "last_name"]:
            if field in validated_data:
                setattr(user, field, validated_data[field])

        for field in ["city", "state", "birthdate", "profile_pic"]:
            if field in validated_data:
                setattr(profile, field, validated_data[field])

        user.save()
        profile.save()
        return user
