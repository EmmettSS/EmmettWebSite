"""Request/response schemas for the public biolab endpoints (F-09).

These exist so the OpenAPI document (`manage.py spectacular`) documents the surface instead of
silently dropping it: the CI job runs the schema command with `--fail-on-warn`, so a public
endpoint without a declared serializer is a build failure on purpose.
"""

from rest_framework import serializers


class BioOptionsSerializer(serializers.Serializer):
    """Analysis knobs; every field has a server-side default in `logic.resolve_options`."""

    table = serializers.CharField(required=False)
    min_orf_aa = serializers.IntegerField(required=False, min_value=1)
    both_strands = serializers.BooleanField(required=False)


class BioAnalyzeRequestSerializer(serializers.Serializer):
    sequence = serializers.CharField(
        max_length=500_000,
        help_text="FASTA or raw nucleotide sequence (ACGTN). Never stored or logged.",
    )
    options = BioOptionsSerializer(required=False)


class CompositionSerializer(serializers.Serializer):
    length = serializers.IntegerField()
    counts = serializers.DictField(child=serializers.IntegerField())
    gc_percent = serializers.FloatField()
    at_percent = serializers.FloatField()
    gc_skew = serializers.FloatField()
    ambiguous = serializers.IntegerField()


class MeltingTemperatureSerializer(serializers.Serializer):
    wallace = serializers.FloatField()
    gc_formula = serializers.FloatField()
    salt_molar = serializers.FloatField()
    method = serializers.CharField()


class OrfSerializer(serializers.Serializer):
    start = serializers.IntegerField()
    end = serializers.IntegerField()
    frame = serializers.IntegerField()
    strand = serializers.CharField()
    length_nt = serializers.IntegerField()
    length_aa = serializers.IntegerField()
    protein = serializers.CharField()
    complete = serializers.BooleanField()


class CodonUsageRowSerializer(serializers.Serializer):
    codon = serializers.CharField()
    amino = serializers.CharField()
    count = serializers.IntegerField()
    per_thousand = serializers.FloatField()


class BioAnalyzeResponseSerializer(serializers.Serializer):
    length = serializers.IntegerField()
    composition = CompositionSerializer()
    molecular_weight_da = serializers.FloatField()
    melting_temperature = MeltingTemperatureSerializer()
    orfs = OrfSerializer(many=True)
    longest_orf = OrfSerializer(allow_null=True)
    codon_usage = CodonUsageRowSerializer(many=True)
    reverse_complement_preview = serializers.CharField()
    protein_preview = serializers.CharField()
    options = BioOptionsSerializer()
    header = serializers.CharField(allow_blank=True, required=False)
    mode = serializers.CharField(required=False)


class CodonTableSerializer(serializers.Serializer):
    id = serializers.CharField()
    starts = serializers.ListField(child=serializers.CharField())
    stops = serializers.ListField(child=serializers.CharField())
    codons = serializers.DictField(child=serializers.CharField())


class CodonTablesResponseSerializer(serializers.Serializer):
    tables = CodonTableSerializer(many=True)
    default = serializers.CharField()
    max_sequence_length = serializers.IntegerField()


class FhirSamplesResponseSerializer(serializers.Serializer):
    """Loosely typed on purpose: the payload *is* a FHIR bundle, validated by `fhir.py`."""

    resourceType = serializers.CharField()
    type = serializers.CharField()
    entry = serializers.ListField(child=serializers.DictField())
    validation = serializers.DictField()
