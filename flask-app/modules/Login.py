from flask import Blueprint, request, jsonify, session
import re
from .Auth import login_required
from .db import db
from werkzeug.security import generate_password_hash, check_password_hash
from .models import User

login_bp = Blueprint("login", __name__)


class Users:
    def __init__(self, username, email, password):
        self.username = username
        self.email = email
        self.password = password
        self.errors = {}

    def valid_username(self):
        if not self.username:
            self.errors["username"] = "Username cannot be empty."
        elif self.username_exists():
            self.errors["username"] = "Username already exists."
        return not self.errors.get("username")

    def username_exists(self):
        return User.query.filter_by(username=self.username).first() is not None

    def valid_email(self):
        email_regex = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
        if not self.email:
            self.errors["email"] = "Email cannot be empty."
        elif self.email_exists():
            self.errors["email"] = "This email is already registered."
        elif not re.match(email_regex, self.email):
            self.errors["email"] = "Invalid email format."
        return not self.errors.get("email")

    def email_exists(self):
        return User.query.filter_by(email=self.email).first() is not None

    def valid_password(self):
        if not self.password:
            self.errors["password"] = "Password cannot be empty."
        elif len(self.password) < 6:
            self.errors["password"] = "Password must be at least 6 characters."
        return not self.errors.get("password")

    def validate_user(self):
        self.valid_username()
        self.valid_email()
        self.valid_password()
        return not self.errors, self.errors


def valid_login(username, password):
    errors = {}
    if not username:
        errors["username"] = "Enter your username."
    if not password:
        errors["password"] = "Enter your password."
    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.user_password, password):
        errors["username"] = "Invalid credentials."
        errors["password"] = "Invalid credentials."
    if errors:
        return False, errors
    return True, errors


@login_bp.route("/", methods=["POST"])
def authenticate():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if "register" in data:
        email = data.get("email")
        new_user = Users(
            username=username,
            email=email,
            password=password,
        )
        is_valid, errors = new_user.validate_user()
        if not is_valid:
            return jsonify(errors), 400

        try:
            user = User(
                username=new_user.username,
                email=new_user.email,
                user_password=generate_password_hash(new_user.password),
            )
            db.session.add(user)
            db.session.commit()
            return jsonify({"msg": "User registered successfully."}), 201

        except Exception as e:
            print("Error:", e)
            return jsonify({"error": "Internal server error."}), 500
    # Handle login
    is_valid, errors = valid_login(username, password)
    if not is_valid:
        return jsonify(errors), 400

    session["user_id"] = username
    session.permanent = True
    print("Logged in, current session:", session.get("user_id"))
    return jsonify({"msg": "Login successful."}), 200


@login_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    session.clear()
    print("Logged out. Session:", session.get("user_id"))
    return jsonify({"msg": "Logged out successfully!"}), 200
