import { useState, useRef, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconCheck, IconArrow } from "./icons";

interface Option {
  label: string;
  value: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface Props {
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Select({
  options,
  value,
  onChange,
  placeholder = "Select…",
  label,
  error,
  disabled,
  size = "md",
}: Props) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const sz = {
    sm: "h-10 text-[13px] rounded-xl px-3.5",
    md: "h-12 text-[14px] rounded-2xl px-4",
    lg: "h-14 text-[15px] rounded-2xl px-5",
  }[size];

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="mono mb-1.5 block text-[10px] uppercase tracking-[0.22em] text-dim">
          {label}
        </label>
      )}
      <button
        onClick={() => !disabled && setOpen((o) => !o)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        className={`flex w-full items-center justify-between border bg-bg2 text-left transition-all duration-200 ${sz} ${
          error
            ? "border-down"
            : open || focused
              ? "border-teal/60"
              : "border-line"
        } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
      >
        <span className={`flex items-center gap-2 ${selected ? "text-ink" : "text-line"}`}>
          {selected?.icon}
          {selected?.label ?? placeholder}
        </span>
        <span className={`text-dim transition-transform ${open ? "rotate-180" : ""}`}>
          <IconArrow size={14} />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="el-3 absolute left-0 right-0 top-full z-30 mt-2 max-h-[260px] overflow-auto rounded-2xl border border-line/70 bg-gradient-to-b from-card to-surface"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                disabled={opt.disabled}
                onClick={() => {
                  onChange?.(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-[13.5px] transition-colors ${
                  opt.value === value
                    ? "bg-teal/12 text-teal"
                    : opt.disabled
                      ? "text-line cursor-not-allowed"
                      : "text-dim hover:bg-white/[0.04] hover:text-ink"
                }`}
              >
                {opt.icon}
                <span className="flex-1">{opt.label}</span>
                {opt.value === value && <IconCheck size={15} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {error && <p className="mt-1.5 text-[11.5px] text-down">{error}</p>}
    </div>
  );
}
