import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { CornerDownLeft, Search } from "lucide-react";
import { useNavigate } from "react-router";
import { useI18n } from "@/app/i18n";
import { toolsCopy } from "@/content/tools";
import { searchRegistry, type RegistryEntry } from "@/features/registry";
import { useTier } from "@/lib/device-tier";
import { apiGet } from "@/lib/api-client";

export function Palette({ open, onOpenChange, onOpenTerminal }: { open: boolean; onOpenChange: (value: boolean) => void; onOpenTerminal: (command?: string) => void }) {
  const { lang, path } = useI18n();
  const copy = toolsCopy[lang];
  const navigate = useNavigate();
  const { setOverride } = useTier();
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState<{ name: string; role: string; anchor: string }[]>([]);
  const [cases, setCases] = useState<{ title: string; anchor: string }[]>([]);

  // Team and case studies come from the real API; when it is empty or unreachable the
  // palette simply shows fewer groups (no invented rows).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    apiGet<{ name_fa: string; name_en: string; role_fa: string; role_en: string }[]>("/public/team/")
      .then((rows) => {
        if (cancelled) return;
        setTeam(rows.map((row) => ({ name: lang === "fa" ? row.name_fa : row.name_en || row.name_fa, role: lang === "fa" ? row.role_fa : row.role_en || row.role_fa, anchor: (row.name_en || row.name_fa).toLowerCase().replace(/\s+/g, "-") })));
      })
      .catch(() => undefined);
    apiGet<{ slug: string; title: string }[]>(`/public/case-studies/?lang=${lang}`)
      .then((rows) => {
        if (cancelled) return;
        setCases(rows.slice(0, 6).map((row) => ({ title: row.title, anchor: row.slug })));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, lang]);

  const results = useMemo(() => searchRegistry(query, lang, { limit: 18 }), [query, lang]);
  const grouped = useMemo(() => ({ tools: results.filter((entry) => entry.kind === "tool"), pages: results.filter((entry) => entry.kind === "page"), commands: results.filter((entry) => entry.kind === "command") }), [results]);
  const filteredTeam = useMemo(() => (query.trim() ? team.filter((member) => `${member.name} ${member.role}`.includes(query.trim())) : team), [team, query]);
  const filteredCases = useMemo(() => (query.trim() ? cases.filter((item) => item.title.includes(query.trim())) : cases), [cases, query]);

  const run = (entry: RegistryEntry) => {
    if (entry.kind === "command") {
      if (entry.id === "command.tools") navigate(path("tools"));
      if (entry.id === "command.status") onOpenTerminal("status");
      if (entry.id === "command.help") onOpenTerminal("help");
      if (entry.id === "command.lang") navigate(path(""));
      onOpenChange(false);
      return;
    }
    navigate(path(entry.path?.[lang] ?? ""));
    onOpenChange(false);
  };

  const quickActions = [
    {
      id: "action.terminal",
      label: lang === "fa" ? "ترمینال را باز کن" : "Open the terminal",
      hint: "`",
      run: () => {
        onOpenTerminal();
        onOpenChange(false);
      },
    },
    {
      id: "action.low-power",
      label: lang === "fa" ? "حالت کم‌مصرف" : "Low-power mode",
      hint: "",
      run: () => {
        setOverride("low-power");
        onOpenChange(false);
      },
    },
    {
      id: "action.lang",
      label: lang === "fa" ? "Switch to English" : "تغییر به فارسی",
      hint: "",
      run: () => {
        navigate(path("").replace(`/${lang}`, lang === "fa" ? "/en" : "/fa"));
        onOpenChange(false);
      },
    },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          aria-label={copy.shell.paletteTitle}
          className="fixed left-1/2 top-[12vh] z-[95] w-[min(680px,94vw)] -translate-x-1/2 overflow-hidden rounded-3xl border border-[var(--line)] bg-[#06140e] shadow-2xl"
        >
          <Dialog.Title className="sr-only">{copy.shell.paletteTitle}</Dialog.Title>
          <Dialog.Description className="sr-only">{copy.shell.paletteDescription}</Dialog.Description>
          <Command label={copy.shell.paletteDescription} shouldFilter={false} loop>
            <div className="flex items-center gap-3 border-b border-[var(--line)] px-4">
              <Search className="h-4 w-4 text-white/40" aria-hidden />
              <Command.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder={copy.shell.palettePlaceholder}
                className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-white/30"
              />
            </div>
            <Command.List className="max-h-[58vh] overflow-auto p-2">
              <Command.Empty className="p-6 text-center text-sm text-white/40">{copy.shell.paletteEmpty}</Command.Empty>

              <Command.Group heading={copy.shell.groups.tools} className="px-2 py-1 text-xs text-white/35">
                {grouped.tools.map((entry) => (
                  <Item key={entry.id} value={`tool ${entry.title[lang]} ${entry.keywords[lang].join(" ")}`} onSelect={() => run(entry)} title={entry.title[lang]} subtitle={entry.title[lang === "fa" ? "en" : "fa"]} badge={entry.version ? `v${entry.version}` : undefined} />
                ))}
              </Command.Group>

              <Command.Group heading={copy.shell.groups.pages} className="px-2 py-1 text-xs text-white/35">
                {grouped.pages.map((entry) => (
                  <Item key={entry.id} value={`page ${entry.title[lang]}`} onSelect={() => run(entry)} title={entry.title[lang]} subtitle={entry.description[lang]} />
                ))}
              </Command.Group>

              {filteredTeam.length ? (
                <Command.Group heading={copy.shell.groups.team} className="px-2 py-1 text-xs text-white/35">
                  {filteredTeam.map((member) => (
                    <Item key={`team.${member.anchor}`} value={`team ${member.name} ${member.role}`} onSelect={() => { navigate(`/${lang}/about#${member.anchor}`); onOpenChange(false); }} title={member.name} subtitle={member.role} />
                  ))}
                </Command.Group>
              ) : null}

              {filteredCases.length ? (
                <Command.Group heading={copy.shell.groups.cases} className="px-2 py-1 text-xs text-white/35">
                  {filteredCases.map((item) => (
                    <Item key={`case.${item.anchor}`} value={`case ${item.title}`} onSelect={() => { navigate(`/${lang}/projects#${item.anchor}`); onOpenChange(false); }} title={item.title} subtitle={copy.shell.groups.cases} />
                  ))}
                </Command.Group>
              ) : null}

              <Command.Group heading={copy.shell.groups.commands} className="px-2 py-1 text-xs text-white/35">
                {quickActions.map((action) => (
                  <Item key={action.id} value={`action ${action.label}`} onSelect={action.run} title={action.label} subtitle={action.hint} />
                ))}
                {grouped.commands.map((entry) => (
                  <Item key={entry.id} value={`command ${entry.title[lang]}`} onSelect={() => run(entry)} title={entry.title[lang]} subtitle={entry.description[lang]} />
                ))}
              </Command.Group>
            </Command.List>
          </Command>
          <p className="flex items-center gap-2 border-t border-[var(--line)] px-4 py-2 text-[11px] text-white/35">
            <CornerDownLeft className="h-3 w-3" aria-hidden />
            {lang === "fa" ? "برای انتخاب Enter، برای بستن Escape" : "Enter to select, Escape to close"}
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Item({ value, title, subtitle, badge, onSelect }: { value: string; title: string; subtitle?: string; badge?: string; onSelect: () => void }) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="mt-1 flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/80 data-[selected=true]:bg-[var(--bright)]/12 data-[selected=true]:text-white"
    >
      <span className="min-w-0 flex-1">
        <b className="block truncate font-medium">{title}</b>
        {subtitle ? <small className="block truncate text-[11px] text-white/40">{subtitle}</small> : null}
      </span>
      {badge ? <span className="font-mono text-[11px] text-white/35">{badge}</span> : null}
    </Command.Item>
  );
}
