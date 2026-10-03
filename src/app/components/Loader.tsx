import { motion } from "motion/react";
import { useEffect, useState } from "react";

export function Loader({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 300);
          return 100;
        }
        return prev + 2;
      });
    }, 25);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "#07130F" }}
    >
      <div className="text-center space-y-8">
        <div className="font-mono text-5xl tracking-[0.2em] text-[#F3FAF6] font-semibold">
          EMMETT
        </div>

        <div className="space-y-3 w-72 mx-auto">
          <div className="flex items-center justify-between text-xs font-mono text-[rgba(243,250,246,0.28)]">
            <span>INITIALIZING</span>
            <span>{progress}%</span>
          </div>
          <div className="h-px bg-[rgba(31,174,110,0.12)] overflow-hidden">
            <motion.div
              className="h-full bg-[#1FAE6E]"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        </div>

        <p className="text-xs font-mono text-[rgba(243,250,246,0.2)] tracking-widest">
          EMMETT GROUP · ENGINEERING COLLECTIVE
        </p>
      </div>
    </motion.div>
  );
}
