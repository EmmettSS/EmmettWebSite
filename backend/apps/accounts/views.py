from __future__ import annotations

from django.apps import apps as django_apps
from django.contrib.auth import authenticate, login, logout
from django.contrib.contenttypes.models import ContentType
from django.db.models import QuerySet
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Favorite, User
from apps.accounts.serializers import (
    FavoriteCreateSerializer,
    FavoriteSerializer,
    LoginSerializer,
    MeSerializer,
    MeUpdateSerializer,
    RegisterSerializer,
)
from apps.core.throttling import AuthRateThrottle

#: نگاشت رشتهٔ عمومی content_type (همان رشته‌های استفاده‌شده در ``apps.core.search``)
#: به مدل واقعی — جلوگیری از پذیرفتن مسیر پایتونی دلخواه از کاربر.
_FAVORITABLE_MODELS: dict[str, str] = {
    "service": "services.Service",
    "project": "portfolio.Project",
    "course": "academy.Course",
    "blog_post": "blog.BlogPost",
}


@method_decorator(ensure_csrf_cookie, name="get")
class CsrfTokenView(APIView):
    """بازدید اول فرانت از این endpoint باید باشد تا کوکی ``csrftoken`` ست شود."""

    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        return Response({"detail": "csrf cookie set"})


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request: Request) -> Response:
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        login(request._request, user)
        return Response(MeSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request: Request) -> Response:
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request._request,
            username=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            return Response({"detail": "ایمیل یا رمز عبور نادرست است."}, status=status.HTTP_401_UNAUTHORIZED)
        login(request._request, user)
        return Response(MeSerializer(user).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        logout(request._request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        user = self._user(request)
        return Response(MeSerializer(user).data)

    def patch(self, request: Request) -> Response:
        user = self._user(request)
        serializer = MeUpdateSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(MeSerializer(user).data)

    @staticmethod
    def _user(request: Request) -> User:
        assert isinstance(request.user, User)
        return request.user


class FavoriteListView(ListAPIView[Favorite]):
    permission_classes = [IsAuthenticated]
    serializer_class = FavoriteSerializer

    def get_queryset(self) -> QuerySet[Favorite]:
        queryset: QuerySet[Favorite] = Favorite.objects.filter(user=self.request.user)
        return queryset.select_related("content_type")


class FavoriteCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = FavoriteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        model_label = _FAVORITABLE_MODELS[serializer.validated_data["content_type"]]
        model = django_apps.get_model(model_label)
        target = model.objects.filter(public_id=serializer.validated_data["public_id"]).first()
        if target is None:
            return Response({"detail": "محتوای موردنظر پیدا نشد."}, status=status.HTTP_404_NOT_FOUND)

        content_type = ContentType.objects.get_for_model(model)
        favorite, _created = Favorite.objects.get_or_create(
            user=request.user, content_type=content_type, object_id=target.pk
        )
        return Response(FavoriteSerializer(favorite).data, status=status.HTTP_201_CREATED)


class FavoriteDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request: Request, pk: int) -> Response:
        deleted, _ = Favorite.objects.filter(pk=pk, user=request.user).delete()
        if not deleted:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


__all__ = [
    "CsrfTokenView",
    "RegisterView",
    "LoginView",
    "LogoutView",
    "MeView",
    "FavoriteListView",
    "FavoriteCreateView",
    "FavoriteDeleteView",
]
