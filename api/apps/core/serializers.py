from rest_framework import serializers


class ToolCatalogResponseSerializer(serializers.Serializer):
    items = serializers.ListField(child=serializers.DictField())
    count = serializers.IntegerField()
