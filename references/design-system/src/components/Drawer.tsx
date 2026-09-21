import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FocusTrap } from "./FocusTrap";
import { IconX } from "./icons";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  side?: "left" | "right" | "bottom";
  width?: number | string;
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = "right",
  width = 380,
}: Props) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const isBottom = side === "bottom";

  const dir = {
    left: { x: "-100%", y: 0 },
    right: { x: "100%", y: 0 },
    bottom: { x: 0, y: "100%" },
  }[side];

  return createPortal(
    <AnimatePresence>
      {open && (
        <FocusTrap open={open} onClose={onClose}>
          <motion.div
            className="fixed inset-0 z-[80]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
              className={`el-4 absolute border border-line/70 bg-gradient-to-b from-card to-surface ${
                isBottom
                  ? "inset-x-0 bottom-0 rounded-t-[32px]"
                  : side === "left"
                    ? "inset-y-0 left-0 rounded-r-[32px]"
                    : "inset-y-0 right-0 rounded-l-[32px]"
              }`}
              style={!isBottom ? { width } : { maxHeight: "85vh" }}
              initial={{ opacity: 1, ...dir }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 1, ...dir }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
            >
              {title && (
                <div className="flex items-center justify-between border-b border-line/60 px-6 py-4">
                  <h3 className="font-display text-[17px] font-bold text-ink">{title}</h3>
                  <button
                    onClick={onClose}
                    className="el-1 flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-card text-dim hover:text-ink"
                    aria-label="Close"
                  >
                    <IconX size={15} />
                  </button>
                </div>
              )}
              <div className="max-h-[calc(85vh-64px)] overflow-auto px-6 py-5">{children}</div>
            </motion.div>
          </motion.div>
        </FocusTrap>
      )}
    </AnimatePresence>,
    document.body,
  );
}
