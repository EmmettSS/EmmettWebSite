#!/usr/bin/env bash
# =============================================================================
# پیش‌پرواز (Preflight) استقرار روی cPanel — ADR-0041
# =============================================================================
# چرا این فایل وجود دارد؟ تا امروز «موفقیت استقرار» فقط یعنی «اسکریپت بدون
# خطا تمام شد». اما در معماری دو-اپیِ این پروژه، سه چیز می‌تواند هم‌زمان خراب
# باشد و هیچ‌کدام در خروجی اسکریپت دیده نشود:
#
#   ۱) اپ Python بالا نباشد و بیلد فرانت با محتوای خالی ساخته شده باشد؛
#   ۲) اپ Node توکن داخلی را نداشته باشد و صفحه‌ها پس از مدتی 429/خالی شوند؛
#   ۳) مسیر /backend یا /static یا /media روی دامنه به اپ درست نرسد.
#
# این اسکریپت همان سه چیز را روی هاست واقعی می‌سنجد و با کد خروج غیرصفر
# تمام می‌شود اگر چیزی درست نباشد. بدون آن، «استقرار قطعی» یک ادعاست.
#
# کاربرد (روی ترمینال cPanel، از ریشهٔ ریپو):
#   bash scripts/preflight_cpanel.sh
#   bash scripts/preflight_cpanel.sh --url https://<domain> --skip-http
#
# کدهای خروج: 0 = همه‌چیز سبز، 1 = دست‌کم یک بررسی شکست خورده.
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"
FRONTEND_DIR="${REPO_ROOT}/frontend"

SITE_URL=""
# مسیری که اپ Python روی دامنه mount شده؛ روی cPanel پیش‌فرض /backend است و
# باید با DJANGO_FORCE_SCRIPT_NAME یکی باشد.
BACKEND_BASE="${BACKEND_BASE:-/backend}"
SKIP_HTTP=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --url)
      SITE_URL="${2:-}"
      shift 2
      ;;
    --backend-base)
      BACKEND_BASE="${2:-}"
      shift 2
      ;;
    --skip-http)
      SKIP_HTTP=true
      shift
      ;;
    -h|--help)
      echo "Usage: bash scripts/preflight_cpanel.sh [--url https://<domain>] [--backend-base /backend] [--skip-http]"
      exit 0
      ;;
    *)
      echo "[ERROR] آرگومان ناشناخته: $1" >&2
      exit 1
      ;;
  esac
done

read_env_value() {
  local file="$1" key="$2"
  [[ -f "${file}" ]] || return 0
  tr -d '\r' < "${file}" | sed -n "s/^${key}=//p" | tail -n 1
}

if [[ -z "${SITE_URL}" ]]; then
  SITE_URL="$(read_env_value "${FRONTEND_DIR}/.env.local" PUBLIC_SITE_URL)"
fi
SITE_URL="${SITE_URL%/}"
# "" یا "/" یعنی Django روی ریشهٔ دامنه است (مثلاً در تست محلی).
if [[ "${BACKEND_BASE}" == "/" ]]; then BACKEND_BASE=""; else BACKEND_BASE="${BACKEND_BASE%/}"; fi

PASS=0
FAIL=0
WARN=0

ok() { printf '  \033[1;32m✓\033[0m %s\n' "$*"; PASS=$((PASS + 1)); }
bad() { printf '  \033[1;31m✗\033[0m %s\n' "$*"; FAIL=$((FAIL + 1)); }
warn() { printf '  \033[1;33m!\033[0m %s\n' "$*"; WARN=$((WARN + 1)); }

section() { printf '\n\033[1m%s\033[0m\n' "$*"; }

