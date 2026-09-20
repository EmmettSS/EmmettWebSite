// Minimal ambient presence — not a visual spectacle
const DOTS = [
  { left: "12%", top: "22%", color: "rgba(16,185,129,0.1)", size: 2 },
  { left: "78%", top: "15%", color: "rgba(99,102,241,0.08)", size: 1.5 },
  { left: "55%", top: "60%", color: "rgba(16,185,129,0.07)", size: 1 },
  { left: "88%", top: "72%", color: "rgba(99,102,241,0.07)", size: 2 },
  { left: "30%", top: "80%", color: "rgba(16,185,129,0.06)", size: 1.5 },
  { left: "5%",  top: "55%", color: "rgba(99,102,241,0.05)", size: 1 },
];

export function ParticleField() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden>
      {DOTS.map((d, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{ left: d.left, top: d.top, width: d.size, height: d.size, backgroundColor: d.color }}
        />
      ))}
    </div>
  );
}
