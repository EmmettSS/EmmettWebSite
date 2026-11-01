# ADR-0026: پیاده‌سازی `ai_engine`، مشاور ایده‌پرداز و قابلیت‌های AI

**وضعیت:** پذیرفته‌شده — تأیید صریح مالک محصول در 2026-10-05؛ implementation فاز ۵ مجاز است<br>
**تاریخ:** 2026-10-05<br>
**دامنه:** فاز ۵<br>
**مرتبط با:** ADR-0002, 0003, 0006, 0008, 0009, 0013, 0014, 0015, 0016, 0019, 0022, 0025<br>
**تصمیم‌گیرندگان:** مالک محصول + ایجنت ارشد توسعه

---

## ۱. زمینه

`ai_engine` در ADR-0009 طراحی شده، اما در ریپوی فعلی هیچ اپ، مدل، migration، provider یا endpoint مربوط به AI وجود ندارد. امکانات موجودی که فاز ۵ می‌تواند reuse کند:

- Django/DRF، OpenAPI با `drf-spectacular`، session/CSRF، `django-environ` و rate limit scope از پیش رزروشدهٔ `ai_engine` با نرخ پیش‌فرض `20/hour`.
- Cache بدون Redis/Celery: LocMem در توسعه و FileBased در production.
- `requests` از قبل برای adapter اعلان استفاده می‌شود؛ SDK اختصاصی AI در requirements نیست.
- مدل‌های `Contact` و `Lead`، محتوای دوزبانهٔ `Service` و `Project(is_product=True)` و مقالات `BlogPost` وجود دارند.

مالک محصول در Discovery فاز ۵ این تصمیم‌های محصولی را روشن کرد:

1. provider اولیه یک adapter عمومی OpenAI-compatible باشد؛ secret در گفتگو دریافت نشود.
2. ورودی‌ها و گزینه‌های customer-facing در DB/Catalog باشند؛ گزینه‌های `Contact` نیز با Catalog یکپارچه شوند.
3. دستیار محدود به خدمات/محصولات فعلی نباشد و ایدهٔ محصول جدید نیز بسازد؛ در صورت ارتباط بتواند به خدمت موجود اشاره کند.
4. CTA برای ثبت درخواست/Lead است، نه پرداخت یا سفارش قطعی آنلاین.
5. تخمین هزینهٔ عددی نمایش داده نشود؛ کاربر باید برای قیمت درخواست بدهد. زمان، حداقلِ خوش‌بینانه و غیرتعهدآور باشد.
6. نتیجهٔ مشاور قابل اشتراک عمومی باشد، بدون نمایش ورودی‌های کاربر یا اطلاعات تماس. Lead از همان نتیجه ایجاد شود.
7. Audit داده‌های AI یک سال نگه‌داری و از IP، user-agent و اطلاعات تماس خالی باشد.
8. علاوه بر مشاور، تخمین‌گر پروژه و خلاصه‌ساز مقالات هم در scope باشند. خلاصهٔ بلاگ پیش از انتشار بازبینی ادمین شود.
9. Frontend از قرارداد فعلی `next-intl` پیروی کند؛ gettext برای Django/admin حفظ شود.

این تصمیم‌ها بخشی از طرح اولیهٔ ADR-0009 را تغییر می‌دهند: خروجی مشاور دیگر نباید فقط انتخاب از فهرست محصولات از پیش موجود باشد. این ADR در صورت تأیید، آن بخش را supersede می‌کند.

---

## ۲. گزینه‌های بررسی‌شده

### ۲.۱ مرز فراخوانی provider

1. **فراخوانی مستقیم از هر app** — ساده‌تر برای نمونهٔ اولیه، اما Guardrail، audit، throttling و کلید provider را پراکنده می‌کند و قانون ۱۲ را نقض می‌کند.
2. **Gateway مرکزی در `ai_engine`** — تمام featureها از pipeline و Provider interface مشترک عبور می‌کنند.

### ۲.۲ اتصال provider

