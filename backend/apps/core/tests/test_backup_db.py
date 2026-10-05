"""تست دستور ``backup_db`` — فاز ۷، ADR-0033.

پوشش: پشتیبان SQLite (با API رسمی sqlite3)، manifest با SHA-256، آرشیو مدیا،
چرخش نسخه‌ها، حالت ``--dry-run`` و fallback به ``dumpdata`` وقتی mysqldump در
PATH نیست (سناریوی هاست اشتراکی بدون ابزار بومی MySQL).
"""

from __future__ import annotations

import gzip
import json
import sqlite3
from collections.abc import Iterator
from io import StringIO
from pathlib import Path
from typing import Any

import pytest
from django.core.management import call_command

pytestmark = pytest.mark.django_db


def _backups(directory: Path) -> list[Path]:
    return sorted(directory.glob("db-*"))


def _make_sqlite_file(tmp_path: Path) -> Path:
    """یک دیتابیس SQLite فایلی با دادهٔ نشانه می‌سازد (بدون تغییر تنظیمات)."""

    source = tmp_path / "source.sqlite3"
    connection = sqlite3.connect(str(source))
    try:
        connection.execute("CREATE TABLE marker (value TEXT)")
        connection.execute("INSERT INTO marker VALUES ('emmett-backup-probe')")
        connection.commit()
    finally:
        connection.close()
    return source


@pytest.fixture
def file_database(tmp_path: Path, settings: Any) -> Iterator[Path]:
    """``NAME`` را به یک دیتابیس فایلی می‌بندد و پس از تست بازمی‌گرداند.

    دیتابیس آزمون pytest-django درون‌حافظه‌ای و در تراکنش قفل است؛ مسیر
    پشتیبان‌گیری باید مثل پروداکشن فایلی باشد. (تغییر ``NAME`` سطح تودرتو است و
    ``settings`` fixture آن را خودکار برنمی‌گرداند.)
    """

    source = _make_sqlite_file(tmp_path)
    settings.DATABASES["default"]["NAME"] = str(source)
    yield source
    settings.DATABASES["default"]["NAME"] = ":memory:"


def _restore(archive: Path, tmp_path: Path) -> sqlite3.Connection:
    restored = tmp_path / "restored.sqlite3"
    with gzip.open(archive, "rb") as compressed, restored.open("wb") as target:
        target.write(compressed.read())
    return sqlite3.connect(str(restored))


class TestSqliteBackup:
    def test_creates_database_and_manifest(self, tmp_path: Path, file_database: Path) -> None:
        assert file_database.is_file()
        output = StringIO()

        call_command("backup_db", output_dir=str(tmp_path), skip_media=True, stdout=output)

        backups = _backups(tmp_path)
        assert len(backups) == 1
        assert backups[0].name.endswith(".sqlite3.gz")

        manifests = list(tmp_path.glob("manifest-*.json"))
        assert len(manifests) == 1
        manifest: dict[str, Any] = json.loads(manifests[0].read_text(encoding="utf-8"))
        info = manifest["artifacts"]["database"]
        assert info["size"] == backups[0].stat().st_size
        assert len(info["sha256"]) == 64
        assert manifest["database_engine"].endswith("sqlite3")
        assert manifest["django_version"]
        assert "sqlite3" in manifest["database_engine"]

    def test_backup_is_a_readable_sqlite_database(self, tmp_path: Path, file_database: Path) -> None:

        call_command("backup_db", output_dir=str(tmp_path), skip_media=True, stdout=StringIO())

        connection = _restore(_backups(tmp_path)[0], tmp_path)
        try:
            rows = connection.execute("SELECT value FROM marker").fetchall()
        finally:
            connection.close()
        assert rows == [("emmett-backup-probe",)]

    def test_locked_database_fails_with_a_clear_error(self, tmp_path: Path, file_database: Path) -> None:
        """قفل دیتابیس نباید Cron را بی‌پایان منتظر بگذارد (باگ کشف‌شده در تست)."""

        from django.core.management.base import CommandError

        from apps.core.management.commands.backup_db import Command

        locker = sqlite3.connect(str(file_database))
        locker.execute("BEGIN EXCLUSIVE")
        try:
            command = Command()
            command.SQLITE_BUSY_TIMEOUT_SECONDS = 1
            with pytest.raises(CommandError):
                command.handle(
                    output_dir=str(tmp_path / "out"),
                    keep=7,
                    skip_media=True,
                    dry_run=False,
                )
        finally:
            locker.rollback()
            locker.close()

    def test_dry_run_writes_nothing(self, tmp_path: Path) -> None:
        output = StringIO()

        call_command("backup_db", output_dir=str(tmp_path), dry_run=True, stdout=output)

        assert not list(tmp_path.iterdir())
        assert "[dry-run]" in output.getvalue()


