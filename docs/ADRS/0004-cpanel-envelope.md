# ADR-004 — پاکت cPanel

**وضعیت:** پذیرفته‌شده · ۲۰۲۶-۱۰-۰۱

## زمینه
تیم cPanel اشتراکی را الزام کرده؛ نسخهٔ سرویس/دسترسی هنوز از B2 دریافت نشده است.
## تصمیم
بدون Docker، Node runtime، Redis، Celery، WebSocket یا daemon. Worker با cron و صف دیتابیس؛ ایمیل با outbox و cron؛ build/رندر سنگین در CI؛ فایل‌ها filesystem/WhiteNoise؛ SQLite برای تست و MariaDB/MySQL برای تولید.
## پیامدها
هر کار طولانی به job + polling شکسته می‌شود. نسخه‌های واقعی Python/MySQL cPanel پیش از deploy باید تأیید شوند؛ فعلاً [INPUT B2] blocker استقرار است.
