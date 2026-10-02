# وضعیت فیچرها — پس از فاز ۴

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
| F-09 | Biolab (میز کار بیوانفورماتیک) | ۴ | **زنده** — `/fa/biolab/` و `/en/biolab/`؛ چهار تب (تحلیل، تبدیل، خط لوله، FHIR نمونه)؛ منطق خالص در `logic.ts` + Web Worker با مسیر chunked؛ سه حالت نمایشگر (تعاملی/ساده/جدول)؛ نمونهٔ مرجع عمومی MN908947.3؛ اعداد خط لوله فقط از `SiteConfig` | ۱۷ تست منطق + ۳ تست runner (توالی ۱ مگابایتی با اندازه‌گیری) + jsdom برای نگهبان‌ها + ۱۱ تست API؛ `docs/PHASE-4-REPORT.md` |
| F-10 | Performance Lab | ۵ | **زنده** — `/fa/lab/performance/` و `/en/lab/performance/`؛ سه کارت Device Tier (با دلیل انتخاب)، vitals واقعی از PerformanceObserver، نمودار FPS در حالت `full`/`balanced` و جدول اعداد در `low-power`؛ آمار باندل فقط از `public/data/bundle-stats.json` که CI با `budget --emit` می‌سازد و اگر نباشد پیام «در انتظار دادهٔ CI» می‌آید (هیچ عددی حدس زده نمی‌شود) | ۹ تست `metrics.test.ts` + گیت بودجهٔ CI؛ `docs/LAUNCH-REPORT.md` |
| F-11 | پیشنهاد معماری | ۵ | **زنده** — `/fa/architect/` و `/en/architect/`؛ گراف قواعد (نه لیست hard-code) که معماری، استک، ریسک‌ها، اندازهٔ تیم و بازهٔ هزینه (میلیون تومان/نفر-هفته با نسخهٔ `architect-cost-1405.1`) را از ورودی‌ها می‌سازد؛ دیاگرام SVG قطعی؛ پیشنهاد در URL قابل بازگشت و اشتراک | ۶ تست `rules.test.ts` (سه سناریو → سه امضا، یال‌ها زیرمجموعهٔ گره‌ها، ≥۳ دلیل) |
| F-12 | OWASP Top 10 زنده | backlog | **عمداً ساخته نشد** — اجرای payload زنده نیازمند sandbox ایزوله و اثبات تقاضا است؛ ساخت نسخهٔ ناایمن، نقض §۷ (هیچ کد کاربر سمت سرور اجرا نمی‌شود) می‌بود؛ جایگزین صادقانه: F-06 اسکنر passive + صفحهٔ امنیت | `docs/OPEN-ITEMS.md` (تصمیم محصول) |
| F-13 | Telegram-first | ۵ | **زنده با ورودی باز** — `TelegramCta` در خانه و تماس؛ تا رسیدن `B5` مقدار `telegram_handle` خالی است و UI وضعیت صادقانهٔ «پیکربندی‌نشده» + `[INPUT B5]` نشان می‌دهد (دکمهٔ غیرفعال، بدون لینک جعلی)؛ با ست‌شدن handle در SiteConfig، لینک `t.me` با پیش‌متن دوزبانه و UTM ساخته می‌شود | ۴ تست `link.test.ts`؛ رویداد `telegram_click` |
| F-14 | Capability matrix با evidence | ۵ | **زنده** — `/fa/capabilities/` و `/en/capabilities/`؛ هر پنج توان با artifact زنده، لینک شاهد، وضعیت و وابستگی؛ ردیف بدون شاهد → حالت خالی و خطای گیت | تست `matrix.test.ts` + گیت CI (هر توان باید `live` با ≥۱ شاهد باشد)؛ رویداد `capability_click` |
| F-15 | استخدام challenge | backlog | نساخته | اجرای تست فقط در Worker/WASM |
| F-16 | Typography/OG lab | backlog | فونت self-host و OG metadata پایه، generator ندارد | کارت F-16 |
| F-17 | صفحهٔ شفافیت | backlog | نساخته | B11 و دادهٔ uptime واقعی |
| F-18 | LLM benchmark | backlog | نساخته | متدولوژی/dataset واقعی |
| F-19 | ابزارهای بیشتر | backlog | نساخته | هر ابزار نیازمند کارت اختصاصی |

## نتیجهٔ محصول
پس از فاز ۵: نُه فیچر P0 (F-01..F-09) و چهار فیچر P1 (F-10, F-11, F-13, F-14) زنده و تست‌شده‌اند. F-08 در حالت BM25 ship شده است؛ مدل زبانی وقتی B7 (دسترسی provider/کلید/سقف بودجه) برسد با یک متغیر محیطی و بدون تغییر کد فعال می‌شود. F-13 با ورودی باز `B5` صادقانه کار می‌کند. F-12 عمداً ساخته نشد (دلیل در ردیف خودش). ادعا فقط برای چیزی مطرح می‌شود که artifact زنده و تست دارد (G1).

**جمع تست‌ها در این branch:** ۲۴ فایل / ۱۵۴ تست وب (vitest) + ۹۷ تست API (pytest) + گیت‌های محتوا/بودجه/SEO/قرارداد ابزار.
