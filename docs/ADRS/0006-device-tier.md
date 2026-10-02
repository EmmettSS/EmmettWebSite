# ADR-006 — Device Tier Engine

**وضعیت:** پذیرفته‌شده · ۲۰۲۶-۱۰-۰۱

## زمینه
افکت‌های بصری باید با توان دستگاه و تنظیم حرکت سازگار باشند؛ تصمیم باید یکتا و قابل override باشد.
## تصمیم
`detectTier()` در `web/src/lib/device-tier.tsx` بر اساس cores، deviceMemory و reduced-motion سطح `full`, `balanced`, `low-power` را برمی‌گرداند. SSR-safe مقدار اولیه balanced دارد؛ کاربر می‌تواند low-power را در navbar ذخیره کند. WebGL فقط در full مجاز است.
## پیامدها
قابلیت deviceMemory در همهٔ مرورگرها تضمین‌شده نیست و مقدار محافظه‌کارانهٔ ۲ استفاده می‌شود. تست‌ها هر سه tier و reduced-motion را mock می‌کنند.

### الگوی کد
```tsx
const { tier } = useTier();
return tier === "full" ? <Suspense fallback={<StaticFallback />}><LazyScene /></Suspense> : <StaticFallback />;
```