class TestMediaBackup:
    def test_media_archive_is_included_and_described(
        self, tmp_path: Path, settings: Any, file_database: Path
    ) -> None:
        media_root = tmp_path / "media"
        media_root.mkdir()
        (media_root / "logo.txt").write_text("emmett", encoding="utf-8")
        settings.MEDIA_ROOT = media_root
        output_dir = tmp_path / "backups"

        call_command("backup_db", output_dir=str(output_dir), stdout=StringIO())

        archives = list(output_dir.glob("media-*.tar.gz"))
        assert len(archives) == 1
        manifest = json.loads(next(output_dir.glob("manifest-*.json")).read_text(encoding="utf-8"))
        assert "media" in manifest["artifacts"]

        import tarfile

        with tarfile.open(archives[0], "r:gz") as archive:
            names = archive.getnames()
        assert any(name.endswith("logo.txt") for name in names)

    def test_empty_media_directory_is_skipped(
        self, tmp_path: Path, settings: Any, file_database: Path
    ) -> None:
        empty = tmp_path / "empty-media"
        empty.mkdir()
        settings.MEDIA_ROOT = empty
        output_dir = tmp_path / "out"

        call_command("backup_db", output_dir=str(output_dir), stdout=StringIO())

        assert list(output_dir.glob("media-*.tar.gz")) == []
        manifest = json.loads(next(output_dir.glob("manifest-*.json")).read_text(encoding="utf-8"))
        assert "media" not in manifest["artifacts"]


class TestRetention:
    def _fake_old_backup(self, directory: Path, stamp: str) -> list[Path]:
        files = [
            directory / f"db-{stamp}.sqlite3.gz",
            directory / f"media-{stamp}.tar.gz",
            directory / f"manifest-{stamp}.json",
        ]
        for path in files:
            path.write_bytes(b"old")
        return files

    def test_keeps_only_the_newest_versions(self, tmp_path: Path, file_database: Path) -> None:
        old_files = self._fake_old_backup(tmp_path, "19700101-000000")
        older_files = self._fake_old_backup(tmp_path, "19700102-000000")

        call_command("backup_db", output_dir=str(tmp_path), skip_media=True, keep=1, stdout=StringIO())

        assert all(not path.exists() for path in old_files)
        assert all(not path.exists() for path in older_files)
        assert len(_backups(tmp_path)) == 1  # فقط پشتیبان تازه
        assert len(list(tmp_path.glob("manifest-*.json"))) == 1

    def test_zero_retention_keeps_everything(self, tmp_path: Path, file_database: Path) -> None:
        old_files = self._fake_old_backup(tmp_path, "19700101-000000")

        call_command("backup_db", output_dir=str(tmp_path), skip_media=True, keep=0, stdout=StringIO())

        assert all(path.exists() for path in old_files)


class TestDumpdataFallback:
    def test_falls_back_when_mysqldump_is_missing(
        self, tmp_path: Path, settings: Any, monkeypatch: Any
    ) -> None:
        from apps.accounts.tests.factories import UserFactory

        monkeypatch.setattr("shutil.which", lambda name: None)
        settings.DATABASES["default"]["ENGINE"] = "django.db.backends.mysql"
        UserFactory(email="fallback@example.com")

        call_command("backup_db", output_dir=str(tmp_path), skip_media=True, stdout=StringIO())

        backups = _backups(tmp_path)
        assert len(backups) == 1
        assert backups[0].name.endswith(".json.gz")
        with gzip.open(backups[0], "rb") as handle:
            payload = json.loads(handle.read().decode("utf-8"))
        assert isinstance(payload, list)
        assert any(record.get("model") == "accounts.user" for record in payload)
