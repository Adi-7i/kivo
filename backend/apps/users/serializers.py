"""Serializers for user registration, authentication, and profile representation."""

from __future__ import annotations

from typing import Any

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.users.models import User
from apps.users.services import authenticate_user, register_user


class UserProfileSerializer(serializers.ModelSerializer[User]):
    """Public profile serializer exposing safe, read-only user attributes."""

    class Meta:
        model = User
        fields = ("id", "email", "name", "date_joined")
        read_only_fields = ("id", "email", "name", "date_joined")


class UserRegistrationSerializer(serializers.Serializer[User]):
    """Serializer validating incoming registration requests and delegating creation."""

    id = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(max_length=255, required=True)
    name = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
        default="",
    )
    password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=10,
        style={"input_type": "password"},
        help_text="Must be at least 10 characters and cannot be entirely numeric or common.",
    )
    date_joined = serializers.DateTimeField(read_only=True)

    def validate_email(self, value: str) -> str:
        """Ensure email uniqueness and canonical lowercase formatting."""
        clean_email = User.objects.normalize_email(value).strip().lower()
        if User.objects.filter(email__iexact=clean_email).exists():
            raise serializers.ValidationError("A user with this email address already exists.")
        return clean_email

    def validate_password(self, value: str) -> str:
        """Validate password against Django configured security validators."""
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value

    def create(self, validated_data: dict[str, Any]) -> User:
        """Create new user instance via the domain service."""
        try:
            return register_user(
                email=validated_data["email"],
                password=validated_data["password"],
                name=validated_data.get("name", ""),
            )
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict"):
                raise serializers.ValidationError(exc.message_dict) from exc
            raise serializers.ValidationError(exc.messages) from exc


class UserLoginSerializer(serializers.Serializer[dict[str, Any]]):
    """Serializer validating user login credentials."""

    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
    )

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        """Authenticate user against backend credentials."""
        email = attrs.get("email", "")
        password = attrs.get("password", "")
        request = self.context.get("request")

        user = authenticate_user(request=request, email=email, password=password)
        if user is None:
            raise serializers.ValidationError(
                {"detail": "Unable to log in with provided credentials."},
                code="authentication_failed",
            )

        attrs["user"] = user
        return attrs
