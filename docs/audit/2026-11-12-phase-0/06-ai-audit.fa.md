# فاز ۰ — ممیزی موتور هوش مصنوعی

## ۱. اجزا

- کاتالوگ‌ها: `Catalog`, `CatalogOption` برای انتخاب‌های بسته.
- تنظیمات: `PromptTemplate`, `GuardrailRule`, `EstimationRule`.
- عملیات: `AIRequest`, `AISuggestion`, `AIConcept`, `AIContentArtifact`.
- pipelineها: `advisor`, `estimator`, `blog_summary`.
- provider: `OpenAICompatibleProvider` با factory مبتنی بر env.
- commandها: `seed_ai_engine`, `generate_blog_summaries`, `purge_ai_audit`.

## ۲. Advisor

جریان: اعتبارسنجی ورودی بسته → normalize → prompt/context → provider → guardrail → persist → share token.

کنترل‌های مشاهده‌شده:

- ورودی فقط کلیدهای مجاز کاتالوگ را می‌پذیرد.
- `request_hash` شامل prompt/taxonomy/asset digest است و cache کلید `ai:advisor:{hash}` دارد.
- خروجی provider باید JSON ساخت‌یافته و فیلدهای دوزبانهٔ معتبر باشد.
- guardrailها fail-closed هستند؛ خروجی نامعتبر/مسدود به کاربر نمایش داده نمی‌شود.
- `requester_pseudonym` با HMAC ساخته می‌شود؛ IP/UA وارد audit درخواست نمی‌شود.
- share token خام فقط یک‌بار در پاسخ ایجاد برمی‌گردد؛ ذخیره به‌صورت SHA-256 است.
- پاسخ‌های advisor/result دارای `Cache-Control: no-store` و `X-Robots-Tag: noindex, nofollow` هستند.
- revoke اشتراک از ادمین ممکن است و نتیجهٔ revoked/deleted/displayable=false قابل خواندن نیست.

وضعیت محلی: BLOCKED برای provider واقعی؛ `AI_ENABLED` پیش‌فرض false است و credential/provider در env محلی وجود نداشت. تست‌های واحد/یکپارچهٔ backend مسیرهای خطا/ساختار را پوشش می‌دهند.

## ۳. Estimator

تخمین‌گر deterministic است و از `EstimationRule` روی گزینه‌های کاتالوگ حداقل روز کاری را محاسبه می‌کند. قیمت عددی/مالی جعلی تولید نمی‌کند. E2E تأیید کرد صفحهٔ estimate حداقل روز کاری را نشان می‌دهد و به advisor لینک دارد.

## ۴. Shared result و Lead

`/ai/results/{token}/` فقط hash توکن را lookup می‌کند و شرط‌های active/displayable/not-revoked/not-deleted را اعمال می‌کند. `/ai/leads/` برای یک concept معتبر، Contact و Lead را در transaction می‌سازد؛ اطلاعات تماس وارد AI audit نمی‌شود و source برابر AI_ASSISTANT است.

## ۵. Blog summary

`AIContentArtifact` و command تولید خلاصه وجود دارد و ادمین approve/reject با stale guard دارد. اگر summary ویرایش شود وضعیت به draft برمی‌گردد. تولید عملیاتی با provider واقعی در این محیط تأیید نشد؛ وضعیت PARTIAL/BLOCKED از نظر عملیات production.

## ۶. حریم خصوصی و retention

- `purge_ai_audit` برای پاک‌سازی audit قدیمی‌تر از retention وجود دارد.
- retention پیش‌فرض ۳۶۵ روز است.
- لاگ‌ها نباید prompt خام، secret provider یا اطلاعات تماس را افشا کنند.
- cache نتیجه باید با تغییر prompt/taxonomy/asset نامعتبر شود.

## ۷. شکاف‌ها و معیار پذیرش فاز بعد

| مورد | معیار پذیرش |
|---|---|
| provider واقعی | با credential مجاز، یک درخواست موفق و یک خطای provider بدون افشای جزئیات ثبت شود |
| guardrail | خروجی آلوده/نامعتبر رد شود و کاربر پیام امن ببیند |
| share/revoke | توکن نامعتبر/revoked 404 بدهد؛ پاسخ no-store/noindex بماند |
| estimator | قواعد کاتالوگ تغییر کنند و نتیجه بدون قیمت جعلی به‌روز شود |
| blog summary | artefact پس از approve منتشر و پس از ویرایش stale/draft شود |
| retention | command dry-run و اجرای واقعی روی دادهٔ آزمایشی تأیید شود |
| privacy | audit/request لاگ شامل IP/UA/تماس/secret نباشد |
