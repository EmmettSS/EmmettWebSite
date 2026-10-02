import type { ToolMeta } from "@/features/toolbox/types";
import { LOGIC_CODE_SAMPLE } from "./logic";

export const meta: ToolMeta = {
  id: "biolab",
  slug: { fa: "biolab", en: "biolab" },
  /** Feature card F-09 places this workbench at /fa/biolab/ — not under /tools/*. */
  route: { fa: "biolab", en: "biolab" },
  title: { fa: "میز کار بیوانفورماتیک", en: "Bioinformatics workbench" },
  subtitle: {
    fa: "تحلیل توالی، تبدیل‌ها، خط لولهٔ آزمایشگاه و نمونهٔ FHIR — همه در مرورگر شما.",
    en: "Sequence analysis, conversions, a lab pipeline and FHIR samples — all inside your browser.",
  },
  description: {
    fa: "توالی DNA را بچسبانید یا فایل FASTA را باز کنید: طول، ترکیب بازها، محتوای GC با نمایشگر تعاملی، وزن مولکولی، نقطهٔ ذوب، مکمل معکوس، ORF در شش قاب و فراوانی کدون — بدون ارسال توالی به هیچ سروری. خروجی JSON/CSV و لینک اشتراکی (فقط اعداد، نه توالی) در دسترس است.",
    en: "Paste a DNA sequence or open a FASTA file: length, base composition, GC content with an interactive viewer, molecular weight, melting temperature, reverse complement, ORFs in all six frames and codon usage — without uploading the sequence anywhere. Export JSON/CSV and create a share link that carries the numbers, never the sequence.",
  },
  capability: "biotech",
  version: "1.0.0",
  updatedFa: "۱۴۰۵/۰۷/۱۰",
  keywords: {
    fa: ["بیوانفورماتیک", "توالی", "DNA", "FASTA", "محتوای GC", "ORF", "ترجمه", "کدون", "مکمل معکوس", "FHIR", "آزمایشگاه"],
    en: ["bioinformatics", "sequence", "DNA", "FASTA", "GC content", "ORF", "translation", "codon usage", "reverse complement", "FHIR", "lab"],
  },
  evidence: {
    fa: "هستهٔ محاسبات خالص و تست‌شده است؛ نمونهٔ مرجع عمومی (ژن S ویروس SARS-CoV-2) با مقدار مرجع مقایسه می‌شود.",
    en: "The compute core is pure and tested; the public reference sample (SARS-CoV-2 spike) is checked against published values.",
  },
  howItWorks: {
    fa: [
      "ورودی با یک پارسر FASTA پاک‌سازی می‌شود: سرخط‌ها جدا، فاصله و شماره‌خط حذف و فقط A/C/G/T/N پذیرفته می‌شود؛ هر کاراکتر دیگر با موقعیت دقیق گزارش می‌شود.",
      "همهٔ محاسبات در تابع‌های خالص (logic.ts) انجام می‌شود و برای توالی‌های بزرگ در Web Worker اجرا می‌شود؛ اگر Worker در دسترس نباشد، همان مراحل با yield بین chunk‌ها روی رشتهٔ اصلی اجرا می‌شوند تا رابط قفل نشود.",
      "ORF در هر سه قاب و هر دو رشته با کدون آغاز و کدون پایان استاندارد جست‌وجو می‌شود؛ ORFهای ناتمام (بدون کدون پایان) صریح علامت می‌خورند. جدول کدون قابل انتخاب است و Tm با روش اعلام‌شده (والاس برای الیگو کوتاه، فرمول GC با تصحیح نمک برای بقیه) تخمین زده می‌شود.",
      "نمونهٔ پیش‌فرض یک توالی مرجع عمومی است (MN908947.3، ژن S ویروس SARS-CoV-2) و از همان مسیر ورودی کاربر عبور می‌کند؛ هیچ داده‌ای از کاربر ذخیره یا لاگ نمی‌شود.",
    ],
    en: [
      "Input goes through a FASTA parser: headers are separated, whitespace and line numbers stripped, and only A/C/G/T/N is accepted; anything else is reported with its exact position.",
      "All computation lives in pure functions (logic.ts) and runs in a Web Worker for large sequences; when Workers are unavailable the same stages run on the main thread with a yield between chunks so the UI never freezes.",
      "ORFs are found in all three frames on both strands using standard start and stop codons; partial ORFs (no stop codon) are explicitly flagged. The codon table is selectable and Tm uses the stated method (Wallace for short oligos, GC formula with salt correction otherwise).",
      "The preloaded sample is a public reference sequence (MN908947.3, SARS-CoV-2 spike) and it travels through the same input path as user data; nothing the visitor enters is stored or logged.",
    ],
  },
  howToSteps: {
    fa: [
      { name: "توالی را وارد کنید", text: "یک توالی FASTA را بچسبانید یا فایل .fasta/.fa/.txt را باز کنید؛ یا نمونهٔ مرجع عمومی را بار کنید." },
      { name: "تحلیل کنید", text: "دکمهٔ «تحلیل کن» را بزنید و طول، GC، Tm، ORFها و فراوانی کدون را ببینید." },
      { name: "در نمایشگر کاوش کنید", text: "با اسکرول زوم و با کشیدن جابه‌جا کنید؛ ORFهای جلویی و پشتی و مناطق GC-غنی هایلایت می‌شوند." },
      { name: "خروجی بگیرید", text: "نتیجه را به‌صورت JSON یا CSV دانلود کنید یا لینک اشتراکی بسازید (فقط اعداد ذخیره می‌شوند)." },
    ],
    en: [
      { name: "Provide a sequence", text: "Paste a FASTA sequence, open a .fasta/.fa/.txt file, or load the public reference sample." },
      { name: "Run the analysis", text: "Press “Analyse” to get length, GC, Tm, ORFs and codon usage." },
      { name: "Explore in the viewer", text: "Scroll to zoom and drag to pan; forward and reverse ORFs and GC-rich regions are highlighted." },
      { name: "Export", text: "Download the result as JSON or CSV, or create a share link (only numbers are stored)." },
    ],
  },
  codeSamples: [{ label: "logic · logic.ts", language: "typescript", code: LOGIC_CODE_SAMPLE }],
  limitations: {
    fa: [
      "این ابزار پژوهشی و آموزشی است و جایگزین نرم‌افزار آزمایشگاهی یا تأیید بالینی نمی‌شود؛ هیچ ادعای تشخیصی ندارد.",
      "هرگز دادهٔ واقعی بیمار وارد نکنید؛ چنین داده‌ای نه در این صفحه پذیرفته می‌شود و نه در سرور.",
      "Tm یک تخمین است (والاس/فرمول GC با تصحیح نمک) و به‌اندازهٔ روش‌های nearest-neighbour دقیق نیست؛ ترازبندی، همگذاری و فیلوژنی در این نسخه وجود ندارد.",
      "نمونهٔ پیش‌فرض یک توالی مرجع عمومی است، نه دادهٔ آزمایشگاه امت؛ جای دادهٔ واقعی تیم با مارکر [INPUT B10] باز است.",
    ],
    en: [
      "This tool is for research and education and is not a substitute for laboratory software or clinical approval; it makes no diagnostic claim.",
      "Never enter real patient data; it is neither accepted in this page nor on the server.",
      "Tm is an estimate (Wallace rule or GC formula with salt correction) and is not as accurate as nearest-neighbour methods; alignment, assembly and phylogenetics are out of scope for this build.",
      "The preloaded sample is a public reference sequence, not Emmett lab data; the placeholder for the team's real dataset is marked [INPUT B10].",
    ],
  },
  disclaimers: {
    fa: ["برای پژوهش و آموزش. توالی شما در مرورگر می‌ماند و ارسال یا لاگ نمی‌شود."],
    en: ["For research and education. Your sequence stays in the browser and is never uploaded or logged."],
  },
  offlineCapable: true,
  noindexResults: true,
};

export default meta;
