import { motion } from "motion/react";

const projects = [
  { codename: "ORACLE-7", area: "LLM Development", abstract: "Investigating emergent reasoning capabilities in fine-tuned domain models using contrastive chain-of-thought training methods with…", tags: ["NLP", "PyTorch", "RLHF"], status: "ACTIVE" },
  { codename: "SYNAPSE", area: "Multi-Agent Systems", abstract: "Cooperative task decomposition framework enabling heterogeneous AI agents to negotiate subtask allocation without central…", tags: ["MAS", "Python", "LangChain"], status: "ACTIVE" },
  { codename: "FERRITE", area: "Edge AI", abstract: "Model compression pipeline targeting sub-100ms inference on ARM Cortex-M7 with accuracy degradation below 2% versus…", tags: ["TFLite", "C++", "Quantization"], status: "EXPERIMENTAL" },
  { codename: "LABYRINTH", area: "RAG Systems", abstract: "Hybrid dense-sparse retrieval augmented generation system with dynamic context window allocation and query-adaptive…", tags: ["FAISS", "Elasticsearch", "Python"], status: "ACTIVE" },
  { codename: "PHOTON", area: "Computer Vision", abstract: "Real-time object segmentation pipeline for satellite imagery using modified SegFormer architecture with spectral band…", tags: ["PyTorch", "CUDA", "OpenCV"], status: "EXPERIMENTAL" },
  { codename: "CARTOGRAPHER", area: "Knowledge Graphs", abstract: "Automated knowledge graph construction from unstructured technical documentation with relation extraction confidence…", tags: ["Neo4j", "spaCy", "Python"], status: "ACTIVE" },
  { codename: "MERIDIAN", area: "Cyber Intelligence", abstract: "Adversarial machine learning research into evasion techniques against behavioral anomaly detection systems in…", tags: ["Rust", "TensorFlow", "Network"], status: "CLASSIFIED" },
  { codename: "SINGULARITY", area: "Digital Twins", abstract: "High-fidelity simulation environment for distributed system stress testing using physics-informed neural networks…", tags: ["Simulation", "Python", "CUDA"], status: "EXPERIMENTAL" },
  { codename: "HELIOS", area: "Robotics", abstract: "Reinforcement learning control policy for robotic manipulation tasks using sim-to-real transfer with domain randomization…", tags: ["ROS2", "Isaac Gym", "Python"], status: "ACTIVE" },
  { codename: "AXIOM", area: "Bioinformatics", abstract: "Protein structure prediction pipeline extension for pathogen resistance profiling combining AlphaFold with molecular…", tags: ["BioPython", "CUDA", "ML"], status: "EXPERIMENTAL" },
  { codename: "PHANTOM", area: "Quantum Security", abstract: "Post-quantum cryptographic protocol implementation benchmarking CRYSTALS-Kyber and NTRU lattice-based schemes…", tags: ["Rust", "Crypto", "Quantum"], status: "CLASSIFIED" },
];

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  ACTIVE: { color: "#10B981", bg: "rgba(16,185,129,0.1)", label: "ACTIVE" },
  EXPERIMENTAL: { color: "#F59E0B", bg: "rgba(245,158,11,0.1)", label: "EXPERIMENTAL" },
  CLASSIFIED: { color: "#EF4444", bg: "rgba(239,68,68,0.08)", label: "CLASSIFIED" },
};

export function ResearchLab() {
  return (
    <section id="research" className="relative py-40 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(129,140,248,0.04),transparent_50%)]" />

      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-6 h-px bg-[rgba(245,246,247,0.2)]" />
            <span className="text-xs font-mono tracking-[0.2em] uppercase text-[rgba(245,246,247,0.38)]">
              08 — Research Lab
            </span>
          </div>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-medium leading-tight tracking-tight text-[#F5F6F7] max-w-2xl">
            Classified research.{" "}
            <span className="text-[rgba(245,246,247,0.38)]">Real experiments.</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map((p, i) => {
            const sc = statusConfig[p.status];
            const isClassified = p.status === "CLASSIFIED";

            return (
              <motion.div
                key={p.codename}
                initial={{ opacity: 0, filter: "blur(4px)" }}
                whileInView={{ opacity: 1, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="group relative rounded-xl border border-white/[0.05] bg-[rgba(10,11,14,0.8)] backdrop-blur-sm overflow-hidden hover:border-white/[0.1] transition-all duration-300 cursor-pointer"
              >
                {/* Header bar */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
                  <span className="text-xs font-mono tracking-[0.15em] text-[rgba(245,246,247,0.55)]">{p.codename}</span>
                  <span
                    className="text-[10px] font-mono tracking-widest px-2 py-0.5 rounded"
                    style={{ color: sc.color, backgroundColor: sc.bg }}
                  >
                    {sc.label}
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-[#F5F6F7]">{p.area}</h3>

                  {/* Abstract with fade */}
                  <div className="relative">
                    <p className="text-xs text-[rgba(245,246,247,0.38)] leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">
                      {isClassified ? (
                        <span className="blur-sm select-none">{p.abstract}</span>
                      ) : p.abstract}
                    </p>
                    {!isClassified && (
                      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[rgba(10,11,14,0.8)] to-transparent group-hover:opacity-0 transition-opacity" />
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {isClassified ? (
                      <span className="text-[10px] font-mono text-[rgba(239,68,68,0.6)] tracking-widest">ACCESS RESTRICTED</span>
                    ) : (
                      p.tags.map((t) => (
                        <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/[0.04] text-[rgba(245,246,247,0.22)]">
                          {t}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Scanline animation on hover */}
                <motion.div
                  className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100"
                  animate={{ y: [0, 200] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
