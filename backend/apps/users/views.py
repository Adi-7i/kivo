"""Views for user registration, authentication, session lifecycle, and profile."""

from __future__ import annotations

from django.contrib.auth import login, logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from drf_spectacular.utils import OpenApiExample, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.serializers import (
    UserLoginSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
)
from apps.users.throttling import LoginRateThrottle, RegisterRateThrottle


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CSRFTokenView(APIView):
    """Endpoint for web clients to obtain an initial CSRF cookie."""

    permission_classes = [AllowAny]

    @extend_schema(
        tags=["auth"],
        summary="Obtain CSRF cookie",
        description="Sets the standard Django csrftoken cookie for subsequent state-changing requests.",
        request=None,
        responses={
            200: OpenApiResponse(description="CSRF cookie set successfully"),
        },
    )
    def get(self, request: Request) -> Response:
        """Return confirmation that CSRF cookie has been attached to response."""
        return Response({"detail": "CSRF cookie set."}, status=status.HTTP_200_OK)


@method_decorator(csrf_protect, name="dispatch")
class RegisterView(APIView):
    """API endpoint for new user registration."""

    permission_classes = [AllowAny]
    throttle_classes = [RegisterRateThrottle]

    @extend_schema(
        tags=["auth"],
        summary="Register a new user account",
        description="Creates a new user account with email, name, and password. Returns the created public user profile.",
        request=UserRegistrationSerializer,
        examples=[
            OpenApiExample(
                "Valid Registration Example",
                value={
                    "email": "user@example.com",
                    "name": "Aditya Kumar",
                    "password": "SecurePassword123!",
                },
                request_only=True,
            ),
        ],
        responses={
            201: UserProfileSerializer,
            400: OpenApiResponse(
                description="Validation error (e.g. duplicate email or weak password)."
            ),
            429: OpenApiResponse(description="Too many registration attempts. Throttled."),
        },
    )
    def post(self, request: Request) -> Response:
        """Handle user registration request."""
        serializer = UserRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        response_serializer = UserProfileSerializer(user)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    """API endpoint for user authentication and session establishment."""

    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    @extend_schema(
        tags=["auth"],
        summary="Log in user and establish session",
        description="Authenticates credentials, rotates session key to prevent session fixation, and sets HttpOnly cookie.",
        request=UserLoginSerializer,
        examples=[
            OpenApiExample(
                "Valid Login Example",
                value={
                    "email": "user@example.com",
                    "password": "SecurePassword123!",
                },
                request_only=True,
            ),
        ],
        responses={
            200: UserProfileSerializer,
            400: OpenApiResponse(description="Invalid email or password credentials."),
            429: OpenApiResponse(description="Too many login attempts. Throttled."),
        },
    )
    def post(self, request: Request) -> Response:
        """Handle user login request and establish session."""
        serializer = UserLoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        # Cycle key internally to prevent session fixation attacks
        login(request, user)

        response_serializer = UserProfileSerializer(user)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """API endpoint to terminate the active user session."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["auth"],
        summary="Log out active session",
        description="Terminates active authenticated session and invalidates session cookies.",
        request=None,
        responses={
            204: OpenApiResponse(description="Logged out successfully. No content returned."),
            401: OpenApiResponse(description="Authentication required to log out."),
        },
    )
    def post(self, request: Request) -> Response:
        """Log out user and flush active session."""
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """API endpoint to inspect current authenticated user profile."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["auth"],
        summary="Get current user profile",
        description="Returns the profile of the currently authenticated user. Never exposes internal credentials or flags.",
        responses={
            200: UserProfileSerializer,
            401: OpenApiResponse(description="Authentication credentials were not provided."),
        },
    )
    def get(self, request: Request) -> Response:
        """Return the current user profile."""
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
