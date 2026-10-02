# Design system — بخش A: جهت و foundations

## جهت بصری
هویت موجود: زمرد تیره با تایپوگرافی درشت، شبکهٔ واضح و motion کوتاه و هدفمند. امضای بصری فعلی خطوط grid/شبکهٔ داده در hero است؛ WebGL فقط در `full` tier و به‌صورت lazy مجاز است. هیچ‌یک از demoهای غیرواقعی نباید با عبارت «زنده» معرفی شوند.

## توکن‌ها
منبع رنگ و motion در `web/src/styles/tokens.css` است: رنگ برند، رنگ معنایی پنج قابلیت، spacing unit، radius، shadow و مدت حرکت. Tailwind theme از `@theme` می‌خواند. موجودی legacy در `theme.css` در مهاجرت تدریجی است؛ این فاز هنوز hardcoded CSS color audit کامل ندارد.

## تایپوگرافی
فونت Vazirmatn موجود در `fonts.css` برای فارسی self-host است؛ لاتین از system stack فعلی استفاده می‌کند تا به CDN وابسته نباشد. ضریب‌های line-height با نمونه‌های واقعی فارسی باید طی audit بصری اصلاح شوند.

## RTL و حرکت
جهت از `lang`/`dir` سند می‌آید؛ توسعهٔ جدید باید از `start/end` و logical properties استفاده کند. واژگان مجاز: enter/exit، emphasis و transition؛ reduced-motion باید انیمیشن غیرضروری را خاموش کند. Low-power در Navbar در دسترس است.

## ممنوع
Glassmorphism فراگیر، glow رنگی روی متن، gradient رنگین‌کمانی و انیمیشن بدون هدف.
