"""URL patterns for user authentication and session management."""

from __future__ import annotations

from django.urls import path

from apps.users.views import (
    CSRFTokenView,
    LoginView,
    LogoutView,
    MeView,
    RegisterView,
)

app_name = "users"

urlpatterns = [
    path("csrf/", CSRFTokenView.as_view(), name="auth-csrf"),
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),
]
