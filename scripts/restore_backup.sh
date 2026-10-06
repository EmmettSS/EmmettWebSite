#!/usr/bin/env bash
# =============================================================================
# اسکریپت بازیابی ایمن دیتابیس و فایل‌های Media از نسخه‌های پشتیبان (فاز ۹ — ADR-0036)
# =============================================================================
# کاربردها:
#   ۱) مشاهدهٔ فهرست بکاپ‌های موجود:
#      bash scripts/restore_backup.sh --list
#   ۲) بازیابی دیتابیس (SQLite / MySQL SQL / JSON dumpdata):
#      bash scripts/restore_backup.sh --db backend/backups/db-20261006T033000Z.sql.gz --yes
#   ۳) بازیابی آرشیو فایل‌های آپلودشده (Media):
#      bash scripts/restore_backup.sh --media backend/backups/media-20261006T033000Z.tar.gz --yes
# =============================================================================

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"
BACKUP_DIR="${BACKUP_DIR:-${BACKEND_DIR}/backups}"

DB_ARCHIVE=""
MEDIA_ARCHIVE=""
LIST_ONLY=false
ASSUME_YES=false
SKIP_PRE_BACKUP=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --list)
      LIST_ONLY=true
      shift
      ;;
    --db)
      DB_ARCHIVE="$2"
      shift 2
      ;;
    --media)
      MEDIA_ARCHIVE="$2"
      shift 2
      ;;
    --yes|-y)
      ASSUME_YES=true
      shift
      ;;
    --skip-pre-backup)
      SKIP_PRE_BACKUP=true
      shift
      ;;
    -h|--help)
      echo "Usage: bash scripts/restore_backup.sh [--list] [--db <db-archive.gz>] [--media <media-archive.tar.gz>] [--yes] [--skip-pre-backup]"
      exit 0
      ;;
    *)
      echo "[ERROR] آرگومان ناشناخته: $1" >&2
      exit 1
      ;;
  esac
done

if [[ "${LIST_ONLY}" == "true" ]]; then
  echo "=== فهرست فایل‌های پشتیبان در ${BACKUP_DIR} ==="
  if [[ -d "${BACKUP_DIR}" ]]; then
    ls -lh "${BACKUP_DIR}"
  else
    echo "پوشهٔ پشتیبان (${BACKUP_DIR}) هنوز ایجاد نشده است."
  fi
  exit 0
fi

if [[ -z "${DB_ARCHIVE}" && -z "${MEDIA_ARCHIVE}" ]]; then
  echo "[ERROR] لطفاً حداقل یکی از گزینه‌های --list، --db یا --media را مشخص کنید." >&2
  exit 1
fi

if [[ -n "${VIRTUAL_ENV:-}" && -x "${VIRTUAL_ENV}/bin/python" ]]; then
  PYTHON_BIN="${VIRTUAL_ENV}/bin/python"
elif [[ -x "${BACKEND_DIR}/.venv/bin/python" ]]; then
  PYTHON_BIN="${BACKEND_DIR}/.venv/bin/python"
else
  PYTHON_BIN="$(command -v python3)"
fi

if [[ "${ASSUME_YES}" != "true" ]]; then
  read -r -p "آیا از بازنویسی داده‌های فعلی با فایل پشتیبان اطمینان دارید؟ [y/N] " confirm
  if [[ "${confirm}" != "y" && "${confirm}" != "Y" ]]; then
    echo "عملیات بازیابی لغو شد."
    exit 1
  fi
fi

if [[ "${SKIP_PRE_BACKUP}" != "true" ]]; then
  echo "==> تهیهٔ نسخهٔ پشتیبان ایمنی پیش از بازیابی..."
  (cd "${BACKEND_DIR}" && "${PYTHON_BIN}" manage.py backup_db --no-media || true)
fi

if [[ -n "${DB_ARCHIVE}" ]]; then
  if [[ ! -f "${DB_ARCHIVE}" ]]; then
    echo "[ERROR] فایل پشتیبان دیتابیس یافت نشد: ${DB_ARCHIVE}" >&2
    exit 1
  fi

  echo "==> در حال بازیابی دیتابیس از ${DB_ARCHIVE}..."
  case "${DB_ARCHIVE}" in
    *.sqlite3.gz)
      gzip -dc "${DB_ARCHIVE}" > "${BACKEND_DIR}/db.sqlite3.restoring"
      mv "${BACKEND_DIR}/db.sqlite3.restoring" "${BACKEND_DIR}/db.sqlite3"
      echo "✔ فایل SQLite با موفقیت جایگزین شد."
      ;;
    *.sql.gz)
      if [[ -f "${BACKEND_DIR}/.env" ]]; then
        set -a
        # shellcheck disable=SC1091
        source "${BACKEND_DIR}/.env"
        set +a
      fi
      : "${MYSQL_DATABASE:?متغیر MYSQL_DATABASE باید تنظیم شده باشد}"
      : "${MYSQL_USER:?متغیر MYSQL_USER باید تنظیم شده باشد}"
      : "${MYSQL_PASSWORD:?متغیر MYSQL_PASSWORD باید تنظیم شده باشد}"
      MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
      MYSQL_PORT="${MYSQL_PORT:-3306}"
      gzip -dc "${DB_ARCHIVE}" | MYSQL_PWD="${MYSQL_PASSWORD}" mysql \
        -h "${MYSQL_HOST}" -P "${MYSQL_PORT}" -u "${MYSQL_USER}" "${MYSQL_DATABASE}"
      echo "✔ دیتابیس MySQL با موفقیت بازیابی شد."
      ;;
    *.json.gz)
      TMP_JSON="$(mktemp /tmp/emmett-restore-XXXXXX.json)"
      trap 'rm -f "${TMP_JSON}"' EXIT
      gzip -dc "${DB_ARCHIVE}" > "${TMP_JSON}"
      (cd "${BACKEND_DIR}" && "${PYTHON_BIN}" manage.py loaddata "${TMP_JSON}")
      rm -f "${TMP_JSON}"
      echo "✔ داده‌های JSON با موفقیت از طریق loaddata بازیابی شدند."
      ;;
    *)
      echo "[ERROR] فرمت فایل پشتیبان دیتابیس پشتیبانی نمی‌شود: ${DB_ARCHIVE}" >&2
      exit 1
      ;;
  esac
fi

if [[ -n "${MEDIA_ARCHIVE}" ]]; then
  if [[ ! -f "${MEDIA_ARCHIVE}" ]]; then
    echo "[ERROR] فایل پشتیبان Media یافت نشد: ${MEDIA_ARCHIVE}" >&2
    exit 1
  fi

  MEDIA_TARGET="${DJANGO_MEDIA_ROOT:-${BACKEND_DIR}/media}"
  mkdir -p "${MEDIA_TARGET}"
  echo "==> در حال استخراج فایل‌های Media در ${MEDIA_TARGET}..."
  tar -xzf "${MEDIA_ARCHIVE}" -C "${MEDIA_TARGET}"
  cp "${BACKEND_DIR}/deploy/media.htaccess.example" "${MEDIA_TARGET}/.htaccess"
  echo "✔ فایل‌های Media و محافظ .htaccess با موفقیت بازیابی شدند."
fi

echo "✔ عملیات بازیابی با موفقیت به پایان رسید."
