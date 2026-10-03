import type { Lang } from "./i18n";

export type PageKey =
  | "services"
  | "products"
  | "pentestor"
  | "crm"
  | "projects"
  | "academy"
  | "about";
export type PageCopy = {
  eyebrow: string;
  title: string;
  accent: string;
  intro: string;
  metrics: [string, string][];
  cards: { tag: string; title: string; copy: string }[];
  capabilities: string[];
};
const en: Record<PageKey, PageCopy> = {
  services: {
    eyebrow: "THE ENGINEERING SYSTEM",
    title: "From hard problem to",
    accent: "living system.",
    intro:
      "Strategy, product design, AI and resilient infrastructure—one senior team turning consequential ideas into production systems.",
    metrics: [
      ["04", "Integrated disciplines"],
      ["14d", "Prototype sprint"],
      ["99.9%", "Production target"],
    ],
    cards: [
      {
        tag: "DISCOVER",
        title: "Systems diagnosis",
        copy: "Map the real constraint, model risk and find the smallest high-leverage move.",
      },
      {
        tag: "BUILD",
        title: "Product engineering",
        copy: "Design, software and intelligence move in one continuous delivery loop.",
      },
      {
        tag: "SCALE",
        title: "Operational intelligence",
        copy: "Observability, automation and governance designed in from day one.",
      },
    ],
    capabilities: [
      "AI product engineering",
      "Cloud architecture",
      "Security engineering",
      "Data platforms",
      "Product design",
      "Technical strategy",
    ],
  },
  products: {
    eyebrow: "EMMETT PRODUCT LAB",
    title: "Tools born from",
    accent: "real constraints.",
    intro:
      "Products built where off-the-shelf software stops: sensitive data, high-friction workflows and decisions that need intelligence.",
    metrics: [
      ["02", "Flagship products"],
      ["24/7", "Autonomous signals"],
      ["01", "Unified intelligence layer"],
    ],
    cards: [
      {
        tag: "SECURITY",
        title: "PenTestor",
        copy: "Continuous attack simulation translated into prioritized, explainable fixes.",
      },
      {
        tag: "OPERATIONS",
        title: "Emmett CRM",
        copy: "A relationship operating system that turns context into momentum.",
      },
      {
        tag: "EXPERIMENTAL",
        title: "Signal Engine",
        copy: "Composable routing for events, agents and human decisions.",
      },
    ],
    capabilities: [
      "Agentic workflows",
      "Privacy-first architecture",
      "Explainable AI",
      "Human controls",
      "Live telemetry",
      "Composable APIs",
    ],
  },
  pentestor: {
    eyebrow: "AUTONOMOUS SECURITY",
    title: "See the breach",
    accent: "before it happens.",
    intro:
      "PenTestor continuously thinks like an attacker, validates exposure and gives engineering teams a clear route from signal to remediation.",
    metrics: [
      ["24/7", "Continuous testing"],
      ["10×", "Faster triage"],
      ["100%", "Explainable findings"],
    ],
    cards: [
      {
        tag: "MAP",
        title: "Living attack surface",
        copy: "Discover assets and relationships as your infrastructure changes.",
      },
      {
        tag: "SIMULATE",
        title: "Safe adversarial testing",
        copy: "Validate exploitable paths without disrupting production.",
      },
      {
        tag: "REMEDIATE",
        title: "Developer-ready fixes",
        copy: "Prioritized evidence, ownership and clear mitigation steps.",
      },
    ],
    capabilities: [
      "Attack-path modeling",
      "Asset discovery",
      "Evidence capture",
      "Risk prioritization",
      "Team workflows",
      "Executive reporting",
    ],
  },
  crm: {
    eyebrow: "RELATIONSHIP INTELLIGENCE",
    title: "Every relationship.",
    accent: "Full context.",
    intro:
      "Emmett CRM captures the signal behind every conversation and helps teams act at the right moment—without turning work into data entry.",
    metrics: [
      ["360°", "Relationship view"],
      ["42%", "Less admin work"],
      ["3.2×", "Faster follow-up"],
    ],
    cards: [
      {
        tag: "CAPTURE",
        title: "Ambient memory",
        copy: "Meetings, messages and actions become structured context automatically.",
      },
      {
        tag: "UNDERSTAND",
        title: "Opportunity signals",
        copy: "Surface momentum, risk and the next best action.",
      },
      {
        tag: "ACT",
        title: "Workflow orchestration",
        copy: "Coordinate people and agents while keeping humans in control.",
      },
    ],
    capabilities: [
      "Unified timeline",
      "AI summaries",
      "Next-best action",
      "Workflow automation",
      "Role permissions",
      "Open integrations",
    ],
  },
  projects: {
    eyebrow: "PROOF OF WORK",
    title: "Systems that perform",
    accent: "under pressure.",
    intro:
      "Selected engagements across security, operations and intelligent products—measured by what changed after launch.",
    metrics: [
      ["42%", "Less operational drag"],
      ["3.2×", "Faster decisions"],
      ["8wk", "Average first release"],
    ],
    cards: [
      {
        tag: "FINTECH / AI",
        title: "Decision cockpit",
        copy: "Unified fragmented risk signals into one explainable surface.",
      },
      {
        tag: "SECURITY",
        title: "Continuous assurance",
        copy: "Replaced quarterly snapshots with a living model of exposure.",
      },
      {
        tag: "OPERATIONS",
        title: "Workflow autopilot",
        copy: "Automated casework while experts controlled exceptions.",
      },
    ],
    capabilities: [
      "Discovery sprint",
      "Experience architecture",
      "Full-stack delivery",
      "AI evaluation",
      "Production hardening",
      "Team enablement",
    ],
  },
  academy: {
    eyebrow: "EMMETT ACADEMY",
    title: "Learn by shipping",
    accent: "real systems.",
    intro:
      "Focused paths for builders who want durable mental models, production habits and a portfolio that proves the work.",
    metrics: [
      ["06", "Learning paths"],
      ["70%", "Project based"],
      ["∞", "Builder mindset"],
    ],
    cards: [
      {
        tag: "FOUNDATIONS",
        title: "AI systems engineering",
        copy: "Move beyond prompts into architecture, evaluation and reliable behavior.",
      },
      {
        tag: "ADVANCED",
        title: "Production intelligence",
        copy: "Build observable, secure and cost-aware systems.",
      },
      {
        tag: "STUDIO",
        title: "Ship with mentors",
        copy: "Turn one consequential idea into a working product.",
      },
    ],
    capabilities: [
      "Live studios",
      "Hands-on labs",
      "Code reviews",
      "Architecture clinics",
      "Portfolio projects",
      "Builder community",
    ],
  },
  about: {
    eyebrow: "BUILT BY BUILDERS",
    title: "Small team.",
    accent: "Deep range.",
    intro:
      "Emmett is an engineering studio for consequential digital systems. We stay close to the craft, customer and outcome.",
    metrics: [
      ["01", "Integrated team"],
      ["10+", "Years building"],
      ["100%", "Senior attention"],
    ],
    cards: [
      {
        tag: "PRINCIPLE 01",
        title: "Clarity before velocity",
        copy: "Make the system legible before making it larger.",
      },
      {
        tag: "PRINCIPLE 02",
        title: "Craft is strategy",
        copy: "Interface and API details compound into trust.",
      },
      {
        tag: "PRINCIPLE 03",
        title: "Stay with the outcome",
        copy: "Measure what works in the world, not what was delivered.",
      },
    ],
    capabilities: [
      "Senior-only teams",
      "Direct collaboration",
      "Weekly demos",
      "Transparent tradeoffs",
      "Long-term stewardship",
      "Knowledge transfer",
    ],
  },
};
const fa: Record<PageKey, PageCopy> = {
  services: {
    eyebrow: "خدمات مهندسی امت",
    title: "از یک چالش پیچیده تا",
    accent: "محصولی زنده و ماندگار.",
    intro:
      "استراتژی، طراحی محصول، هوش مصنوعی و زیرساخت را در یک تیم منسجم کنار هم می‌آوریم تا ایده شما سریع‌تر، دقیق‌تر و با ریسک کمتر به محصول واقعی تبدیل شود.",
    metrics: [
      ["۴", "تخصص در یک تیم"],
      ["۱۴ روز", "تا نمونه اولیه"],
      ["٪۹۹٫۹", "هدف پایداری"],
    ],
    cards: [
      {
        tag: "کشف",
        title: "شناخت عمیق سامانه",
        copy: "محدودیت واقعی را پیدا می‌کنیم، ریسک را می‌سنجیم و مؤثرترین نقطه شروع را انتخاب می‌کنیم.",
      },
      {
        tag: "ساخت",
        title: "مهندسی محصول",
        copy: "طراحی، نرم‌افزار و هوش مصنوعی در یک چرخه پیوسته پیش می‌روند.",
      },
      {
        tag: "مقیاس",
        title: "هوشمندی عملیاتی",
        copy: "رصدپذیری، خودکارسازی و حاکمیت از روز نخست در معماری قرار می‌گیرند.",
      },
    ],
    capabilities: [
      "مهندسی محصولات هوشمند",
      "معماری ابری",
      "مهندسی امنیت",
      "سکوهای داده",
      "طراحی محصول",
      "راهبرد فنی",
    ],
  },
  products: {
    eyebrow: "محصولات امت",
    title: "محصولاتی برای",
    accent: "نیازهای واقعی کسب‌وکار.",
    intro:
      "جایی که ابزارهای آماده پاسخ‌گو نیستند، محصولات امت وارد می‌شوند؛ برای داده‌های حساس، فرایندهای پیچیده و تصمیم‌هایی که به دید دقیق‌تری نیاز دارند.",
    metrics: [
      ["۲", "محصول اصلی"],
      ["۲۴/۷", "پایش هوشمند"],
      ["۱", "هسته یکپارچه داده"],
    ],
    cards: [
      {
        tag: "امنیت",
        title: "PenTestor",
        copy: "شبیه‌سازی پیوسته حمله و تبدیل یافته‌ها به اصلاحات روشن و اولویت‌بندی‌شده.",
      },
      {
        tag: "عملیات",
        title: "Emmett CRM",
        copy: "سامانه‌ای برای تبدیل زمینه هر ارتباط به اقدام درست و به‌موقع.",
      },
      {
        tag: "آزمایشی",
        title: "موتور سیگنال",
        copy: "مسیریابی ترکیبی رویدادها، عامل‌های هوشمند و تصمیم انسانی.",
      },
    ],
    capabilities: [
      "فرایندهای عامل‌محور",
      "معماری حریم‌خصوصی‌محور",
      "هوش مصنوعی توضیح‌پذیر",
      "کنترل انسانی",
      "داده زنده",
      "رابط‌های ترکیب‌پذیر",
    ],
  },
  pentestor: {
    eyebrow: "امنیت هوشمند و پیوسته",
    title: "آسیب‌پذیری را پیدا کنید؛",
    accent: "پیش از آن‌که مهاجم پیدا کند.",
    intro:
      "PenTestor به‌صورت پیوسته از نگاه مهاجم زیرساخت شما را بررسی می‌کند، مسیرهای نفوذ واقعی را می‌سنجد و برای هر تهدید، راه اصلاح روشن و اولویت‌بندی‌شده ارائه می‌دهد.",
    metrics: [
      ["۲۴/۷", "ارزیابی پیوسته"],
      ["۱۰ برابر", "بررسی سریع‌تر"],
      ["٪۱۰۰", "یافته‌های قابل‌توضیح"],
    ],
    cards: [
      {
        tag: "نقشه",
        title: "سطح حمله زنده",
        copy: "دارایی‌ها و ارتباط آن‌ها هم‌زمان با تغییر زیرساخت کشف می‌شوند.",
      },
      {
        tag: "شبیه‌سازی",
        title: "آزمون امن مهاجمانه",
        copy: "مسیرهای قابل بهره‌برداری بدون اختلال در محیط عملیاتی اعتبارسنجی می‌شوند.",
      },
      {
        tag: "اصلاح",
        title: "راهکار آماده توسعه",
        copy: "شواهد، مالکیت و گام‌های اصلاحی با اولویت روشن ارائه می‌شوند.",
      },
    ],
    capabilities: [
      "مدل‌سازی مسیر حمله",
      "کشف دارایی",
      "ثبت شواهد",
      "اولویت‌بندی ریسک",
      "فرایند تیمی",
      "گزارش مدیریتی",
    ],
  },
  crm: {
    eyebrow: "مدیریت هوشمند ارتباط با مشتری",
    title: "هر مشتری را",
    accent: "با تمام جزئیات بشناسید.",
    intro:
      "Emmett CRM اطلاعات پراکنده هر ارتباط را به یک تصویر روشن تبدیل می‌کند و بدون ورود داده‌های تکراری، بهترین زمان و اقدام بعدی را به تیم شما پیشنهاد می‌دهد.",
    metrics: [
      ["۳۶۰°", "نمای کامل مشتری"],
      ["٪۴۲", "کاهش کارهای دستی"],
      ["۳٫۲ برابر", "پیگیری سریع‌تر"],
    ],
    cards: [
      {
        tag: "ثبت",
        title: "حافظه محیطی",
        copy: "جلسه‌ها، پیام‌ها و اقدام‌ها به‌صورت خودکار به زمینه ساختاریافته تبدیل می‌شوند.",
      },
      {
        tag: "درک",
        title: "سیگنال فرصت",
        copy: "شتاب، ریسک و بهترین اقدام بعدی در زمان مناسب آشکار می‌شود.",
      },
      {
        tag: "اقدام",
        title: "هماهنگی فرایند",
        copy: "انسان‌ها و عامل‌ها هماهنگ می‌شوند و کنترل نهایی در دست تیم باقی می‌ماند.",
      },
    ],
    capabilities: [
      "خط زمانی یکپارچه",
      "خلاصه‌سازی هوشمند",
      "پیشنهاد اقدام بعدی",
      "خودکارسازی فرایند",
      "سطوح دسترسی",
      "یکپارچه‌سازی باز",
    ],
  },
  projects: {
    eyebrow: "نمونه‌کارهای منتخب",
    title: "محصولاتی که",
    accent: "زیر فشار هم درست کار می‌کنند.",
    intro:
      "گزیده‌ای از پروژه‌های امنیتی، عملیاتی و هوشمند امت؛ موفقیت هر پروژه را با نتیجه پس از انتشار می‌سنجیم، نه با حجم مستندات و ارائه‌ها.",
    metrics: [
      ["٪۴۲", "کاهش اصطکاک عملیاتی"],
      ["۳٫۲ برابر", "تصمیم‌گیری سریع‌تر"],
      ["۸ هفته", "تا انتشار نسخه نخست"],
    ],
    cards: [
      {
        tag: "فین‌تک / هوش مصنوعی",
        title: "اتاق فرمان تصمیم",
        copy: "سیگنال‌های پراکنده ریسک در یک سطح توضیح‌پذیر یکپارچه شدند.",
      },
      {
        tag: "امنیت",
        title: "اطمینان پیوسته",
        copy: "ارزیابی‌های مقطعی جای خود را به مدل زنده آسیب‌پذیری دادند.",
      },
      {
        tag: "عملیات",
        title: "خلبان خودکار فرایند",
        copy: "کارهای تکراری خودکار شدند و استثناها در کنترل متخصصان ماندند.",
      },
    ],
    capabilities: [
      "چرخه کشف",
      "معماری تجربه",
      "توسعه کامل",
      "ارزیابی هوش مصنوعی",
      "آماده‌سازی تولید",
      "توانمندسازی تیم",
    ],
  },
  academy: {
    eyebrow: "آکادمی امت",
    title: "یادگیری واقعی،",
    accent: "با ساختن محصول واقعی.",
    intro:
      "مسیرهای فشرده و پروژه‌محور برای کسانی که می‌خواهند اصول مهندسی را عمیق بفهمند، حرفه‌ای‌تر بسازند و نمونه‌کاری قابل‌ارائه داشته باشند.",
    metrics: [
      ["۶", "مسیر تخصصی"],
      ["٪۷۰", "یادگیری پروژه‌محور"],
      ["∞", "فرصت برای ساختن"],
    ],
    cards: [
      {
        tag: "پایه",
        title: "مهندسی سامانه‌های هوشمند",
        copy: "از پرامپت عبور کنید و معماری، ارزیابی و رفتار قابل اتکا را بیاموزید.",
      },
      {
        tag: "پیشرفته",
        title: "هوشمندی در مقیاس تولید",
        copy: "سامانه‌هایی رصدپذیر، امن و بهینه بسازید.",
      },
      {
        tag: "استودیو",
        title: "ساخت در کنار راهنما",
        copy: "یک ایده مهم را به محصولی واقعی و قابل ارائه تبدیل کنید.",
      },
    ],
    capabilities: [
      "استودیوی زنده",
      "آزمایشگاه عملی",
      "بازبینی کد",
      "کلینیک معماری",
      "پروژه نمونه‌کار",
      "جامعه سازندگان",
    ],
  },
  about: {
    eyebrow: "درباره امت",
    title: "تیمی جمع‌وجور؛",
    accent: "با تجربه‌ای عمیق.",
    intro:
      "امت یک استودیوی مهندسی برای ساخت محصولات دیجیتال اثرگذار است؛ نزدیک به مسئله، نزدیک به کاربر و متعهد به نتیجه‌ای که در عمل دیده می‌شود.",
    metrics: [
      ["۱", "تیم یکپارچه"],
      ["+۱۰ سال", "تجربه ساخت محصول"],
      ["٪۱۰۰", "همراهی متخصصان ارشد"],
    ],
    cards: [
      {
        tag: "اصل 01",
        title: "شفافیت پیش از سرعت",
        copy: "پیش از بزرگ‌تر کردن سامانه، آن را فهمیدنی می‌کنیم.",
      },
      {
        tag: "اصل 02",
        title: "ظرافت، بخشی از راهبرد است",
        copy: "جزئیات رابط و API در طول زمان به اعتماد تبدیل می‌شوند.",
      },
      {
        tag: "اصل 03",
        title: "همراه نتیجه می‌مانیم",
        copy: "آنچه در جهان واقعی کار می‌کند معیار ماست، نه صرفاً آنچه تحویل شده است.",
      },
    ],
    capabilities: [
      "تیم کاملاً ارشد",
      "همکاری مستقیم",
      "نمایش هفتگی محصول",
      "شفافیت تصمیم‌ها",
      "همراهی بلندمدت",
      "انتقال دانش",
    ],
  },
};
export const pages = { en, fa };

