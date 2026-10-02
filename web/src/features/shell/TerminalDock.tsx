import { useCallback, useEffect, useRef, useState } from "react";
import { TerminalSquare, X } from "lucide-react";
import { useI18n } from "@/app/i18n";
import { toolsCopy } from "@/content/tools";
import { useTier } from "@/lib/device-tier";
import { apiGet, apiPost } from "@/lib/api-client";
import { completeCommand, executeCommand, type CommandResponse } from "./terminal/commands";
import { pushHistory, type HistoryEntry } from "./terminal/logic";

const HISTORY_LIMIT = 80;

export function TerminalDock({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, switchLanguage } = useI18n();
  const copy = toolsCopy[lang];
  const { setOverride, tier } = useTier();
  const [input, setInput] = useState("");
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const context = useCallback(
    () => ({
      lang,
      navigate: (target: string) => {
        window.location.assign(target);
      },
      setLowPower: (value: boolean) => setOverride(value ? "low-power" : "auto"),
      switchLanguage,
      clear: () => setEntries([]),
      api: { get: apiGet, post: apiPost },
    }),
    [lang, setOverride, switchLanguage],
  );

  const submit = useCallback(
    async (line: string) => {
      const command = line.trim();
      if (!command) return;
      setBusy(true);
      setInput("");
      let response: CommandResponse;
      try {
        response = await executeCommand(command, context());
      } catch (error) {
        response = { kind: "error", text: error instanceof Error ? error.message : String(error) };
      }
      setEntries((current) => pushHistory(current, { command, response }, HISTORY_LIMIT));
      setCursor(null);
      setBusy(false);
    },
    [context],
  );

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [entries, open]);

  if (!open) return null;

  const localCommands: { name: string; usage: string }[] = [
    { name: "help", usage: "help" },
    { name: "tools", usage: "tools" },
    { name: "status", usage: "status" },
    { name: "open", usage: "open contact" },
    { name: "theme", usage: "theme low-power" },
    { name: "lang", usage: "lang en" },
  ];

  return (
    <section aria-label={copy.terminal.title} className="fixed inset-x-0 bottom-0 z-[80] border-t border-[var(--line)] bg-[#04100a]/97 backdrop-blur-xl">
      <header className="flex items-center justify-between gap-3 px-4 py-2 text-xs text-white/50">
        <span className="inline-flex items-center gap-2">
          <TerminalSquare className="h-4 w-4 text-[var(--bright)]" aria-hidden />
          {copy.terminal.title}
          <span className="rounded-full border border-[var(--line)] px-2 py-0.5 font-mono">{tier}</span>
        </span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setEntries([])} className="rounded-lg border border-[var(--line)] px-2 py-1 hover:text-white">
            {copy.terminal.clear}
          </button>
          <button type="button" onClick={onClose} aria-label={copy.terminal.close} className="rounded-lg border border-[var(--line)] p-1 hover:text-white">
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        className="max-h-[46vh] overflow-auto px-4 pb-3 font-mono text-[12.5px] leading-6"
      >
        <p className="text-white/35">{copy.terminal.hint}</p>
        {entries.map((entry, index) => (
          <div key={index} className="mt-2">
            <p className="text-white/70">
              <span className="text-[var(--bright)]">emmett$</span> {entry.command}
            </p>
            <ResponseView response={entry.response} />
          </div>
        ))}
        {busy ? <p className="text-white/40">…</p> : null}
      </div>

      <form
        className="flex items-center gap-2 border-t border-[var(--line)] px-4 py-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(input);
        }}
      >
        <label className="sr-only" htmlFor="terminal-input">
          {copy.terminal.placeholder}
        </label>
        <span aria-hidden className="text-[var(--bright)]">
          emmett$
        </span>
        <input
          id="terminal-input"
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Tab") {
              const [completed] = completeCommand(input);
              if (completed) {
                event.preventDefault();
                setInput(completed);
              }
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              const next = cursor === null ? entries.length - 1 : Math.max(0, cursor - 1);
              if (entries[next]) {
                setCursor(next);
                setInput(entries[next].command);
              }
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              if (cursor === null) return;
              const next = cursor + 1;
              if (next >= entries.length) {
                setCursor(null);
                setInput("");
              } else {
                setCursor(next);
                setInput(entries[next].command);
              }
            }
          }}
          autoComplete="off"
          spellCheck={false}
          dir="ltr"
          className="flex-1 bg-transparent text-white/90 outline-none placeholder:text-white/25"
          placeholder={copy.terminal.placeholder}
          aria-describedby="terminal-noscript"
          role="combobox"
          aria-expanded="false"
          aria-controls="terminal-log"
        />
        <button type="submit" className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs hover:text-white">
          {copy.terminal.run}
        </button>
      </form>

      <div id="terminal-noscript" className="border-t border-[var(--line)] px-4 py-2 text-[11px] text-white/35">
        <span>{copy.terminal.noscript}</span>
        <ul className="mt-1 flex flex-wrap gap-3">
          {localCommands.map((command) => (
            <li key={command.name}>
              <a className="underline decoration-dotted hover:text-white" href={`/${lang}${command.name === "open" ? "/contact" : "/tools/"}`}>
                {command.name} — {command.usage}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ResponseView({ response }: { response: CommandResponse }) {
  if (response.kind === "text") {
    return <pre className="whitespace-pre-wrap text-white/70">{response.text}</pre>;
  }
  if (response.kind === "error") {
    return <pre className={`whitespace-pre-wrap ${response.blocked ? "text-amber-300" : "text-red-300"}`}>{response.text}</pre>;
  }
  if (response.kind === "json") {
    return (
      <pre dir="ltr" className="max-h-64 overflow-auto text-left text-white/70">
        <code>{JSON.stringify(response.data, null, 2)}</code>
      </pre>
    );
  }
  return (
    <table className="mt-1 w-full text-[12px]">
      <thead className="text-white/40">
        <tr>
          {response.columns.map((column) => (
            <th key={column} className="p-1 text-start">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {response.rows.map((row, index) => (
          <tr key={index} className="border-t border-[var(--line)]/60 text-white/70">
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="p-1">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
