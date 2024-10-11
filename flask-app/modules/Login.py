from flask import Blueprint, request, jsonify, session
import re

login_bp = Blueprint("login", __name__)

users = {"tnh0527": {"email": "tuan@gmail.com", "password": "tuanhoang"}}


class Users:
    def __init__(self, username, email, password):
        self.username = username
        self.email = email
        self.password = password
        self.errors = {}

    def valid_username(self):
        if not self.username:
            self.errors["username"] = "Username cannot be empty."
        elif self.username in users:
            self.errors["username"] = "Username already exists."
        return not "username" in self.errors

    def valid_email(self):
        email_regex = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
        if not self.email:
            self.errors["email"] = "Email cannot be empty."
        elif any(user["email"] == self.email for user in users.values()):
            self.errors["email"] = "This email is already registered."
        elif not re.match(email_regex, self.email):
            self.errors["email"] = "Invalid email format."
        return not "email" in self.errors  # Return True if no error for email

    def valid_password(self):
        if not self.password:
            self.errors["password"] = "Password cannot be empty."
        elif len(self.password) < 6:
            self.errors["password"] = "Password must be at least 6 characters."
        return not "password" in self.errors

    def validateUser(self):
        self.valid_username()
        self.valid_email()
        self.valid_password()
        if self.errors:
            return False, self.errors
        return True, self.errors


def valid_login(username, password):
    errors = {}
    if not username:
        errors["username"] = "Enter your username."
    if not password:
        errors["password"] = "Enter your password."
    if username not in users or users[username]["password"] != password:
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
        new_user = Users(username, email, password)

        is_valid, errors = new_user.validateUser()
        if not is_valid:
            return jsonify(errors), 400

        # Store user in the simulated database
        return jsonify({"msg": "User registered successfully."}), 201

    # Handle login
    is_valid, errors = valid_login(username, password)
    if not is_valid:
        return jsonify(errors), 400

    # Create a session for the logged-in user
    return jsonify({"msg": "Login successful."}), 200
