from datetime import datetime
import os

from django.conf import settings
from django.core.files.storage import default_storage
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Profile
from .serializers import ProfileSerializer


def date_format(birthdate_str):
    try:
        date_obj = datetime.strptime(birthdate_str, "%Y-%m-%dT%H:%M:%S.%fZ")
        return date_obj.date()
    except ValueError:
        raise ValueError("Date must be in MM/DD/YYYY format.")


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def profile(request):
    user = request.user
    if request.method == "GET":
        serializer = ProfileSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    if request.method == "PUT":
        data = request.data.copy()
        if "birthdate" in data:
            try:
                data["birthdate"] = date_format(data["birthdate"])
            except ValueError as e:
                return Response(
                    {"errors": {"birthdate": str(e)}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Ensure profile exists for legacy users created before signals were added.
        Profile.objects.get_or_create(user=user)

        serializer = ProfileSerializer(user, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            # Return the updated profile payload so the frontend can re-render immediately.
            return Response(ProfileSerializer(user).data, status=status.HTTP_200_OK)

        return Response(
            {"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def profile_pic(request):
    user = request.user
    profile, _ = Profile.objects.get_or_create(user=user)

    if request.method == "GET":
        if profile.profile_pic:
            profile_pic_path = os.path.join(
                settings.MEDIA_ROOT, "profile_pics", profile.profile_pic
            )
            if os.path.exists(profile_pic_path):
                with open(profile_pic_path, "rb") as pic_file:
                    return HttpResponse(pic_file.read(), content_type="image/jpeg")
            else:
                return Response(
                    {"error": "No profile picture found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            return Response(
                {"error": "No profile picture set."}, status=status.HTTP_404_NOT_FOUND
            )

    if request.method == "PUT":
        if "file" not in request.FILES:
            return Response(
                {"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST
            )

        file = request.FILES["file"]
        if file.name == "":
            return Response(
                {"error": "No file selected."}, status=status.HTTP_400_BAD_REQUEST
            )

        if file.name.split(".")[-1].lower() in ["png", "jpg", "jpeg"]:
            filename = f"{user.username}.{file.name.split('.')[-1]}"
            # Use relative path for default_storage
            relative_path = os.path.join("profile_pics", filename)

            try:
                # Delete the old profile picture if it exists
                if default_storage.exists(relative_path):
                    default_storage.delete(relative_path)

                default_storage.save(relative_path, file)

                profile.profile_pic = filename
                profile.save()
                return Response(
                    {"msg": "Profile picture saved successfully!"},
                    status=status.HTTP_200_OK,
                )
            except Exception as e:
                return Response(
                    {"error": f"Failed to save file: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        return Response(
            {"error": "File format not allowed."}, status=status.HTTP_400_BAD_REQUEST
        )
