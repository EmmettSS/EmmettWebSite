#!/usr/bin/env bash
# =============================================================================
# بیلد و استقرار فرانت‌اند Next.js 16 روی هاست cPanel (ADR-0036 + ADR-0041)
# =============================================================================
# از ADR-0041 به بعد، صفحه‌های محتوایی **در زمان بیلد** pre-render می‌شوند و
# دادهٔ آن‌ها از Django خوانده می‌شود. این دو پیامد عملی دارد که همین فایل
# رعایتشان می‌کند:
#
#   ۱) بک‌اند باید **قبل از** بیلد بالا و سالم باشد. اگر نباشد، صفحه‌ها با
#      محتوای پیش‌فرض ساخته می‌شوند و اولین بازدیدکننده‌ها (و خزنده‌های گوگل)
#      صفحهٔ خالی می‌بینند. پس این اسکریپت تا سالم‌شدن health صبر می‌کند.
#
#   ۲) فراخوانی‌های بیلد باید با هدر X-Internal-Token بروند. بدون توکن، همهٔ
#      آن‌ها در سطل throttle ناشناس (۱۰۰ درخواست/ساعت) می‌افتند؛ بیلد ۶۱ صفحه
#      بیش از ۱۰۰ فراخوانی دارد، پس بخشی از صفحه‌ها با 429 خالی ساخته می‌شوند
#      — بی‌آنکه بیلد شکست بخورد. اندازه‌گیری‌شده روی همین مخزن:
#      150 درخواست بدون توکن → 100×200 + 50×429؛ همان 150 با توکن → 150×200.
#      پس توکن اجباری است، نه توصیه.
#
# کاربرد:
#   bash scripts/deploy_frontend.sh [--install-deps]
#
# متغیرهای لازم (از env یا از فایل‌های .env.local / backend/.env خوانده می‌شوند):
#   PUBLIC_SITE_URL       دامنهٔ canonical، بدون اسلش پایانی
#   INTERNAL_API_URL      mount اپ Python، مثل https://<domain>/backend
#   INTERNAL_API_TOKEN    همان مقدار ثبت‌شده در اپ Python
# =============================================================================

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
FRONTEND_DIR="${REPO_ROOT}/frontend"
BACKEND_DIR="${REPO_ROOT}/backend"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-90}"

INSTALL_DEPS=false
for arg in "$@"; do
  case "${arg}" in
    --install-deps) INSTALL_DEPS=true ;;
    -h|--help)
      echo "Usage: bash scripts/deploy_frontend.sh [--install-deps]"
      exit 0
      ;;
    *)
      echo "[ERROR] آرگومان ناشناخته: ${arg}" >&2
      exit 1
      ;;
  esac
done

die() { echo "[ERROR] $*" >&2; exit 1; }
info() { echo "==> $*"; }

# مقدار یک کلید را از فایل .env می‌خواند (آخرین تعریف برنده است).
read_env_file() {
  local file="$1" key="$2"
  [[ -f "${file}" ]] || return 0
  # پاک‌کردن CRLF برای فایل‌هایی که با ویرایشگر ویندوز ساخته شده‌اند.
  tr -d '\r' < "${file}" | sed -n "s/^${key}=//p" | tail -n 1
}

cd "${FRONTEND_DIR}"

info "[1/6] آماده‌سازی فایل ورودی Passenger Node.js..."
mkdir -p "${FRONTEND_DIR}/tmp"
if [[ ! -f "${FRONTEND_DIR}/server.js" ]]; then
  cp "${FRONTEND_DIR}/deploy/server.js.example" "${FRONTEND_DIR}/server.js"
fi

info "[2/6] بررسی متغیرهای محیطی اجباری (ADR-0041)..."
PUBLIC_SITE_URL="${PUBLIC_SITE_URL:-$(read_env_file "${FRONTEND_DIR}/.env.local" PUBLIC_SITE_URL)}"
INTERNAL_API_URL="${INTERNAL_API_URL:-$(read_env_file "${FRONTEND_DIR}/.env.local" INTERNAL_API_URL)}"
INTERNAL_API_TOKEN="${INTERNAL_API_TOKEN:-$(read_env_file "${FRONTEND_DIR}/.env.local" INTERNAL_API_TOKEN)}"
INTERNAL_API_TOKEN="${INTERNAL_API_TOKEN:-$(read_env_file "${BACKEND_DIR}/.env" INTERNAL_API_TOKEN)}"

