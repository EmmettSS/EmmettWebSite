# AI-OPS — دستیار امت (F-08)

> این سند مالکِ تصمیم‌های عملیاتی F-08 است: provider، سقف هزینه، آستانه، fallback و runbook.
> اگر کدی با این سند اختلاف داشت، سند به‌روزرسانی می‌شود یا کد اصلاح می‌شود — هیچ‌کدام بی‌صدا نمی‌ماند.

## ۱. معماری در یک نگاه

```
cron شبانه (process_jobs --kind=embed)
  منبع: web/scripts/export-corpus.ts  →  api/apps/assistant/data/site_corpus.json
        + docs/*.md و docs/ADRS/*.md  +  apps/tools/catalog.py
  → chunk (۴۰۰–۶۰۰ کاراکتر، هم‌پوشانی ۶۰)  →  hash  →  فقط تغییرکرده‌ها embedding می‌شوند
  → AssistantChunk {source,url,title,kind,locale,text,embedding BLOB,hash}

درخواست کاربر (POST /api/v1/assistant/ask/)
  → 202 { job_id }  (بدون انتظار)
  → retrieval:  اگر provider فعال + embedding موجود → cosine در حافظه (numpy)
                در غیر این صورت → BM25
  → آستانه:    هیچ hit بالای آستانه → «پیدا نکردم» + ❌ هیچ تماسی با LLM
  → اگر provider فعال و بودجه باقی است → LLM با دستور «فقط از متن داده‌شده»
  → فیلتر خروجی: پاسخ بدون ارجاع [n] → دور ریخته می‌شود، «نمی‌دانم» جایگزین می‌شود
  → AssistantAnswer + AssistantQueryCache (بر اساس hash پرسش نرمال‌شده)
  → GET /assistant/ask/<id>/poll/?offset=n  (هر ۷۰۰ms)
```

## ۲. Provider abstraction (ADR-007)

`apps/assistant/providers.py` تنها جایی است که به بیرون وصل می‌شود. انتخاب از env:

| `ASSISTANT_LLM_PROVIDER` | کلاس | کاربرد |
|---|---|---|
| `null` (پیش‌فرض) | `NullProvider` | dev، تست و وضعیت فعلی (B7 باز) — فقط BM25 |
| `relay` | `HttpRelayProvider` | واسطهٔ داخلی؛ کلید vendor هرگز روی اپ نمی‌نشیند |
| `hosted` | `HostedProvider` | هر endpoint سازگار با OpenAI |

قواعد سخت:
- هیچ کلیدی در مخزن نیست؛ فقط env (G9 و §۱۲).
- هیچ کدی به یک سرویس خاص وابسته نیست؛ شکست provider = `ProviderError` → BM25، هرگز خطای خام.
- مدل‌ها با env انتخاب می‌شوند: `ASSISTANT_LLM_BASE_URL/MODEL/EMBED_MODEL`.

## ۳. سقف هزینه

- `ASSISTANT_DAILY_COST_CAP_USD` (پیش‌فرض `0` = بدون بودجه → BM25).
- هر فراخوانی provider در `AssistantUsage` (روز، توکن، هزینهٔ تخمینی) ثبت می‌شود.
- رسیدن به سقف **خطا نیست**: پاسخ BM25 + پیام صادقانه. تست: `test_cost_cap_reached_falls_back_to_bm25`.
- نرخ‌ها با `ASSISTANT_COST_PER_1K_INPUT/OUTPUT` قابل تنظیم‌اند؛ این عدد برای کنترل مصرف است، نه صورتحساب.

## ۴. آستانه و توابع جست‌وجو

| متغیر | پیش‌فرض | معنا |
|---|---|---|
| `ASSISTANT_SIMILARITY_THRESHOLD` | `0.35` | حداقل cosine برای مسیر embedding |
| `ASSISTANT_BM25_MIN_SCORE` | `0.6` | حداقل امتیاز BM25 |
| `ASSISTANT_BM25_MIN_COVERAGE` | `0.5` | حداقل نسبت واژه‌های پرسش که در chunk هست |

- آستانه **قبل از** LLM اعمال می‌شود: تست `test_unrelated_question_makes_no_llm_call` با spy اثبات می‌کند هیچ فراخوانی‌ای رخ نداده است.
- اگر کورپوس از ۵۰۰۰ chunk بگذرد، این الگو (بارگذاری در حافظه + numpy) بازبینی و ADR جدید نوشته می‌شود؛ کند شدن بی‌صدا ممنوع است.

## ۵. حریم خصوصی

- متن پرسش در `Job.payload` نگه داشته نمی‌شود؛ بلافاصله پس از پاسخ با `{locale, cleared:true}` جایگزین می‌شود (تست ۱۰).
- کش بر اساس `sha256(locale + پرسش نرمال‌شده)` است؛ متن پرسش در کش نیست.
- `consent_to_log` فقط به‌عنوان سیگنال پذیرفته می‌شود و هرگز به لاگ محتوا تبدیل نمی‌شود.
- فیدبک «مفید بود؟» فقط بولین ذخیره می‌کند (`AssistantFeedback` هیچ فیلد متنی ندارد).
- ۲۰ پرسش/ساعت بر IP + هانی‌پات + حداکثر ۵۰۰ کاراکتر.

## ۶. Runbook

| نشانه | کار |
|---|---|
| پاسخ‌ها همه BM25 هستند | `ASSISTANT_LLM_PROVIDER` و کلید/سقف را چک کنید؛ سقف روزانه در `AssistantUsage` |
| «پیدا نکردم» زیاد شده | `corpus:check` سبز است؟ منبع تازه را با `pnpm corpus:export` بفرستید و `rebuild_assistant_corpus` را اجرا کنید |
| استنادها فقط نام فایل‌اند | B14: مستندات صفحهٔ عمومی ندارند (OPEN-ITEMS) |
| هزینه بالا رفته | سقف را در env پایین بیاورید؛ سیستم خودکار به BM25 می‌افتد |
| پاسخ بی‌ارجاع دیده شد | باگ فیلتر خروجی است؛ `_has_valid_citation` و تست ۷ را اجرا کنید |

## ۷. تست‌های الزامی (همه سبز)

`apps/assistant/test_assistant.py` — ۲۰ تست: پاسخ با ارجاع، «پیدا نکردم» بدون تماس LLM، BM25 بدون provider، سقف هزینه، نرخ ۲۰/ساعت، polling بدون تکرار، رد پاسخ بی‌ارجاع، اعلام AI، hash-based embedding، عدم ذخیرهٔ متن پرسش، و سقف ۵۰۰ کاراکتر.
