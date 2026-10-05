"""پشتیبان‌گیری دیتابیس (+ مدیا) — فاز ۷، ADR-0033.

چرا دستور مدیریتی و نه سرویس خارجی؟ چون محیط هدف «هاست اشتراکی cPanel» است؛
ابزار بومی این محیط Cron + فضای فایل است. این دستور:

- روی **MySQL** از ``mysqldump`` (اگر در PATH باشد) استفاده می‌کند و خروجی را
  با ``gzip`` فشرده می‌کند؛ در غیر این صورت به ``dumpdata`` جنگو برمی‌گردد.
- روی **SQLite** از ``VACUUM INTO`` استفاده می‌کند (نسخهٔ سازگار و قفل‌محترم؛
  ``sqlite3.Connection.backup()`` در حالت قفل بی‌پایان منتظر می‌ماند) و روی
  SQLite قدیمی‌تر به ``iterdump`` برمی‌گردد.
- به‌صورت اختیاری ``MEDIA_ROOT`` را با ``tarfile.gz`` آرشیو می‌کند.
- یک ``manifest.json`` با فراداده (اندازه، SHA-256، زمان، نسخهٔ جنگو) می‌نویسد.
- ``BACKUP_RETENTION`` **تعداد نسخه** را نگه می‌دارد (پیش‌فرض ۷): روی Cron روزانه
  یعنی یک هفته پشتیبان. نسخه‌های قدیمی‌تر همراه رسانه/manifest همان زمان پاک
  می‌شوند تا فضای هاست اشتراکی پر نشود.

خروجی هر اجرا مسیر فایل‌های نوشته‌شده را چاپ می‌کند تا در Cron قابل لاگ‌گیری
باشد.
"""

from __future__ import annotations

import gzip
import hashlib
import json
import shutil
import sqlite3
import subprocess
import tarfile
import tempfile
from pathlib import Path
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.utils import timezone


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


