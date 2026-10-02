#!/usr/bin/env sh
set -eu
: "${VIRTUAL_ENV:?Set VIRTUAL_ENV to the cPanel Python App virtualenv}"
: "${APP_ROOT:?Set APP_ROOT to the Django project root}"
: "${BACKUP_DIR:?Set BACKUP_DIR outside the public document root}"
"$VIRTUAL_ENV/bin/python" "$APP_ROOT/manage.py" db_backup
