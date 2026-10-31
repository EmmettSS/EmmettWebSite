# ADR-0024: Adapter اعلان پیامکی (Kavenegar) با backend Mock برای dev/test

**وضعیت:** پذیرفته‌شده

## زمینه

`DISCOVERY.md` از ابتدا تصمیم گرفته بود که Kavenegar به‌صورت «adapter قابل‌تعویض» با کلید API در `.env` پیاده‌سازی شود. در زمان شروع فاز ۴ هیچ حساب/کلید واقعی Kavenegar در دسترس تیم فنی نیست (تأیید صریح مالک محصول). فرم تماس (آیتم ۶ بریف) باید همین حالا کار کند (ذخیرهٔ `Contact` + اعلان به تیم) بدون اینکه منتظر تهیهٔ حساب واقعی Kavenegar بماند.

## گزینه‌ها

1. **پیاده‌سازی مستقیم و قطعی کلاینت Kavenegar، بدون انتزاع:** اگر کلید نباشد، فرم تماس یا خطا می‌دهد یا پیامک اصلاً ارسال نمی‌شود — تجربهٔ شکننده در توسعه/تست و در هر دیپلویی که کلید هنوز تنظیم نشده.
2. **اینترفیس `NotificationBackend` با پیاده‌سازی‌های چندگانه قابل‌انتخاب از طریق env:** `KavenegarSMSBackend` (واقعی، فقط وقتی `KAVENEGAR_API_KEY` ست شده فعال می‌شود)، `ConsoleSMSBackend` (فقط لاگ ساختاریافته، برای dev)، `LoggingTestSMSBackend` (برای pytest — پیام‌ها را در یک لیست حافظه‌ای ذخیره می‌کند تا تست بتواند `assert` کند).

## تصمیم

گزینهٔ ۲. `apps/leads/notifications.py`:

```python
class SMSBackend(Protocol):
    def send(self, *, to: str, message: str) -> SMSResult: ...
```

- `KavenegarSMSBackend`: فراخوانی واقعی REST API کاوه‌نگار (`https://api.kavenegar.com/v1/{api_key}/sms/send.json`) با `requests`‌؛ فقط زمانی که `settings.KAVENEGAR_API_KEY` غیرخالی باشد قابل‌انتخاب است.
- `ConsoleSMSBackend` (پیش‌فرض dev): پیام را با `structlog` به‌صورت ساختاریافته لاگ می‌کند (`sms_would_send`)، هیچ تماس شبکه‌ای واقعی برقرار نمی‌کند.
- انتخاب backend در زمان اجرا: `get_sms_backend()` بر اساس `settings.KAVENEGAR_API_KEY` (اگر خالی → `ConsoleSMSBackend`، در غیر این صورت → `KavenegarSMSBackend`؛ در تست‌ها با `override_settings`/dependency injection مستقیماً `FakeSMSBackend` تزریق می‌شود).
- ایمیل همچنان کانال fallback (طبق فرض مستندشدهٔ `ARCHITECTURE.md` بخش ۹.۵) با `django.core.mail` استاندارد (`EmailBackend` از env، پیش‌فرض `console` در dev) باقی می‌ماند؛ ثبت `Contact` هر دو کانال (پیامک به تیم داخلی + رسید ایمیلی اختیاری به کاربر) را تلاش می‌کند، اما شکست هرکدام از این دو کانال اعلان، ذخیرهٔ خود `Contact` در دیتابیس را متوقف نمی‌کند (ثبت داده همیشه موفق‌تر/حیاتی‌تر از اعلان است).
- `requests` به‌عنوان وابستگی جدید اضافه شد (توجیه: سبک، استاندارد صنعتی برای فراخوانی REST API خارجی، مورد نیاز مستقیم برای کلاینت Kavenegar).

## دلیل

- محیط dev/test هرگز به یک سرویس SMS خارجی واقعی وابسته نیست؛ توسعه/CI بدون نیاز به کلید واقعی کاملاً کار می‌کند.
- وقتی کلید واقعی Kavenegar بعداً در `.env` production قرار بگیرد، هیچ تغییر کدی لازم نیست — فقط سوئیچ خودکار بر اساس وجود env var (همان الگوی `CACHE_BACKEND` در ADR-0006).
- جداسازی رابط (`Protocol`) امکان نوشتن تست واحد قطعی (deterministic) برای `apps/leads` بدون mock کردن شبکه را فراهم می‌کند.

## پیامدها

- وقتی حساب واقعی Kavenegar تهیه شود، فقط باید `KAVENEGAR_API_KEY` در `.env` production ست شود و رفتار واقعی (نه فقط لاگ کنسول) روی یک محیط staging تأیید شود؛ این تأیید باید قبل از اتکای کامل به این کانال در فرآیندهای حیاتی انجام شود.
- اگر در آینده کانال پیامکی دوم (مثلاً Ghasedak یا Melipayamak) اضافه شود، فقط کافی‌ست یک پیاده‌سازی جدید از `SMSBackend` اضافه شود؛ هیچ کد مصرف‌کننده (`apps/leads/views.py`) نیازی به تغییر ندارد.
