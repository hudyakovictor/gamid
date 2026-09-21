import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";

interface Tab {
  label: string;
  content: ReactNode;
}

interface Props {
  tabs: Tab[];
  defaultIndex?: number;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export function Tabs2({ tabs, defaultIndex = 0, size = "md", fullWidth }: Props) {
  const [i, setI] = useState(defaultIndex);

  const h = { sm: "h-8 text-[12px]", md: "h-10 text-[13px]", lg: "h-12 text-[14px]" }[size];
  const pad = { sm: "px-3", md: "px-4", lg: "px-5" }[size];

  return (
    <div>
      <div className="el-press inline-flex gap-0.5 rounded-2xl bg-bg2 p-1">
        {tabs.map((tab, k) => (
          <button
            key={tab.label}
            onClick={() => setI(k)}
            className={`font-display relative ${pad} ${h} rounded-xl font-semibold transition-colors ${
              k === i ? "text-teal" : "text-dim hover:text-ink"
            } ${fullWidth ? "flex-1" : ""}`}
          >
            {k === i && (
              <motion.div
                layoutId="tab-pill"
                className="el-1 absolute inset-0 rounded-xl bg-card"
                transition={{ type: "spring", damping: 28, stiffness: 400 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="mt-4"
      >
        {tabs[i].content}
      </motion.div>
    </div>
  );
}
