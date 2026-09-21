import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconArrow } from "./icons";

interface Item {
  title: string;
  children: ReactNode;
}

interface Props {
  items: Item[];
  multiple?: boolean;
}

export function Accordion({ items, multiple = false }: Props) {
  const [open, setOpen] = useState<number[]>([]);

  const toggle = (i: number) => {
    setOpen((prev) =>
      multiple
        ? prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
        : prev.includes(i) ? [] : [i],
    );
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const isOpen = open.includes(i);
        return (
          <div
            key={i}
            className={`el-2 overflow-hidden rounded-2xl border transition-colors ${
              isOpen ? "border-teal/40 bg-card" : "border-line/60 bg-card/60"
            }`}
          >
            <button
              onClick={() => toggle(i)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
              aria-expanded={isOpen}
            >
              <span className="font-display text-[14.5px] font-semibold text-ink">
                {item.title}
              </span>
              <span
                className={`text-dim transition-transform duration-300 ${
                  isOpen ? "rotate-180 text-teal" : ""
                }`}
              >
                <IconArrow size={16} />
              </span>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="border-t border-line/50 px-5 py-4 text-[13.5px] leading-relaxed text-dim">
                    {item.children}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
