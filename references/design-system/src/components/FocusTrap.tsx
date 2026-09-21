import { useEffect, useRef, useCallback, type ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function FocusTrap({ open, onClose, children, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const prev = useRef<HTMLElement | null>(null);

  const getFocusable = useCallback(() => {
    if (!ref.current) return [];
    return Array.from(
      ref.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      ),
    );
  }, []);

  useEffect(() => {
    if (open) {
      prev.current = document.activeElement as HTMLElement;
      setTimeout(() => {
        const els = getFocusable();
        els[0]?.focus();
      }, 50);
    } else {
      prev.current?.focus();
    }
  }, [open, getFocusable]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab") {
        const els = getFocusable();
        if (els.length === 0) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, getFocusable]);

  return (
    <div
      ref={ref}
      className={className}
      aria-hidden={!open}
      tabIndex={-1}
    >
      {children}
    </div>
  );
}