export const ui = {
  en: {
    nav: ["Services", "Products", "Projects", "Resources", "Academy", "About"],
    start: "Start a project",
    explore: "Explore the system",
    modules: "CORE MODULES",
    modulesTitle: "How it comes alive.",
    connected: "Built as one connected system.",
    next: "BUILD SOMETHING CONSEQUENTIAL",
    cta: "Your hardest problem might be your best product.",
    talk: "Talk to the builders",
    search: "Search pages and products…",
    operational: "All systems operational",
  },
  fa: {
    nav: ["خدمات", "محصولات", "پروژه‌ها", "منابع", "آکادمی", "درباره امت"],
    start: "شروع همکاری",
    explore: "جزئیات راهکار",
    modules: "اجزای کلیدی",
    modulesTitle: "راهکار چطور کار می‌کند؟",
    connected: "یکپارچه، دقیق و آماده رشد.",
    next: "از یک مسئله واقعی شروع کنیم",
    cta: "پیچیده‌ترین چالش شما می‌تواند به ارزشمندترین محصولتان تبدیل شود.",
    talk: "با تیم امت صحبت کنید",
    search: "جست‌وجو در سایت…",
    operational: "همه سامانه‌ها پایدار و فعال‌اند",
  },
} satisfies Record<Lang, Record<string, string | string[]>>;
