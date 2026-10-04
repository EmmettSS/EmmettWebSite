import { useSyncExternalStore } from "react";

function subscribe() {
  // هیچ external store واقعی‌ای نیست؛ فقط یک‌بار بعد از hydration باید
  // re-render رخ دهد، نیازی به اشتراک واقعی در تغییرات بعدی نیست.
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

/**
 * آیا کامپوننت از مرحلهٔ hydration کلاینت عبور کرده؟ برای جلوگیری از
 * عدم‌تطابق SSR/CSR در کامپوننت‌هایی که به state فقط-کلاینت (مثل تم
 * ذخیره‌شده در localStorage) وابسته‌اند.
 *
 * به‌جای الگوی متداول `useState(false) + useEffect(() => setMounted(true))`
 * از `useSyncExternalStore` استفاده شده تا نیازی به setState درون effect
 * نباشد (قانون react-hooks/set-state-in-effect).
 */
export function useHasMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
