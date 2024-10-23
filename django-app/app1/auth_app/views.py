from django.contrib.auth import authenticate, login, logout
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import User
import re


@api_view(["POST"])
def register(request):
    username = request.data.get("username")
    email = request.data.get("email")
    password = request.data.get("password")

    errors = {}
    if not username:
        errors["username"] = "Username cannot be empty."
    elif User.objects.filter(username=username).exists():
        errors["username"] = "Username already exists."

    if not email:
        errors["email"] = "Email cannot be empty."
    elif User.objects.filter(email=email).exists():
        errors["email"] = "This email is already registered."
    elif not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
        errors["email"] = "Invalid email format."

    if not password or len(password) < 6:
        errors["password"] = "Password must be at least 6 characters."

    if errors:
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)

    user = User(username=username, email=email)
    user.set_password(password)
    user.save()
    return Response(
        {"msg": "User registered successfully."}, status=status.HTTP_201_CREATED
    )


@api_view(["POST"])
def user_login(request):
    username = request.data.get("username")
    password = request.data.get("password")

    errors = {}
    if not username:
        errors["username"] = "Enter your username."
    if not password:
        errors["password"] = "Enter your password."

    if errors:
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(request, username=username, password=password)
    if user is not None:
        login(request, user)
        return Response({"msg": "Login successful."}, status=status.HTTP_200_OK)
    else:
        errors["username"] = "Invalid credentials."
        errors["password"] = "Invalid credentials."
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
def user_logout(request):
    logout(request)
    return Response({"msg": "Logged out successfully!"}, status=status.HTTP_200_OK)
