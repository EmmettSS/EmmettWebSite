#!/usr/bin/env bash
# =============================================================================
# اسکریپت بیلد و استقرار فرانت‌اند Next.js 16 روی هاست cPanel (فاز ۹ — ADR-0036)
# =============================================================================
# کاربرد:
#   bash scripts/deploy_frontend.sh [--install-deps]
# =============================================================================

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
FRONTEND_DIR="${REPO_ROOT}/frontend"

INSTALL_DEPS=false
for arg in "$@"; do
  case "${arg}" in
    --install-deps)
      INSTALL_DEPS=true
      ;;
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

cd "${FRONTEND_DIR}"

echo "==> [1/4] آماده‌سازی فایل ورودی Passenger Node.js..."
mkdir -p "${FRONTEND_DIR}/tmp"
if [[ ! -f "${FRONTEND_DIR}/server.js" ]]; then
  cp "${FRONTEND_DIR}/deploy/server.js.example" "${FRONTEND_DIR}/server.js"
fi

if [[ "${INSTALL_DEPS}" == "true" || ! -d "${FRONTEND_DIR}/node_modules" ]]; then
  echo "==> [2/4] نصب قطعی پکیج‌های Node.js از روی package-lock.json (npm ci)..."
  npm ci
else
  echo "==> [2/4] استفاده از node_modules موجود (برای نصب مجدد --install-deps بدهید)."
fi

export NODE_ENV="production"
export PUBLIC_SITE_URL="${PUBLIC_SITE_URL:-https://emmett.ir}"
export INTERNAL_API_URL="${INTERNAL_API_URL:-http://127.0.0.1:8000}"

echo "==> [3/4] بیلد پروداکشن Next.js (PUBLIC_SITE_URL=${PUBLIC_SITE_URL})..."
npm run build

echo "==> [4/4] سیگنال ری‌استارت بدون قطعی به Phusion Passenger (tmp/restart.txt)..."
touch "${FRONTEND_DIR}/tmp/restart.txt"

echo "✔ بیلد و آماده‌سازی فرانت‌اند با موفقیت کامل انجام شد."
