# =============================================================================
# نقطهٔ ورودی واحد پروژهٔ امیت (ADR-0041)
# =============================================================================
# پیش از این هیچ Makefile/اسکریپت واحدی نبود: هر توسعه‌دهنده باید دو ترمینال
# باز می‌کرد، ترتیب استارت را از README حدس می‌زد و «کندی» را از «بک‌اند خاموش»
# تشخیص نمی‌داد. هدف این فایل این است که «استارت پروژه» یک دستور باشد، مثل
# پروژه‌های بک‌اند-محور قبلی — با این تفاوت که Django منبع داده است و Next.js
# لایهٔ نمایش، پس ترتیب استارت همیشه Django → Next است.
#
#   make dev      # کل استک، حالت توسعه
#   make prod     # بیلد + اجرای production روی همین ماشین
#   make test     # تست‌های هر دو اپ
#   make verify   # دروازهٔ کامل: lint/typecheck/format/build/tests
# =============================================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

# مسیر نسبی است چون همهٔ مصرف‌ها بعد از `cd backend` اجرا می‌شوند.
PY := .venv/bin/python

.PHONY: help dev prod backend frontend setup test test-backend test-frontend \
        lint typecheck format format-check build verify verify-rendering bench clean

help:
	@echo "make dev               اجرای کل استک (Django + Next.js) در حالت توسعه"
	@echo "make prod              بیلد و اجرای production روی همین ماشین"
	@echo "make setup             نصب وابستگی‌های هر دو اپ + .env + مهاجرت + seed"
	@echo "make backend           فقط Django (runserver :8000)"
	@echo "make frontend          فقط Next.js (dev :3000)"
	@echo "make test              تست بک‌اند + فرانت‌اند"
	@echo "make lint              ruff/black + eslint"
	@echo "make typecheck         mypy + tsc"
	@echo "make format-check      prettier --check + ruff format --check"
	@echo "make build             بیلد production فرانت‌اند"
	@echo "make verify-rendering  بررسی این‌که صفحات محتوایی واقعاً pre-render می‌شوند"
	@echo "make bench             اندازه‌گیری TTFB/حجم HTML/JS روی سایت در حال اجرا"
	@echo "make verify            همهٔ دروازه‌های کیفیت (همان چیزی که CI اجرا می‌کند)"

setup:
	cd backend && python3.11 -m venv .venv && ./.venv/bin/pip install -q --upgrade pip && ./.venv/bin/pip install -q -r requirements-dev.txt
	cd backend && [ -f .env ] || cp .env.example .env
	cd frontend && npm ci
	cd frontend && [ -f .env.local ] || cp .env.example .env.local
	cd backend && $(PY) manage.py migrate --noinput && $(PY) manage.py seed_demo_data

dev:
	./scripts/dev.sh

prod:
	PROD=1 ./scripts/dev.sh

backend:
	cd backend && $(PY) manage.py runserver 0.0.0.0:8000

frontend:
	cd frontend && npm run dev

test: test-backend test-frontend

test-backend:
	cd backend && $(PY) -m pytest -q

test-frontend:
	cd frontend && npm run test

lint:
	cd backend && ./.venv/bin/ruff check . && ./.venv/bin/black --check .
	cd frontend && npm run lint

typecheck:
	cd backend && ./.venv/bin/mypy apps config
	cd frontend && npm run typecheck

format:
	cd backend && ./.venv/bin/ruff format . && ./.venv/bin/black .
	cd frontend && npm run format

format-check:
	cd backend && ./.venv/bin/ruff format --check . && ./.venv/bin/black --check .
	cd frontend && npm run format:check

build:
	cd frontend && npm run build

verify-rendering:
	cd frontend && npm run verify:rendering

# اعداد مستندات (docs/audit) از همین دستور می‌آیند؛ سایت باید بالا باشد.
bench:
	cd frontend && node scripts/measure-perf.mjs

verify: format-check lint typecheck test build verify-rendering
	@echo "✅ همهٔ دروازه‌های کیفیت سبز است"

clean:
	rm -rf frontend/.next frontend/coverage backend/.pytest_cache backend/htmlcov
