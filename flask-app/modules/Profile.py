from flask import Blueprint, request, jsonify
from marshmallow import fields, ValidationError, pre_load
from datetime import datetime
from flask_marshmallow import Marshmallow

profile_bp = Blueprint("profile", __name__)

ma = Marshmallow()


class datesFormat(fields.Date):
    def _deserialize(self, value, attr, data, **kwargs):
        try:
            if isinstance(value, int):
                timestamp = value / 1000
                date_value = datetime.fromtimestamp(timestamp).date()
            else:
                date_value = datetime.strptime(value, "%Y-%m-%dT%H:%M:%S.%fZ").date()

            return date_value
        except ValueError:
            raise ValidationError("Invalid date format. Expected MM/DD/YYYY.")


class ProfileSchema(ma.Schema):
    firstName = fields.String(
        required=True,
        validate=lambda s: 1 <= len(s) <= 50,
        error_messages={
            "validator_failed": "First name must be between 1 - 50 characters.",
        },
    )
    lastName = fields.String(
        required=True,
        validate=lambda s: 1 <= len(s) <= 50,
        error_messages={
            "validator_failed": "Last name must be between 1 - 50 characters.",
        },
    )
    username = fields.String(
        required=True,
        validate=lambda s: 1 <= len(s) <= 20,
        error_messages={
            "validator_failed": "Invalid username.",
        },
    )
    email = fields.Email(
        required=True,
        error_messages={
            "validator_failed": "Enter a valid email.",
        },
    )
    state = fields.String(
        required=True,
        validate=lambda s: len(s) == 2,
        error_messages={
            "validator_failed": "Select your State.",
        },
    )
    city = fields.String(
        required=True,
        validate=lambda s: 1 <= len(s) <= 100,
        error_messages={
            "validator_failed": "Enter a valid city",
        },
    )
    birthdate = datesFormat(required=True)

    @pre_load
    def validate_birthdate(self, data, **kwargs):
        if (
            "birthdate" not in data
            or data.get("birthdate") is None
            or data.get("birthdate") == ""
        ):
            raise ValidationError({"birthdate": "Birthdate cannot be empty."})
        return data


profile_schema = ProfileSchema()

user_profile = {}


@profile_bp.route("/profile/edit-profile", methods=["GET", "PUT"])
def profile():
    if request.method == "GET":
        return jsonify(user_profile), 200

    if request.method == "PUT":
        try:
            data = profile_schema.load(request.json)

        except ValidationError as error:
            return jsonify({"errors": error.messages}), 400

        user_profile.update(data)
        print(user_profile)

        return (
            jsonify(
                {"message": "Profile updated successfully", "profile": user_profile}
            ),
            200,
        )
