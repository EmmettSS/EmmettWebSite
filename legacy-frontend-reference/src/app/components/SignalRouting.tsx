import { motion } from "motion/react";
import { useState, useRef } from "react";
import { Link } from "react-router";

type Node = {
  id: string;
  label: string;
  desc: string;
  href: string;
  x: number;
  y: number;
  color: string;
  size: number;
};

const nodes: Node[] = [
  { id: "services", label: "Services", desc: "What we build for you", href: "/services", x: 25, y: 38, color: "#10B981", size: 14 },
  { id: "products", label: "Products", desc: "What we have built", href: "/products", x: 72, y: 28, color: "#22D3EE", size: 14 },
  { id: "projects", label: "Projects", desc: "Real implementations", href: "/projects", x: 55, y: 68, color: "#818CF8", size: 11 },
  { id: "library", label: "Library", desc: "Engineering knowledge", href: "/library", x: 18, y: 70, color: "#818CF8", size: 9 },
  { id: "academy", label: "Academy", desc: "What we teach", href: "/academy", x: 82, y: 62, color: "#10B981", size: 9 },
  { id: "ai", label: "AI", desc: "", href: "/services", x: 40, y: 20, color: "#10B981", size: 6 },
  { id: "security", label: "Security", desc: "", href: "/services", x: 60, y: 45, color: "#22D3EE", size: 6 },
  { id: "cloud", label: "Cloud", desc: "", href: "/services", x: 35, y: 55, color: "#818CF8", size: 6 },
  { id: "pentestor", label: "PenTestor", desc: "", href: "/products/pentestor", x: 80, y: 40, color: "#22D3EE", size: 7 },
  { id: "crm", label: "CRM", desc: "", href: "/products/crm", x: 88, y: 75, color: "#10B981", size: 7 },
];

const connections = [
  ["services", "ai"], ["services", "security"], ["services", "cloud"],
  ["products", "pentestor"], ["products", "crm"],
  ["services", "projects"], ["products", "projects"],
  ["services", "library"], ["academy", "library"],
  ["security", "pentestor"], ["ai", "products"],
];

