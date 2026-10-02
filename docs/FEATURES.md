# وضعیت فیچرها — پس از فاز ۳

**قاعده:** scaffold/contract به معنی محصول زنده نیست. تا تست پذیرش فیچر پیاده و پاس نشده، وضعیت «نساخته» می‌ماند.

| ID | فیچر | فاز برنامه | وضعیت در این branch | شاهد/گام بعد |
|---|---|---:|---|---|
| F-01 | محاسبات تاریخ شمسی | ۲ | **زنده** — ابزار `/fa/tools/tarikh-shamsi/`، سه تب (تبدیل/محاسبات/انبوه)، URL-state، هفت تست منطق + `jalali:check` (۴۷۴۸ تاریخ با ICU) |
| F-02 | اعتبارسنج کد ملی | ۲ | **زنده** — `/fa/tools/kod-meli/`، checksum محلی بدون هیچ lookup، گام‌به‌گام، ۹ تست + دو تست امنیتی (بدون شبکه) |
| F-03 | formatter تومان/حروف چک | ۲ | **زنده** — `/fa/tools/toman/`، BigInt خالص، حروف‌نویسی چک، فاکتور و ریال؛ ۱۰ تست |
| F-04 | نرمال‌ساز فارسی | ۲ | **زنده** — `/fa/tools/matn-farsi/`، diff زندهٔ متن‌محور، نیم‌فاصلهٔ محافظه‌کار، idempotent؛ ۸ تست + تست عدم تزریق HTML |
| F-05 | JWT debugger | ۲ | **زنده** — `/fa/tools/jwt/`، decode کامل سمت مرورگر، هشدارهای CWEدار، بدون لاگ/ذخیره؛ ۸ تست + تست عدم لاگ توکن |
| F-06 | Passive scanner | ۳ | **زنده** — `/fa/tools/check-security/`، شش بخش و گرید A–F، موتور روی صف cron، دو serializer (عمومی mask‌شده)، لینک دائمی `noindex` با TTL ۷ روز، CTA به PenTestor با رویداد Matomo | ۲۸ تست API شامل چهار تست سخت‌گیر نگهبان (پورت ۸۰/۴۴۳، blocklist پیش از job، ماسک، noindex) |
| F-07 | Palette + terminal | ۲ | **زنده** — registry واحد، ⌘K/Ctrl+K، راهنمای `?`، ترمینال allow-list با `kod/toman/jalali/normalize/tools/team/projects/status/theme/lang/open/help`، تست `eval(\"alert(1)\")` |
| F-08 | دستیار RAG | ۳ | **زنده با BM25** — کورپوس ۱۳۸ chunk از محتوای همین مخزن، lookup+استناد، آستانه پیش از LLM، کش پرسش، فیلتر «بدون استناد نمایش نده»، صفحهٔ `/fa/assistant/` + ویجت شناور، اتصال به ترمینال (`ask`). provider مدل زبانی: `NullProvider` تا ورود B7 | ۲۰ تست API (شامل «هیچ تماسی با LLM») + ۱۰ تست قرارداد/کپی؛ `docs/AI-OPS.md` |
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
پس از فاز ۳، هشت فیچر P0 (F-01..F-08) زنده و تست‌شده‌اند. F-08 در حالت BM25 ship شده است؛ مدل زبانی وقتی B7 (دسترسی provider/کلید/سقف بودجه) برسد با یک متغیر محیطی و بدون تغییر کد فعال می‌شود. ادعا فقط برای چیزی مطرح می‌شود که artifact زنده و تست دارد (G1).
