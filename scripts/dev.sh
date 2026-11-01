#!/usr/bin/env bash
# =============================================================================
# استارت یک‌دستوری کل استک توسعه (ADR-0041)
# =============================================================================
# چرا این فایل وجود دارد؟
#   در این پروژه دو پروسه لازم است: Django (منبع داده) و Next.js (لایهٔ نمایش).
#   تا امروز هیچ نقطهٔ ورودی واحدی وجود نداشت و کاربر باید دو ترمینال باز می‌کرد،
#   ترتیب استارت را دستی رعایت می‌کرد و اگر Django بالا نبود، سایت با صفحه‌های
#   خالی بالا می‌آمد (serverFetch خطا را می‌بلعد و null برمی‌گرداند) — که
#   «کندی» و «خرابی» را از هم غیرقابل‌تشخیص می‌کرد.
#
# این اسکریپت به ترتیب:
#   ۱) بررسی می‌کند venv و node_modules آماده‌اند (و اگر نه، راهنمایی می‌دهد).
#   ۲) مهاجرت‌ها را اعمال و در صورت خالی‌بودن، دادهٔ نمایشی را seed می‌کند.
#   ۳) Django را روی 8000 بالا می‌آورد و تا سالم‌شدن /api/v1/health/ صبر می‌کند.
#   ۴) تازه بعد از آن Next.js را بالا می‌آورد (هیچ صفحه‌ای با بک‌اند خاموش
#      pre-render نمی‌شود).
#   ۵) با Ctrl+C هر دو پروسه با هم خاموش می‌شوند.
#
# استفاده:
#   ./scripts/dev.sh              # حالت توسعه (next dev + runserver)
#   PROD=1 ./scripts/dev.sh       # بیلد و اجرای production (next build && next start)
# =============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"
PYTHON="$BACKEND_DIR/.venv/bin/python"
API_URL="${INTERNAL_API_URL:-http://127.0.0.1:8000}"
API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-3000}"

log() { printf '\033[1;32m[dev]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[dev]\033[0m %s\n' "$*" >&2; exit 1; }

[ -x "$PYTHON" ] || die "پایتون venv پیدا نشد: $PYTHON
  cd backend && python3.11 -m venv .venv && ./.venv/bin/pip install -r requirements-dev.txt"

[ -d "$FRONTEND_DIR/node_modules" ] || die "node_modules پیدا نشد:
  cd frontend && npm ci"

[ -f "$BACKEND_DIR/.env" ] || { log "ساخت backend/.env از .env.example"; cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"; }
[ -f "$FRONTEND_DIR/.env.local" ] || { log "ساخت frontend/.env.local از .env.example"; cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env.local"; }

log "اعمال مهاجرت‌ها…"
(cd "$BACKEND_DIR" && DJANGO_SETTINGS_MODULE=config.settings.dev "$PYTHON" manage.py migrate --noinput >/dev/null)

CONTENT_COUNT=$(cd "$BACKEND_DIR" && DJANGO_SETTINGS_MODULE=config.settings.dev "$PYTHON" - <<'PY'
import django, os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
django.setup()
from apps.services.models import Service
print(Service.objects.count())
PY
)
if [ "$CONTENT_COUNT" = "0" ]; then
  log "پایگاه‌داده خالی است — اجرای seed_demo_data"
  (cd "$BACKEND_DIR" && DJANGO_SETTINGS_MODULE=config.settings.dev "$PYTHON" manage.py seed_demo_data >/dev/null)
fi

PIDS=()
CLEANED=0
cleanup() {
  # فقط یک بار اجرا می‌شود: هم trap روی INT/TERM می‌آید و هم بعد از آن EXIT،
  # و بدون این نگهبان پیام خاموش‌شدن دو بار چاپ می‌شد (دیده‌شده در آزمایش).
  [ "$CLEANED" = "1" ] && return
  CLEANED=1
  log "خاموش‌کردن پروسه‌ها…"
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT
trap 'cleanup; exit 130' INT TERM

log "استارت Django روی پورت $API_PORT"
(cd "$BACKEND_DIR" && DJANGO_SETTINGS_MODULE=config.settings.dev "$PYTHON" manage.py runserver "0.0.0.0:$API_PORT" --noreload) &
PIDS+=($!)

for _ in $(seq 1 60); do
  if curl -fsS "$API_URL/api/v1/health/" >/dev/null 2>&1; then
    log "Django آماده است ($API_URL/api/v1/health/)"
    break
  fi
  sleep 1
done
curl -fsS "$API_URL/api/v1/health/" >/dev/null 2>&1 || die "Django در ۶۰ ثانیه بالا نیامد"

if [ "${PROD:-0}" = "1" ]; then
  log "بیلد production فرانت‌اند…"
  (cd "$FRONTEND_DIR" && INTERNAL_API_URL="$API_URL" npm run build)
  log "استارت Next.js (production) روی پورت $WEB_PORT"
  (cd "$FRONTEND_DIR" && PORT="$WEB_PORT" INTERNAL_API_URL="$API_URL" npm run start) &
else
  log "استارت Next.js (dev) روی پورت $WEB_PORT"
  (cd "$FRONTEND_DIR" && PORT="$WEB_PORT" INTERNAL_API_URL="$API_URL" npm run dev) &
fi
PIDS+=($!)

log "سایت:     http://localhost:$WEB_PORT/"
log "ادمین:    $API_URL/admin/  (در پروداکشن: $API_URL/backend/admin/)"
log "Swagger:  $API_URL/api/v1/schema/swagger-ui/"
log "برای خاموش‌کردن: Ctrl+C"
wait
