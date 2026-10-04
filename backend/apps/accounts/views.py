from __future__ import annotations

from django.apps import apps as django_apps
from django.contrib.auth import authenticate, login, logout
from django.contrib.contenttypes.models import ContentType
from django.db.models import QuerySet
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
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
from apps.core.models import log_action
from apps.core.throttling import AuthRateThrottle
from apps.core.utils.request import get_client_ip

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

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request: Request) -> Response:
        return Response({"detail": "csrf cookie set"})


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    @extend_schema(request=RegisterSerializer, responses={201: MeSerializer})
    def post(self, request: Request) -> Response:
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        login(request._request, user)
        log_action(
            action="auth.register",
            actor=user,
            target=user,
            ip_address=get_client_ip(request._request),
            user_agent=request._request.META.get("HTTP_USER_AGENT", "")[:500],
        )
        return Response(MeSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    @extend_schema(request=LoginSerializer, responses={200: MeSerializer})
    def post(self, request: Request) -> Response:
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        user = authenticate(
            request._request,
            username=email,
            password=serializer.validated_data["password"],
        )
        ip_address = get_client_ip(request._request)
        user_agent = request._request.META.get("HTTP_USER_AGENT", "")[:500]
        if user is None:
            # قانون ۱۶ / ADR-0013: ورود ناموفق صراحتاً نمونهٔ رویداد حساس است.
            # ``target`` خالی می‌ماند چون نمی‌دانیم ایمیل متعلق به کاربر واقعی
            # است یا نه (جلوگیری از افشای وجود/عدم‌وجود حساب در AuditLog).
            log_action(
                action="auth.login_failed",
                metadata={"email": email},
                ip_address=ip_address,
                user_agent=user_agent,
            )
            return Response({"detail": "ایمیل یا رمز عبور نادرست است."}, status=status.HTTP_401_UNAUTHORIZED)
        login(request._request, user)
        log_action(
            action="auth.login_succeeded",
            actor=user,
            target=user,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return Response(MeSerializer(user).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={204: None})
    def post(self, request: Request) -> Response:
        user = self._user(request)
        log_action(
            action="auth.logout",
            actor=user,
            target=user,
            ip_address=get_client_ip(request._request),
            user_agent=request._request.META.get("HTTP_USER_AGENT", "")[:500],
        )
        logout(request._request)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @staticmethod
    def _user(request: Request) -> User:
        assert isinstance(request.user, User)
        return request.user


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=MeSerializer)
    def get(self, request: Request) -> Response:
        user = self._user(request)
        return Response(MeSerializer(user).data)

    @extend_schema(request=MeUpdateSerializer, responses=MeSerializer)
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
        if getattr(self, "swagger_fake_view", False):  # pragma: no cover - فقط تولید اسکیمای OpenAPI
            empty: QuerySet[Favorite] = Favorite.objects.none()
            return empty
        queryset: QuerySet[Favorite] = Favorite.objects.filter(user=self.request.user)
        return queryset.select_related("content_type")


class FavoriteCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=FavoriteCreateSerializer, responses={201: FavoriteSerializer})
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

    @extend_schema(responses={204: None})
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
