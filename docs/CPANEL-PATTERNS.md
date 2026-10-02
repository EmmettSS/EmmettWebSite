# الگوهای cPanel

## محدودیت‌های پایه
بدون Docker/Node runtime/Redis/Celery/WebSocket/daemon یا headless browser در production.

## Queue + cron
`Job` در DB نگهداری می‌شود. Cron اجرای bounded `manage.py process_jobs` را شروع می‌کند. claim با transaction + `select_for_update(skip_locked=True)` برای MariaDB/MySQL؛ stale running بعد از timeout بازمی‌گردد. SQLite برای dev/test ساده است و race semantics را تضمین نمی‌کند؛ race test باید روی MySQL واقعی اجرا شود.

## Polling
`PollableJobView` `progress[offset:]` و `offset_next` می‌دهد؛ polling پاسخ JSON کوتاه است، نه HTTP streaming. مالکیت/authorization jobهای حساس باید در feature API اضافه شود.

## Email outbox
lead و outbox message در تراکنش واحد نوشته می‌شوند؛ `send_outbox` با cron می‌فرستد و retry/backoff دارد. کلید SMTP فقط environment است.

## Static Bridge
مقاله/کیس/موقعیت شغلی منتشرشده به دو locale با Django template نوشته می‌شود. `STATIC_BRIDGE_DIR` مسیر خروجی را تعیین می‌کند؛ Puppeteer فقط در CI/فرآیند build مجاز است.

## فایل/کش/طول درخواست
محتوا در filesystem و Django/WhiteNoise؛ no Redis. درخواست HTTP باید کوتاه باشد؛ محاسبات طولانی به queue منتقل شود. هر handler network timeout خودش را تعیین کند.
