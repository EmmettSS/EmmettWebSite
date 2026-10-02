from rest_framework import serializers


class SiteHealthSerializer(serializers.Serializer):
    status = serializers.CharField()
    version = serializers.CharField()
    db = serializers.CharField()
    uptime = serializers.IntegerField()