1. SDK اختصاصی برای یک vendor — API آن vendor را ساده می‌کند، اما وابستگی جدید و قفل‌شدن به vendor می‌آورد.
2. **درخواست HTTP با `requests` به endpoint سازگار با OpenAI** — از dependency موجود استفاده می‌کند؛ endpoint محلی OpenAI-compatible هم قابل اتصال است.
3. Mock-only — برای آزمون مناسب است، اما adapter production را فراهم نمی‌کند.

### ۲.۳ نوع خروجی مشاور

1. فقط انتخاب سرویس/محصول موجود — امن‌تر و قابل‌پیش‌بینی‌تر، اما مطابق توضیح مالک محصول جذابیت و ایده‌پردازی کافی ندارد.
2. متن آزاد بدون taxonomy یا محدودیت — بیشترین آزادی، اما احتمال پیشنهاد خارج از حوزهٔ Emmett، hallucination و خروجی غیرقابل پردازش را بالا می‌برد.
3. **ایده‌پردازی متنی در قالب JSON محدود، همراه با دسته‌ها و پیچیدگی‌های انتخاب‌شده از catalogهای DB؛ تطبیق اختیاری با Service/Project موجود.**

### ۲.۴ تخمین زمان/هزینه

1. درخواست از مدل برای ساخت عدد — بدون دادهٔ واقعی، برآورد قابل اتکا نیست و ممکن است تعهد گمراه‌کننده بسازد.
2. **محاسبهٔ زمان از قواعد قابل‌مدیریت در DB؛ عدم نمایش هزینهٔ عددی.**
3. حذف هر نوع تخمین — ریسک کم‌تر، اما نیاز محصول برای تخمین زمانی را برآورده نمی‌کند.

### ۲.۵ خلاصهٔ بلاگ

1. تولید و انتشار خودکار — سریع، اما خطای محتوایی را بدون بازبینی عمومی می‌کند.
2. تولید با درخواست هر خواننده — تعداد فراخوانی و هزینهٔ provider را نامحدود و رفتار صفحه را کند می‌کند.
3. **تولید توسط ادمین برای مقالهٔ منتشرشده، نگه‌داری Draft و نمایش عمومی فقط بعد از تأیید ادمین.**

### ۲.۶ اجرای درخواست روی هاست

1. Celery/Redis یا سرویس صف — برای کارهای async مناسب است، اما در زیرساخت هدف موجود/تأییدشده نیست.
2. **فراخوانی synchronous با timeout محدود و خطای کنترل‌شده؛** برای کارهای دسته‌ایِ محتوا، management command قابل اجرا از Admin/cron.

---

## ۳. تصمیم پیشنهادی

### ۳.۱ ساختار و مرزبندی

ساخت اپ مستقل `backend/apps/ai_engine/` به‌عنوان تنها Gateway فراخوانی مدل، با این مرزها:

```text
ai_engine/
  providers/   # Protocol، factory، OpenAI-compatible adapter
  catalog/     # Catalog/CatalogOption و API خواندن گزینه‌ها
  pipelines/   # مشاور، تخمین‌گر، خلاصه‌ساز؛ ترتیب اجرای استاندارد
  guardrails/  # قواعد فرهنگی/موضوعی و بررسی ورودی/خروجی
  audit/       # AIRequest، AI output/artifact و retention command
  migrations/
  tests/
```

اپ‌های دیگر اجازهٔ import مستقیم SDK/HTTP provider یا ساخت prompt ندارند. آن‌ها فقط از serviceهای سطح‌بالای `ai_engine` استفاده می‌کنند. آزمون معماری باید این مرز را بررسی کند.

### ۳.۲ Provider و تنظیمات محیطی

- رابط Provider بر مبنای `Protocol` و یک provider factory باشد.
- پیاده‌سازی اول `OpenAICompatibleProvider` از `requests` موجود استفاده کند؛ endpoint مانند `/v1/chat/completions` از `AI_API_BASE_URL` ساخته شود.
- تنظیمات پیشنهادی در `.env`: `AI_ENABLED`, `AI_API_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_TIMEOUT_SECONDS` و `AI_CACHE_TTL_SECONDS`. فقط نام متغیرها در مستندات؛ مقدار واقعی key هرگز در کد یا chat قرار نمی‌گیرد.
- adapter محلی در صورت ارائهٔ API سازگار با OpenAI بدون تغییر pipeline قابل استفاده است؛ برای پروتکل‌های ناسازگار، interface افزودن adapter بعدی را پشتیبانی می‌کند.
- پیش‌فرض `AI_TIMEOUT_SECONDS=15` باشد. اگر provider تنظیم/فعال نشده یا timeout/خطای شبکه رخ دهد، پاسخ کنترل‌شده و بدون جزئیات provider/key برگردد؛ هیچ fallback جعلی به خروجی AI نشان داده نشود.
- در تست‌ها شبکهٔ واقعی فراخوانی نشود؛ Provider fake/mock استفاده شود. هیچ SDK جدیدی در این مرحله لازم نیست.

