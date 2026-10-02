/** F-09 tab 2 — conversions and formatters (card §UI 2). */
import { useMemo, useState } from "react";
import { CODON_TABLES, formatFasta, reverseComplement, transcribe, translate, type CodonTableId } from "../logic";
import { biolabCopy } from "../copy";
import { CopyButton, Labeled, TextArea } from "./bits";

export function ConvertTab({ lang, sequence }: { lang: "fa" | "en"; sequence: string }) {
  const copy = biolabCopy[lang].convert;
  const [table, setTable] = useState<CodonTableId>("standard");
  const [frame, setFrame] = useState<0 | 1 | 2>(0);
  const [id, setId] = useState("sequence");
  const [description, setDescription] = useState("");
  const [width, setWidth] = useState(60);

  const outputs = useMemo(() => {
    if (!sequence) return null;
    return {
      reverseComplement: reverseComplement(sequence),
      rna: transcribe(sequence),
      protein: translate(sequence, { table, frame }),
      fasta: formatFasta(sequence, { id, description: description || undefined, width }),
    };
  }, [description, frame, id, sequence, table, width]);

  if (!sequence) {
    return <p className="rounded-2xl border border-[var(--line)] bg-black/20 p-4 text-sm text-white/55">{copy.emptyInput}</p>;
  }

  const blocks: { title: string; value: string }[] = outputs
    ? [
        { title: copy.reverseComplement, value: outputs.reverseComplement },
        { title: copy.transcribe, value: outputs.rna },
        { title: copy.translate, value: outputs.protein },
        { title: copy.fasta, value: outputs.fasta },
      ]
    : [];

  return (
    <div className="space-y-6">
      <p className="text-xs text-white/50">{copy.inputNote}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled label={copy.fastaId}>
          <input value={id} onChange={(event) => setId(event.target.value.replace(/\s+/g, "_"))} className="w-full rounded-xl border border-[var(--line)] bg-black/30 px-3 py-2 text-sm text-white/85" />
        </Labeled>
        <Labeled label={copy.fastaDescription}>
          <input value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-xl border border-[var(--line)] bg-black/30 px-3 py-2 text-sm text-white/85" />
        </Labeled>
        <Labeled label={copy.fastaWidth}>
          <input type="number" min={20} max={120} value={width} onChange={(event) => setWidth(Math.min(120, Math.max(20, Number(event.target.value) || 60)))} className="w-full rounded-xl border border-[var(--line)] bg-black/30 px-3 py-2 text-sm text-white/85" />
        </Labeled>
        <Labeled label={biplabTableLabel(lang)}>
          <select value={table} onChange={(event) => setTable(event.target.value as CodonTableId)} className="w-full rounded-xl border border-[var(--line)] bg-black/30 px-3 py-2 text-sm text-white/85">
            {Object.entries(CODON_TABLES).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label[lang]}
              </option>
            ))}
          </select>
        </Labeled>
        <Labeled label={copy.frame}>
          <select value={frame} onChange={(event) => setFrame(Number(event.target.value) as 0 | 1 | 2)} className="w-full rounded-xl border border-[var(--line)] bg-black/30 px-3 py-2 text-sm text-white/85">
            <option value={0}>1</option>
            <option value={1}>2</option>
            <option value={2}>3</option>
          </select>
        </Labeled>
      </div>

      <div className="space-y-5">
        {blocks.map((block) => (
          <section key={block.title} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white/85">{block.title}</h3>
              <CopyButton text={block.value} label={copy.copy} copiedLabel={copy.copied} />
            </div>
            <TextArea value={block.value.length > 20_000 ? `${block.value.slice(0, 20_000)}\n…` : block.value} onChange={() => undefined} rows={4} />
          </section>
        ))}
      </div>
    </div>
  );
}

function biplabTableLabel(lang: "fa" | "en"): string {
  return lang === "fa" ? "جدول کدون" : "Codon table";
}
