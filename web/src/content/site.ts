export const siteCopy = {
  fa: { brand: "امت", home: "خانه", services: "خدمات", products: "محصولات", projects: "پروژه‌ها", resources: "منابع", academy: "آکادمی", about: "دربارهٔ ما", contact: "تماس", lowPower: "حالت کم‌مصرف", language: "زبان", notFound: "صفحه پیدا نشد" },
  en: { brand: "Emmett", home: "Home", services: "Services", products: "Products", projects: "Projects", resources: "Resources", academy: "Academy", about: "About", contact: "Contact", lowPower: "Low-power mode", language: "Language", notFound: "Page not found" },
} as const;
export type SiteCopyKey = keyof typeof siteCopy.fa;
