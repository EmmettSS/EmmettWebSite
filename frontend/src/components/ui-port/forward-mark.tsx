/** پیکان «ادامه» که در RTL آینه می‌شود، بدون تغییر ظاهر LTR. */
export function ForwardMark({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`inline-block rtl:-scale-x-100 ${className}`}>
      →
    </span>
  );
}
