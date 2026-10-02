from rest_framework import serializers


class ContentSerializer(serializers.Serializer):
    slug = serializers.CharField()
    slug_fa = serializers.CharField(allow_blank=True)
    title = serializers.CharField()
    body = serializers.CharField()
    published_at = serializers.DateTimeField(allow_null=True, required=False)


class SiteConfigSerializer(serializers.Serializer):
    brand_en = serializers.CharField()
    brand_fa = serializers.CharField()
    telegram_handle = serializers.CharField()
    building_fa = serializers.CharField()
    building_en = serializers.CharField()
    # Optional lab throughput (F-09 tab 3). `null` means "not configured" and is rendered as
    # such; the API never fabricates a default.
    lab_samples_per_day = serializers.IntegerField(allow_null=True)
    lab_turnaround_hours = serializers.IntegerField(allow_null=True)
    lab_tests_per_sample = serializers.IntegerField(allow_null=True)


class TeamSerializer(serializers.Serializer):
    name_fa = serializers.CharField()
    name_en = serializers.CharField()
    role_fa = serializers.CharField()
    role_en = serializers.CharField()
