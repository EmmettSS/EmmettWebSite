from rest_framework import serializers

from .catalog import TOOL_IDS
from .normalize import RULE_IDS


class HolidayItemSerializer(serializers.Serializer):
    date = serializers.CharField()
    label = serializers.CharField()
    label_en = serializers.CharField(allow_blank=True)
    kind = serializers.CharField()


class HolidayCalendarResponseSerializer(serializers.Serializer):
    year = serializers.IntegerField()
    version = serializers.CharField()
    source = serializers.CharField()
    coverage = serializers.CharField()
    note_fa = serializers.CharField(allow_blank=True)
    note_en = serializers.CharField(allow_blank=True)
    items = HolidayItemSerializer(many=True)


class JalaliConvertResponseSerializer(serializers.Serializer):
    jalali = serializers.CharField()
    gregorian = serializers.CharField()
    weekday_fa = serializers.CharField()
    weekday_en = serializers.CharField()
    day_of_year = serializers.IntegerField()
    leap_year = serializers.BooleanField()


class NormalizeRequestSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=50_000)
    rules = serializers.ListField(
        child=serializers.ChoiceField(choices=list(RULE_IDS)), required=False
    )

    def validate_text(self, value):
        if not value.strip():
            raise serializers.ValidationError("متن ورودی خالی است.")
        return value


class NormalizeChangeSerializer(serializers.Serializer):
    rule = serializers.CharField()
    count = serializers.IntegerField()
    samples = serializers.ListField(child=serializers.CharField())


class NormalizeResponseSerializer(serializers.Serializer):
    normalized = serializers.CharField()
    changes = NormalizeChangeSerializer(many=True)
    total = serializers.IntegerField()
    rules_version = serializers.CharField()


class ShareCreateSerializer(serializers.Serializer):
    tool = serializers.ChoiceField(choices=list(TOOL_IDS))
    locale = serializers.ChoiceField(choices=["fa", "en"], default="fa")
    summary_fa = serializers.CharField(max_length=400, allow_blank=True)
    summary_en = serializers.CharField(max_length=400, allow_blank=True)
    params = serializers.DictField(child=serializers.CharField(max_length=400), required=False)

    def validate_params(self, value):
        if len(value) > 12:
            raise serializers.ValidationError("تعداد پارامترها بیش از حد مجاز است.")
        if sum(len(f"{key}{item}") for key, item in value.items()) > 2_000:
            raise serializers.ValidationError("حجم پارامترها بیش از حد مجاز است.")
        return value


class ShareResponseSerializer(serializers.Serializer):
    share_id = serializers.CharField()
    path = serializers.CharField()
    permanent = serializers.BooleanField()
    noindex = serializers.BooleanField()


class ShareDetailSerializer(serializers.Serializer):
    share_id = serializers.CharField()
    tool = serializers.CharField()
    locale = serializers.CharField()
    summary_fa = serializers.CharField(allow_blank=True)
    summary_en = serializers.CharField(allow_blank=True)
    params = serializers.DictField()
    created_at = serializers.DateTimeField()


class ToolUsageSerializer(serializers.Serializer):
    tool = serializers.ChoiceField(choices=list(TOOL_IDS))
    locale = serializers.ChoiceField(choices=["fa", "en"], default="fa")
    completed = serializers.BooleanField(default=False)


class ToolUsageResponseSerializer(serializers.Serializer):
    accepted = serializers.BooleanField()
    stored = serializers.BooleanField()


class ToolCatalogItemSerializer(serializers.Serializer):
    id = serializers.CharField()
    title = serializers.CharField()
    title_fa = serializers.CharField()
    title_en = serializers.CharField()
    status = serializers.CharField()
    version = serializers.CharField()
    capability = serializers.CharField()
    path = serializers.CharField()
    evidence_url = serializers.CharField()


class ToolCatalogResponseSerializer(serializers.Serializer):
    items = ToolCatalogItemSerializer(many=True)
    count = serializers.IntegerField()
