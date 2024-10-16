from flask import Blueprint, request, jsonify, session, current_app, send_from_directory
from marshmallow import fields, ValidationError, pre_load
from datetime import datetime
from flask_marshmallow import Marshmallow
from .Auth import login_required
import os
from werkzeug.utils import secure_filename

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

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@profile_bp.route("/profile/edit-profile", methods=["GET", "PUT"])
@login_required
def profile():
    if request.method == "GET":
        if user_profile:
            return jsonify(user_profile), 200
        return jsonify({"msg": "Profile not found."}), 404

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


@profile_bp.route("/profile/profile-pic", methods=["GET", "PUT"])
@login_required
def profile_pic():
    PROFILE_PIC_FOLDER = os.path.join(current_app.root_path, "static", "profile_pics")
    user_email = user_profile.get("email", None)
    if not user_email:
        return jsonify({"error": "User email not found."}), 400

    if request.method == "GET":
        profile_pic_filename = user_profile.get("profile_pic", None)
        if profile_pic_filename:
            return send_from_directory(PROFILE_PIC_FOLDER, profile_pic_filename), 200
        return jsonify({"error": "No profile picture found."}), 404

    if request.method == "PUT":
        if "file" not in request.files:
            return jsonify({"error": "Requested with no file."}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No file."}), 400

        if file and allowed_file(file.filename):
            extension = file.filename.rsplit(".", 1)[1].lower()
            filename = secure_filename(f"{user_email}.{extension}")

            file.save(os.path.join(PROFILE_PIC_FOLDER, filename))
            return jsonify({"msg": "Profile picture saved successfully!"}), 200

        return jsonify({"error": "File format not allowed."}), 400
