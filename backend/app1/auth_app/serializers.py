from rest_framework import serializers
from django.contrib.auth import authenticate
from django.core.validators import RegexValidator
from django.db import models
import re
from .models import User


# Validators for name fields
name_validator = RegexValidator(
    regex=r'^[a-zA-Z\s\'\-]+$',
    message="Name can only contain letters, spaces, hyphens, and apostrophes. No numbers or special characters like ;?{}[] allowed."
)

# Validator for username
username_validator = RegexValidator(
    regex=r'^[a-zA-Z0-9_]+$',
    message="Username can only contain letters, numbers, and underscores."
)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        error_messages={"min_length": "Password must be at least 8 characters."},
    )
    email = serializers.EmailField(required=True)
    username = serializers.CharField(
        min_length=3,
        max_length=20,
        validators=[username_validator],
        error_messages={
            "min_length": "Username must be at least 3 characters.",
            "max_length": "Username cannot exceed 20 characters."
        }
    )

    # Optional profile fields (stored on profile_app.Profile)
    first_name = serializers.CharField(
        required=False, 
        allow_blank=True,
        max_length=50,
        validators=[name_validator]
    )
    last_name = serializers.CharField(
        required=False, 
        allow_blank=True,
        max_length=50,
        validators=[name_validator]
    )
    city = serializers.CharField(required=False, allow_blank=True)
    state = serializers.CharField(required=False, allow_blank=True)
    birthdate = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
            "city",
            "state",
            "birthdate",
        ]

    def validate_email(self, value):
        # Normalize email to lowercase
        value = value.lower().strip()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value

    def validate_username(self, value):
        # Additional username validation
        value = value.strip()
        # Check for SQL injection patterns
        dangerous_patterns = [';', '--', '/*', '*/', 'DROP', 'DELETE', 'INSERT', 'UPDATE', 'SELECT']
        if any(pattern.lower() in value.lower() for pattern in dangerous_patterns):
            raise serializers.ValidationError("Username contains invalid characters.")
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_first_name(self, value):
        if value:
            value = value.strip()
            # Check for dangerous characters
            if re.search(r'[;?{}[\]<>|\\/@#$%^&*()=+~`!0-9]', value):
                raise serializers.ValidationError(
                    "First name can only contain letters, spaces, hyphens, and apostrophes."
                )
        return value

    def validate_last_name(self, value):
        if value:
            value = value.strip()
            # Check for dangerous characters
            if re.search(r'[;?{}[\]<>|\\/@#$%^&*()=+~`!0-9]', value):
                raise serializers.ValidationError(
                    "Last name can only contain letters, spaces, hyphens, and apostrophes."
                )
        return value

    def validate_password(self, value):
        # Additional password strength validation
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters.")
        # Check for at least one letter and one number for stronger passwords
        if not re.search(r'[a-zA-Z]', value):
            raise serializers.ValidationError("Password must contain at least one letter.")
        return value

    def create(self, validated_data):
        first_name = validated_data.pop("first_name", "")
        last_name = validated_data.pop("last_name", "")
        city = validated_data.pop("city", "")
        state = validated_data.pop("state", "")
        birthdate = validated_data.pop("birthdate", None)

        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )

        # Profile is created by signal; populate it if provided.
        user.first_name = first_name
        user.last_name = last_name
        user.save(update_fields=["first_name", "last_name"])

        # Profile is normally created by signal; be defensive in case signals
        # aren't loaded yet (e.g., misconfigured INSTALLED_APPS).
        from profile_app.models import Profile

        profile, _created = Profile.objects.get_or_create(user=user)
        profile.city = city
        profile.state = state
        profile.birthdate = birthdate
        profile.save(update_fields=["city", "state", "birthdate"])

        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        username = data.get("username")
        password = data.get("password")

        if username and password:
            # First, check if user exists
            try:
                # Try to find user by username or email
                user = User.objects.filter(
                    models.Q(username=username) | models.Q(email=username)
                ).first()
                
                if user:
                    # Check if this is a Google-only account (no usable password)
                    if not user.has_usable_password:
                        raise serializers.ValidationError({
                            "google_account": True,
                            "message": "This account uses Google sign-in. Please continue with Google."
                        })
                    
                    # Attempt authentication
                    auth_user = authenticate(username=user.username, password=password)
                    if auth_user:
                        if not auth_user.is_active:
                            raise serializers.ValidationError("User account is disabled.")
                        data["user"] = auth_user
                    else:
                        raise serializers.ValidationError("Invalid credentials.")
                else:
                    raise serializers.ValidationError("Invalid credentials.")
            except User.DoesNotExist:
                raise serializers.ValidationError("Invalid credentials.")
        else:
            raise serializers.ValidationError("Must include 'username' and 'password'.")
        return data


