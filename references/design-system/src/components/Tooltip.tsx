import { useState, useRef, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  content: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export function Tooltip({
  content,
  children,
  side = "top",
  delay = 400,
}: Props) {
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const open = useCallback(() => {
    timer.current = setTimeout(() => setShow(true), delay);
  }, [delay]);

  const close = useCallback(() => {
    clearTimeout(timer.current);
    setShow(false);
  }, []);

  const pos: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2.5",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2.5",
    left: "right-full top-1/2 -translate-y-1/2 mr-2.5",
    right: "left-full top-1/2 -translate-y-1/2 ml-2.5",
  };

  const origin: Record<string, string> = {
    top: "origin-bottom",
    bottom: "origin-top",
    left: "origin-right",
    right: "origin-left",
  };

  return (
    <div className="relative inline-flex" onMouseEnter={open} onMouseLeave={close} onFocus={open} onBlur={close}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            className={`absolute z-[90] whitespace-nowrap rounded-xl border border-line/70 bg-gradient-to-b from-card to-surface px-3.5 py-2 text-[12px] font-medium text-ink shadow-2xl ${pos[side]}`}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.88 }}
            transition={{ type: "spring", damping: 26, stiffness: 440 }}
            style={{ transformOrigin: origin[side] }}
            role="tooltip"
          >
            {content}
            <span className="absolute h-2 w-2 rotate-45 border-l border-t border-line/70 bg-card" style={{
              ...(side === "top" ? { bottom: -4, left: "50%", marginLeft: -4 } : {}),
              ...(side === "bottom" ? { top: -4, left: "50%", marginLeft: -4 } : {}),
              ...(side === "left" ? { right: -4, top: "50%", marginTop: -4 } : {}),
              ...(side === "right" ? { left: -4, top: "50%", marginTop: -4 } : {}),
            }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
