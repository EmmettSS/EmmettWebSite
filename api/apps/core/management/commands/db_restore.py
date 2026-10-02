import gzip
import os
import shutil
import sqlite3
import subprocess
import tempfile
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.db import connections, connection


class Command(BaseCommand):
    help = "Restore an explicitly selected backup; take a fresh backup first."

    def add_arguments(self, parser):
        parser.add_argument("backup")
        parser.add_argument("--confirm", action="store_true")

    def handle(self, *args, **opts):
        if not opts["confirm"]:
            raise CommandError("Destructive restore requires --confirm")
        configured = os.getenv("BACKUP_DIR")
        if not configured:
            raise CommandError("BACKUP_DIR must be configured")
        root = Path(configured).expanduser().resolve()
        source = Path(opts["backup"]).expanduser().resolve()
        if not root.is_dir() or root not in source.parents or not source.is_file():
            raise CommandError("Backup must be an existing file inside BACKUP_DIR")
        if connection.vendor == "sqlite" and source.name.endswith(".sqlite.gz"):
            destination = Path(connection.settings_dict["NAME"])
            with tempfile.NamedTemporaryFile(
                dir=root, suffix=".sqlite", delete=False
            ) as temp:
                temporary = Path(temp.name)
            try:
                with (
                    gzip.open(source, "rb") as compressed,
                    temporary.open("wb") as restored,
                ):
                    shutil.copyfileobj(compressed, restored)
                connections.close_all()
                with (
                    sqlite3.connect(temporary) as backup,
                    sqlite3.connect(destination) as live,
                ):
                    backup.backup(live)
            finally:
                temporary.unlink(missing_ok=True)
        elif connection.vendor == "mysql" and source.name.endswith(".sql.gz"):
            config = connection.settings_dict
            env = os.environ.copy()
            env["MYSQL_PWD"] = config.get("PASSWORD", "")
            command = [
                "mysql",
                "-h",
                config.get("HOST") or "localhost",
                "-P",
                str(config.get("PORT") or 3306),
                "-u",
                config["USER"],
                config["NAME"],
            ]
            connections.close_all()
            with gzip.open(source, "rb") as stream:
                result = subprocess.run(
                    command,
                    stdin=stream,
                    stderr=subprocess.PIPE,
                    env=env,
                    check=False,
                    timeout=900,
                )
            if result.returncode:
                raise CommandError(
                    "mysql restore failed: "
                    + result.stderr.decode(errors="replace")[:500]
                )
        else:
            raise CommandError("Backup type does not match configured database engine")
        self.stdout.write(
            self.style.SUCCESS(
                f"Restored from {source.name}; verify application health immediately."
            )
        )
