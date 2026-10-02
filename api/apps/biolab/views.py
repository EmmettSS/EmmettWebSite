"""Public biolab endpoints (F-09).

Contract with the card:
  * the browser is the primary compute surface; these endpoints exist for the Static Bridge,
    for share links and for clients that prefer the server;
  * a submitted sequence is **never** stored or logged — the analysis happens in memory and
    the response is returned immediately;
  * the server limit is 500 KB (the browser allows 1 MB), and any payload that looks like real
    patient data is rejected with a bilingual 400.
"""

from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.tools.views import _bad_request

from . import logic
from .fhir import sample_bundle, validate_bundle
from .serializers import (
    BioAnalyzeRequestSerializer,
    BioAnalyzeResponseSerializer,
    CodonTablesResponseSerializer,
    FhirSamplesResponseSerializer,
)


class BioWriteThrottle(AnonRateThrottle):
    """Sequence analysis is cheap but not free; keep the public surface polite."""

    rate = "60/hour"


@extend_schema(request=BioAnalyzeRequestSerializer, responses=BioAnalyzeResponseSerializer)
class BioAnalyzeView(APIView):
    serializer_class = BioAnalyzeRequestSerializer
    permission_classes = []
    authentication_classes = []
    throttle_classes = [BioWriteThrottle]

    def post(self, request):
        payload = request.data if isinstance(request.data, dict) else {}
        offending = logic.contains_patient_data(payload)
        if offending:
            return _bad_request(
                f"فیلد «{offending}» نشانهٔ دادهٔ بیمار واقعی است. این ابزار فقط برای پژوهش و آموزش است و دادهٔ بیمار نمی‌پذیرد.",
                f"The field “{offending}” looks like real patient data. This tool is for research and education and does not accept patient data.",
            )
        raw = payload.get("sequence")
        if not isinstance(raw, str):
            return _bad_request("توالی ارسال نشده است.", "No sequence was provided.")
        try:
            sequence, header = logic.sanitize_sequence(raw)
            options = payload.get("options") if isinstance(payload.get("options"), dict) else {}
            result = logic.analyze(sequence, options)
        except logic.SequenceError as error:
            return _bad_request(error.message_fa, error.message_en)
        # No logging, no persistence: the response is the only place the sequence exists.
        result["header"] = header
        result["mode"] = "server"
        return Response(result, status=status.HTTP_200_OK)


@extend_schema(responses=CodonTablesResponseSerializer)
class CodonTablesView(APIView):
    serializer_class = CodonTablesResponseSerializer
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        return Response(
            {
                "tables": [
                    {
                        "id": table_id,
                        "starts": list(table["starts"]),  # type: ignore[index]
                        "stops": list(table["stops"]),  # type: ignore[index]
                        "codons": table["table"],  # type: ignore[index]
                    }
                    for table_id, table in logic.CODON_TABLES.items()
                ],
                "default": "standard",
                "max_sequence_length": logic.MAX_SEQUENCE_LENGTH,
            }
        )


@extend_schema(responses=FhirSamplesResponseSerializer)
class FhirSamplesView(APIView):
    serializer_class = FhirSamplesResponseSerializer
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        bundle = sample_bundle()
        resources = [entry["resource"] for entry in bundle["entry"]]  # type: ignore[index]
        return Response({**bundle, "validation": validate_bundle(resources)})