[[ -n "${PUBLIC_SITE_URL}" ]] || die "PUBLIC_SITE_URL تنظیم نشده است (دامنهٔ canonical بدون اسلش پایانی)."
[[ -n "${INTERNAL_API_URL}" ]] || die "INTERNAL_API_URL تنظیم نشده است (مثلاً https://<domain>/backend)."
if [[ -z "${INTERNAL_API_TOKEN}" ]]; then
  cat >&2 <<'MSG'
[ERROR] INTERNAL_API_TOKEN خالی است و بیلد متوقف شد.

چرا اجباری است؟ صفحه‌های محتوایی در بیلد از Django خوانده می‌شوند و بدون این
توکن، همهٔ آن فراخوانی‌ها در سقف throttle ناشناس (۱۰۰ درخواست در ساعت) می‌افتند.
بیلد ۶۱ صفحه بیش از ۱۰۰ فراخوانی دارد، پس بخشی از صفحه‌ها با پاسخ 429 و
**محتوای خالی** ساخته می‌شوند؛ بیلد با موفقیت تمام می‌شود و سایت خالی بالا
می‌آید. اندازه‌گیری‌شده: ۱۵۰ فراخوانی بدون توکن → ۱۰۰ موفق + ۵۰ خطای 429.

ساخت و ثبت توکن:
  python3 -c "import secrets; print(secrets.token_urlsafe(50))"
سپس همان مقدار را در هر دو جا بگذارید:
  - Setup Python App  → Environment Variables → INTERNAL_API_TOKEN
  - Setup Node.js App → Environment Variables → INTERNAL_API_TOKEN
(یا در frontend/.env.local و backend/.env، با مجوز 600؛ هر دو در .gitignore هستند.)

نکته: مقدار توکن را در دو اپ **یکسان** بگذارید؛ در غیر این صورت بک‌اند آن را
نمی‌پذیرد و همان رفتار 429 تکرار می‌شود.
MSG
  exit 1
fi

PUBLIC_SITE_URL="${PUBLIC_SITE_URL%/}"
INTERNAL_API_URL="${INTERNAL_API_URL%/}"
HEALTH_URL="${INTERNAL_API_URL}/api/v1/health/"

# اگر خود اپ Node هم توکن ندارد، بیلد کار می‌کند اما ISR در زمان اجرا خالی
# می‌شود؛ این هشدار آن حالت را قابل‌تشخیص می‌کند.
NODE_ENV_TOKEN="$(read_env_file "${FRONTEND_DIR}/.env.local" INTERNAL_API_TOKEN)"
if [[ -z "${NODE_ENV_TOKEN}" ]]; then
  echo "[WARN] INTERNAL_API_TOKEN فقط در env این شل بود، نه در frontend/.env.local." >&2
  echo "       مطمئن شوید همین متغیر در Setup Node.js App → Environment Variables هم ثبت شده؛" >&2
  echo "       در غیر این صورت ISR در زمان اجرا هم 429 می‌گیرد." >&2
fi

echo "    PUBLIC_SITE_URL   = ${PUBLIC_SITE_URL}"
echo "    INTERNAL_API_URL  = ${INTERNAL_API_URL}"
echo "    INTERNAL_API_TOKEN= ${INTERNAL_API_TOKEN:0:6}… (${#INTERNAL_API_TOKEN} کاراکتر)"

info "[3/6] بررسی سالم‌بودن بک‌اند پیش از بیلد (${HEALTH_URL})..."
ready=false
for _ in $(seq 1 "${HEALTH_TIMEOUT_SECONDS}"); do
  # هدر توکن هم فرستاده می‌شود: اگر نسخهٔ قدیمی بک‌اند (بدون معافیت health از
  # throttle) هنوز در حال اجراست، این پروب نباید در سطل ناشناس بیفتد و بیلد را
  # بی‌دلیل متوقف کند. نسخه‌های جدید به توکن هم نیازی ندارند.
  if curl -fsS --max-time 3 -H "X-Internal-Token: ${INTERNAL_API_TOKEN}" "${HEALTH_URL}" >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done

