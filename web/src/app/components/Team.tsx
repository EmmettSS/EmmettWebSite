import { motion } from "motion/react";
import { Github, Linkedin, Mail } from "lucide-react";

const team = [
  {
    name: "Dr. Aria Hosseini",
    role: "AI Systems Lead",
    specialty: "Deep Learning & LLM Engineering",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
  },
  {
    name: "Parisa Karimi",
    role: "Cybersecurity Director",
    specialty: "Network Defense & Zero Trust",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
  },
  {
    name: "Reza Mohammadi",
    role: "Infrastructure Architect",
    specialty: "Distributed Systems & Cloud",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
  },
  {
    name: "Mina Sadeghi",
    role: "Frontend Lead",
    specialty: "WebGL & Interactive Experiences",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",
  },
  {
    name: "Ali Rezaei",
    role: "Creative Technologist",
    specialty: "3D Visualization & Motion",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400",
  },
  {
    name: "Sara Ahmadi",
    role: "Research Scientist",
    specialty: "Computer Vision & AI Ethics",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
  },
];

export function Team() {
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(139,92,246,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.02)_1px,transparent_1px)] bg-[size:8rem_8rem]" />

      <div className="container relative z-10 px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20 space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 backdrop-blur-sm mb-6">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-sm text-cyan-400 font-mono">UNIVERSITY OF TEHRAN</span>
          </div>

          <h2 className="text-4xl lg:text-6xl tracking-tight" style={{ fontWeight: 700 }}>
            Elite{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-500 to-emerald-400">
              Engineering Minds
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Award-winning researchers and developers pushing the boundaries of technology
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {team.map((member, index) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative"
            >
              <div className="relative p-6 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-[#0F0F14] to-[#1A1A24] backdrop-blur-xl overflow-hidden hover:border-violet-500/40 transition-all duration-500">
                {/* Holographic Scan Effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-b from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 opacity-0 group-hover:opacity-100"
                  animate={{ y: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />

                {/* Profile Image with Holographic Border */}
                <div className="relative mb-6">
                  <div className="relative w-32 h-32 mx-auto rounded-2xl overflow-hidden border-2 border-violet-500/30 group-hover:border-cyan-500/50 transition-colors">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Corner Brackets */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <motion.div
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-8 h-8 border-t-2 border-l-2 border-cyan-500/50 -rotate-45"
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="text-center space-y-3 relative z-10">
                  <h3 className="text-xl" style={{ fontWeight: 600 }}>
                    {member.name}
                  </h3>

                  <div className="space-y-1">
                    <div className="text-sm text-cyan-400 font-mono">{member.role}</div>
                    <div className="text-xs text-muted-foreground">{member.specialty}</div>
                  </div>

                  {/* Terminal-style Details (shown on hover) */}
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    whileInView={{ opacity: 1, height: "auto" }}
                    className="pt-4 mt-4 border-t border-violet-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <div className="flex items-center justify-center gap-4">
                      <button className="p-2 rounded-lg border border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 transition-colors">
                        <Github className="w-4 h-4 text-violet-400" />
                      </button>
                      <button className="p-2 rounded-lg border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors">
                        <Linkedin className="w-4 h-4 text-cyan-400" />
                      </button>
                      <button className="p-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                        <Mail className="w-4 h-4 text-emerald-400" />
                      </button>
                    </div>
                  </motion.div>
                </div>

                {/* ID Badge */}
                <div className="absolute top-4 right-4 text-xs font-mono text-muted-foreground opacity-50">
                  ID:{String(index + 1).padStart(3, "0")}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
