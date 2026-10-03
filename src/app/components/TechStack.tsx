import { motion } from "motion/react";

const technologies = [
  { name: "Python", category: "Backend" },
  { name: "Rust", category: "Systems" },
  { name: "Go", category: "Backend" },
  { name: "React", category: "Frontend" },
  { name: "Next.js", category: "Frontend" },
  { name: "TypeScript", category: "Frontend" },
  { name: "Docker", category: "DevOps" },
  { name: "Kubernetes", category: "DevOps" },
  { name: "TensorFlow", category: "AI/ML" },
  { name: "PyTorch", category: "AI/ML" },
  { name: "FastAPI", category: "Backend" },
  { name: "PostgreSQL", category: "Database" },
  { name: "Redis", category: "Database" },
  { name: "Kafka", category: "Infrastructure" },
  { name: "Three.js", category: "3D" },
  { name: "WebGL", category: "3D" },
  { name: "Node.js", category: "Backend" },
  { name: "GraphQL", category: "API" },
];

const categoryColors: Record<string, string> = {
  Backend: "from-cyan-400 to-blue-500",
  Systems: "from-orange-400 to-red-500",
  Frontend: "from-violet-400 to-purple-500",
  DevOps: "from-emerald-400 to-green-500",
  "AI/ML": "from-pink-400 to-rose-500",
  Database: "from-yellow-400 to-amber-500",
  Infrastructure: "from-indigo-400 to-blue-500",
  "3D": "from-fuchsia-400 to-purple-500",
  API: "from-teal-400 to-cyan-500",
};

export function TechStack() {
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%"],
          }}
          transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.03),transparent_50%)]"
          style={{ backgroundSize: "200% 200%" }}
        />
      </div>

      <div className="container relative z-10 px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20 space-y-4"
        >
          <h2 className="text-4xl lg:text-6xl tracking-tight" style={{ fontWeight: 700 }}>
            Technology{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-500">
              Ecosystem
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powered by cutting-edge tools and frameworks
          </p>
        </motion.div>

        {/* Tech Grid */}
        <div className="relative">
          {/* Connecting Lines Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent"
                style={{
                  top: `${20 + i * 15}%`,
                  left: 0,
                  right: 0,
                }}
                animate={{
                  opacity: [0.2, 0.5, 0.2],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.5,
                }}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {technologies.map((tech, index) => (
              <motion.div
                key={tech.name}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="group relative p-6 rounded-xl border border-violet-500/20 bg-gradient-to-br from-[#0F0F14] to-[#1A1A24] backdrop-blur-xl hover:border-violet-500/40 transition-all duration-300"
              >
                {/* Glow Effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500/0 to-cyan-500/0 group-hover:from-violet-500/10 group-hover:to-cyan-500/10 transition-all duration-300" />

                <div className="relative space-y-3">
                  <div
                    className={`text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${
                      categoryColors[tech.category]
                    }`}
                  >
                    {tech.name}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {tech.category}
                  </div>
                </div>

                {/* Scan Line */}
                <motion.div
                  className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent opacity-0 group-hover:opacity-100"
                  animate={{ y: [0, 80] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 grid md:grid-cols-4 gap-6"
        >
          {[
            { value: "18+", label: "Technologies" },
            { value: "5", label: "Core Stacks" },
            { value: "100%", label: "Modern" },
            { value: "∞", label: "Scalable" },
          ].map((stat, i) => (
            <div
              key={i}
              className="text-center p-6 rounded-xl border border-violet-500/20 bg-violet-500/5 backdrop-blur-xl"
            >
              <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-500 mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
