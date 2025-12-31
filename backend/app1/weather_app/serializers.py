from rest_framework import serializers
from .models import SavedLocation


class SavedLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedLocation
        fields = [
            "id",
            "name",
            "latitude",
            "longitude",
            "is_primary",
            "order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data):
        # Automatically assign the user from the request
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)

    def validate(self, data):
        user = self.context["request"].user
        name = data.get("name")

        # Check for duplicate location names (case-insensitive)
        existing = SavedLocation.objects.filter(user=user, name__iexact=name)
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError(
                {"name": "You already have a location with this name."}
            )

        return data


class SavedLocationReorderSerializer(serializers.Serializer):
    """Serializer for reordering locations"""

    locations = serializers.ListField(
        child=serializers.DictField(child=serializers.IntegerField())
    )

    def validate_locations(self, value):
        for item in value:
            if "id" not in item or "order" not in item:
                raise serializers.ValidationError(
                    "Each item must have 'id' and 'order' fields."
                )
        return value