### ۳.۳ Catalogهای پایگاه‌داده

`Catalog` و `CatalogOption` در DB منبع حقیقت گزینه‌های customer-facing باشند. هر گزینه دست‌کم `catalog_key`, `key`, `label_fa`, `label_en`, `is_active`, `is_public`, `order` و در صورت نیاز metadata ساختاریافته داشته باشد. کلیدها پس از استفاده عوض یا reuse نشوند؛ گزینهٔ قدیمی archive/inactive شود، نه حذف.

- API عمومی فقط catalogهای مجاز و گزینه‌های active را برگرداند.
- DRF در زمان درخواست، کلیدهای فعال همان catalog را اعتبارسنجی کند؛ آرایهٔ گزینه‌های AI در Python/TypeScript منبع حقیقت نیست.
- دادهٔ اولیه با data migration یا seed command وارد DB می‌شود؛ literalهای migration فقط bootstrap داده‌اند، نه validation/runtime choices.
- `Contact.project_type`, `budget_range`, `timeline` به catalogهای DB متصل شوند. migration مقدارهای فعلی (`website`, `mobile_app`, `security`, `crm`, `consulting`, `other`؛ rangeهای Toman؛ و timelineهای موجود) را حفظ کند و قرارداد API همچنان همان stable keyها را برگرداند. `Contact.source` و statusهای داخلی، انتخاب کاربر نیستند و در این تصمیم catalog عمومی محسوب نمی‌شوند.

#### گزینه‌های اولیهٔ پیشنهادی برای تأیید

| Catalog | keyهای پیشنهادی | یادداشت |
|---|---|---|
| `job_role` | `owner`, `executive`, `operations`, `sales_marketing`, `finance_admin`, `it_engineering`, `customer_support`, `human_resources`, `other` | نقش/شغل پاسخ‌دهنده، نه متن آزاد |
| `business_size` | `solo`, `2_10`, `11_50`, `51_250`, `251_plus` | اندازهٔ کسب‌وکار |
| `city_scale` | `metropolitan`, `small_city` | دقیقاً دو گزینهٔ درخواست‌شده |
| `budget_range` | `under_50m`, `50_150m`, `150_500m`, `over_500m`, `not_sure` | reuse گزینه‌های Contact؛ مبالغ تومان و بودجهٔ کل پروژه |
| `team_size` | `solo`, `2_5`, `6_20`, `21_plus` | اندازهٔ تیم مشتری، نه اندازهٔ تیم Emmett |
| `goal` | `automate_processes`, `improve_customer_support`, `increase_sales`, `improve_analytics`, `digitize_services`, `adopt_ai`, `improve_security`, `integrate_systems`, `reduce_costs` | انتخاب چندگانه |
| `solution_area` | `web_platform`, `mobile_app`, `workflow_automation`, `ai_assistant`, `data_analytics`, `cybersecurity`, `customer_crm`, `saas_product`, `other` | خروجی دسته‌بندی‌شدهٔ ایده؛ برچسب‌های فارسی/انگلیسی در DB |
| `complexity` | `simple`, `standard`, `complex` | خروجی محدود برای تخمین زمان |
| `delivery_scope` | `prototype`, `mvp`, `integrated_mvp`, `multi_module_platform` | ورودی تخمین‌گر و دسته‌بندی خروجی ایده |

این فهرست، keyها و برچسب‌های پیشنهادی **تأیید شده‌اند** و مبنای bootstrap migration هستند.

### ۳.۴ درخواست، ایده و اشتراک

