/**
 * Terminal allow-list (F-07).
 *
 * Security contract: this module never evaluates user input. Every command is a named
 * handler in `COMMANDS`; anything else is answered with an "unknown command" message.
 * There is no `eval`, no `new Function`, no dynamic import of user strings.
 */
import { registry, toolEntries } from "@/features/registry";
import { composition, findOrfs, reverseComplement, sanitizeInput, translate } from "@/features/biolab/logic";

export type CommandResponse =
  | { kind: "text"; text: string }
  | { kind: "json"; data: unknown; caption?: string }
  | { kind: "table"; columns: string[]; rows: string[][]; caption?: string }
  | { kind: "error"; text: string; blocked?: boolean };

export type CommandContext = {
  lang: "fa" | "en";
  navigate: (path: string) => void;
  setLowPower: (value: boolean) => void;
  switchLanguage: () => void;
  clear: () => void;
  api: {
    get: <T>(path: string) => Promise<T>;
    post: <T>(path: string, body?: unknown) => Promise<T>;
  };
};

export type CommandSpec = {
  name: string;
  usage: string;
  descriptionFa: string;
  descriptionEn: string;
  local: boolean;
  run: (args: string[], ctx: CommandContext) => Promise<CommandResponse> | CommandResponse;
};

const copy = {
  unknown: { fa: "دستور ناشناخته. برای فهرست دستورها help را بزنید.", en: "Unknown command. Type help for the allow-list." },
  blocked: { fa: "این دستور مجاز نیست: ترمینال فقط دستورهای فهرست‌شده را اجرا می‌کند.", en: "Blocked: the terminal only runs allow-listed commands." },
  badArgs: { fa: "آرگومان‌های این دستور کامل نیست. مثال را ببینید.", en: "Missing arguments for this command. Check the usage example." },
  offline: { fa: "سرویس در دسترس نیست.", en: "The service is unavailable." },
  scanConsent: { fa: "برای اسکن دامنه باید مالک آن باشید یا اجازه داشته باشید: scan <domain> --consent", en: "Scanning requires ownership or permission: scan <domain> --consent" },
};

function helpText(lang: "fa" | "en"): string {
  const header = lang === "fa" ? "دستورهای موجود:" : "Available commands:";
  const lines = Object.values(COMMANDS).map((command) => `  ${command.usage.padEnd(34, " ")} ${lang === "fa" ? command.descriptionFa : command.descriptionEn}`);
  const footer = lang === "fa" ? "Tab تکمیل می‌کند، ↑ تاریخچه را می‌آورد و clear صفحه را پاک می‌کند." : "Tab completes, ↑ walks the history, clear wipes the screen.";
  return [header, ...lines, "", footer].join("\n");
}

function unknown(lang: "fa" | "en"): CommandResponse {
  return { kind: "error", text: lang === "fa" ? copy.unknown.fa : copy.unknown.en };
}

function requireArgs(args: string[], count: number, lang: "fa" | "en"): CommandResponse | null {
  return args.length >= count ? null : { kind: "error", text: lang === "fa" ? copy.badArgs.fa : copy.badArgs.en };
}

