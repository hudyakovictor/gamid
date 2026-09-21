import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { IconCheck, IconX, IconBolt, IconShield, IconBell } from "./icons";

type ToastType = "success" | "error" | "info" | "warning" | "xp";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastCtx {
  push: (message: string, type?: ToastType, duration?: number) => void;
}

const Ctx = createContext<ToastCtx>({ push: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  let next = 0;

  const push = useCallback((message: string, type: ToastType = "info", duration = 3400) => {
    const id = next++;
    setItems((prev) => [...prev, { id, type, message, duration }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-[360px] flex-col gap-2">
          <AnimatePresence>
            {items.map((t) => (
              <ToastItem key={t.id} toast={t} onDismiss={(id) => setItems((p) => p.filter((x) => x.id !== id))} />
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

const iconMap: Record<ToastType, ReactNode> = {
  success: <IconCheck size={17} />,
  error: <IconX size={17} />,
  info: <IconBell size={17} />,
  warning: <IconShield size={17} />,
  xp: <IconBolt size={17} />,
};

const colorMap: Record<ToastType, string> = {
  success: "border-up/50 bg-up/12 text-up",
  error: "border-down/50 bg-down/12 text-down",
  info: "border-wait/50 bg-wait/12 text-wait",
  warning: "border-amber/50 bg-amber/12 text-amber",
  xp: "border-lime/50 bg-lime/12 text-lime",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), toast.duration ?? 3400);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.92 }}
      transition={{ type: "spring", damping: 26, stiffness: 420 }}
      className={`pointer-events-auto el-3 flex items-center gap-3 rounded-2xl border px-4 py-3 ${colorMap[toast.type]}`}
    >
      <span className="shrink-0">{iconMap[toast.type]}</span>
      <span className="flex-1 text-[13.5px] font-medium text-ink">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-dim hover:text-ink"
        aria-label="Dismiss"
      >
        <IconX size={14} />
      </button>
    </motion.div>
  );
}
