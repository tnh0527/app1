import re
from rest_framework import serializers
from .models import SavedLocation


class SavedLocationSerializer(serializers.ModelSerializer):
    """Serializer for saved weather locations with comprehensive validation."""

    # Override fields with explicit validation
    name = serializers.CharField(min_length=2, max_length=255)
    latitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, min_value=-90, max_value=90
    )
    longitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, min_value=-180, max_value=180
    )

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

    def validate_name(self, value):
        """Validate location name for proper format and security."""
        if not value:
            raise serializers.ValidationError("Location name is required.")

        stripped = value.strip()
        if len(stripped) < 2:
            raise serializers.ValidationError(
                "Location name must be at least 2 characters."
            )
        if len(stripped) > 255:
            raise serializers.ValidationError(
                "Location name must be 255 characters or less."
            )

        # Check for suspicious patterns (XSS prevention)
        suspicious_patterns = re.compile(r"<script|javascript:|data:|on\w+=", re.I)
        if suspicious_patterns.search(stripped):
            raise serializers.ValidationError("Invalid location name.")

        # Only allow alphanumeric, spaces, commas, periods, hyphens, apostrophes
        if not re.match(r"^[\w\s,.\-']+$", stripped, re.UNICODE):
            raise serializers.ValidationError(
                "Location name contains invalid characters."
            )

        return stripped

    def validate_latitude(self, value):
        """Validate latitude is within valid range."""
        if value is None:
            raise serializers.ValidationError("Latitude is required.")
        if value < -90 or value > 90:
            raise serializers.ValidationError(
                "Latitude must be between -90 and 90 degrees."
            )
        return value

    def validate_longitude(self, value):
        """Validate longitude is within valid range."""
        if value is None:
            raise serializers.ValidationError("Longitude is required.")
        if value < -180 or value > 180:
            raise serializers.ValidationError(
                "Longitude must be between -180 and 180 degrees."
            )
        return value

    def create(self, validated_data):
        # Automatically assign the user from the request
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)

    def validate(self, data):
        """Cross-field validation."""
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

        # Check maximum saved locations limit (5)
        if not self.instance:  # Only check on create
            current_count = SavedLocation.objects.filter(user=user).count()
            if current_count >= 5:
                raise serializers.ValidationError(
                    {"non_field_errors": "Maximum 5 locations can be saved."}
                )

        return data


class SavedLocationReorderSerializer(serializers.Serializer):
    """Serializer for reordering locations with validation."""

    locations = serializers.ListField(
        child=serializers.DictField(child=serializers.IntegerField()),
        min_length=1,
        max_length=10,  # Reasonable max
    )

    def validate_locations(self, value):
        """Validate reorder data structure."""
        if not value:
            raise serializers.ValidationError("Locations list cannot be empty.")

        seen_ids = set()
        for idx, item in enumerate(value):
            if "id" not in item or "order" not in item:
                raise serializers.ValidationError(
                    f"Item {idx}: must have 'id' and 'order' fields."
                )

            # Validate ID is positive
            if item["id"] <= 0:
                raise serializers.ValidationError(
                    f"Item {idx}: 'id' must be a positive integer."
                )

            # Validate order is non-negative
            if item["order"] < 0:
                raise serializers.ValidationError(
                    f"Item {idx}: 'order' must be a non-negative integer."
                )

            # Check for duplicate IDs
            if item["id"] in seen_ids:
                raise serializers.ValidationError(
                    f"Duplicate location ID: {item['id']}."
                )
            seen_ids.add(item["id"])

        return value
