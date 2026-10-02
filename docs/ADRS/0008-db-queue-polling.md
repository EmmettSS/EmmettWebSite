# ADR-008 — صف DB + Chunked Polling

**وضعیت:** پذیرفته‌شده · ۲۰۲۶-۱۰-۰۱

## زمینه
WebSocket/streaming و processهای پایدار در cPanel حاضر نیستند.
## تصمیم
job در جدول با pending/running/done/failed ذخیره می‌شود؛ cPanel cron اجرای bounded worker را آغاز می‌کند. API polling با offset فقط گام‌های تازه را می‌دهد و پاسخ کوتاه است. Claim با `select_for_update(skip_locked=True)` روی MariaDB طراحی شده؛ race test در SQLite به دلیل نبود این قابلیت skip می‌شود.
## پیامدها
فاصلهٔ polling و تعداد گام‌ها باید محدود باشند. حد timeout اپلیکیشن نمی‌تواند thread پایتون را از یک syscall blocking متوقف کند؛ handlerها موظف‌اند timeout داخلی داشته باشند.

### الگوی کد
```python
job = Job.objects.filter(state="pending").order_by("created_at").select_for_update(skip_locked=True).first()
# Set RUNNING + locked_at inside the same transaction, then execute a bounded handler.
```
`apps/jobs/runner.py` و `apps/jobs/polling.py` پیاده‌سازی پایه را دارند.
