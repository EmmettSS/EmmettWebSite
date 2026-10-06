#!/usr/bin/env bash
# =============================================================================
# اسکریپت استقرار و به‌روزرسانی بک‌اند Django روی هاست cPanel (فاز ۹ — ADR-0036)
# =============================================================================
# کاربردها:
#   ۱) روی سرور cPanel (پس از فعال‌سازی محیط مجازی Setup Python App):
#      bash scripts/deploy_backend.sh --install-deps
#   ۲) اجرای سریع مهاجرت و collectstatic پس از git pull:
#      bash scripts/deploy_backend.sh
#   ۳) تست دود (Smoke Test) در محیط توسعه/CI بدون نیاز به MySQL:
#      DJANGO_SETTINGS_MODULE=config.settings.dev bash scripts/deploy_backend.sh --allow-missing-env --skip-deploy-check
# =============================================================================

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"

INSTALL_DEPS=false
ALLOW_MISSING_ENV=false
SKIP_DEPLOY_CHECK=false

for arg in "$@"; do
  case "${arg}" in
    --install-deps)
      INSTALL_DEPS=true
      ;;
    --allow-missing-env)
      ALLOW_MISSING_ENV=true
      ;;
    --skip-deploy-check)
      SKIP_DEPLOY_CHECK=true
      ;;
    -h|--help)
      echo "Usage: bash scripts/deploy_backend.sh [--install-deps] [--allow-missing-env] [--skip-deploy-check]"
      exit 0
      ;;
    *)
      echo "[ERROR] آرگومان ناشناخته: ${arg}" >&2
      exit 1
      ;;
  esac
done

cd "${BACKEND_DIR}"

# انتخاب مفسر پایتون (محیط مجازی فعال cPanel یا .venv محلی)
if [[ -n "${VIRTUAL_ENV:-}" && -x "${VIRTUAL_ENV}/bin/python" ]]; then
  PYTHON_BIN="${VIRTUAL_ENV}/bin/python"
  PIP_BIN="${VIRTUAL_ENV}/bin/pip"
elif [[ -x "${BACKEND_DIR}/.venv/bin/python" ]]; then
  PYTHON_BIN="${BACKEND_DIR}/.venv/bin/python"
  PIP_BIN="${BACKEND_DIR}/.venv/bin/pip"
else
  PYTHON_BIN="$(command -v python3)"
  PIP_BIN="$(command -v pip3)"
fi

echo "==> [1/7] بررسی فایل محیطی و دایرکتوری‌های عملیاتی..."
if [[ ! -f "${BACKEND_DIR}/.env" && "${ALLOW_MISSING_ENV}" != "true" ]]; then
  echo "[ERROR] فایل backend/.env یافت نشد. ابتدا backend/.env.example را به backend/.env کپی و مقادیر پروداکشن را تنظیم کنید." >&2
  exit 1
fi

if [[ -f "${BACKEND_DIR}/.env" ]]; then
  chmod 600 "${BACKEND_DIR}/.env"
fi

mkdir -p "${BACKEND_DIR}/media" \
         "${BACKEND_DIR}/staticfiles" \
         "${BACKEND_DIR}/backups" \
         "${BACKEND_DIR}/.cache/django-cache" \
         "${BACKEND_DIR}/tmp"

chmod 700 "${BACKEND_DIR}/backups" "${BACKEND_DIR}/.cache/django-cache"

# کپی فایل امنیتی .htaccess در پوشهٔ media برای مسدودسازی اجرای اسکریپت (ADR-0005)
cp "${BACKEND_DIR}/deploy/media.htaccess.example" "${BACKEND_DIR}/media/.htaccess"

# کپی فایل ورودی Passenger در صورت عدم وجود (ADR-0036)
if [[ ! -f "${BACKEND_DIR}/passenger_wsgi.py" ]]; then
  cp "${BACKEND_DIR}/deploy/passenger_wsgi.py.example" "${BACKEND_DIR}/passenger_wsgi.py"
fi

if [[ "${INSTALL_DEPS}" == "true" ]]; then
  echo "==> [2/7] نصب وابستگی‌های Pin شده از requirements.txt..."
  "${PIP_BIN}" install --upgrade pip
  "${PIP_BIN}" install -r "${BACKEND_DIR}/requirements.txt"
else
  echo "==> [2/7] عبور از نصب پکیج‌ها (برای نصب، سوئیچ --install-deps را بدهید)."
fi

export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.production}"

echo "==> [3/7] کامپایل و بررسی کاتالوگ‌های ترجمهٔ دوزبانه (i18n)..."
"${PYTHON_BIN}" "${BACKEND_DIR}/scripts/i18n.py" compile
"${PYTHON_BIN}" "${BACKEND_DIR}/scripts/i18n.py" check

echo "==> [4/7] اجرای مهاجرت‌های دیتابیس (migrate --noinput)..."
"${PYTHON_BIN}" "${BACKEND_DIR}/manage.py" migrate --noinput

echo "==> [5/7] جمع‌آوری فایل‌های استاتیک (collectstatic --noinput --clear)..."
"${PYTHON_BIN}" "${BACKEND_DIR}/manage.py" collectstatic --noinput --clear

if [[ "${SKIP_DEPLOY_CHECK}" != "true" ]]; then
  echo "==> [6/7] اجرای ممیزی امنیتی پروداکشن (manage.py check --deploy)..."
  "${PYTHON_BIN}" "${BACKEND_DIR}/manage.py" check --deploy
else
  echo "==> [6/7] اجرای بررسی سلامت پایه (manage.py check)..."
  "${PYTHON_BIN}" "${BACKEND_DIR}/manage.py" check
fi

echo "==> [7/7] سیگنال ری‌استارت بدون قطعی به Phusion Passenger (tmp/restart.txt)..."
touch "${BACKEND_DIR}/tmp/restart.txt"

echo "✔ استقرار بک‌اند با موفقیت کامل انجام شد."
