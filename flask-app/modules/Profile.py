from flask import Blueprint, request, jsonify, current_app, send_from_directory
from marshmallow import fields, ValidationError, pre_load
from datetime import datetime
from flask_marshmallow import Marshmallow
from .Auth import login_required
import os
from werkzeug.utils import secure_filename
from .models import User
from .db import db

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
        required=False,
        validate=lambda s: 1 <= len(s) <= 50,
        error_messages={
            "validator_failed": "First name must be between 1 - 50 characters.",
        },
    )
    lastName = fields.String(
        required=False,
        validate=lambda s: 1 <= len(s) <= 50,
        error_messages={
            "validator_failed": "Last name must be between 1 - 50 characters.",
        },
    )
    username = fields.String(
        required=False,
        validate=lambda s: 1 <= len(s) <= 20,
        error_messages={
            "validator_failed": "Invalid username.",
        },
    )
    email = fields.Email(
        required=False,
        error_messages={
            "validator_failed": "Enter a valid email.",
        },
    )
    state = fields.String(
        required=False,
        validate=lambda s: len(s) == 2,
        error_messages={
            "validator_failed": "Select your State.",
        },
    )
    city = fields.String(
        required=False,
        validate=lambda s: 1 <= len(s) <= 100,
        error_messages={
            "validator_failed": "Enter a valid city",
        },
    )
    birthdate = datesFormat(required=False)

    @pre_load
    def validate_required_fields(self, data, **kwargs):
        errors = {}
        for field in [
            "firstName",
            "lastName",
            "username",
            "email",
            "state",
            "city",
            "birthdate",
        ]:
            if field in data and not data[field]:
                errors[field] = f"Field cannot be empty."
        if errors:
            raise ValidationError(errors)
        return data

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

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@profile_bp.route("/profile/edit-profile", methods=["GET", "PUT"])
@login_required
def profile():
    user_id = request.user_id
    user = User.query.filter_by(username=user_id).first()
    if not user:
        return jsonify({"error": "User not found."}), 404

    if request.method == "GET":
        user_profile = {
            "firstName": user.firstName,
            "lastName": user.lastName,
            "username": user.username,
            "email": user.email,
            "state": user.state,
            "city": user.city,
            "birthdate": user.birthdate,
        }
        print(user_profile)
        return jsonify(user_profile), 200

    if request.method == "PUT":
        try:
            profile_data = profile_schema.load(request.json)
        except ValidationError as error:
            return jsonify({"errors": error.messages}), 400

        for key, value in profile_data.items():
            if hasattr(user, key):
                setattr(user, key, value)

        db.session.commit()
        return (
            jsonify({"message": "Profile updated successfully"}),
            200,
        )


@profile_bp.route("/profile/profile-pic", methods=["GET", "PUT"])
@login_required
def profile_pic():
    user_id = request.user_id
    user = User.query.filter_by(username=user_id).first()
    if not user:
        return jsonify({"error": "User not found."}), 404

    PROFILE_PIC_FOLDER = os.path.join(
        current_app.root_path, "..", "static", "profile_pics"
    )

    if request.method == "GET":
        if user.profile_pic:
            return send_from_directory(PROFILE_PIC_FOLDER, user.profile_pic), 200
        return jsonify({"error": "No profile picture found."}), 404

    if request.method == "PUT":
        if "file" not in request.files:
            return jsonify({"error": "No file provided."}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No file selected."}), 400

        if file and allowed_file(file.filename):
            extension = file.filename.rsplit(".", 1)[1].lower()
            filename = secure_filename(f"{user.username}.{extension}")

            file.save(os.path.join(PROFILE_PIC_FOLDER, filename))
            user.profile_pic = filename
            db.session.commit()

            return jsonify({"msg": "Profile picture saved successfully!"}), 200

        return jsonify({"error": "File format not allowed."}), 400
