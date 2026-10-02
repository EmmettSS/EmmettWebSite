from django.urls import path

from .views import BioAnalyzeView, CodonTablesView, FhirSamplesView

urlpatterns = [
    path("public/bio/analyze/", BioAnalyzeView.as_view(), name="bio-analyze"),
    path("public/bio/codon-tables/", CodonTablesView.as_view(), name="bio-codon-tables"),
    path("public/bio/fhir/samples/", FhirSamplesView.as_view(), name="bio-fhir-samples"),
]
