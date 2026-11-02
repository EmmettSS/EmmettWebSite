from __future__ import annotations

from django.urls import path

from apps.accounts.views import (
    CsrfTokenView,
    FavoriteCreateView,
    FavoriteDeleteView,
    FavoriteListView,
    LoginView,
    LogoutView,
    MeView,
    RegisterView,
)

urlpatterns = [
    path("csrf/", CsrfTokenView.as_view(), name="csrf-token"),
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("favorites/", FavoriteListView.as_view(), name="favorite-list"),
    path("favorites/add/", FavoriteCreateView.as_view(), name="favorite-create"),
    path("favorites/<int:pk>/", FavoriteDeleteView.as_view(), name="favorite-delete"),
]
