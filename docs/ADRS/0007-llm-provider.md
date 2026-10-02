# ADR-007 — انتزاع provider مدل زبانی

**وضعیت:** پذیرفته‌شده برای طراحی؛ پیاده‌سازی فاز ۳

## زمینه
دسترسی/پرداخت provider از ایران ناپایدار است؛ cPanel نباید inference سنگین اجرا کند.
## تصمیم
کد assistant فقط از interface داخلی Provider استفاده می‌کند؛ provider HTTPS بیرونی پشت config و budget limits. fallback BM25/keyword روی chunks محلی، پاسخ بدون ارجاع ممنوع و محتوای کاربر بدون رضایت log نمی‌شود.
## پیامدها
هیچ credential/provider در این فاز لازم نیست. [INPUT B7] را پیش از اجرای F-08 بگیرید؛ بدون آن fallback شفاف باقی می‌ماند.
