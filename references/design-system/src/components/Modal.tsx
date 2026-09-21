import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FocusTrap } from "./FocusTrap";
import { IconX } from "./icons";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  footer?: ReactNode;
}

const sizeMap = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  footer,
}: Props) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <FocusTrap open={open} onClose={onClose}>
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div
              className="absolute inset-0 bg-black/65 backdrop-blur-sm"
              onClick={onClose}
            />
            <motion.div
              className={`el-4 relative w-full ${sizeMap[size]} overflow-hidden rounded-[32px] border border-line/70 bg-gradient-to-b from-card to-surface`}
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 30 }}
              transition={{ type: "spring", damping: 28, stiffness: 380 }}
            >
              {/* glow accent */}
              <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-[320px] -translate-x-1/2 rounded-full bg-teal/15 blur-3xl" />

              {/* header */}
              {(title || description) && (
                <div className="relative border-b border-line/60 px-6 pb-5 pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      {title && (
                        <h3 className="font-display text-[19px] font-bold text-ink">{title}</h3>
                      )}
                      {description && (
                        <p className="mt-1 text-[13px] text-dim">{description}</p>
                      )}
                    </div>
                    <button
                      onClick={onClose}
                      className="el-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-line bg-card text-dim transition-colors hover:text-ink"
                      aria-label="Close"
                    >
                      <IconX size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* body */}
              <div className="relative max-h-[60vh] overflow-auto px-6 py-5">{children}</div>

              {/* footer */}
              {footer && (
                <div className="relative flex items-center justify-end gap-2 border-t border-line/60 px-6 py-4">
                  {footer}
                </div>
              )}
            </motion.div>
          </motion.div>
        </FocusTrap>
      )}
    </AnimatePresence>,
    document.body,
  );
}
