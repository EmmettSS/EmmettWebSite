from django.db import transaction
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from .models import EmailOutbox, JobApplication


class JobApplicationThrottle(AnonRateThrottle):
    rate = "5/hour"


class JobApplicationSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    role = serializers.CharField(max_length=120)
    cover_letter = serializers.CharField(
        max_length=5000, allow_blank=True, required=False
    )
    website = serializers.CharField(
        max_length=200, allow_blank=True, required=False, write_only=True
    )


class JobApplicationView(APIView):
    serializer_class = JobApplicationSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [JobApplicationThrottle]

    @transaction.atomic
    def post(self, request):
        serializer = JobApplicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if data.get("website"):
            return Response({"accepted": True}, status=202)
        application = JobApplication.objects.create(
            name=data["name"],
            email=data["email"],
            role=data["role"],
            cover_letter=data.get("cover_letter", ""),
        )
        EmailOutbox.objects.create(
            recipient=data["email"],
            subject="Application received",
            body="Your application was received for team review.",
        )
        return Response({"accepted": True, "id": application.pk}, status=201)
