# وضعیت فیچرها — baseline پس از فازهای ۰ و ۱

**قاعده:** scaffold/contract به معنی محصول زنده نیست. تا تست پذیرش فیچر پیاده و پاس نشده، وضعیت «نساخته» می‌ماند.

| ID | فیچر | فاز برنامه | وضعیت در این branch | شاهد/گام بعد |
|---|---|---:|---|---|
| F-01 | محاسبات تاریخ شمسی | ۲ | منطق پایهٔ تاریخ/فرمت در `lib/jalali.ts`؛ ابزار UI/API ندارد | تست ۴ Vitest؛ ساخت ابزار فاز ۲ |
| F-02 | اعتبارسنج کد ملی | ۲ | نساخته | کارت F-02؛ صرفاً local checksum |
| F-03 | formatter تومان/حروف چک | ۲ | توابع پایه در `lib/toman.ts`؛ صفحه ندارد | تست ۴ Vitest؛ تکمیل لبه‌های رقم |
| F-04 | نرمال‌ساز فارسی | ۲ | نساخته | کارت F-04 |
| F-05 | JWT debugger | ۲ | نساخته | کارت F-05؛ مرورگرمحور و بدون log |
| F-06 | Passive scanner | ۳ | فقط مدل `ScanJob`/`ScanResult` و queue scaffolding | شش guard و probe safety پیش‌شرط‌اند؛ اسکنر فعال نیست |
| F-07 | Palette + terminal | ۲ | موجود در برنامهٔ فعلی فقط ناوبری legacy؛ فیچر تعریف‌شده کامل نیست | registry/API terminal/testهای کارت لازم |
| F-08 | دستیار RAG | ۳ | فقط مدل chunk/answer؛ provider/retrieval/endpoint ندارد | B7 و محتوای B6/B12؛ BM25 پیش از LLM |
| F-09 | Biolab | ۴ | ساختار خالی + مدل‌های آزمایشگاه/محتوا پایه | الگوریتم FASTA و UI/Web Worker بعداً |
| F-10 | Performance Lab | ۵ | نساخته | نیاز به دادهٔ واقعی build/observer |
| F-11 | پیشنهاد معماری | ۵ | نساخته | کارت F-11 |
| F-12 | OWASP Top 10 زنده | backlog | نساخته | sandbox ایزوله و اثبات تقاضا |
| F-13 | Telegram-first | ۵ | فیلد SiteConfig خالی/placeholder | B5 |
| F-14 | Capability matrix با evidence | ۵ | نساخته | هر capability نیازمند evidenceUrl |
| F-15 | استخدام challenge | backlog | نساخته | اجرای تست فقط در Worker/WASM |
| F-16 | Typography/OG lab | backlog | فونت self-host و OG metadata پایه، generator ندارد | کارت F-16 |
| F-17 | صفحهٔ شفافیت | backlog | نساخته | B11 و دادهٔ uptime واقعی |
| F-18 | LLM benchmark | backlog | نساخته | متدولوژی/dataset واقعی |
| F-19 | ابزارهای بیشتر | backlog | نساخته | هر ابزار نیازمند کارت اختصاصی |

## نتیجهٔ محصول
پس از فازهای ۰ و ۱، **هیچ‌یک از ۹ فیچر P0 کامل و آمادهٔ کاربر نهایی نیست**؛ این دو فاز platform-only هستند. قبل از لانچ نباید ادعای محصول زنده برای capabilityهای جدول مطرح شود.
