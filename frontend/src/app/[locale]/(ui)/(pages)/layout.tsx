import { Footer } from "@/components/ui-port/footer";

/**
 * صفحات داخلی. خانه و ComingSoon فوتر خودشان را دارند (همان بستهٔ UI)؛
 * این گروه فقط مسیرهای بازطراحی‌شده را با همان فوتر می‌بندد.
 */
export default function InteriorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Footer />
    </>
  );
}
