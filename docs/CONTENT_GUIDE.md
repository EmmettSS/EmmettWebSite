# راهنمای محتوا

مدیر مجاز وارد `/admin/` می‌شود و محتوای فارسی را ابتدا تکمیل می‌کند. برای انتشار، slug لاتین یکتا، عنوان و متن فارسی الزامی است؛ انگلیسی را هم‌زمان تکمیل کنید. محتوای نمونه نباید به مشتری/metric واقعی نسبت داده شود. Admin permissionها باید قبل از دسترسی تیمی به editor/admin تفکیک شوند.

محتوای `Post`, `CaseStudy`, `JobOpening` از static bridge با فرمان `python manage.py render_public_html --incremental` رندر می‌شود.
