from django.contrib.auth import login, logout
from rest_framework import status, generics, views
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.template.loader import render_to_string
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
import secrets
import logging
from .serializers import RegisterSerializer, LoginSerializer, GoogleAuthSerializer
from .models import User


class LoginRateThrottle(AnonRateThrottle):
    """Custom throttle for login attempts to prevent brute force attacks."""
    rate = '10/minute'


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            return Response(
                {"msg": "User registered successfully."}, status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(views.APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    @method_decorator(ensure_csrf_cookie)
    def post(self, request):
        logger = logging.getLogger(__name__)
        # Log whether the CSRF header is present for debugging (do not log token values in prod)
        logger.info("LoginView: X-CSRFToken header present: %s", bool(request.headers.get('X-CSRFToken')))
        logger.info("LoginView: META HTTP_X_CSRFTOKEN present: %s", bool(request.META.get('HTTP_X_CSRFTOKEN')))
        serializer = LoginSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            user = serializer.validated_data["user"]
            login(request, user)
            remember_me = bool(request.data.get("remember_me"))

            # If remember_me is false, expire the session when the browser closes.
            # Otherwise, use the default session age (persistent cookie by default).
            request.session.set_expiry(None if remember_me else 0)
            
            # Rotate session ID after login for security
            request.session.cycle_key()
            
            return Response({"msg": "Login successful."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(views.APIView):
    def post(self, request):
        logout(request)
        response = Response({"msg": "Logged out successfully!"}, status=status.HTTP_200_OK)
        # Clear the session cookie
        response.delete_cookie('sessionid')
        return response


class GoogleAuthView(views.APIView):
    """Handle Google OAuth sign-in/sign-up."""
    permission_classes = [AllowAny]

    def post(self, request):
        logger = logging.getLogger(__name__)
        logger.info("GoogleAuthView: X-CSRFToken header present: %s", bool(request.headers.get('X-CSRFToken')))
        logger.info("GoogleAuthView: META HTTP_X_CSRFTOKEN present: %s", bool(request.META.get('HTTP_X_CSRFTOKEN')))
        serializer = GoogleAuthSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user, is_new_user, link_status = serializer.create_or_get_user()
                
                if not user.is_active:
                    return Response(
                        {"error": "User account is disabled."},
                        status=status.HTTP_403_FORBIDDEN
                    )
                
                # Log the user in
                login(request, user)
                
                # Set session expiry (persistent by default for Google users)
                request.session.set_expiry(None)
                
                response_data = {
                    "msg": "Google authentication successful.",
                    "is_new_user": is_new_user,
                    "user": {
                        "username": user.username,
                        "email": user.email,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                    }
                }
                
                # Add linking message if account was just linked
                if link_status == "linked":
                    response_data["account_linked"] = True
                    response_data["link_message"] = "We found an existing account with this email. Your Google account has been linked."
                
                return Response(response_data, status=status.HTTP_200_OK)
                
            except Exception as e:
                error_data = getattr(e, 'detail', str(e))
                if isinstance(error_data, dict):
                    return Response(error_data, status=status.HTTP_400_BAD_REQUEST)
                return Response(
                    {"error": f"Authentication failed: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class SessionCheckView(views.APIView):
    """Check if the current session is valid and ensure a CSRF cookie is set."""
    permission_classes = [AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            return Response({
                "authenticated": True,
                "user": {
                    "username": request.user.username,
                    "email": request.user.email,
                }
            }, status=status.HTTP_200_OK)
        return Response(
            {"authenticated": False},
            status=status.HTTP_401_UNAUTHORIZED
        )


class GoogleLinkStatusView(views.APIView):
    """Get Google link status for the current user."""
    
    def get(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        user = request.user
        return Response({
            "google_linked": bool(user.google_id),
            "google_linked_at": user.google_linked_at,
            "has_password": user.has_usable_password,
            "email_verified": user.email_verified,
        }, status=status.HTTP_200_OK)


class GoogleLinkView(views.APIView):
    """Link Google account to existing user account."""
    
    def post(self, request):
        """Link Google account using credential token."""
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        user = request.user
        
        # Check if already linked
        if user.google_id:
            return Response(
                {"error": "A Google account is already linked to this account."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate the Google credential
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        from django.conf import settings
        from django.utils import timezone
        
        credential = request.data.get('credential')
        if not credential:
            return Response(
                {"error": "Google credential is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Ensure server is configured with the expected Google client ID
            client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '')
            if not client_id:
                return Response(
                    {"error": "Server misconfiguration: GOOGLE_OAUTH_CLIENT_ID is not set on the backend."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            idinfo = id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                client_id
            )
            
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                return Response(
                    {"error": "Invalid token issuer."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            google_email = idinfo.get('email')
            google_id = idinfo.get('sub')
            email_verified = idinfo.get('email_verified', False)
            
            if not email_verified:
                return Response(
                    {"error": "Google email must be verified to link account."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if this Google account is already linked to another user
            from .models import User
            existing_link = User.objects.filter(google_id=google_id).exclude(pk=user.pk).first()
            if existing_link:
                return Response(
                    {"error": "This Google account is already linked to another user."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if emails match (security requirement)
            if google_email.lower() != user.email.lower():
                return Response(
                    {"error": "Google email must match your account email to link."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Link the Google account
            user.google_id = google_id
            user.google_linked_at = timezone.now()
            user.email_verified = True  # Google verified the email
            user.save(update_fields=['google_id', 'google_linked_at', 'email_verified'])
            
            # Update profile picture if available
            from profile_app.models import Profile
            profile, _ = Profile.objects.get_or_create(user=user)
            if idinfo.get('picture') and not profile.google_picture_url:
                profile.google_picture_url = idinfo['picture']
                profile.save(update_fields=['google_picture_url'])
            
            return Response({
                "msg": "Google account linked successfully.",
                "google_linked_at": user.google_linked_at,
            }, status=status.HTTP_200_OK)
            
        except ValueError as e:
            return Response(
                {"error": f"Invalid Google token: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )


class GoogleUnlinkView(views.APIView):
    """Unlink Google account from user account."""
    
    def post(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        user = request.user
        
        # Check if Google is linked
        if not user.google_id:
            return Response(
                {"error": "No Google account is linked."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Can only unlink if user has a usable password
        if not user.has_usable_password:
            return Response(
                {"error": "Cannot unlink Google. Please set a password first to maintain account access."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Unlink Google
        user.google_id = None
        user.google_linked_at = None
        user.save(update_fields=['google_id', 'google_linked_at'])
        
        # Clear Google picture URL
        from profile_app.models import Profile
        try:
            profile = user.profile
            profile.google_picture_url = ''
            profile.save(update_fields=['google_picture_url'])
        except Profile.DoesNotExist:
            pass
        
        return Response({
            "msg": "Google account unlinked successfully."
        }, status=status.HTTP_200_OK)


class SetPasswordView(views.APIView):
    """Set password for Google-only accounts."""
    
    def post(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        user = request.user
        new_password = request.data.get('new_password')
        
        if not new_password:
            return Response(
                {"error": "New password is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(new_password) < 8:
            return Response(
                {"error": "Password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        import re
        if not re.search(r'[a-zA-Z]', new_password):
            return Response(
                {"error": "Password must contain at least one letter."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Set the password
        user.set_password(new_password)
        user.has_usable_password = True
        user.save(update_fields=['password', 'has_usable_password'])
        
        # Re-login the user (password change invalidates session)
        login(request, user)
        
        return Response({
            "msg": "Password set successfully. You can now log in with email/password."
        }, status=status.HTTP_200_OK)


class SendEmailVerificationView(views.APIView):
    """Send email verification link to user's email."""
    
    def post(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        user = request.user
        
        if user.email_verified:
            return Response(
                {"error": "Email is already verified."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate verification token
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # Build verification URL (frontend URL)
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        verification_url = f"{frontend_url}/verify-email/{uid}/{token}"
        
        # Send verification email
        subject = "Verify your email - Nexus"
        message = f"""
Hello {user.first_name or user.username},

Please verify your email address by clicking the link below:

{verification_url}

This link will expire in 24 hours.

If you didn't request this verification, please ignore this email.

Best regards,
The Nexus Team
"""
        
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
            
            return Response({
                "msg": "Verification email sent. Please check your inbox."
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": "Failed to send verification email. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VerifyEmailView(views.APIView):
    """Verify email using token from email link."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        uid = request.data.get('uid')
        token = request.data.get('token')
        
        if not uid or not token:
            return Response(
                {"error": "Invalid verification link."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"error": "Invalid verification link."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if user.email_verified:
            return Response({
                "msg": "Email is already verified."
            }, status=status.HTTP_200_OK)
        
        if default_token_generator.check_token(user, token):
            user.email_verified = True
            user.save(update_fields=['email_verified'])
            
            return Response({
                "msg": "Email verified successfully!"
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {"error": "Verification link has expired or is invalid."},
                status=status.HTTP_400_BAD_REQUEST
            )


class UpdatePasswordView(views.APIView):
    """Update password for authenticated users."""
    
    def post(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        
        # For users with password, require current password
        if user.has_usable_password:
            if not current_password:
                return Response(
                    {"error": "Current password is required."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not user.check_password(current_password):
                return Response(
                    {"error": "Current password is incorrect."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if not new_password:
            return Response(
                {"error": "New password is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(new_password) < 8:
            return Response(
                {"error": "Password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        import re
        if not re.search(r'[a-zA-Z]', new_password):
            return Response(
                {"error": "Password must contain at least one letter."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Set the new password
        user.set_password(new_password)
        user.has_usable_password = True
        user.save(update_fields=['password', 'has_usable_password'])
        
        # Re-login the user (password change invalidates session)
        login(request, user)
        
        return Response({
            "msg": "Password updated successfully."
        }, status=status.HTTP_200_OK)


class ForgotPasswordView(views.APIView):
    """Send password reset email."""
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]
    
    def post(self, request):
        email = request.data.get('email')
        
        if not email:
            return Response(
                {"error": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Don't reveal if email exists for security
            return Response({
                "msg": "If an account with this email exists, you will receive a password reset link."
            }, status=status.HTTP_200_OK)
        
        # Generate password reset token
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # Build reset URL (frontend URL)
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        reset_url = f"{frontend_url}/reset-password/{uid}/{token}"
        
        # Send reset email
        subject = "Reset your password - Nexus"
        message = f"""
Hello {user.first_name or user.username},

You requested to reset your password. Click the link below to create a new password:

{reset_url}

This link will expire in 24 hours.

If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

Best regards,
The Nexus Developer
"""
        
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
        except Exception as e:
            # Log the error but don't reveal it to the user
            print(f"Failed to send password reset email: {e}")
        
        return Response({
            "msg": "If an account with this email exists, you will receive a password reset link."
        }, status=status.HTTP_200_OK)


class ResetPasswordView(views.APIView):
    """Reset password using token from email link."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        uid = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        
        if not uid or not token:
            return Response(
                {"error": "Invalid reset link."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not new_password:
            return Response(
                {"error": "New password is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(new_password) < 8:
            return Response(
                {"error": "Password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        import re
        if not re.search(r'[a-zA-Z]', new_password):
            return Response(
                {"error": "Password must contain at least one letter."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"error": "Invalid reset link."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if default_token_generator.check_token(user, token):
            user.set_password(new_password)
            user.has_usable_password = True
            user.save(update_fields=['password', 'has_usable_password'])
            
            return Response({
                "msg": "Password reset successfully. You can now log in with your new password."
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {"error": "Reset link has expired or is invalid."},
                status=status.HTTP_400_BAD_REQUEST
            )


class DeleteAccountView(views.APIView):
    """
    Allow authenticated users to delete their own account.
    
    This will cascade delete all related data:
    - Profile
    - Calendars and Events
    - Financial Accounts and Snapshots
    - Subscriptions
    - Trips
    - Saved Weather Locations
    """
    
    def delete(self, request):
        user = request.user
        
        if not user.is_authenticated:
            return Response(
                {"error": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Optional: Require password confirmation for extra security
        password = request.data.get('password')
        if password and not user.check_password(password):
            return Response(
                {"error": "Incorrect password."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Log out before deletion
        logout(request)
        
        # Delete the user (CASCADE will handle all related data)
        username = user.username
        user.delete()
        
        return Response(
            {"msg": f"Account '{username}' and all associated data have been permanently deleted."},
            status=status.HTTP_200_OK
        )
