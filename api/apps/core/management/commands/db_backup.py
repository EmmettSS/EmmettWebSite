import gzip
import os
import sqlite3
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.db import connection


class Command(BaseCommand):
    help = "Create a private compressed database backup in BACKUP_DIR."

    def handle(self, *args, **opts):
        configured = os.getenv("BACKUP_DIR")
        if not configured:
            raise CommandError("BACKUP_DIR must point outside the public document root")
        folder = Path(configured).expanduser().resolve()
        folder.mkdir(parents=True, exist_ok=True, mode=0o700)
        os.chmod(folder, 0o700)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        if connection.vendor == "sqlite":
            source = Path(connection.settings_dict["NAME"])
            if not source.is_file():
                raise CommandError("SQLite database file is unavailable for backup")
            temporary = folder / f"emmett-{stamp}.sqlite"
            with sqlite3.connect(source) as src, sqlite3.connect(temporary) as dst:
                src.backup(dst)
            output = folder / f"emmett-{stamp}.sqlite.gz"
        elif connection.vendor == "mysql":
            config = connection.settings_dict
            temporary = folder / f"emmett-{stamp}.sql"
            output = folder / f"emmett-{stamp}.sql.gz"
            env = os.environ.copy()
            env["MYSQL_PWD"] = config.get("PASSWORD", "")
            cmd = [
                "mysqldump",
                "--single-transaction",
                "--quick",
                "--default-character-set=utf8mb4",
                "-h",
                config.get("HOST") or "localhost",
                "-P",
                str(config.get("PORT") or 3306),
                "-u",
                config["USER"],
                config["NAME"],
            ]
            with temporary.open("wb") as stream:
                result = subprocess.run(
                    cmd,
                    stdout=stream,
                    stderr=subprocess.PIPE,
                    env=env,
                    check=False,
                    timeout=600,
                )
            if result.returncode:
                temporary.unlink(missing_ok=True)
                raise CommandError(
                    "mysqldump failed: " + result.stderr.decode(errors="replace")[:500]
                )
        else:
            raise CommandError(f"Unsupported database backend: {connection.vendor}")
        try:
            with (
                temporary.open("rb") as src,
                gzip.open(output, "wb", compresslevel=6) as dst,
            ):
                dst.writelines(src)
        finally:
            temporary.unlink(missing_ok=True)
        os.chmod(output, 0o600)
        self._prune(folder)
        self.stdout.write(self.style.SUCCESS(f"Backup created: {output.name}"))

    def _prune(self, folder: Path):
        backups = sorted(
            [*folder.glob("emmett-*.sql.gz"), *folder.glob("emmett-*.sqlite.gz")],
            key=lambda item: item.stat().st_mtime,
            reverse=True,
        )
        keep = set(backups[:7])
        weekly = {}
        for item in backups[7:]:
            modified = datetime.fromtimestamp(item.stat().st_mtime, timezone.utc)
            weekly.setdefault(modified.isocalendar()[:2], item)
        keep.update(list(weekly.values())[:4])
        for item in backups:
            if item not in keep:
                item.unlink(missing_ok=True)
