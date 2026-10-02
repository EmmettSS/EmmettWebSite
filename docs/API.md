# API v1 — شروع سریع

سرور محلی: `cd api && python manage.py runserver 0.0.0.0:8000`

```bash
curl http://localhost:8000/api/v1/health/
curl 'http://localhost:8000/api/v1/public/posts/?lang=fa'
curl -X POST http://localhost:8000/api/v1/leads/contact/ \
  -H 'Content-Type: application/json' \
  -d '{"name":"نام","email":"person@example.org","message":"پیام","locale":"fa","website":""}'
```

Schema در `/api/schema/`، Swagger در `/api/docs/`. OpenAPI صادرشده هنگام اجرای `python manage.py spectacular --file schema.yml` در `api/schema.yml` نگهداری می‌شود؛ TS generator فرانت‌اند با `pnpm --filter @emmett/web api:types` اجرا می‌شود.

## Endpoints پیاده‌سازی‌شده
- `GET /api/v1/health/`
- `GET /api/v1/public/tools/` (honest empty catalog until Phase 2 tools ship)
- `GET /api/v1/public/posts/`, `/public/case-studies/`, `/public/team/`, `/site-config/`
- `GET /api/v1/content/posts/`, `/case-studies/`, `/jobs/`, `/sitemap.xml`, `/feed.xml`
- `POST /api/v1/leads/contact/`, `/leads/newsletter/`, `/leads/waitlist/`

قراردادهای ابزار، اسکنر، دستیار، share IDs، job creation/poll endpoints هنوز feature phaseهای بعد هستند و نباید به‌عنوان endpoint زنده معرفی شوند.