# -----------------------------------------------------------------------------
section "۱) نسخهٔ runtimeها"
# -----------------------------------------------------------------------------
if command -v python3 >/dev/null 2>&1; then
  PY_VERSION="$(python3 -c 'import sys; print("%d.%d" % sys.version_info[:2])')"
  if python3 -c 'import sys; raise SystemExit(0 if sys.version_info[:2] >= (3, 11) else 1)'; then
    ok "python3 ${PY_VERSION}"
  else
    bad "python3 ${PY_VERSION} — پروژه Python ≥ 3.11 می‌خواهد"
  fi
else
  bad "python3 پیدا نشد (محیط virtualenv اپ Python را فعال کنید)"
fi

if command -v node >/dev/null 2>&1; then
  NODE_VERSION="$(node --version)"
  case "${NODE_VERSION}" in
    v22.*) ok "node ${NODE_VERSION}" ;;
    *) warn "node ${NODE_VERSION} — package.json نسخهٔ 22.22.3 را قفل کرده است" ;;
  esac
else
  warn "node پیدا نشد (اگر این شل برای اپ Node فعال نشده، طبیعی است؛ با --skip-http یا از محیط Node اجرا کنید)"
fi

# -----------------------------------------------------------------------------
section "۲) فایل‌های ورودی Passenger"
# -----------------------------------------------------------------------------
[[ -f "${BACKEND_DIR}/passenger_wsgi.py" ]] \
  && ok "backend/passenger_wsgi.py موجود است" \
  || bad "backend/passenger_wsgi.py نیست → cp deploy/passenger_wsgi.py.example passenger_wsgi.py"

[[ -f "${FRONTEND_DIR}/server.js" ]] \
  && ok "frontend/server.js موجود است" \
  || bad "frontend/server.js نیست → cp deploy/server.js.example server.js"

if [[ -f "${FRONTEND_DIR}/.next/BUILD_ID" ]]; then
  ok "بیلد فرانت موجود است (.next/BUILD_ID)"
else
  bad "بیلد فرانت نیست → bash scripts/deploy_frontend.sh --install-deps"
fi

# -----------------------------------------------------------------------------
section "۳) مجوز نوشتن (کش، آپلود، بکاپ)"
# -----------------------------------------------------------------------------
for dir in \
  "${BACKEND_DIR}/media" \
  "${BACKEND_DIR}/staticfiles" \
  "${BACKEND_DIR}/backups" \
  "${BACKEND_DIR}/.cache/django-cache" \
  "${BACKEND_DIR}/tmp" \
  "${FRONTEND_DIR}/.next" \
  "${FRONTEND_DIR}/tmp"; do
  if [[ -d "${dir}" ]] && [[ -w "${dir}" ]]; then
    ok "قابل نوشتن: ${dir#${REPO_ROOT}/}"
  elif [[ ! -d "${dir}" ]]; then
    bad "وجود ندارد: ${dir#${REPO_ROOT}/} → bash scripts/deploy_backend.sh"
  else
    bad "قابل نوشتن نیست: ${dir#${REPO_ROOT}/} (کش ISR/آپلود/بکاپ از کار می‌افتد)"
  fi
done

# -----------------------------------------------------------------------------
section "۴) متغیرهای محیطی و هم‌خوانی توکن‌ها"
# -----------------------------------------------------------------------------
BACKEND_TOKEN="$(read_env_value "${BACKEND_DIR}/.env" INTERNAL_API_TOKEN)"
FRONTEND_TOKEN="$(read_env_value "${FRONTEND_DIR}/.env.local" INTERNAL_API_TOKEN)"
BACKEND_SECRET="$(read_env_value "${BACKEND_DIR}/.env" FRONTEND_REVALIDATE_SECRET)"

if [[ -n "${BACKEND_TOKEN}" ]]; then
  ok "INTERNAL_API_TOKEN در backend/.env تنظیم شده (${#BACKEND_TOKEN} کاراکتر)"
  if [[ "${#BACKEND_TOKEN}" -lt 32 ]]; then
    warn "طول توکن کمتر از ۳۲ کاراکتر است؛ مقدار قوی‌تر بسازید"
  fi
