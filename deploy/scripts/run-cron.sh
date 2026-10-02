#!/usr/bin/env sh
set -eu
: "${EMMETT_CRON_ENV_FILE:?Set this to a private chmod-600 file outside public_html}"
. "$EMMETT_CRON_ENV_FILE"
: "${VIRTUAL_ENV:?Set VIRTUAL_ENV to the cPanel Python App virtualenv}"
: "${APP_ROOT:?Set APP_ROOT to the Django project root}"
command_name=${1:-}
case "$command_name" in
  scan-jobs) exec "$VIRTUAL_ENV/bin/python" "$APP_ROOT/manage.py" process_jobs --kind=scan --limit=5 --timeout=90 ;;
  embed-jobs) exec "$VIRTUAL_ENV/bin/python" "$APP_ROOT/manage.py" process_jobs --kind=embed --limit=20 --timeout=120 ;;
  send-outbox) exec "$VIRTUAL_ENV/bin/python" "$APP_ROOT/manage.py" send_outbox --limit=50 ;;
  render-public-html) exec "$VIRTUAL_ENV/bin/python" "$APP_ROOT/manage.py" render_public_html --incremental ;;
  purge-results) exec "$VIRTUAL_ENV/bin/python" "$APP_ROOT/manage.py" purge_scan_results ;;
  db-backup) exec "$VIRTUAL_ENV/bin/python" "$APP_ROOT/manage.py" db_backup ;;
  *) echo "Unknown cron task" >&2; exit 2 ;;
esac