if [[ "${ready}" != "true" ]]; then
  cat >&2 <<MSG
[ERROR] بک‌اند در ${HEALTH_TIMEOUT_SECONDS} ثانیه سالم نشد و بیلد متوقف شد.

اگر بیلد بدون بک‌اند انجام شود، ۶۱ صفحه با محتوای پیش‌فرض ساخته می‌شوند و
سایت تا نخستین revalidate (۶۰ ثانیه پس از اولین بازدید) خالی می‌ماند.

بررسی کنید:
  1) اپ Python در cPanel ساخته و Restart شده باشد.
  2) curl -i ${HEALTH_URL}
  3) اگر mount بک‌اند جایی جز /backend است، INTERNAL_API_URL را اصلاح کنید.
  4) اگر هاست درخواست HTTPS از خودش به خودش را مسدود می‌کند، آدرس داخلی
     قابل‌استفاده را از پشتیبانی هاست بگیرید و همان را بدهید.
  5) برای عبور موقت از این بررسی (فقط برای عیب‌یابی، نه استقرار):
     HEALTH_TIMEOUT_SECONDS=0 bash scripts/deploy_frontend.sh
MSG
  exit 1
fi
echo "    بک‌اند سالم است."

info "[4/6] نصب پکیج‌های Node.js از package-lock.json (npm ci)..."
if [[ "${INSTALL_DEPS}" == "true" || ! -d "${FRONTEND_DIR}/node_modules" ]]; then
  npm ci
else
  echo "    node_modules موجود است (برای نصب مجدد --install-deps بدهید)."
fi

# کش ISR در زمان اجرا در .next/cache نوشته می‌شود؛ اگر Passenger اجازهٔ نوشتن
# نداشته باشد، هر بازدید یک رندر کامل است و «کندی» برمی‌گردد.
mkdir -p "${FRONTEND_DIR}/.next"
if ! touch "${FRONTEND_DIR}/.next/.write-test" 2>/dev/null; then
  die "پوشهٔ frontend/.next قابل نوشتن نیست؛ کش ISR کار نمی‌کند. مجوز پوشه را اصلاح کنید."
fi
rm -f "${FRONTEND_DIR}/.next/.write-test"

export NODE_ENV="production"
export PUBLIC_SITE_URL
export INTERNAL_API_URL
export INTERNAL_API_TOKEN

info "[5/6] بیلد پروداکشن Next.js (PUBLIC_SITE_URL=${PUBLIC_SITE_URL})..."
rm -rf "${FRONTEND_DIR}/.next"
npm run build

info "      گارد رگرسیون ADR-0041: بررسی این‌که صفحه‌های محتوایی واقعاً pre-render شده‌اند..."
if ! npm run --silent verify:rendering; then
  cat >&2 <<'MSG'

[ERROR] بیلد انجام شد اما صفحه‌های محتوایی pre-render نشده‌اند؛ استقرار متوقف شد.

این همان رگرسیونی است که ADR-0041 بست: صفحه‌ای که در هر درخواست رندر می‌شود
یعنی هر بازدید یک رندر کامل + چند فراخوانی Django.

علت‌های رایج: بازگشت headers()/cookies()/connection()/searchParams به یک layout
یا صفحهٔ عمومی، یا force-dynamic، یا خاموش‌بودن بک‌اند در زمان بیلد.
MSG
  exit 1
fi

info "[6/6] سیگنال ری‌استارت بدون قطعی به Phusion Passenger (tmp/restart.txt)..."
touch "${FRONTEND_DIR}/tmp/restart.txt"

cat <<MSG

✔ بیلد و استقرار فرانت‌اند کامل شد.
  مسیر      : ${FRONTEND_DIR}
  دامنه     : ${PUBLIC_SITE_URL}
  بک‌اند    : ${INTERNAL_API_URL}
  ری‌استارت : ${FRONTEND_DIR}/tmp/restart.txt

قدم بعدی (اجباری): در cPanel → Setup Node.js App روی Restart بزنید، سپس:
  bash scripts/preflight_cpanel.sh --url ${PUBLIC_SITE_URL}
MSG
