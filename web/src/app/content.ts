import type { Lang } from "./i18n";

export type PageKey =
  | "services"
  | "products"
  | "pentestor"
  | "crm"
  | "projects"
  | "academy"
  | "about";

/** A verifiable statement about how we work — deliberately never a number we cannot prove. */
export type PageSignal = { label: string; note: string };

/**
 * Honest placeholder for content the team still owes. Rendered as a marked, visible state
 * instead of being filled with an invented metric, customer name or award (MASTER rule 4 / G1).
 */
export type PagePending = { marker: string; title: string; note: string };

export type PageCopy = {
  eyebrow: string;
  title: string;
  accent: string;
  intro: string;
  signals: PageSignal[];
  cards: { tag: string; title: string; copy: string }[];
  capabilities: string[];
  pending?: PagePending;
};

const en: Record<PageKey, PageCopy> = {
  services: {
    eyebrow: "THE EMMETT ENGINEERING SYSTEM",
    title: "From a hard problem to",
    accent: "a living system.",
    intro:
      "Strategy, product design, AI and resilient infrastructure in one senior team. We publish how we work, and every claim on this site links to a tool you can use right now.",
    signals: [
      { label: "Live tools, not slides", note: "Each public claim opens a working artifact." },
      { label: "Computation in your browser", note: "Our public tools run locally and send no input to our servers." },
      { label: "Limits in writing", note: "Every tool states what it does not do." },
    ],
    cards: [
      { tag: "DISCOVER", title: "Systems diagnosis", copy: "Map the real constraint, model risk and find the smallest high-leverage move." },
      { tag: "BUILD", title: "Product engineering", copy: "Design, software and intelligence move in one continuous delivery loop." },
      { tag: "OPERATE", title: "Operational intelligence", copy: "Observability, automation and governance designed in from day one." },
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
    signals: [
      { label: "Two product lines", note: "PenTestor for security, Emmett CRM for relationship work." },
      { label: "One team end to end", note: "The same engineers build, ship and support them." },
      { label: "No invented numbers", note: "Adoption and revenue figures are published only once the team can document them." },
    ],
    cards: [
      { tag: "SECURITY", title: "PenTestor", copy: "Continuous, passive-first attack-surface review turned into prioritized and explainable fixes." },
      { tag: "OPERATIONS", title: "Emmett CRM", copy: "A relationship workspace that keeps context in one place instead of scattering it across tools." },
      { tag: "PLATFORM", title: "Shared foundations", copy: "One job engine, one design system and one deployment envelope behind both products." },
    ],
    capabilities: [
      "Agentic workflows",
      "Privacy-first architecture",
      "Explainable AI",
      "Human controls",
      "Live telemetry",
      "Composable APIs",
    ],
    pending: {
      marker: "[INPUT B12]",
      title: "Product numbers are pending",
      note: "Adoption, revenue and growth figures will appear here only with documented, permissioned data from the team. Until then this page stays qualitative.",
    },
  },
  pentestor: {
    eyebrow: "SECURITY REVIEW, HONESTLY SCOPED",
    title: "See your exposure",
    accent: "before someone else does.",
    intro:
      "PenTestor reviews your public surface the way our live scanner does: passively, with evidence, and with a report an engineer can act on.",
    signals: [
      { label: "Passive by design", note: "No port scanning and no intrusion attempts — the same guardrail as the public tool." },
      { label: "Evidence, not verdicts", note: "Every finding carries the observation that produced it." },
      { label: "A–F grade with reasons", note: "Six sections, each one explainable and reproducible." },
    ],
    cards: [
      { tag: "MAP", title: "Living attack surface", copy: "Track assets and their security posture as infrastructure changes." },
      { tag: "REVIEW", title: "Safe, passive review", copy: "Collect header, TLS, DNS and content signals without touching production." },
      { tag: "FIX", title: "Developer-ready reports", copy: "Prioritized findings, ownership and explicit remediation steps." },
    ],
    capabilities: [
      "Passive exposure mapping",
      "Evidence capture",
      "Risk prioritization",
      "Team workflows",
      "Executive reporting",
      "Repeatable checks",
    ],
    pending: {
      marker: "[INPUT B12]",
      title: "Customer evidence is pending",
      note: "We will publish case studies only with customer permission and documented results. None are shown yet.",
    },
  },
  crm: {
    eyebrow: "RELATIONSHIP INTELLIGENCE",
    title: "Every relationship.",
    accent: "Full context.",
    intro:
      "Emmett CRM keeps the signal behind every conversation in one place and helps teams act at the right moment — without turning work into data entry.",
    signals: [
      { label: "Context stays in one place", note: "Conversations, decisions and next steps live together." },
      { label: "Humans stay in control", note: "Automation proposes; people decide." },
      { label: "Numbers when documented", note: "Efficiency figures are only published once measured with customers." },
    ],
    cards: [
      { tag: "CAPTURE", title: "Structured memory", copy: "Turn meetings and messages into searchable, linked context." },
      { tag: "UNDERSTAND", title: "Opportunity signals", copy: "Surface momentum, risk and the next best action." },
      { tag: "ACT", title: "Workflow orchestration", copy: "Coordinate people and agents while keeping decisions human." },
    ],
    capabilities: [
      "Unified timeline",
      "AI summaries",
      "Next-best action",
      "Workflow automation",
      "Role permissions",
      "Open integrations",
    ],
    pending: {
      marker: "[INPUT B12]",
      title: "Efficiency metrics are pending",
      note: "We do not publish “faster by X%” claims without measured, permissioned customer data.",
    },
  },
  projects: {
    eyebrow: "PROOF OF WORK",
    title: "We publish results,",
    accent: "not promises.",
    intro:
      "Case studies appear here only with customer permission and verifiable numbers. What we can show today is live: the tools and the assistant on this site are the work.",
    signals: [
      { label: "Permission first", note: "No customer name, logo or metric is published without written approval." },
      { label: "Verified numbers only", note: "Every figure in a case study must be reproducible from the customer's own data." },
      { label: "Post-mortems too", note: "When something fails, the honest version is more useful than a highlight reel." },
    ],
    cards: [
      { tag: "STANDARD", title: "What a case study will contain", copy: "The problem, the constraint, what we built, what changed — and what we would do differently." },
      { tag: "EVIDENCE", title: "How numbers get verified", copy: "Measurements come from the customer's systems, reviewed by both sides before publication." },
      { tag: "UNTIL THEN", title: "Live proof instead", copy: "Use the toolbox, the scanner and the bio workbench — they run the same code we ship in production." },
    ],
    capabilities: [
      "Discovery sprint",
      "Experience architecture",
      "Full-stack delivery",
      "Security review",
      "AI integration",
      "Operational handover",
    ],
    pending: {
      marker: "[INPUT B6]",
      title: "Case studies are pending",
      note: "At least one customer story with written permission and documented metrics is required before this section is filled.",
    },
  },
  academy: {
    eyebrow: "KNOWLEDGE FROM THE WORK",
    title: "Notes from",
    accent: "inside the projects.",
    intro:
      "The Field Library collects what we learn while building: patterns, checklists and write-ups that come from real work, not from generic tutorials.",
    signals: [
      { label: "Written by the builders", note: "Material comes from the same team that ships the products." },
      { label: "Reproducible examples", note: "Where we publish a technique, we publish the tool or snippet that proves it." },
      { label: "Persian first", note: "Technical writing starts in Persian; English versions follow." },
    ],
    cards: [
      { tag: "PATTERNS", title: "Engineering notes", copy: "Decisions, trade-offs and the reasoning behind them." },
      { tag: "PLAYBOOKS", title: "Operational checklists", copy: "What to do when cron stops, when a provider fails, when a deploy goes wrong." },
      { tag: "TOOLS", title: "Learn by using", copy: "Each article links to a live tool you can run on your own input." },
    ],
    capabilities: [
      "Technical writing",
      "Security notes",
      "AI practice",
      "Persian typography",
      "Performance writing",
      "Operational runbooks",
    ],
    pending: {
      marker: "[INPUT B14]",
      title: "Public documentation links are pending",
      note: "Our runbooks live in the repository today; a public index is planned so every citation resolves to a URL.",
    },
  },
  about: {
    eyebrow: "THE TEAM",
    title: "Engineers who prefer",
    accent: "shipping.",
    intro:
      "Emmett is an independent engineering studio. We do not publish invented biographies, client lists or awards — the work on this site is the evidence.",
    signals: [
      { label: "Named people, real roles", note: "Team profiles will be published with the team's own consent and wording." },
      { label: "No invented awards", note: "Certifications and partnerships are listed only where they exist." },
      { label: "One public contract", note: "Our limits, security posture and open items are documented in this repository." },
    ],
    cards: [
      { tag: "HOW WE WORK", title: "Small senior team", copy: "A compact team with direct access to the people writing the code." },
      { tag: "WHAT WE BUILD", title: "Products and systems", copy: "From internal tools to public products, engineered to be maintained." },
      { tag: "WHAT WE WON'T", title: "No fabricated proof", copy: "If we cannot show it, we do not claim it." },
    ],
    capabilities: [
      "Software engineering",
      "Security engineering",
      "AI engineering",
      "Product design",
      "Technical writing",
      "Operations",
    ],
    pending: {
      marker: "[INPUT B6]",
      title: "Team profiles are pending",
      note: "Names, roles and bios will be published once the team supplies them; nothing is invented meanwhile.",
    },
  },
};

const fa: Record<PageKey, PageCopy> = {
  services: {
    eyebrow: "سیستم مهندسی امت",
    title: "از مسئلهٔ سخت تا",
    accent: "سامانهٔ زنده.",
    intro:
      "راهبرد، طراحی محصول، هوش مصنوعی و زیرساخت پایدار در یک تیم ارشد. روش کارمان را منتشر می‌کنیم و هر ادعای این سایت به ابزاری باز می‌شود که همین حالا می‌توانید استفاده کنید.",
    signals: [
      { label: "ابزار زنده، نه اسلاید", note: "هر ادعای عمومی به یک artifact قابل استفاده لینک دارد." },
      { label: "محاسبه در مرورگر شما", note: "ابزارهای عمومی محلی اجرا می‌شوند و ورودی شما به سرور ما نمی‌رود." },
      { label: "محدودیت‌ها نوشته می‌شوند", note: "هر ابزار می‌گوید چه کاری انجام نمی‌دهد." },
    ],
    cards: [
      { tag: "کشف", title: "تشخیص سامانه", copy: "قید واقعی را پیدا می‌کنیم، ریسک را مدل می‌کنیم و کوچک‌ترین حرکت پراثر را انتخاب می‌کنیم." },
      { tag: "ساخت", title: "مهندسی محصول", copy: "طراحی، نرم‌افزار و هوش مصنوعی در یک چرخهٔ تحویل پیوسته پیش می‌روند." },
      { tag: "بهره‌برداری", title: "هوش عملیاتی", copy: "دیده‌بانی، خودکارسازی و حاکمیت از روز اول در طراحی حاضرند." },
    ],
    capabilities: [
      "مهندسی محصول هوش مصنوعی",
      "معماری ابری",
      "مهندسی امنیت",
      "پلتفرم داده",
      "طراحی محصول",
      "راهبرد فنی",
    ],
  },
  products: {
    eyebrow: "آزمایشگاه محصول امت",
    title: "محصولاتی که از",
    accent: "قیدهای واقعی متولد شده‌اند.",
    intro:
      "محصولات جایی ساخته می‌شوند که نرم‌افزار آماده متوقف می‌شود: دادهٔ حساس، گردش‌کارهای پراصطکاک و تصمیم‌هایی که هوش می‌خواهند.",
    signals: [
      { label: "دو خط محصول", note: "PenTestor برای امنیت و Emmett CRM برای کار رابطه‌ای." },
      { label: "یک تیم، سرتاسر مسیر", note: "همان مهندسانی که می‌سازند، تحویل و پشتیبانی هم می‌کنند." },
      { label: "بدون عدد ساختگی", note: "اعداد پذیرش و درآمد فقط وقتی منتشر می‌شوند که تیم سند داشته باشد." },
    ],
    cards: [
      { tag: "امنیت", title: "PenTestor", copy: "بررسی پیوسته و passive-first سطح حمله، تبدیل‌شده به اصلاح‌های اولویت‌دار و قابل توضیح." },
      { tag: "عملیات", title: "Emmett CRM", copy: "فضای کاری رابطه‌ای که زمینه را در یک جا نگه می‌دارد، نه پخش‌شده در ابزارهای مختلف." },
      { tag: "پلتفرم", title: "پایه‌های مشترک", copy: "یک موتور job، یک سیستم طراحی و یک پوشش استقرار در پشت هر دو محصول." },
    ],
    capabilities: [
      "گردش‌کارهای عاملی",
      "معماری حریم‌خصوصی‌محور",
      "هوش مصنوعی قابل توضیح",
      "کنترل انسانی",
      "تلمتری زنده",
      "APIهای ترکیب‌پذیر",
    ],
    pending: {
      marker: "[INPUT B12]",
      title: "اعداد محصولات در انتظار دادهٔ واقعی است",
      note: "اعداد پذیرش، درآمد و رشد فقط با دادهٔ مستند و مجاز تیم اینجا می‌آید. تا آن روز، این صفحه کیفی می‌ماند.",
    },
  },
  pentestor: {
    eyebrow: "بررسی امنیتی با دامنهٔ صادقانه",
    title: "قبل از دیگران",
    accent: "نقطه‌های افشا را ببینید.",
    intro:
      "PenTestor سطح عمومی شما را همان‌طور بررسی می‌کند که ابزار زندهٔ ما: passive، با شاهد، و گزارشی که یک مهندس بتواند روی آن کار کند.",
    signals: [
      { label: "passive به‌صورت طراحی", note: "بدون پورت‌اسکن و بدون تلاش نفوذی — همان نگهبان ابزار عمومی." },
      { label: "شاهد، نه حکم", note: "هر یافته، مشاهده‌ای را که تولیدش کرده همراه دارد." },
      { label: "گرید A تا F با دلیل", note: "شش بخش، هر کدام قابل توضیح و بازتولید." },
    ],
    cards: [
      { tag: "نقشه", title: "سطح حملهٔ زنده", copy: "دارایی‌ها و وضعیت امنیتی‌شان را همراه تغییر زیرساخت پیگیری می‌کند." },
      { tag: "بررسی", title: "بررسی passive ایمن", copy: "سیگنال‌های هدر، TLS، DNS و محتوا را بدون دست‌زدن به production جمع می‌کند." },
      { tag: "اصلاح", title: "گزارش آمادهٔ توسعه", copy: "یافته‌های اولویت‌دار، مالک مشخص و گام‌های رفع صریح." },
    ],
    capabilities: [
      "نقشه‌برداری passive",
      "ثبت شاهد",
      "اولویت‌بندی ریسک",
      "گردش‌کار تیمی",
      "گزارش مدیریتی",
      "بررسی‌های تکرارپذیر",
    ],
    pending: {
      marker: "[INPUT B12]",
      title: "شاهد مشتری در انتظار تأیید است",
      note: "مطالعهٔ موردی فقط با اجازهٔ مشتری و نتایج مستند منتشر می‌شود. فعلاً هیچ موردی نمایش داده نمی‌شود.",
    },
  },
  crm: {
    eyebrow: "هوش رابطه‌ای",
    title: "همهٔ رابطه‌ها.",
    accent: "زمینهٔ کامل.",
    intro:
      "Emmett CRM سیگنال پشت هر گفت‌وگو را یک‌جا نگه می‌دارد و به تیم کمک می‌کند در لحظهٔ درست عمل کند — بدون تبدیل کار به ورود داده.",
    signals: [
      { label: "زمینه در یک جا می‌ماند", note: "گفت‌وگوها، تصمیم‌ها و گام‌های بعدی کنار هم زندگی می‌کنند." },
      { label: "کنترل دست انسان می‌ماند", note: "خودکارسازی پیشنهاد می‌دهد؛ انسان تصمیم می‌گیرد." },
      { label: "عدد وقتی مستند شد", note: "اعداد کارایی فقط با اندازه‌گیری مستند کنار مشتری منتشر می‌شوند." },
    ],
    cards: [
      { tag: "ثبت", title: "حافظهٔ ساختارمند", copy: "جلسه‌ها و پیام‌ها را به زمینهٔ قابل جست‌وجو و پیوندخورده تبدیل می‌کند." },
      { tag: "فهم", title: "سیگنال فرصت", copy: "شتاب، ریسک و بهترین گام بعدی را نشان می‌دهد." },
      { tag: "اقدام", title: "ارکستراسیون گردش‌کار", copy: "انسان‌ها و عامل‌ها را هم‌راستا می‌کند و تصمیم را انسانی نگه می‌دارد." },
    ],
    capabilities: [
      "خط زمانی یکپارچه",
      "خلاصه‌های هوش مصنوعی",
      "بهترین اقدام بعدی",
      "خودکارسازی گردش‌کار",
      "دسترسی نقش‌محور",
      "یکپارچه‌سازی باز",
    ],
    pending: {
      marker: "[INPUT B12]",
      title: "متریک کارایی در انتظار است",
      note: "ادعای «چند درصد سریع‌تر» را بدون دادهٔ اندازه‌گیری‌شده و مجاز مشتری منتشر نمی‌کنیم.",
    },
  },
  projects: {
    eyebrow: "اثبات کار",
    title: "نتیجه منتشر می‌کنیم،",
    accent: "نه وعده.",
    intro:
      "مطالعهٔ موردی فقط با اجازهٔ مشتری و اعداد قابل راستی‌آزمایی اینجا می‌آید. چیزی که امروز می‌توانیم نشان دهیم زنده است: ابزارها و دستیار همین سایت، خودِ کارند.",
    signals: [
      { label: "اول اجازه", note: "هیچ نام، لوگو یا عددی بدون تأیید کتبی مشتری منتشر نمی‌شود." },
      { label: "فقط اعداد راستی‌آزمایی‌شده", note: "هر عدد در مطالعهٔ موردی باید از دادهٔ خود مشتری بازتولیدشدنی باشد." },
      { label: "post-mortem هم منتشر می‌کنیم", note: "وقتی چیزی شکست می‌خورد، روایت صادقانه از تیزر تبلیغاتی مفیدتر است." },
    ],
    cards: [
      { tag: "استاندارد", title: "یک مطالعهٔ موردی چه دارد", copy: "مسئله، قید، آنچه ساختیم، چه چیزی تغییر کرد — و چه کاری را امروز متفاوت انجام می‌دهیم." },
      { tag: "شاهد", title: "اعداد چطور تأیید می‌شوند", copy: "اندازه‌گیری از سامانهٔ مشتری می‌آید و پیش از انتشار، دو طرف بازبینی می‌کنند." },
      { tag: "تا آن روز", title: "به‌جایش شاهد زنده", copy: "جعبه‌ابزار، اسکنر و میز کار بیوانفورماتیک همان کدی را اجرا می‌کنند که در production می‌فرستیم." },
    ],
    capabilities: [
      "اسپرینت کشف",
      "معماری تجربه",
      "تحویل full-stack",
      "بازبینی امنیتی",
      "یکپارچه‌سازی هوش مصنوعی",
      "تحویل عملیاتی",
    ],
    pending: {
      marker: "[INPUT B6]",
      title: "مطالعات موردی در انتظار است",
      note: "پیش از پر شدن این بخش، دست‌کم یک روایت مشتری با اجازهٔ کتبی و متریک مستند لازم است.",
    },
  },
  academy: {
    eyebrow: "دانش برآمده از کار",
    title: "یادداشت‌هایی از",
    accent: "دل پروژه‌ها.",
    intro:
      "کتابخانهٔ امت آنچه در مسیر ساخت یاد می‌گیریم را جمع می‌کند: الگوها، چک‌لیست‌ها و نوشته‌هایی که از کار واقعی آمده‌اند، نه از آموزش‌های عمومی.",
    signals: [
      { label: "نوشتهٔ سازندگان", note: "مطالب از همان تیمی می‌آید که محصولات را تحویل می‌دهد." },
      { label: "نمونه‌های بازتولیدشدنی", note: "هرجا تکنیکی منتشر می‌کنیم، ابزار یا قطعه‌کدی که اثباتش می‌کند هم هست." },
      { label: "فارسی‌اول", note: "نوشتن فنی از فارسی شروع می‌شود و نسخهٔ انگلیسی پس از آن می‌آید." },
    ],
    cards: [
      { tag: "الگوها", title: "یادداشت‌های مهندسی", copy: "تصمیم‌ها، بده‌بستان‌ها و استدلال پشت‌شان." },
      { tag: "راهنماها", title: "چک‌لیست‌های عملیاتی", copy: "وقتی cron می‌ایستد، وقتی provider قطع می‌شود، وقتی deploy خراب می‌شود." },
      { tag: "ابزارها", title: "با استفاده یاد بگیرید", copy: "هر مقاله به یک ابزار زنده لینک دارد که روی ورودی خودتان اجرا می‌شود." },
    ],
    capabilities: [
      "نوشتار فنی",
      "یادداشت‌های امنیتی",
      "عمل هوش مصنوعی",
      "تایپوگرافی فارسی",
      "نوشتن دربارهٔ کارایی",
      "راهنمای عملیات",
    ],
    pending: {
      marker: "[INPUT B14]",
      title: "لینک عمومی مستندات در انتظار است",
      note: "راهنماهای ما امروز در مخزن هستند؛ فهرست عمومی تا وقتی ساخته نشود، استنادها فقط نام فایل‌اند.",
    },
  },
  about: {
    eyebrow: "تیم",
    title: "مهندس‌هایی که تحویل دادن را",
    accent: "ترجیح می‌دهند.",
    intro:
      "امت یک استودیوی مهندسی مستقل است. بیوگرافی، فهرست مشتری یا جایزهٔ ساختگی منتشر نمی‌کنیم — کارِ همین سایت شاهدن است.",
    signals: [
      { label: "نام و نقش واقعی", note: "پروفایل تیم با رضایت و متن خودشان منتشر می‌شود." },
      { label: "بدون جایزهٔ ساختگی", note: "گواهی‌ها و شراکت‌ها فقط جایی می‌آیند که وجود دارند." },
      { label: "یک قرارداد عمومی", note: "محدودیت‌ها، وضعیت امنیتی و موارد بازمان در همین مخزن مستندند." },
    ],
    cards: [
      { tag: "روش کار", title: "تیم کوچک ارشد", copy: "تیمی فشرده با دسترسی مستقیم به کسانی که کد را می‌نویسند." },
      { tag: "آنچه می‌سازیم", title: "محصول و سامانه", copy: "از ابزار داخلی تا محصول عمومی، مهندسی‌شده برای نگهداری." },
      { tag: "آنچه نمی‌کنیم", title: "شاهد ساختگی نداریم", copy: "اگر نتوانیم نشانش دهیم، ادعایش نمی‌کنیم." },
    ],
    capabilities: [
      "مهندسی نرم‌افزار",
      "مهندسی امنیت",
      "مهندسی هوش مصنوعی",
      "طراحی محصول",
      "نوشتار فنی",
      "عملیات",
    ],
    pending: {
      marker: "[INPUT B6]",
      title: "پروفایل تیم در انتظار است",
      note: "نام، نقش و بیوگرافی وقتی تیم متن را بدهد منتشر می‌شود؛ تا آن زمان چیزی ساخته نمی‌شود.",
    },
  },
};

export const pages: Record<Lang, Record<PageKey, PageCopy>> = { en, fa };

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
    statusChecking: "Checking service status…",
    statusOnline: "Services responding",
    statusOffline: "Service status unavailable",
    pendingTitle: "Awaiting team input",
    pendingNote: "This section stays marked until the real content arrives — nothing is invented to fill it.",
  },
  fa: {
    nav: ["خدمات", "محصولات", "پروژه‌ها", "منابع", "آکادمی", "درباره امت"],
    start: "شروع همکاری",
    explore: "جزئیات راهکار",
    modules: "اجزای کلیدی",
    modulesTitle: "راهکار چطور کار می‌کند؟",
    connected: "یکپارچه، دقیق و آماده رشد.",
    next: "چیزی سازنده بسازیم",
    cta: "سخت‌ترین مسئلهٔ شما می‌تواند بهترین محصول‌تان باشد.",
    talk: "با سازندگان حرف بزنید",
    search: "جست‌وجوی صفحه‌ها و محصولات…",
    statusChecking: "در حال بررسی وضعیت سرویس…",
    statusOnline: "سرویس‌ها پاسخ می‌دهند",
    statusOffline: "وضعیت سرویس در دسترس نیست",
    pendingTitle: "در انتظار ورودی تیم",
    pendingNote: "این بخش تا رسیدن محتوای واقعی علامت‌دار می‌ماند؛ چیزی برای پر کردنش ساخته نمی‌شود.",
  },
};

export type UiCopy = (typeof ui)["fa"];
