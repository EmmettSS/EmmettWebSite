# حداقل امنیت پلتفرم

- ورودی‌ها با DRF serializers و سقف طول validate می‌شوند؛ فرم‌های public دارای honeypot و 5/hour/IP throttle هستند.
- Django CSRF middleware برای session/admin و middlewareهای security header فعال‌اند؛ production با `DEBUG=false` HTTPS/HSTS فعال می‌کند.
- هیچ user code در server اجرا نمی‌شود؛ secrets از env می‌آیند.
- فایل کاربر در API فعلی پذیرفته نمی‌شود؛ قابلیت upload باید با allowlist mime/size و نام تولیدی اضافه شود.
- محتوای AI/اسکنر در این فاز اجرا نشده؛ قبل از فعال‌سازی باید safety guards، consent/disclaimer، هزینه/rate caps، timeoutهای خروجی و عدم ثبت متن prompt پیاده شود.
- Privacy/legal content هنوز ورودی B9 است.