else
  warn "INTERNAL_API_TOKEN در backend/.env نیست (اگر فقط در Environment Variables اپ Python است، طبیعی است)"
fi

if [[ -n "${FRONTEND_TOKEN}" ]]; then
  ok "INTERNAL_API_TOKEN در frontend/.env.local تنظیم شده (${#FRONTEND_TOKEN} کاراکتر)"
else
  warn "INTERNAL_API_TOKEN در frontend/.env.local نیست (اگر فقط در Environment Variables اپ Node است، طبیعی است)"
fi

if [[ -n "${BACKEND_TOKEN}" && -n "${FRONTEND_TOKEN}" ]]; then
  if [[ "${BACKEND_TOKEN}" == "${FRONTEND_TOKEN}" ]]; then
    ok "توکن دو اپ یک‌سان است"
  else
    bad "توکن دو اپ یک‌سان نیست → فراخوانی‌های داخلی ۴۲۹ می‌گیرند و صفحه‌ها خالی می‌شوند"
  fi
fi

[[ -n "${BACKEND_SECRET}" ]] \
  && ok "FRONTEND_REVALIDATE_SECRET در backend/.env تنظیم شده" \
  || warn "FRONTEND_REVALIDATE_SECRET خالی است → تازه‌سازی فوری محتوا کار نمی‌کند (فقط ISR ۶۰ ثانیه‌ای)"

# -----------------------------------------------------------------------------
section "۵) بررسی زندهٔ مسیرها روی دامنه"
# -----------------------------------------------------------------------------
if [[ "${SKIP_HTTP}" == "true" ]]; then
  warn "بررسی HTTP با --skip-http رد شد"
elif [[ -z "${SITE_URL}" ]]; then
  bad "SITE_URL معلوم نیست → با --url https://<domain> بدهید یا PUBLIC_SITE_URL را در frontend/.env.local بگذارید"
else
  echo "  دامنه: ${SITE_URL}  |  mount بک‌اند: ${BACKEND_BASE:-/}"

  # توکن سرور-به-سرور: پراکسی‌های ما آن را می‌فرستند، پس اگر این اسکریپت هم
  # بفرستد، بررسی‌اش دقیقاً همان مسیری را می‌سنجد که سایت در زمان اجرا می‌رود.
  PROBE_TOKEN="${FRONTEND_TOKEN:-${BACKEND_TOKEN}}"
  http_status() {
    if [[ -n "${PROBE_TOKEN}" ]]; then
      curl -s -o /dev/null -w '%{http_code}' --max-time 15 \
        -H "X-Internal-Token: ${PROBE_TOKEN}" "$1" || echo "000"
    else
      curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$1" || echo "000"
    fi
  }

  # --- اپ Python مستقیماً
  CODE="$(http_status "${SITE_URL}${BACKEND_BASE}/api/v1/health/")"
  [[ "${CODE}" == "200" ]] \
    && ok "اپ Python: ${BACKEND_BASE}/api/v1/health/ → 200" \
    || bad "اپ Python: ${BACKEND_BASE}/api/v1/health/ → ${CODE} (mount یا Passenger را بررسی کنید)"

  # --- پراکسی Next → Django
  CODE="$(http_status "${SITE_URL}/api/v1/health/")"
  [[ "${CODE}" == "200" ]] \
    && ok "پراکسی Next → Django: /api/v1/health/ → 200" \
    || bad "پراکسی Next: /api/v1/health/ → ${CODE}"

  # --- health بدون توکن هم باید ۲۰۰ بدهد (مانیتور uptime روزی صدها بار صدا
  #     می‌زند؛ اگر ۴۲۹ بگیرد، هاست سالم را «دان» گزارش می‌کند).
  CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "${SITE_URL}${BACKEND_BASE}/api/v1/health/")"
  [[ "${CODE}" == "200" ]] \
    && ok "health بدون توکن → 200 (مانیتورینگ سالم است)" \
    || bad "health بدون توکن → ${CODE}؛ مانیتورینگ uptime خطای کاذب می‌دهد (کد قدیمی بک‌اند در حال اجراست؟)"

  # --- صفحهٔ اصلی
  HOME_STATUS="$(curl -s -o /tmp/preflight-home.html -w '%{http_code}' --max-time 20 "${SITE_URL}/" || echo 000)"
  [[ "${HOME_STATUS}" == "200" ]] \
    && ok "صفحهٔ اصلی → 200" \
    || bad "صفحهٔ اصلی → ${HOME_STATUS}"

  # --- محتوا واقعاً در HTML هست؟ (قوی‌ترین بررسی: عنوان اولین خدمت از API را
  #     در HTML بیلدشده می‌جوییم؛ اگر بیلد با بک‌اند خاموش انجام شده باشد،
  #     اسکلت صفحه هست ولی داده نه — و این همان «سایت خالی» است.)
  if [[ "${HOME_STATUS}" == "200" ]]; then
    SERVICE_TITLE="$(curl -s --max-time 15 -H "X-Internal-Token: ${PROBE_TOKEN}" "${SITE_URL}/api/v1/services/?page_size=1" \
      | python3 -c 'import json,sys
