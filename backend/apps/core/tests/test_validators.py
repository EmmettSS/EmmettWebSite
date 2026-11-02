from __future__ import annotations

from typing import cast

import django.conf
import pytest
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.core.validators import (
    validate_media_file_signature,
    validate_media_file_size,
)

pytestmark = pytest.mark.django_db


class TestValidateMediaFileSize:
    def test_image_under_limit_passes(self, settings: object) -> None:
        cast(django.conf.LazySettings, settings).MEDIA_MAX_IMAGE_SIZE_MB = 1
        small_file = SimpleUploadedFile("tiny.png", b"x" * 100, content_type="image/png")
        validate_media_file_size(small_file, media_type="image")  # no raise

    def test_image_over_limit_raises(self, settings: object) -> None:
        cast(django.conf.LazySettings, settings).MEDIA_MAX_IMAGE_SIZE_MB = 1
        big_file = SimpleUploadedFile("big.png", b"x" * (2 * 1024 * 1024), content_type="image/png")
        with pytest.raises(ValidationError):
            validate_media_file_size(big_file, media_type="image")

    def test_document_uses_document_limit(self, settings: object) -> None:
        s = cast(django.conf.LazySettings, settings)
        s.MEDIA_MAX_IMAGE_SIZE_MB = 1
        s.MEDIA_MAX_DOCUMENT_SIZE_MB = 10
        doc = SimpleUploadedFile("doc.pdf", b"x" * (2 * 1024 * 1024), content_type="application/pdf")
        validate_media_file_size(doc, media_type="document")  # no raise؛ زیر سقف سند


class TestValidateMediaFileSignature:
    def test_valid_png_signature_passes(self) -> None:
        content = b"\x89PNG\r\n\x1a\n" + b"rest-of-file"
        file_obj = SimpleUploadedFile("photo.png", content, content_type="image/png")
        validate_media_file_signature(file_obj)  # no raise

    def test_fake_png_with_wrong_signature_raises(self) -> None:
        content = b"not-really-a-png"
        file_obj = SimpleUploadedFile("fake.png", content, content_type="image/png")
        with pytest.raises(ValidationError):
            validate_media_file_signature(file_obj)

    def test_valid_pdf_signature_passes(self) -> None:
        content = b"%PDF-1.4\n..."
        file_obj = SimpleUploadedFile("doc.pdf", content, content_type="application/pdf")
        validate_media_file_signature(file_obj)  # no raise

    def test_executable_renamed_to_jpg_is_rejected(self) -> None:
        # سرنام یک فایل اجرایی ELF لینوکس — تلاش برای جعل پسوند jpg.
        content = b"\x7fELF" + b"\x00" * 20
        file_obj = SimpleUploadedFile("malware.jpg", content, content_type="image/jpeg")
        with pytest.raises(ValidationError):
            validate_media_file_signature(file_obj)

    def test_svg_is_not_signature_checked(self) -> None:
        content = b"<svg xmlns='http://www.w3.org/2000/svg'></svg>"
        file_obj = SimpleUploadedFile("icon.svg", content, content_type="image/svg+xml")
        validate_media_file_signature(file_obj)  # no raise؛ svg از این بررسی مستثناست

    def test_webp_requires_webp_marker_at_offset_8(self) -> None:
        riff_but_not_webp = b"RIFF" + b"\x00\x00\x00\x00" + b"AVI "
        file_obj = SimpleUploadedFile("fake.webp", riff_but_not_webp, content_type="image/webp")
        with pytest.raises(ValidationError):
            validate_media_file_signature(file_obj)

    def test_valid_webp_passes(self) -> None:
        valid_webp = b"RIFF" + b"\x00\x00\x00\x00" + b"WEBP" + b"rest"
        file_obj = SimpleUploadedFile("real.webp", valid_webp, content_type="image/webp")
        validate_media_file_signature(file_obj)  # no raise
