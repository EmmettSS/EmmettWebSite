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

---

# Design system — بخش B: اجرای بصری (فاز ۴)

## اصل حاکم
جسارت بصری باید **هدفمند** باشد: هر عنصر متحرک یا سه‌بعدی‌نما باید چیزی را بگوید که صفحه نمی‌تواند با متن بگوید، وگرنه SVG/CSS ساده کافی است. «no gratuitous 3D» از v1 حفظ شده و هیچ runtime سه‌بعدی در پروژه نیست.

## لایهٔ `src/visuals/`
- `TierScene.tsx`: تنها راه رندر صحنه. propها: `scene` · `fallback` (اجباری) · `minTier` · `lazy` · `pauseOffscreen` · `height` · `label`.
- `registry.ts`: فهرست صحنه‌ها با `minTier`، فایل fallback و loader داینامیک.
- `primitives/`: `capabilities.ts` (پنج توان، یال‌ها و لینک شاهد) و `scene-runtime.ts` (cap کردن DPR، سقف فریم، حلقهٔ امن RAF، اندازه‌گیری بوم).
- `scenes/<Name>/index.tsx`: ماژول مستقل و lazy. سه صحنه: `HeroSystem` (امضا)، `SignalFlow` (مسیر یک درخواست)، `DataLattice` (بودجهٔ tierها).
- `fallbacks/`: `<Name>Static.tsx` (همان معنا، بدون canvas) + `<name>.svg` از پیش رندر؛ `scripts/render-assets.ts` همان SVGها را در build به PNG هم تبدیل می‌کند.

## قرارداد اجرا
```tsx
<TierScene scene="HeroSystem" fallback={<HeroSystemStatic />} minTier="balanced" pauseOffscreen height={340} />
```
1. tier از `useTier()` فاز ۰ خوانده می‌شود؛ زیر `minTier` هیچ صحنه‌ای mount نمی‌شود و `fallback` جای آن را می‌گیرد.
2. تا وقتی ظرف وارد viewport نشده، نه صحنه و نه fallback رندر نمی‌شود؛ فقط placeholder با ارتفاع رزروشده (rule 3 + CLS).
3. خروج از viewport حلقهٔ رندر را **cancel** می‌کند، نه اینکه idle بگذارد (rule 7).
4. `reduced-motion` و نبود canvas/two-d هر دو مسیر fallback را فعال می‌کنند.
5. DPR: `full` → `min(devicePixelRatio, 2)`؛ `balanced` → ۱. سقف فریم: ۶۰ در `full`، ۲۴ در `balanced`.
6. ارتفاع و ابعاد ظرف ثابت است (`contain: layout paint`)؛ هیچ انیمیشنی layout را تغییر نمی‌دهد (rule 6 / CLS < 0.1).

## صحنهٔ امضا — HeroSystem
گره‌ها = پنج توان (فرانت‌اند، بک‌اند، امنیت، هوش مصنوعی، بیوتک). یال‌ها = ترکیب واقعی توان‌ها، هر یال با یک جملهٔ دلیل. هر گره یک `<Link>` واقعی به صفحهٔ زندهٔ همان توان است؛ در حالت fallback همان پنج لینک به‌صورت شبکهٔ کارت‌ها باقی می‌مانند. اگر روزی یک ابزار از کار بیفتد، `visuals.static.test.ts` (گره ↔ evidenceUrl) می‌شکند.

## قواعد اجباری
- هر صحنه: lazy، fallback معنادار، tier gate، pause خارج از viewport.
- ممنوع: `three`/`@react-three/*` در هر جای پروژه (قاعدهٔ eslint + تست + بودجهٔ باندل).
- ممنوع: mount کردن مستقیم ماژول صحنه؛ فقط از طریق `<TierScene>` (قاعدهٔ eslint `no-restricted-imports`).
- بودجه: روت‌های اصلی ≤ ۲۰۰ KB gzip، روت‌های `/tools/*` و `/lab/*` ≤ ۳۵۰ KB؛ UI اصلی ۱۳۱.۶ KB است و صحنه‌ها در chunk جدا هستند.

## تایپوگرافی و OG
Vazirmatn self-host برای FA، Inter/Newsreader/JetBrains Mono برای لاتین. کارت‌های OG با `@resvg/resvg-js` + Vazirmatn در build ساخته می‌شوند (`web/scripts/render-assets.ts`) تا تایپوگرافی فارسی در شبکه‌های اجتماعی درست بنشیند.
