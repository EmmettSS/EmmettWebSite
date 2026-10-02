# ADR-005 — Feature-as-Module

**وضعیت:** پذیرفته‌شده · ۲۰۲۶-۱۰-۰۱

## زمینه
محصول قرار است ابزارهای مستقل و code-split داشته باشد؛ import متقاطع featureها coupling ایجاد می‌کند.
## تصمیم
هر فیچر در `web/src/features/<feature>` با route/components/hooks/tests خودش قرار می‌گیرد. اشتراک از `lib/` یا `components/` انجام می‌شود. هیچ feature در initial bundle مجاز نیست.
## پیامدها
اسکلت‌های toolbox، scanner، shell، assistant و biolab ایجاد شده‌اند؛ rule خودکار ESLint برای ممنوعیت feature-to-feature import هنوز در backlog فاز ۰ باقی است.
