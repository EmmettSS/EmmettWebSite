# ADR-0008: مدل دادهٔ Contact/Lead/Newsletter (پایپ‌لاین CRM سبک)

**وضعیت:** پذیرفته‌شده

## زمینه

فرم تماس و دستیار کشف نیاز مشتری (یکی از دو فیچر تأییدشدهٔ `ai_engine`) هر دو منجر به تولید سرنخ فروش می‌شوند. باید مشخص شود آیا «ثبت خام تماس» و «سرنخ در پایپ‌لاین فروش» یک موجودیت‌اند یا دو موجودیت مجزا.

## گزینه‌ها

1. **یک مدل واحد (`Lead`)** که هم ثبت اولیهٔ فرم و هم وضعیت پایپ‌لاین را نگه می‌دارد: ساده‌تر برای شروع، ولی مرز «دادهٔ خام ورودی» و «دادهٔ کاری تیم فروش» (notes، assigned_to، status) مخلوط می‌شود؛ سرنخ‌هایی که از منابع دیگر (مثلاً مستقیماً از AI engine بدون فرم تماس) می‌آیند هم باید در همین مدل جا بگیرند که باعث فیلدهای nullable زیاد و معنای مبهم می‌شود.
2. **دو مدل مجزا (`Contact` + `Lead`)** با رابطهٔ nullable: `Contact` = ثبت خام و غیرقابل‌تغییر هر ارسال فرم (مثل یک رسید)؛ `Lead` = موجودیت کاری پایپ‌لاین فروش با وضعیت قابل‌تغییر، قابل ایجاد از یک `Contact`، از یک `AISuggestion`، یا دستی توسط تیم فروش.

## تصمیم

**گزینهٔ ۲**، طبق تأیید صریح مالک محصول.

## دلیل

- تفکیک «رویداد ورودی غیرقابل‌تغییر» (`Contact`، شبیه audit trail) از «موجودیت کاری قابل‌تغییر» (`Lead`) یک الگوی شناخته‌شده (Event vs. Aggregate) است که هم ردیابی/حسابرسی (قانون ۱۶) و هم مدیریت فروش را تمیز نگه می‌دارد.
- `Lead` می‌تواند از منابع مختلف (`Contact` فرم تماس، `AISuggestion` دستیار هوشمند، ایجاد دستی) سرچشمه بگیرد بدون اینکه مدل `Contact` را با فیلدهای نامرتبط به منبع AI شلوغ کند.
- این تفکیک امکان گزارش‌گیری جداگانه می‌دهد: «نرخ تبدیل Contact به Lead»، «کیفیت سرنخ‌های AI در مقابل فرم مستقیم» بدون کوئری‌های پیچیده.

## مدل‌ها

**`Contact`** (فقط-افزودنی، شبیه رسید): `name`, `email`, `phone`, `project_type` (Enum بسته، هم‌راستا با Enum ورودی `ai_engine`)، `budget_range` (Enum بسته)، `timeline` (Enum بسته)، `message`, `source` (`website_form`/`ai_assistant`/`referral`), `consent_given`, `ip_address`, `user_agent`, `created_at`.

**`Lead`**: `contact` (FK nullable به `Contact`)، `assigned_to` (FK nullable به `User`)، `status` (`new`→`contacted`→`qualified`→`proposal`→`won`/`lost`)، `priority_score` (int، می‌تواند از `AISuggestion` پر شود)، `ai_suggestion` (FK nullable)، `notes`، `created_at`, `updated_at`.

**`Newsletter`**: مستقل از `Contact`/`Lead` (هدف متفاوت — ارتباط محتوایی، نه فروش)؛ `email`, `phone` (nullable)، `locale_preference`، `is_confirmed`، `confirmation_token`، `subscribed_at`، `unsubscribed_at` — جریان Double Opt-in برای جلوگیری از ثبت ایمیل جعلی/اسپم.

## پیامدها

- Enumهای `project_type`/`budget_range`/`timeline` باید در یک محل مشترک (`apps/core/enums.py` یا `apps/leads/enums.py` + ارجاع از `ai_engine`) تعریف شوند تا فرم تماس و دستیار AI همیشه از همان لیست بستهٔ گزینه‌ها استفاده کنند (پیش‌نیاز قانون ۱۳).
- تغییر `status` روی `Lead` باید در `AuditLog` ثبت شود (چه کسی، چه زمانی، از چه وضعیتی به چه وضعیتی).
- Rate limiting سخت‌گیرانه روی ثبت `Contact` الزامی است (`ADR-0006`) چون این تنها endpoint کاملاً عمومی و بدون احراز هویت این گروه از مدل‌هاست.