export const COMMANDS: Record<string, CommandSpec> = {
  help: {
    name: "help",
    usage: "help",
    descriptionFa: "فهرست دستورها",
    descriptionEn: "List commands",
    local: true,
    run: (_args, ctx) => ({ kind: "text", text: helpText(ctx.lang) }),
  },
  tools: {
    name: "tools",
    usage: "tools [--json]",
    descriptionFa: "فهرست ابزارها از API واقعی",
    descriptionEn: "List tools from the real API",
    local: false,
    run: async (args, ctx) => {
      const response = await ctx.api.get<{ items: { id: string; title: string; status: string; version?: string }[]; count: number }>("/public/tools/");
      if (args.includes("--json")) return { kind: "json", data: response, caption: `${response.count} items` };
      return { kind: "table", columns: ["id", ctx.lang === "fa" ? "عنوان" : "title", "status", "version"], rows: response.items.map((item) => [item.id, item.title, item.status, item.version ?? "—"]) };
    },
  },
  team: {
    name: "team",
    usage: "team [--json]",
    descriptionFa: "اعضای تیم از API",
    descriptionEn: "Team members from the API",
    local: false,
    run: async (args, ctx) => {
      const response = await ctx.api.get<{ name_fa: string; name_en: string; role_fa: string; role_en: string }[]>("/public/team/");
      if (args.includes("--json")) return { kind: "json", data: response };
      return { kind: "table", columns: [ctx.lang === "fa" ? "نام" : "name", ctx.lang === "fa" ? "نقش" : "role"], rows: response.map((member) => [ctx.lang === "fa" ? member.name_fa : member.name_en, ctx.lang === "fa" ? member.role_fa : member.role_en]) };
    },
  },
  projects: {
    name: "projects",
    usage: "projects [--json]",
    descriptionFa: "کیس‌استادی‌ها از API",
    descriptionEn: "Case studies from the API",
    local: false,
    run: async (args, ctx) => {
      const response = await ctx.api.get<{ slug: string; title: string }[]>(`/public/case-studies/?lang=${ctx.lang}`);
      if (args.includes("--json")) return { kind: "json", data: response };
      return { kind: "table", columns: ["slug", ctx.lang === "fa" ? "عنوان" : "title"], rows: response.map((item) => [item.slug, item.title]) };
    },
  },
  status: {
    name: "status",
    usage: "status [--json]",
    descriptionFa: "سلامت سامانه، نسخه و uptime",
    descriptionEn: "System health, version and uptime",
    local: false,
    run: async (args, ctx) => {
      const response = await ctx.api.get<{ status: string; version: string; uptime: number; db: string }>("/health/");
      if (args.includes("--json")) return { kind: "json", data: response };
      return { kind: "text", text: `status: ${response.status}\nversion: ${response.version}\nuptime: ${response.uptime}s\ndb: ${response.db}` };
    },
  },
  normalize: {
    name: "normalize",
    usage: "normalize <text>",
    descriptionFa: "نرمال‌سازی متن فارسی با API",
    descriptionEn: "Normalise Persian text through the API",
    local: false,
    run: async (args, ctx) => {
      const text = args.join(" ");
      if (!text) return requireArgs(args, 1, ctx.lang) ?? unknown(ctx.lang);
      const response = await ctx.api.post<{ normalized: string; changes: { rule: string; count: number }[] }>("/tools/persian-text/normalize/", { text, rules: ["yeh", "kaf", "digits", "zwnj", "spaces"] });
      return { kind: "json", data: response };
    },
  },
  jalali: {
    name: "jalali",
    usage: "jalali <1404/07/01>",
    descriptionFa: "تبدیل تاریخ از API",
    descriptionEn: "Convert a date through the API",
    local: false,
    run: async (args, ctx) => {
      const value = args[0];
      if (!value) return requireArgs(args, 1, ctx.lang) ?? unknown(ctx.lang);
      const response = await ctx.api.get<{ jalali: string; gregorian: string; weekday?: string }>(`/tools/jalali/convert/?from=jalali&to=gregorian&value=${encodeURIComponent(value)}`);
      return { kind: "json", data: response };
    },
  },
  scan: {
    name: "scan",
    usage: "scan <domain> --consent",
    descriptionFa: "چک‌آپ امنیتی passive دامنه با تأیید مالکیت",
    descriptionEn: "Passive domain security check-up (consent required)",
    local: false,
    run: async (args, ctx) => {
      const consent = args.includes("--consent");
      const positional = args.filter((value) => !value.startsWith("--"));
      const domain = positional[0];
      if (!domain) return requireArgs(positional, 1, ctx.lang) ?? unknown(ctx.lang);
      // Guard 2 lives here too: the terminal is a second input path and takes consent itself.
      if (!consent) return { kind: "error", text: ctx.lang === "fa" ? copy.scanConsent.fa : copy.scanConsent.en };
      try {
        const created = await ctx.api.post<{ job_id: number }>("/scanner/jobs/", { domain, consent: true, locale: ctx.lang });
        return {
          kind: "json",
          data: { job_id: created.job_id, poll: `/api/v1/scanner/jobs/${created.job_id}/poll/`, note: ctx.lang === "fa" ? "با open check-security گزارش را ببینید." : "Use open check-security to see the report." },
          caption: `scan ${domain}`,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { kind: "error", text: `${ctx.lang === "fa" ? copy.offline.fa : copy.offline.en} (${message})` };
      }
    },
  },
  ask: {
    name: "ask",
    usage: "ask <question>",
    descriptionFa: "پرسش از دستیار RAG روی محتوای امت",
    descriptionEn: "Ask the RAG assistant on Emmett content",
    local: false,
    run: async (args, ctx) => {
      const question = args.join(" ").trim();
      if (!question) return requireArgs(args, 1, ctx.lang) ?? unknown(ctx.lang);
      if (question.length > 500) return { kind: "error", text: ctx.lang === "fa" ? "پرسش حداکثر ۵۰۰ کاراکتر می‌تواند باشد." : "A question can be at most 500 characters." };
      try {
        const created = await ctx.api.post<{ job_id: number }>("/assistant/ask/", { question, locale: ctx.lang });
        const polled = await ctx.api.get<{ result: { answer: string; citations: { title: string; source: string; url: string }[]; mode: string; disclosure: string } | null }>(`/assistant/ask/${created.job_id}/poll/?offset=0`);
        const result = polled.result;
        if (!result) return { kind: "error", text: ctx.lang === "fa" ? copy.offline.fa : copy.offline.en };
        return {
          kind: "json",
          data: {
            mode: result.mode,
            answer: result.answer,
            citations: result.citations.map((citation) => citation.url || citation.source || citation.title),
            disclosure: result.disclosure,
          },
          caption: `ask · ${result.mode}`,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { kind: "error", text: `${ctx.lang === "fa" ? copy.offline.fa : copy.offline.en} (${message})` };
      }
    },
  },
  open: {
    name: "open",
    usage: "open <page|tool>",
    descriptionFa: "باز کردن صفحه یا ابزار",
    descriptionEn: "Open a page or tool",
    local: true,
    run: (args, ctx) => {
      const target = args.join(" ").trim();
      if (!target) return requireArgs(args, 1, ctx.lang) ?? unknown(ctx.lang);
      const match = registry.find((entry) => entry.title[ctx.lang].toLowerCase().includes(target.toLowerCase()) || entry.id.endsWith(target) || entry.keywords[ctx.lang].some((keyword) => keyword.includes(target)));
      if (!match?.path) return { kind: "error", text: ctx.lang === "fa" ? `صفحه‌ای با «${target}» پیدا نشد.` : `No page matches “${target}”.` };
      ctx.navigate(`/${ctx.lang}${match.path[ctx.lang]}`);
      return { kind: "text", text: ctx.lang === "fa" ? `${match.title.fa} باز شد.` : `Opened ${match.title.en}.` };
    },
  },
  theme: {
    name: "theme",
    usage: "theme low-power|auto",
    descriptionFa: "تنظیم حالت کم‌مصرف (Device Tier)",
    descriptionEn: "Set the low-power device tier",
    local: true,
    run: (args, ctx) => {
      const mode = args[0];
      if (mode !== "low-power" && mode !== "auto") return { kind: "error", text: ctx.lang === "fa" ? "مقادیر مجاز: low-power یا auto" : "Allowed values: low-power or auto" };
      ctx.setLowPower(mode === "low-power");
      return { kind: "text", text: mode === "low-power" ? (ctx.lang === "fa" ? "حالت کم‌مصرف روشن شد." : "Low-power mode enabled.") : ctx.lang === "fa" ? "حالت خودکار فعال شد." : "Automatic tier restored." };
    },
  },
  lang: {
    name: "lang",
    usage: "lang fa|en",
    descriptionFa: "تغییر زبان",
    descriptionEn: "Switch language",
    local: true,
    run: (args, ctx) => {
      const mode = args[0];
      if (mode !== "fa" && mode !== "en") return { kind: "error", text: ctx.lang === "fa" ? "مقادیر مجاز: fa یا en" : "Allowed values: fa or en" };
      if (mode !== ctx.lang) ctx.switchLanguage();
      return { kind: "text", text: mode === "fa" ? "زبان به فارسی تغییر کرد." : "Language switched to English." };
    },
  },
  emmett: {
    name: "emmett",
    usage: "emmett why",
    descriptionFa: "یک جملهٔ مهندسی خشک",
    descriptionEn: "One dry engineering sentence",
    local: true,
    run: (args, ctx) => {
      if (args[0] !== "why") return { kind: "error", text: ctx.lang === "fa" ? "تنها زیر‌دستور: emmett why" : "Only subcommand: emmett why" };
      return { kind: "text", text: ctx.lang === "fa" ? "چون ادعای بدون شاهد، بدهی است." : "Because a claim without evidence is debt." };
    },
  },
  kod: {
    name: "kod",
    usage: "kod <code>",
    descriptionFa: "اعتبارسنجی کد ملی — کاملاً محلی، بدون ارسال ورودی",
    descriptionEn: "National-ID checksum — fully local, input never leaves the browser",
    local: true,
    run: async (args, ctx) => {
      const code = args.join(" ").trim();
      if (!code) return requireArgs(args, 1, ctx.lang) ?? unknown(ctx.lang);
      const { validateNationalId } = await import("@/features/toolbox/kod-meli/logic");
      const result = validateNationalId(code);
      return {
        kind: "json",
        data: {
          kind: result.kind,
          valid: result.valid,
          expected_check_digit: result.expectedCheckDigit,
          reason_fa: result.reasonFa,
          steps: result.steps.map((step) => ({ step: step.labelEn, detail: step.detail })),
        },
        caption: ctx.lang === "fa" ? "بدون هیچ درخواست شبکه‌ای؛ ورودی لاگ نمی‌شود." : "No network request; the input is never logged.",
      };
    },
  },
  toman: {
    name: "toman",
    usage: "toman <amount>",
    descriptionFa: "قالب‌بندی مبلغ، حروف‌نویسی و معادل ریالی — محلی",
    descriptionEn: "Format, spell out and convert a toman amount — local",
    local: true,
    run: async (args, ctx) => {
      const amount = args.join(" ").trim();
      if (!amount) return requireArgs(args, 1, ctx.lang) ?? unknown(ctx.lang);
      const { parseAmount, formatTomanFa, tomanToWords, tomanToRial, formatRialFa } = await import("@/features/toolbox/toman/logic");
      const parsed = parseAmount(amount);
      if (!parsed.ok) return { kind: "error", text: ctx.lang === "fa" ? parsed.messageFa : parsed.messageEn };
      return {
        kind: "json",
        data: {
          input_toman: parsed.toman.toString(),
          formatted_fa: formatTomanFa(parsed.toman),
          words_fa: tomanToWords(parsed.toman),
          rial: tomanToRial(parsed.toman).toString(),
          formatted_rial_fa: formatRialFa(parsed.toman),
        },
      };
    },
  },
  clear: {
    name: "clear",
    usage: "clear",
    descriptionFa: "پاک کردن صفحه",
    descriptionEn: "Clear the screen",
    local: true,
    run: (_args, ctx) => {
      ctx.clear();
      return { kind: "text", text: "" };
    },
  },
  bio: {
    name: "bio",
    usage: "bio <sequence>",
    descriptionFa: "تحلیل توالی DNA در همان لحظه (بدون ارسال به سرور)",
    descriptionEn: "Instant DNA sequence analysis (nothing leaves the browser)",
    local: true,
    run: (args, ctx) => {
      const raw = args.join("");
      const cleaned = sanitizeInput(raw);
      if (cleaned.error) return { kind: "error", text: cleaned.error[ctx.lang] };
      const comp = composition(cleaned.sequence);
      const orfs = findOrfs(cleaned.sequence, { minAa: 10, limit: 5 });
      const longest = orfs[0];
      const fa = ctx.lang === "fa";
      return {
        kind: "table",
        caption: fa ? "تحلیل محلی توالی (هیچ داده‌ای ارسال نشد)" : "Local sequence analysis (nothing was uploaded)",
        columns: fa ? ["شاخص", "مقدار"] : ["Metric", "Value"],
        rows: [
          [fa ? "طول" : "Length", `${cleaned.sequence.length} nt`],
          [fa ? "محتوای GC" : "GC content", `${comp.gcPercent.toFixed(2)}%`],
          ["A/C/G/T", `${comp.counts.A}/${comp.counts.C}/${comp.counts.G}/${comp.counts.T}`],
          [fa ? "مکمل معکوس" : "Reverse complement", reverseComplement(cleaned.sequence).slice(0, 40)],
          [fa ? "طولانی‌ترین ORF" : "Longest ORF", longest ? `${longest.start}-${longest.end} (${longest.lengthAa} aa, ${longest.strand})` : "—"],
          [fa ? "پیش‌نمایش پروتئین" : "Protein preview", longest ? longest.protein.slice(0, 40) : translate(cleaned.sequence).slice(0, 40)],
        ],
      };
    },
  },
};

export const COMMAND_NAMES = Object.keys(COMMANDS);

export function completeCommand(prefix: string): string[] {
  const value = prefix.trim().toLowerCase();
  if (!value) return COMMAND_NAMES;
  return COMMAND_NAMES.filter((name) => name.startsWith(value));
}

/**
 * The only entry point: parses a raw line, looks the command up in the allow-list and
 * returns a response. Unknown input can never reach an evaluator.
 */
export async function executeCommand(line: string, ctx: CommandContext): Promise<CommandResponse> {
  const trimmed = line.trim();
  if (!trimmed) return { kind: "text", text: "" };
  const [rawName, ...args] = trimmed.split(/\s+/);
  const name = rawName.toLowerCase().replace(/^emmett\s+/, "");
  const command = COMMANDS[name];
  if (!command) {
    // The gate is explicit: unknown input always reads «دستور ناشناخته» — with a flag so
    // the UI can explain that nothing was executed. Never evaluated, never forwarded.
    const blocked = /^(eval|function|javascript|import|require|process|constructor)\b/i.test(trimmed) || trimmed.includes("(");
    return { kind: "error", text: ctx.lang === "fa" ? copy.unknown.fa : copy.unknown.en, blocked };
  }
  try {
    return await command.run(args, ctx);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { kind: "error", text: ctx.lang === "fa" ? `اجرای دستور ناموفق بود: ${message}` : `Command failed: ${message}` };
  }
}

export function toolListForPalette(lang: "fa" | "en") {
  return toolEntries.map((entry) => ({ id: entry.id, title: entry.title[lang], path: entry.path?.[lang] ?? "/", status: entry.status }));
}

export function commandRowsForPalette() {
  return Object.values(COMMANDS).map((command) => ({ name: command.name, usage: command.usage }));
}