class Command(BaseCommand):
    help = "پشتیبان‌گیری از دیتابیس (و مدیا) با فراداده و چرخش نسخه‌ها."

    #: مهلت انتظار برای قفل SQLite (ثانیه) — پس از آن خطای روشن، نه انتظار بی‌پایان.
    SQLITE_BUSY_TIMEOUT_SECONDS = 30

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--output-dir", default=None, help="مسیر خروجی (پیش‌فرض: BACKUP_DIR).")
        parser.add_argument("--keep", type=int, default=None, help="تعداد نسخه‌های نگه‌داشته‌شده.")
        parser.add_argument("--skip-media", action="store_true", help="آرشیو رسانه‌ها ساخته نشود.")
        parser.add_argument("--dry-run", action="store_true", help="فقط گزارش، بدون نوشتن فایل.")

    def handle(self, *args: Any, **options: Any) -> None:
        output_dir = Path(str(options["output_dir"] or settings.BACKUP_DIR)).expanduser()
        keep = int(options["keep"] if options["keep"] is not None else settings.BACKUP_RETENTION)
        include_media = bool(settings.BACKUP_INCLUDE_MEDIA and not options["skip_media"])
        dry_run = bool(options["dry_run"])
        stamp = timezone.now().strftime("%Y%m%d-%H%M%S")

        if dry_run:
            self.stdout.write(f"[dry-run] مسیر خروجی: {output_dir}")
            self.stdout.write(f"[dry-run] نگه‌داری: {keep} نسخه | مدیا: {include_media}")
            return

        output_dir.mkdir(parents=True, exist_ok=True)

        artifacts: dict[str, dict[str, Any]] = {}
        database_path = self._backup_database(output_dir, stamp)
        artifacts["database"] = self._describe(database_path)

        if include_media:
            media_path = self._backup_media(output_dir, stamp)
            if media_path is not None:
                artifacts["media"] = self._describe(media_path)

        manifest = {
            "created_at": timezone.now().isoformat(),
            "database_engine": settings.DATABASES["default"]["ENGINE"],
            "django_version": self._django_version(),
            "artifacts": artifacts,
        }
        manifest_path = output_dir / f"manifest-{stamp}.json"
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

        for name, info in artifacts.items():
            self.stdout.write(self.style.SUCCESS(f"{name}: {info['path']} ({info['size']} bytes)"))

        removed = self._prune(output_dir, keep)
        for path in removed:
            self.stdout.write(f"حذف نسخهٔ قدیمی: {path}")

    # -- دیتابیس ----------------------------------------------------------
    def _backup_database(self, output_dir: Path, stamp: str) -> Path:
        engine = str(settings.DATABASES["default"]["ENGINE"])
        if "sqlite3" in engine:
            return self._backup_sqlite(output_dir, stamp)
        if "mysql" in engine:
            return self._backup_mysql(output_dir, stamp)
        return self._backup_dumpdata(output_dir, stamp)

    def _backup_sqlite(self, output_dir: Path, stamp: str) -> Path:
        raw_name = str(settings.DATABASES["default"]["NAME"])
        target = output_dir / f"db-{stamp}.sqlite3.gz"

        with tempfile.TemporaryDirectory(prefix="emmett-backup-") as temp_dir:
            # ``VACUUM INTO`` مقصد از قبل موجود را رد می‌کند؛ پوشهٔ تازه تضمینش می‌کند.
            temp_path = Path(temp_dir) / f"db-{stamp}.sqlite3"
            connection = sqlite3.connect(
                raw_name,
                uri=raw_name.startswith("file:"),
                timeout=self.SQLITE_BUSY_TIMEOUT_SECONDS,
            )
            try:
                self._dump_sqlite(connection, temp_path)
            finally:
                connection.close()

            with temp_path.open("rb") as raw, gzip.open(target, "wb") as compressed:
                shutil.copyfileobj(raw, compressed)
        return target

    def _dump_sqlite(self, connection: sqlite3.Connection, destination: Path) -> None:
        """یک نسخهٔ سازگار از دیتابیس SQLite می‌سازد.

        چرا نه ``Connection.backup()``؟ آن API در حالت قفل‌شده **در داخل کد C
        بی‌پایان** منتظر می‌ماند (وقفهٔ پایتون/سیگنال هم اجرا نمی‌شود) و Cron را
        آویزان می‌کند — مشاهده‌شده در تست فاز ۷ روی دیتابیس درون‌حافظه‌ای/قفل‌شده.
        ``VACUUM INTO`` همان خروجی مستقل را می‌دهد ولی به ``busy_timeout``
        احترام می‌گذارد و در نهایت خطای روشن می‌دهد.
        """

        connection.execute(f"PRAGMA busy_timeout = {self.SQLITE_BUSY_TIMEOUT_SECONDS * 1000}")
        try:
            connection.execute("VACUUM INTO ?", (str(destination),))
            return
        except sqlite3.OperationalError as exc:
            message = str(exc)
            if "syntax error" not in message and "near" not in message:
                raise CommandError(f"پشتیبان‌گیری SQLite شکست خورد: {message}") from exc
            # SQLite قدیمی‌تر از ۳.۲۷: ``VACUUM INTO`` ندارد ⇒ خروجی SQL متنی.
            self.stderr.write(self.style.WARNING("VACUUM INTO پشتیبانی نمی‌شود؛ iterdump استفاده شد."))

        with destination.open("w", encoding="utf-8") as handle:
            for line in connection.iterdump():
                handle.write(f"{line}\n")

    def _backup_mysql(self, output_dir: Path, stamp: str) -> Path:
        config = settings.DATABASES["default"]
        mysqldump = shutil.which("mysqldump")
        target = output_dir / f"db-{stamp}.sql.gz"

        if mysqldump is None:
            self.stderr.write(self.style.WARNING("mysqldump در PATH نیست؛ به dumpdata جنگو برمی‌گردیم."))
            return self._backup_dumpdata(output_dir, stamp)

        command = [
            mysqldump,
            "--single-transaction",
            "--quick",
            "--skip-lock-tables",
            "--default-character-set=utf8mb4",
            f"--host={config.get('HOST') or '127.0.0.1'}",
            f"--port={config.get('PORT') or 3306}",
            f"--user={config.get('USER')}",
            str(config.get("NAME")),
        ]
        environment = {"MYSQL_PWD": str(config.get("PASSWORD") or "")}
        import os

        process = subprocess.run(  # noqa: S603 - مسیر از PATH و آرگومان‌ها لیستی است
            command,
            capture_output=True,
            check=False,
            env={**os.environ, **environment},
        )
        if process.returncode != 0:
            raise RuntimeError(f"mysqldump با کد {process.returncode} شکست خورد: {process.stderr[:300]!r}")

        with gzip.open(target, "wb") as compressed:
            compressed.write(process.stdout)
        return target

    def _backup_dumpdata(self, output_dir: Path, stamp: str) -> Path:
        from io import StringIO

        from django.core.management import call_command

        buffer = StringIO()
        call_command("dumpdata", "--natural-foreign", "--natural-primary", stdout=buffer)
        target = output_dir / f"db-{stamp}.json.gz"
        with gzip.open(target, "wb") as compressed:
            compressed.write(buffer.getvalue().encode("utf-8"))
        return target

    # -- مدیا -------------------------------------------------------------
    def _backup_media(self, output_dir: Path, stamp: str) -> Path | None:
        media_root = Path(str(settings.MEDIA_ROOT))
        if not media_root.exists() or not any(media_root.iterdir()):
            self.stdout.write("پوشهٔ مدیا خالی است؛ آرشیو ساخته نشد.")
            return None

        target = output_dir / f"media-{stamp}.tar.gz"
        with tarfile.open(target, "w:gz") as archive:
            archive.add(media_root, arcname="media")
        return target

    # -- کمکی -------------------------------------------------------------
    @staticmethod
    def _describe(path: Path) -> dict[str, Any]:
        return {
            "path": str(path),
            "size": path.stat().st_size,
            "sha256": _sha256(path),
        }

    @staticmethod
    def _django_version() -> str:
        import django

        return django.get_version()

    def _prune(self, output_dir: Path, keep: int) -> list[Path]:
        """``keep`` نسخهٔ آخر را نگه می‌دارد و بقیه (با رسانه/manifest همان زمان) را پاک می‌کند.

        نام‌ها با مُهر زمانی ``YYYYmmdd-HHMMSS`` ساخته می‌شوند، پس مرتب‌سازی
        الفبایی همان ترتیب زمانی است و نیازی به خواندن mtime نیست.
        """

        if keep <= 0:
            return []

        backups = sorted(output_dir.glob("db-*"), reverse=True)
        removed: list[Path] = []
        for path in backups[keep:]:
            stamp = path.name.split(".", 1)[0].removeprefix("db-")
            path.unlink(missing_ok=True)
            removed.append(path)
            stamped = sorted(output_dir.glob(f"*-{stamp}*")) + sorted(output_dir.glob(f"manifest-{stamp}*"))
            for sibling in stamped:
                if sibling.exists():
                    sibling.unlink()
                    removed.append(sibling)
        return removed


__all__ = ["Command"]