مدل‌های نهایی باید دست‌کم این داده‌ها را پشتیبانی کنند (نام/تقسیم دقیق مدل‌ها در implementation به این قرارداد وفادار می‌ماند):

- `AIRequest`: feature داخلی، locale، payload شامل فقط keyهای Catalog، وضعیت، provider/model، نسخهٔ prompt، request hash/cache-hit، latency/token metadata، error code پاک‌سازی‌شده، زمان شروع/پایان و requester pseudonym؛ بدون IP، user-agent، ایمیل، شماره تلفن یا متن آزاد کاربر.
- `AISuggestion`: نتیجهٔ پایدار و versioned، مجموعهٔ ایده‌های ساختاریافته، flags گاردریل و اطلاعات اشتراک. ایده‌ها حداکثر سه عدد باشند.
- هر ایده شامل title, description, benefit، `solution_area`, `complexity`, `delivery_scope`, حداقل زمانِ معتبر (در صورت وجود Rule)، CTA ثابت/محلی‌شدهٔ «درخواست بررسی/قیمت»، و تطبیق اختیاری با service/product موجود باشد. متن ایده می‌تواند تولیدشده باشد، اما plain text با سقف طول، بدون HTML/Markdown اجرایی؛ دسته‌ها و enumهای خروجی فقط از Catalogهای فعال انتخاب شوند.
- نتیجه در provider locale درخواست تولید شود؛ رابط و قالب‌های prompt فارسی/انگلیسی داشته باشند.
- نتیجه با token تصادفی با entropy بالا share شود؛ فقط hash توکن ذخیره گردد. اشتراک public فقط ایده/نتیجه را نمایش می‌دهد، نه ورودی‌های خام یا اطلاعات شخصی. token تا زمان revoke ادمین معتبر است؛ صفحهٔ نتیجه `noindex,nofollow` است.
- پیش از CTA درخواست، هیچ email/phone/user text به provider نمی‌رود. فرم درخواست، رضایت را دریافت می‌کند و با `source=AI_ASSISTANT` یک `Contact` و `Lead` می‌سازد؛ Lead به پیشنهاد و ایدهٔ انتخاب‌شده متصل می‌شود. CTA درخواست برآورد است، نه checkout/payment.

### ۳.۵ Pipeline استاندارد

هر pipeline دقیقاً این ترتیب را اجرا کند:

1. **Validate:** فعال‌بودن همهٔ catalog keys؛ رد گزینهٔ ناشناخته/غیرفعال؛ سقف تعداد goals.
2. **Normalize:** تبدیل payload به ترتیب canonical و پایدار؛ locale معتبر `fa`/`en`.
3. **Prompt Build:** انتخاب PromptTemplate فعال و نسخه‌دار برای feature/locale؛ فقط دادهٔ ساختاریافته وارد prompt شود.
4. **Call:** اجرای Provider از gateway مرکزی با timeout مشخص.
5. **Parse:** JSON/ساختار پاسخ به schema تایپ‌شده تبدیل شود؛ keyهای خروجی حتماً در catalog فعال باشند؛ طول متن و تعداد ایده محدود شود.
6. **Guardrail:** بررسی ورودی/خروجی و توقف fail-closed در نقض policy.
7. **Persist/Audit:** ثبت request و نتیجهٔ امن، ایجاد token share در صورت مناسب‌بودن، و ثبت metadata بدون secret/PII.

خطای parse/provider/Guardrail هیچ متن خام provider را به کاربر برنگرداند. محتوای مقاله در خلاصه‌ساز از `BlogPost` موجود خوانده می‌شود؛ ID مقاله ورودی ساختاریافته است و متن مقاله در audit payload ذخیره نمی‌شود.

### ۳.۶ Guardrail فرهنگی و محتوایی

`GuardrailRule` از DB/Admin قابل مدیریت باشد و pre-check/post-check داشته باشد. baseline مورد تأیید مالک محصول:

- لحن حرفه‌ای و محترمانه؛ پاسخ فقط در حوزهٔ نرم‌افزار/AI/خدمات قابل ارائهٔ Emmett.
- عدم تولید توصیهٔ پزشکی یا مالی؛ عدم محتوای جنسی، نفرت‌پراکن یا سیاسی/مذهبی حساس.
- عدم ارائهٔ قیمت عددی و عدم وانمودکردن ایده به‌عنوان محصول آماده/تعهدشده.
- در صورت trigger با severity بالا، پاسخ نمایش داده نشود و `guardrail_flags`/status برای بررسی ادمین ثبت شود.
- blog summary فقط Draft است تا ادمین آن را بازبینی کند.

Ruleهای متنی/موضوعی باید DB-driven باشند. فیلتر کلمه‌ای به‌تنهایی تضمین کامل ایمنی نیست؛ خروجی ساختاریافته، محدودکردن حوزه و fail-closed اجزای مکمل‌اند.

### ۳.۷ تخمین‌گر پروژه و زمان

- تخمین‌گر به‌صورت pipeline deterministic داخل `ai_engine` پیاده شود؛ نیازی به provider call ندارد.
- اعداد هزینه حذف شوند؛ هزینه فقط از CTA درخواست قیمت قابل دریافت است.
- زمان با واحد **روز کاری** و با wording «حداقل زمان خوش‌بینانه تا نسخهٔ اول قابل بررسی؛ غیرتعهدآور» نمایش داده شود. عدد فقط از `EstimationRule` فعال در DB بیاید، نه از LLM.
- خروجی advisor نیز فقط زمانی زمان نشان دهد که برای `delivery_scope`/`complexity` قاعدهٔ معتبر وجود دارد؛ در غیر این صورت label زمان حذف و CTA درخواست برآورد باقی بماند.

#### seed اولیهٔ زمان — تأییدشده توسط مالک محصول

| `delivery_scope` | حداقل روز کاری پیشنهادی | دامنهٔ فرض‌شده |
|---|---:|---|
| `prototype` | 2 | نمونهٔ اولیهٔ محدود برای بررسی ایده، نه محصول production |
| `mvp` | 5 | نسخهٔ حداقلی با یک جریان اصلی و بدون مهاجرت داده |
| `integrated_mvp` | 10 | MVP با یکپارچه‌سازی محدود با یک سیستم بیرونی |
| `multi_module_platform` | 15 | نسخهٔ نخست پلتفرم چندبخشی با scope محدود و توافق‌شده |

این اعداد deliberately optimistic و تأییدشده برای bootstrap هستند؛ زمان به معنی تعهد تحویل/قیمت نیست. migration آن‌ها را به‌عنوان حداقل زمان خوش‌بینانه و غیرتعهدآور فعال می‌کند.

### ۳.۸ خلاصه‌ساز مقاله

- فقط برای `BlogPost` منتشرشده و از طریق `ai_engine`؛ متن فارسی/انگلیسی موجود در CMS منبع داخلی است، نه متن آزاد ارسالی از فرم کاربر.
- تولید با Admin action/management command به‌ازای مقاله و locale؛ بدون تولید خودکار روی هر بازدید.
- `AIContentArtifact` (یا مدل هم‌ارز) متن خلاصه، source content hash، locale، request و وضعیت `draft/approved/rejected` را نگه دارد. اگر متن مقاله تغییر کند، artifact قبلی stale شده و باید مجدداً ساخته/بازبینی شود.
- ادمین هر خلاصه را پیش از انتشار تأیید کند. API عمومی مقاله فقط خلاصهٔ `approved` و هم‌زبان درخواست را برگرداند؛ Frontend آن را با رشته‌های ترجمه‌شدهٔ موجود نمایش دهد.
- فراخوانی دسته‌ای باید محدود/قابل‌کنترل باشد؛ در cPanel فاقد Celery هر مقاله یک کار synchronous محدود است، نه یک fan-out بی‌حد در web request.

### ۳.۹ Rate limit، cache، audit و retention

