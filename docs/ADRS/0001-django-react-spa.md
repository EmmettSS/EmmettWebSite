# ADR-001 — Django API + React SPA

**وضعیت:** پذیرفته‌شده · ۲۰۲۶-۱۰-۰۱

## زمینه
فرانت‌اند Vite/React موجود است؛ میزبانی اشتراکی cPanel از WSGI پشتیبانی می‌کند ولی Node runtime ندارد.
## تصمیم
React خروجی static در `web/` و Django 5.2 + DRF در `api/`؛ API نسخه‌دار در `/api/v1/`. قرارداد OpenAPI با drf-spectacular و client type generation از schema.
## پیامدها
انتشار UI به Node در production وابسته نیست. توسعه دو پروسهٔ جداگانه دارد. API و admin روی Python App میزبانی می‌شوند؛ schema هر build باید تولید و drift آن با typeها بررسی شود.