export function SignalRouting() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const svgRef = useRef<SVGSVGElement>(null);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const getNodeById = (id: string) => nodes.find((n) => n.id === id);

  const isNearMouse = (node: Node) => {
    const dx = node.x - mousePos.x;
    const dy = node.y - mousePos.y;
    return Math.sqrt(dx * dx + dy * dy) < 18;
  };

  const isConnectedToHovered = (nodeId: string) => {
    if (!hovered) return false;
    return connections.some(([a, b]) => (a === hovered && b === nodeId) || (b === hovered && a === nodeId));
  };

  const activeNode = hovered ? nodes.find((n) => n.id === hovered) : null;

  return (
    <section className="relative py-40 overflow-hidden">

      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-6 h-px bg-[rgba(245,246,247,0.2)]" />
            <span className="text-xs font-mono tracking-[0.2em] uppercase text-[rgba(245,246,247,0.38)]">
              Signal Routing
            </span>
          </div>
          <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-medium leading-tight tracking-tight text-[#F5F6F7] max-w-xl">
            Explore the{" "}
            <span className="text-[rgba(245,246,247,0.38)]">ecosystem</span>
          </h2>
          <p className="mt-3 text-sm text-[rgba(245,246,247,0.38)] font-mono">Hover nodes to reveal destinations</p>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_280px] gap-8 items-center">
          {/* SVG Network */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative rounded-2xl border border-white/[0.05] bg-[rgba(10,11,14,0.6)] backdrop-blur-sm overflow-hidden"
            style={{ aspectRatio: "16/9", maxHeight: 480 }}
          >
            <svg
              ref={svgRef}
              className="w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => { setHovered(null); }}
            >
              {/* Connection lines */}
              {connections.map(([aId, bId], i) => {
                const a = getNodeById(aId);
                const b = getNodeById(bId);
                if (!a || !b) return null;
                const isActive = hovered === aId || hovered === bId;
                return (
                  <motion.line
                    key={i}
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={isActive ? (a.color) : "rgba(245,246,247,0.04)"}
                    strokeWidth={isActive ? 0.4 : 0.2}
                    animate={{ opacity: isActive ? 1 : 0.4 }}
                    transition={{ duration: 0.2 }}
                  />
                );
              })}

              {/* Traveling light pulses on hovered connections */}
              {hovered && connections.map(([aId, bId], i) => {
                if (aId !== hovered && bId !== hovered) return null;
                const a = getNodeById(aId);
                const b = getNodeById(bId);
                if (!a || !b) return null;
                return (
                  <motion.circle
                    key={`pulse-${i}`}
                    r="0.6"
                    fill={a.color}
                    opacity={0.8}
                    animate={{
                      cx: [a.x, b.x],
                      cy: [a.y, b.y],
                    }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  />
                );
              })}

              {/* Nodes */}
              {nodes.map((node) => {
                const near = isNearMouse(node);
                const connected = isConnectedToHovered(node.id);
                const isHov = hovered === node.id;
                const isSmall = node.size < 10;

                return (
                  <g
                    key={node.id}
                    onMouseEnter={() => setHovered(node.id)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Glow ring */}
                    {(isHov || near) && (
                      <motion.circle
                        cx={node.x} cy={node.y}
                        r={node.size * 0.22}
                        fill="none"
                        stroke={node.color}
                        strokeWidth="0.4"
                        opacity={0.3}
                        animate={{ r: [node.size * 0.2, node.size * 0.35, node.size * 0.2] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}

                    {/* Node circle */}
                    <motion.circle
                      cx={node.x} cy={node.y}
                      r={isSmall ? 2 : 3.5}
                      fill={isHov || connected ? node.color : "rgba(245,246,247,0.08)"}
                      stroke={isHov || near || connected ? node.color : "rgba(245,246,247,0.12)"}
                      strokeWidth="0.3"
                      animate={{ opacity: isHov || connected || near ? 1 : 0.5 }}
                      transition={{ duration: 0.2 }}
                    />

                    {/* Label */}
                    {!isSmall && (
                      <motion.text
                        x={node.x} y={node.y - 5}
                        textAnchor="middle"
                        fill={isHov || connected ? node.color : "rgba(245,246,247,0.4)"}
                        fontSize="3"
                        fontFamily="JetBrains Mono, monospace"
                        letterSpacing="0.05em"
                        animate={{ opacity: isHov || connected ? 1 : 0.5 }}
                        transition={{ duration: 0.2 }}
                      >
                        {node.label}
                      </motion.text>
                    )}

                    {isSmall && (isHov || near) && (
                      <motion.text
                        x={node.x} y={node.y - 4}
                        textAnchor="middle"
                        fill={node.color}
                        fontSize="2.5"
                        fontFamily="JetBrains Mono, monospace"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {node.label}
                      </motion.text>
                    )}
                  </g>
                );
              })}
            </svg>
          </motion.div>

          {/* Info panel */}
          <div className="space-y-4">
            {activeNode && activeNode.desc ? (
              <motion.div
                key={activeNode.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="p-6 rounded-xl border bg-[rgba(13,15,18,0.8)] backdrop-blur-sm"
                style={{ borderColor: `${activeNode.color}25` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: activeNode.color }} />
                  <span className="text-xs font-mono tracking-widest uppercase" style={{ color: activeNode.color }}>
                    {activeNode.label}
                  </span>
                </div>
                <p className="text-sm text-[rgba(245,246,247,0.55)] mb-5 leading-relaxed">
                  {activeNode.desc}
                </p>
                <Link
                  to={activeNode.href}
                  className="inline-flex items-center gap-2 text-sm font-mono transition-colors"
                  style={{ color: activeNode.color }}
                >
                  Enter {activeNode.label} →
                </Link>
              </motion.div>
            ) : (
              <div className="p-6 rounded-xl border border-white/[0.04] bg-[rgba(13,15,18,0.4)]">
                <p className="text-sm text-[rgba(245,246,247,0.22)] font-mono leading-relaxed">
                  Hover over a node to explore a destination within the Emmett ecosystem.
                </p>
              </div>
            )}

            {/* Quick nav */}
            <div className="space-y-1">
              {nodes.filter((n) => n.desc).map((node) => (
                <Link
                  key={node.id}
                  to={node.href}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-1.5 h-1.5 rounded-full transition-all duration-150"
                      style={{ backgroundColor: hovered === node.id ? node.color : "rgba(245,246,247,0.12)" }}
                    />
                    <span className="text-sm font-mono text-[rgba(245,246,247,0.38)] group-hover:text-[rgba(245,246,247,0.64)] transition-colors">
                      {node.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-[rgba(245,246,247,0.18)] font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
