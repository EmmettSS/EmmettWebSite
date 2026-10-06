# Emmett Software Development Group — Official Bilingual Platform

> **نسخهٔ فارسی README:** [`README.md`](./README.md)  
> **Unified Technical Documentation (English — Single File):** [`docs/TECHNICAL_DOCUMENTATION.en.md`](./docs/TECHNICAL_DOCUMENTATION.en.md)  
> **مستندات فنی یکپارچه (فارسی — تک‌فایلی):** [`docs/TECHNICAL_DOCUMENTATION.fa.md`](./docs/TECHNICAL_DOCUMENTATION.fa.md)

This repository is the production **Monorepo** for the bilingual (Persian/English) website of **Emmett Software Development Group**, combining a **Next.js 16 (App Router, SSR)** frontend in `frontend/` with a **Django 5.2 + Django REST Framework** modular monolith backend in `backend/`.

---

## Documentation Index

| Document | Description |
|---|---|
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | **cPanel Deployment Runbook (Phase 9 — Persian):** Single-domain setup, `deploy_backend.sh`, `deploy_frontend.sh`, `restore_backup.sh`, `.env` reference, and Go-Live checklist |
| [`docs/TECHNICAL_DOCUMENTATION.en.md`](./docs/TECHNICAL_DOCUMENTATION.en.md) | **Single-File Comprehensive Technical Documentation (English):** System Architecture, 36 ADRs, Full REST API Reference, Admin Guide, cPanel Deployment Guide, and CI/CD |
| [`docs/TECHNICAL_DOCUMENTATION.fa.md`](./docs/TECHNICAL_DOCUMENTATION.fa.md) | **Single-File Comprehensive Technical Documentation (Persian)** |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Domain boundaries, ERD, and ADR index (`ADR-0001` through `ADR-0036`) |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Engineering standards, the 20 Hard Rules, Conventional Commits, and PR review checklist |
| [`CHANGELOG.md`](./CHANGELOG.md) | Project release history with Conventional Commits |

---

## Key Capabilities

- **Bilingual i18n & RTL/LTR by Design:** Persian default at `/` (`dir="rtl"`, Jalali calendar via `jdatetime`/`jalaliday`, Persian numerals) and English at `/en` (`dir="ltr"`, Gregorian calendar, Latin numerals).
- **Emerald / Obsidian Design System:** Self-hosted typography (`Vazirmatn`, `Inter`, `JetBrains Mono`), Dark/Light theme support, WCAG AA accessibility, and live `/design-system` showcase.
- **Full Content, Academy & CRM Suite:** Services, Portfolio with 7-section Case Studies, Flagship Products (`Pentestor`, `CRM`), Academy Courses with student enrollment, Library (Blog) with auto-generated TOC & moderated comments, and ranked Full-Text Search.
- **Centralized AI Engine (`ai_engine`):** Closed-enum Creative Advisor (up to 3 concepts with revocable share tokens), deterministic minimum working-day Project Estimator (no monetary price), admin-reviewed Blog Summaries, and Iranian cultural guardrails.
- **SaaS-Grade Admin Panel:** Custom Jazzmin theme with scoped RTL, cached KPI dashboard with 8-week SVG trend charts, bulk publication & soft-delete restore workflows, two-step CSV/TSV/JSON import/export with Formula Injection protection, and mandatory TOTP 2FA with recovery codes.
- **Technical SEO & Security Hardening:** Dynamic `sitemap.xml`, `robots.txt`, 6 JSON-LD schema types, dynamic `1200×630` OpenGraph images, RSS 2.0 feeds, admin-managed `301/302/410` redirects, dual-policy CSP, brute-force login lockout (`429`), and automated `backup_db` management command.

---

## Quick Start (Local Development)

### 1. Backend (`backend/`)

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements-dev.txt

cp .env.example .env
python manage.py migrate
python manage.py seed_demo_data
python manage.py runserver
```

- OpenAPI Swagger UI: `http://127.0.0.1:8000/api/v1/schema/swagger-ui/`
- OpenAPI ReDoc: `http://127.0.0.1:8000/api/v1/schema/redoc/`
- Admin Panel: `http://127.0.0.1:8000/admin/`

### 2. Frontend (`frontend/`)

```bash
cd frontend
npm ci
npm run dev
```

- Persian (default): `http://localhost:3000/`
- English: `http://localhost:3000/en`

---

## Quality Gates & Testing (Phase 8)

 Both backend and frontend enforce a minimum **85% test coverage gate** (current coverage: **92% backend**, **97.7% frontend**):

```bash
# Run all pre-commit hooks across the repository
backend/.venv/bin/pre-commit run --all-files

# Backend quality & test suite
cd backend && source .venv/bin/activate
ruff check . && ruff format --check . && black --check .
mypy apps config
bandit -c pyproject.toml -r apps config -ll
python scripts/i18n.py check
coverage run -m pytest -q && coverage report --fail-under=85 -m

# Frontend quality & test suite
cd ../frontend
npm run format:check && npm run lint && npm run typecheck
npm run test:coverage
npm run build
```

For the complete **cPanel Shared Hosting Deployment Guide** and **REST API Reference**, see [`docs/TECHNICAL_DOCUMENTATION.en.md`](./docs/TECHNICAL_DOCUMENTATION.en.md).
