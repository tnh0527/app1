from django.urls import path
from .views import (
    RegisterView, LoginView, LogoutView, GoogleAuthView, SessionCheckView,
    GoogleLinkStatusView, GoogleLinkView, GoogleUnlinkView, SetPasswordView,
    SendEmailVerificationView, VerifyEmailView, UpdatePasswordView,
    ForgotPasswordView, ResetPasswordView, DeleteAccountView
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("google/", GoogleAuthView.as_view(), name="google-auth"),
    path("session/", SessionCheckView.as_view(), name="session-check"),
    path("google/status/", GoogleLinkStatusView.as_view(), name="google-link-status"),
    path("google/link/", GoogleLinkView.as_view(), name="google-link"),
    path("google/unlink/", GoogleUnlinkView.as_view(), name="google-unlink"),
    path("set-password/", SetPasswordView.as_view(), name="set-password"),
    path("send-verification/", SendEmailVerificationView.as_view(), name="send-verification"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("update-password/", UpdatePasswordView.as_view(), name="update-password"),
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot-password"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset-password"),
    path("delete-account/", DeleteAccountView.as_view(), name="delete-account"),
]
