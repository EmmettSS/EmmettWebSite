import { useCallback, useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useI18n } from "@/app/i18n";
import { toolsCopy } from "@/content/tools";
import { Palette } from "./Palette";
import { TerminalDock } from "./TerminalDock";

/**
 * Global shell (F-07): command palette on ⌘K/Ctrl+K, the real terminal on ` or /,
 * and the shortcut cheat-sheet on ?. All three honour the device tier and never
 * block the rest of the page.
 */
export function ShellRoot() {
  const { lang } = useI18n();
  const copy = toolsCopy[lang];
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const openTerminal = useCallback((_command?: string) => setTerminalOpen(true), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = Boolean(target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable));
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
        return;
      }
      if (typing) return;
      if (event.key === "`" || (event.key === "/" && !event.metaKey && !event.ctrlKey)) {
        event.preventDefault();
        setTerminalOpen((value) => !value);
      }
      if (event.key === "?" || (event.shiftKey && event.key === "/")) {
        event.preventDefault();
        setHelpOpen((value) => !value);
      }
      if (event.key === "Escape") {
        setHelpOpen(false);
        setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="fixed bottom-4 end-4 z-[70] hidden items-center gap-2 rounded-2xl border border-[var(--line)] bg-[#06140e]/90 px-3 py-2 text-xs text-white/60 backdrop-blur hover:text-white md:inline-flex"
        aria-keyshortcuts="Meta+K Control+K"
      >
        <Keyboard className="h-4 w-4" aria-hidden />
        <span className="font-mono">⌘K</span>
      </button>

      <Palette open={paletteOpen} onOpenChange={setPaletteOpen} onOpenTerminal={openTerminal} />
      <TerminalDock open={terminalOpen} onClose={() => setTerminalOpen(false)} />

      <Dialog.Root open={helpOpen} onOpenChange={setHelpOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[95] w-[min(520px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[var(--line)] bg-[#06140e] p-6">
            <Dialog.Title className="text-lg font-semibold">{copy.shell.helpTitle}</Dialog.Title>
            <Dialog.Description className="mt-1 text-xs text-white/55">{copy.shell.helpDescription}</Dialog.Description>
            <dl className="mt-5 space-y-3 text-sm">
              {[
                ["⌘K / Ctrl+K", copy.shell.shortcuts.palette],
                ["` / /", copy.shell.shortcuts.terminal],
                ["?", copy.shell.shortcuts.help],
                ["Esc", copy.shell.shortcuts.escape],
                ["↑ ↓", copy.shell.shortcuts.tabs],
              ].map(([key, description]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <dt className="rounded-lg border border-[var(--line)] px-2 py-1 font-mono text-xs text-white/70" dir="ltr">
                    {key}
                  </dt>
                  <dd className="text-white/60">{description}</dd>
                </div>
              ))}
            </dl>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