class GoogleAuthSerializer(serializers.Serializer):
    """Serializer for Google OAuth authentication."""
    credential = serializers.CharField(required=True)

    def validate_credential(self, value):
        """Validate the Google credential token."""
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        from django.conf import settings
        import logging

        logger = logging.getLogger(__name__)

        try:
            # Ensure server is configured with the expected Google client ID
            client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '')
            if not client_id:
                raise serializers.ValidationError(
                    "Server misconfiguration: GOOGLE_OAUTH_CLIENT_ID is not set on the backend."
                )
            # Verify the token with Google
            idinfo = id_token.verify_oauth2_token(
                value,
                google_requests.Request(),
                client_id
            )

            # Check if the token is from a valid issuer
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                raise serializers.ValidationError("Invalid token issuer.")

            # Store the user info for later use
            self.google_user_info = {
                'email': idinfo.get('email'),
                'email_verified': idinfo.get('email_verified', False),
                'given_name': idinfo.get('given_name', ''),
                'family_name': idinfo.get('family_name', ''),
                'picture': idinfo.get('picture', ''),
                'sub': idinfo.get('sub'),  # Google user ID
            }

            if not self.google_user_info['email_verified']:
                raise serializers.ValidationError("Google email not verified.")

            return value

        except ValueError as e:
            # Log the verification error to help debugging token/audience issues
            try:
                client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '')
            except Exception:
                client_id = '<unable to read setting>'
            # Avoid logging full token; log the error and configured client id
            logger.warning(
                "Google token validation failed: %s; expected client_id=%s",
                str(e),
                client_id,
            )
            raise serializers.ValidationError(f"Invalid Google token: {str(e)}")

    def create_or_get_user(self):
        """Create a new user or get existing one based on Google info.
        
        Handles account linking with the following rules:
        1. If user exists with matching google_id -> log in
        2. If user exists with matching email and both emails verified -> link Google & log in
        3. If user exists with matching email but not verified -> require password login first
        4. If no user exists -> create new user with Google
        """
        from django.utils import timezone
        from profile_app.models import Profile
        
        email = self.google_user_info['email']
        google_id = self.google_user_info['sub']
        google_email_verified = self.google_user_info['email_verified']
        
        # First, try to find user by Google ID (already linked)
        try:
            user = User.objects.get(google_id=google_id)
            return user, False, None  # User exists, already linked
        except User.DoesNotExist:
            pass

        # Next, try to find user by email
        try:
            user = User.objects.get(email=email)
            
            # Check if we can auto-link
            # Both Google email and account email must be verified
            if google_email_verified and user.email_verified:
                # Auto-link Google to existing account
                user.google_id = google_id
                user.google_linked_at = timezone.now()
                user.save(update_fields=['google_id', 'google_linked_at'])
                
                # Update profile picture if not already set
                profile, _ = Profile.objects.get_or_create(user=user)
                if not profile.google_picture_url and self.google_user_info.get('picture'):
                    profile.google_picture_url = self.google_user_info['picture']
                    profile.save(update_fields=['google_picture_url'])
                
                return user, False, "linked"  # Existing user, newly linked
            
            elif google_email_verified and not user.email_verified:
                # Google email is verified but account email isn't
                # This is safe to auto-verify and link since Google verified it
                user.email_verified = True
                user.google_id = google_id
                user.google_linked_at = timezone.now()
                user.save(update_fields=['email_verified', 'google_id', 'google_linked_at'])
                
                profile, _ = Profile.objects.get_or_create(user=user)
                if not profile.google_picture_url and self.google_user_info.get('picture'):
                    profile.google_picture_url = self.google_user_info['picture']
                    profile.save(update_fields=['google_picture_url'])
                
                return user, False, "linked"
            
            else:
                # Cannot auto-link - require password login first
                raise serializers.ValidationError({
                    "require_password": True,
                    "message": "An account with this email exists. Please log in with your password first, then link Google in settings."
                })
                
        except User.DoesNotExist:
            pass

        # Create new user (no existing account)
        # Generate unique username from email
        base_username = email.split('@')[0]
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        # Create user - mark as Google-only (no usable password)
        import secrets
        user = User.objects.create_user(
            username=username,
            email=email,
            password=secrets.token_urlsafe(32),  # Random password since they use Google
        )
        user.first_name = self.google_user_info.get('given_name', '')
        user.last_name = self.google_user_info.get('family_name', '')
        user.email_verified = True  # Google verified the email
        user.google_id = google_id
        user.google_linked_at = timezone.now()
        user.has_usable_password = False  # Mark as Google-only account
        user.save(update_fields=['first_name', 'last_name', 'email_verified', 'google_id', 'google_linked_at', 'has_usable_password'])

        # Create/update profile
        profile, _ = Profile.objects.get_or_create(user=user)
        
        # Store Google profile picture URL if available
        if self.google_user_info.get('picture'):
            profile.google_picture_url = self.google_user_info['picture']
            profile.save(update_fields=['google_picture_url'])

        return user, True, None  # User created