try:
    data = json.load(sys.stdin)
    print((data.get("results") or [{}])[0].get("title", ""))
except Exception:
    print("")' 2>/dev/null)"

    if [[ -z "${SERVICE_TITLE}" ]]; then
      warn "نشد عنوان خدمت را از API خواند؛ بررسی محتوای HTML انجام نشد"
    elif grep -qF -- "${SERVICE_TITLE}" /tmp/preflight-home.html; then
      ok "HTML صفحهٔ اصلی دادهٔ واقعی دارد (عنوان خدمت «${SERVICE_TITLE:0:40}» در آن هست)"
    else
      bad "HTML صفحهٔ اصلی محتوای API را ندارد → بیلد با بک‌اند خاموش یا توکن نامعتبر انجام شده؛ دوباره deploy_frontend.sh را اجرا کنید"
    fi
  fi

  # --- زبان دوم، سئو و فید
  CODE="$(http_status "${SITE_URL}/en")"
  [[ "${CODE}" == "200" ]] && ok "/en → 200" || bad "/en → ${CODE}"

  CODE="$(http_status "${SITE_URL}/sitemap.xml")"
  [[ "${CODE}" == "200" ]] && ok "/sitemap.xml → 200" || bad "/sitemap.xml → ${CODE}"

  CODE="$(http_status "${SITE_URL}/blog/rss")"
  [[ "${CODE}" == "200" ]] && ok "/blog/rss → 200" || bad "/blog/rss → ${CODE}"

  # --- استاتیک‌ها: اگر Apache مسیر /static را سرو نکند، ادمین بی‌استایل می‌شود
  CODE="$(http_status "${SITE_URL}${BACKEND_BASE}/admin/login/")"
  if [[ "${CODE}" == "200" ]]; then
    ok "ادمین: ${BACKEND_BASE}/admin/login/ → 200"
  else
    warn "ادمین: ${BACKEND_BASE}/admin/login/ → ${CODE} (اگر ادمین روی مسیر دیگری است، این بررسی را نادیده بگیرید)"
  fi
fi

# -----------------------------------------------------------------------------
printf '\n\033[1mخلاصه:\033[0m %d موفق، %d هشدار، %d شکست\n' "${PASS}" "${WARN}" "${FAIL}"
# -----------------------------------------------------------------------------
if [[ "${FAIL}" -gt 0 ]]; then
  echo "❌ استقرار «قطعی» نیست: موارد شکست‌خورده را رفع کنید و دوباره اجرا کنید."
  exit 1
fi

echo "✅ پیش‌پرواز سبز است. اگر هشدارها را هم بررسی کرده‌اید، سایت آمادهٔ ترافیک است."
