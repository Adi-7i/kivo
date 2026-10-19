"""Custom User model for Kivo."""

from __future__ import annotations

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.users.managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    """Custom User model using email as unique identifier for Kivo."""

    email = models.EmailField(
        _("email address"),
        unique=True,
        db_index=True,
        max_length=255,
        help_text=_("Required. Primary unique identity for authentication."),
    )
    name = models.CharField(
        _("full name"),
        max_length=150,
        blank=True,
        default="",
        help_text=_("Optional display or full name of the user."),
    )
    is_staff = models.BooleanField(
        _("staff status"),
        default=False,
        help_text=_("Designates whether the user can log into the Django admin site."),
    )
    is_active = models.BooleanField(
        _("active"),
        default=True,
        help_text=_("Designates whether this user should be treated as active."),
    )
    date_joined = models.DateTimeField(
        _("date joined"),
        default=timezone.now,
    )

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        verbose_name = _("user")
        verbose_name_plural = _("users")
        db_table = "users"
        ordering = ["-date_joined"]
        constraints = [models.UniqueConstraint(Lower("email"), name="users_email_ci_unique")]

    def __str__(self) -> str:
        return self.email

    def clean(self) -> None:
        super().clean()
        self.email = self.__class__.objects.normalize_email(self.email)