- Endpointهای پرهزینه از `AIEngineRateThrottle` موجود، نرخ `20/hour` در DRF و env، استفاده کنند. rate limit پیش از cache lookup اعمال شود تا cache راه دورزدن throttle نباشد.
- کش نتیجهٔ مشاور با کلید SHA-256 از normalized enum payload، locale، feature، provider/model، prompt version و catalog/rules version ساخته شود؛ هیچ دادهٔ تماس در cache key نباشد. TTL پیشنهادی `24h`، قابل تنظیم با env. هر درخواست نتیجهٔ پایدار و share token مستقل خود را می‌گیرد؛ cache فقط provider call را حذف می‌کند.
- AI audit شامل choice keys، feature، locale، provider/model/prompt version، زمان، latency، token count، cache hit، error code و guardrail flags باشد. user/session فقط به‌صورت HMAC pseudonym (کلید بر پایهٔ secret تنظیمات، هرگز raw ID)؛ بدون IP/UA و PII.
- رکوردهای operational مربوط به `AIRequest` پس از **۳۶۵ روز** با management command قابل اجرا از cron پاک شوند. محتوای Lead/Contact تابع retention جداگانهٔ آن‌هاست و با پاک‌سازی AI audit حذف نمی‌شود.
- نتیجهٔ اشتراک‌شده و خلاصهٔ تأییدشدهٔ بلاگ content artifact محسوب می‌شوند و با retention لاگ یکی نیستند؛ share با revoke ادمین خاتمه می‌یابد. هنگام purge، relationهای audit با `SET_NULL`/سیاست مشابه حفظ محتوای موردنیاز Lead/Blog را ممکن کنند.
- تغییر prompt، catalog، rule و moderation با `core.log_action` و metadata حداقلی ثبت شود؛ raw prompt، key یا PII هرگز در AuditLog نرود.

### ۳.۱۰ i18n، API و کیفیت

- Backend/Admin: `gettext_lazy` مطابق استاندارد Django. Next.js: `next-intl` و کلیدهای متقارن در `messages/fa.json` / `messages/en.json` مطابق ADR-0003/0016.
- endpointهای پیشنهادی: خواندن catalogها، ایجاد مشاوره، خواندن نتیجهٔ share، ثبت درخواست Lead، تخمین پروژه. همه با `extend_schema`/serializerهای دقیق OpenAPI.
- تولید خلاصه از Django Admin/management command انجام می‌شود؛ endpoint مدیریتی جداگانه فقط در صورت نیاز محصولی بعدی اضافه شود.
- تمام routeهای UI از ترجمه استفاده کنند؛ locale فارسی RTL، انگلیسی LTR؛ اعداد زمان از formatter فعلی frontend.
- بدون وابستگی Python/Node جدید برای provider یا data parsing؛ استفاده از DRF serializers، `requests` موجود و ابزارهای پروژه.

---

## ۴. دلیل تصمیم پیشنهادی

- Gateway مرکزی اجرای فنی قانون ۱۲ را ممکن می‌کند و Guardrail، Audit، cache، rate-limit و هزینه را از یک نقطه کنترل می‌کند.
- adapter استاندارد با `requests` از SDK سنگین/اختصاصی جلوگیری می‌کند و برای endpoint محلی OpenAI-compatible هم کافی است.
- Catalogهای DB امکان مدیریت enumها در Admin و همگام‌بودن فرم Contact، advisor، estimator و output categories را فراهم می‌کنند؛ keys پایدار API تغییر نمی‌کنند.
- متن خلاقانه در خروجی ارزش محصولی دارد، اما محدودیت ساختاریافته، taxonomy DB، validator، Guardrail و label «ایدهٔ اولیه» از آزادشدن پاسخ خام جلوگیری می‌کند.
- تولید تخمین عددی توسط مدل قابل ممیزی نیست؛ قاعدهٔ admin-managed کمینهٔ خوش‌بینانه قابل توضیح و تغییر است. هزینهٔ عددی عمداً حذف شده تا به‌جای ادعای ساختگی، Lead درخواست قیمت ایجاد شود.
- بازبینی انسانی خلاصهٔ بلاگ ریسک انتشار خلاصهٔ نادرست را کاهش می‌دهد و تولید on-demand عمومی نیز هزینه/latency provider را کنترل می‌کند.
- synchronous call با timeout محدود با نبود Redis/Celery در زیرساخت فعلی هم‌راستا است؛ ابزارهای batch از command/cron استفاده می‌کنند.

---

## ۵. پیامدها و ریسک‌ها

