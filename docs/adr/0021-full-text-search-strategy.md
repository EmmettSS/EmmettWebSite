# ADR-0021: جست‌وجوی سراسری — MySQL FULLTEXT (prod) + SQLite FTS5 (dev/test)

**وضعیت:** پذیرفته‌شده

## زمینه

بریف فاز ۴ (آیتم ۸) خواستار «جستجوی سراسری (PostgreSQL FTS در prod، SQLite FTS در dev — یا راه‌حل سازگار)» است. این مستقیماً با تصمیمات تثبیت‌شدهٔ معماری (`ADR-0010`, `ADR-0011`, `ARCHITECTURE.md`) در تضاد است: دیتابیس پروداکشن پروژه **MySQL 8** است، نه PostgreSQL، و این تصمیم در چند فاز قبل با دلیل مستند (سازگاری با «Setup Python App» هاست اشتراکی cPanel؛ `PyMySQL` بدون نیاز به کامپایل) قطعی شده. مهاجرت به PostgreSQL در این مرحله نیازمند رد چند ADR قبلی، بررسی در دسترس بودن PostgreSQL روی هاست cPanel هدف (که معمولاً فقط MySQL ارائه می‌دهد)، و migration کامل داده بود — بدون سود واضحی که توجیه این هزینه را بدهد.

این ابهام صریحاً از مالک محصول پرسیده شد (قانون ۲)؛ پاسخ: ماندن روی MySQL/SQLite با یک راه‌حل جست‌وجوی سازگار.

## گزینه‌ها

1. **مهاجرت به PostgreSQL:** مطابق متن تحت‌اللفظی بریف، اما ناقض معماری تثبیت‌شده.
2. **جست‌وجوی ساده `icontains`/`Q` objects:** سریع‌ترین پیاده‌سازی، بدون رتبه‌بندی ارتباط (relevance ranking)، کارایی ضعیف روی جدول‌های بزرگ (بدون ایندکس، `LIKE '%...%'` نمی‌تواند از ایندکس B-Tree معمولی استفاده کند).
3. **سرویس جست‌وجوی خارجی (Meilisearch/Typesense):** کیفیت بالا، اما یک سرویس اضافه که باید روی هاست اشتراکی (که معمولاً فقط Apache/MySQL/PHP/Python app ارائه می‌دهد، نه امکان اجرای سرویس Rust/Go دلخواه) مستقر و همیشه در حال اجرا بماند — نقض قانون ۶ (وابستگی غیرضروری/سنگین) برای این مقیاس.
4. **لایهٔ انتزاعی سازگار بین دو بک‌اند واقعی دیتابیس فعلی:** `MySQL FULLTEXT` (`MATCH ... AGAINST`) در production، `SQLite FTS5` (virtual table) در dev/test — هر دو بومی دیتابیس، بدون سرویس اضافه، بدون تغییر تصمیم دیتابیس.

## تصمیم

گزینهٔ ۴. طراحی:

- یک مدل واحد `SearchIndexEntry` در `apps/core`: `content_type` (رشته‌ای کوتاه مثل `service`/`project`/`course`/`blogpost`)، `object_id`، `public_id` (UUID برای ساخت لینک بدون افشای PK داخلی)، `locale`، `title`، `body` (متن ساده، نه HTML/Markdown خام)، `url_path`، `category_label`؛ `unique_together=(content_type, object_id, locale)`.
- هر اپ محتوایی (`services`, `portfolio`, `academy`, `blog`) یک `signals.py` دارد که با `post_save`/`post_delete` مدل اصلی خودش را به `core.search.sync_search_index(...)` وصل می‌کند؛ فقط محتوای `status="published"` ایندکس می‌شود (محتوای draft/archived از نتایج جست‌وجو حذف/خارج می‌شود).
- یک migration اختصاصی در `core` با `RunPython` که بر اساس `schema_editor.connection.vendor` شاخه می‌رود:
  - **MySQL:** `ALTER TABLE core_searchindexentry ADD FULLTEXT INDEX ft_title_body (title, body)`.
  - **SQLite:** ساخت virtual table `core_searchindexentry_fts` با `fts5(title, body, content='core_searchindexentry', content_rowid='id')` + سه trigger (`INSERT`/`UPDATE`/`DELETE`) که آن را با جدول اصلی همگام نگه می‌دارند (الگوی رسمی «external content FTS5 table» در مستندات SQLite).
- تابع `core.search.search(query, locale, limit=20)` بر اساس `connection.vendor` کوئری متفاوت اجرا می‌کند (`MATCH...AGAINST(... IN NATURAL LANGUAGE MODE)` روی MySQL؛ `JOIN` با جدول مجازی FTS5 روی SQLite) و در هر دو حالت لیست یکسانی از نتایج (`content_type`, `public_id`, `title`, `url_path`, `category_label`, `rank`) برمی‌گرداند — مصرف‌کنندهٔ API (`SearchView`) از جزئیات backend بی‌اطلاع می‌ماند.

## دلیل

- دقیقاً همان رفتاری که بریف خواسته («FTS در prod/dev») را، بدون شکستن تصمیم دیتابیس قبلی، فراهم می‌کند.
- جدول ایندکس مجزا (به‌جای FULLTEXT مستقیم روی هر جدول محتوا) باعث می‌شود جست‌وجوی چندنوعی (Service + Project + Course + BlogPost همزمان) با یک کوئری ساده روی یک جدول انجام شود، نه ۴ کوئری جدا + ادغام دستی نتایج.
- محدودیت شناخته‌شدهٔ MySQL `InnoDB FULLTEXT` با `NATURAL LANGUAGE MODE`: حداقل طول کلمه (پیش‌فرض ۳ کاراکتر برای InnoDB) و لیست stopword پیش‌فرض انگلیسی‌محور (که برای کلمات فارسی stopword واقعی ندارد، پس عملاً فارسی را فیلتر نمی‌کند — نکتهٔ مثبت اتفاقی). این محدودیت در کد و مستندات API علامت‌گذاری شده است.

## پیامدها

- هر اپ محتوایی جدید در فازهای بعد که باید قابل‌جست‌وجو باشد، باید `signals.py` خودش را به `core.search.sync_search_index` وصل کند؛ فراموش‌کردن آن به‌معنای «نامرئی بودن در جست‌وجو» است (نه خطا) — باید در چک‌لیست بازبینی کد فازهای بعد باشد.
- اگر در آینده واقعی مقیاس به حدی برسد که FULLTEXT/FTS5 کافی نباشد، باید ADR جدیدی برای مهاجرت به سرویس خارجی (گزینهٔ ۳) نوشته شود؛ این ADR فقط برای مقیاس فعلی معتبر است.
- تست‌های جست‌وجو باید حتماً روی هر دو backend (SQLite در CI پیش‌فرض، و در صورت امکان یک اجرای جداگانه روی MySQL) اجرا شوند، چون رفتار `MATCH AGAINST` و `FTS5 MATCH` از نظر tokenization دقیقاً یکسان نیست (ریسک شناخته‌شده و مستند).
