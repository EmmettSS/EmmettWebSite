# Emmett — Bilingual Emerald Edition

A bilingual Persian/English React experience built with Vite, TypeScript, Tailwind CSS and Motion.

## اجرا در ویندوز

```powershell
npm install --legacy-peer-deps
npm run dev
```

سپس آدرس `http://localhost:5173` را باز کنید. سایت با زبان English باز می‌شود و کاربر از کنترل همیشه‌در‌دسترس `EN / FA` داخل Navbar زبان را تغییر می‌دهد.

## Production build

```bash
npm run build
npm run preview
```

## Deploy on Vercel

1. Push this folder to a GitHub repository.
2. Import the repository in Vercel.
3. Framework: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`
6. Install command: `npm install --legacy-peer-deps`

The included `vercel.json` keeps `/fa/...` and `/en/...` routes working after a direct refresh.

## معماری زبان

- مسیرهای مستقل `/fa/...` و `/en/...`
- انتخاب‌گر متحرک `EN / FA` داخل Navbar و ذخیره انتخاب در `localStorage`
- تغییر هم‌زمان `lang` و `dir` سند
- فونت Vazirmatn و چیدمان RTL برای فارسی
- محتوای فارسی بازنویسی‌شده و مستقل از ترجمه لفظی

## Accessibility & motion

Keyboard focus, semantic labels, responsive layouts and `prefers-reduced-motion` are supported.