- ایده‌های تولیدشده ممکن است از نظر بازار یا امکان اجرا کامل نباشند؛ به همین دلیل نتیجه «طرح اولیه» است و CTA فقط درخواست بررسی/قیمت می‌سازد.
- تخمین‌های ۲/۵/۱۰/۱۵ روز کاری بسیار خوش‌بینانه‌اند و باید توسط مالک محصول تأیید شوند؛ Rule غایب نباید به عدد حدسی تبدیل شود.
- provider واقعی تا زمان پیکربندی env در محیط مقصد فعال نیست. دسترسی شبکهٔ هاست ایران به provider نیز باید در staging آزموده شود.
- ۱۵ ثانیه سقف synchronous ممکن است بعضی مدل‌ها را timeout کند؛ در آن حالت پاسخ safe error داده می‌شود، نه background job پنهان.
- Catalog DB نیازمند migration و تغییر admin/API/فرانت فرم Contact است؛ migration باید داده‌های فعلی را حفظ کند و با SQLite و MySQL سازگار بماند.
- هویت requester با HMAC pseudonym است (قابل unlink از دادهٔ مستقیم، ولی همچنان دادهٔ pseudonymous و مشمول retention). محتوا/Contactهای Lead PII دارند و از audit AI جدا نگه داشته می‌شوند.
- خلاصه‌های Draft برای مقاله‌های تغییرکرده باید stale شوند تا نسخهٔ قدیمی ناخواسته دوباره منتشر نشود.
- این ADR در صورت تأیید، بخش خروجی catalog-only در ADR-0009 و enumهای نمونهٔ ارزی/غیرمحلی آن را supersede می‌کند؛ تاریخچهٔ ADR-0009 حذف/بازنویسی نمی‌شود.

---

## ۶. معیارهای تأیید ADR

- [x] مالک محصول Catalog keys و labels پیشنهادی بخش ۳.۳ را تأیید کرد.
- [x] مالک محصول scope و مقادیر اولیهٔ ۲/۵/۱۰/۱۵ روز کاری را تأیید کرد.
- [x] مالک محصول حداکثر سه ایدهٔ محصول و برچسب «طرح اولیه» را تأیید کرد.
- [x] مالک محصول share token تا لغو ادمین، عدم نمایش ورودی‌ها/اطلاعات شخصی، CTA درخواست Lead و عدم checkout را تأیید کرد.
- [x] مالک محصول retention یک‌سالهٔ operational audit، جدایی retention از Contact/Lead و خلاصهٔ بلاگ پس از تأیید ادمین را تأیید کرد.
- [x] مالک محصول حفظ قرارداد i18n فعلی، adapter عمومی OpenAI-compatible با `requests` و timeout پانزده‌ثانیه‌ای بدون وابستگی جدید را تأیید کرد.

## ۷. وضعیت اجرای مصوبه

- [x] Gateway مرکزی، adapter مبتنی بر `requests`، مدل‌ها، migrationها، Catalogها، pipelineها و guardrail/audit/cache/rate-limit پیاده‌سازی شدند.
- [x] APIهای OpenAPI و UI دوزبانهٔ advisor، share/result، اتصال Lead و estimator پیاده‌سازی شدند؛ خلاصهٔ بلاگ Draft می‌ماند تا ادمین تأیید کند.
- [x] migration، CSRF، پاسخ‌های `no-store`، CSP nonceدار و HSTS production به مسیرهای مرتبط اضافه و با تست/HTTP smoke بررسی شدند.
- [x] کیفیت فاز ۵ با suite بک‌اند و بررسی‌های static/build فرانت‌اند اعتبارسنجی شد؛ جزئیات دقیق و محدودیت‌های محیط در `CHANGELOG.md` آمده‌اند.
- [ ] اتصال provider واقعی، E2E مرورگر و سنجش Lighthouse به secret و زیرساخت مقصد نیاز دارند و پس از پیکربندی staging/production انجام می‌شوند؛ این‌ها به‌عنوان محدودیت تحویل ثبت شده‌اند، نه کار پیاده‌سازیِ فراموش‌شده.

**وضعیت:** implementation فاز ۵ تکمیل است؛ `AI_ENABLED` در تنظیم پیش‌فرض خاموش می‌ماند تا مالک در محیط مقصد provider را امن پیکربندی کند.
