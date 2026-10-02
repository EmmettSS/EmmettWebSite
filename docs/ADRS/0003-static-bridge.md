# ADR-003 — Static Bridge برای SEO

**وضعیت:** پذیرفته‌شده · ۲۰۲۶-۱۰-۰۱

## زمینه
SPA بدون JS محتوای اصلی/metadata قابل crawl تضمین نمی‌کند و cPanel برای headless browser مناسب نیست.
## تصمیم
Marketing routes در build/CI به HTML static تبدیل می‌شوند؛ جزئیات DB-driven از Django template در لحظهٔ publish/cron تولید می‌شوند. هیچ Chromium/Puppeteer روی cPanel اجرا نمی‌شود. هر سند خروجی باید canonical، fa/en hreflang، OG، JSON-LD و متن اصلی را داشته باشد.
## پیامدها
تغییر copy مستلزم rebuild یا rerender است. مسیرهای static باید با URL rewrite درست به فایل index برسند.

### الگوی کد
```python
# Django command: build only from published records
for post in Post.objects.filter(status="published"):
    for locale in ("fa", "en"):
        html = render_to_string("core/content.html", context_for(post, locale))
        write_atomically(output_path(locale, post.slug), html)
```
`api/apps/core/management/commands/render_public_html.py` نمونهٔ اجرایی اولیه است.
