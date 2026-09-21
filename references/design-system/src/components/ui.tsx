import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { IconCopy, IconCheck } from "./icons";

/* ---------------- reveal on scroll ---------------- */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && (setSeen(true), io.disconnect()),
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`reveal ${seen ? "in" : ""} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ---------------- section ---------------- */
export function Section({
  id,
  index,
  eyebrow,
  title,
  desc,
  icon,
  children,
}: {
  id: string;
  index: string;
  eyebrow: string;
  title: string;
  desc?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="relative mx-auto w-full max-w-7xl scroll-mt-24 px-5 py-14 sm:px-8 sm:py-20"
    >
      <Reveal>
        <div className="mb-10 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="el-1 flex h-9 w-9 items-center justify-center rounded-xl border border-teal/30 bg-teal/10 text-teal">
              {icon}
            </span>
            <span className="mono text-[11px] font-bold uppercase tracking-[0.32em] text-teal">
              {index} — {eyebrow}
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-line to-transparent" />
          </div>
          <h2 className="font-display max-w-3xl text-[32px] font-bold leading-[1.08] tracking-tight text-ink sm:text-[46px]">
            {title}
          </h2>
          {desc && (
            <p className="max-w-2xl text-[15px] leading-relaxed text-dim">{desc}</p>
          )}
        </div>
      </Reveal>
      {children}
    </section>
  );
}

/* ---------------- panel ---------------- */
export function Panel({
  children,
  className = "",
  label,
  action,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  label?: string;
  action?: ReactNode;
  tone?: "default" | "teal" | "flat";
}) {
  const bg =
    tone === "teal"
      ? "from-[#10352f] to-surface border-teal/30"
      : tone === "flat"
        ? "from-bg2 to-bg2 border-line/60"
        : "from-card to-surface border-line/70";
  return (
    <div
      className={`el-2 hov-l3 relative overflow-hidden rounded-3xl border bg-gradient-to-b ${bg} p-5 sm:p-6 ${className}`}
    >
      {(label || action) && (
        <div className="mb-5 flex items-center justify-between gap-3">
          {label && (
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-teal shadow-[0_0_10px_2px_rgba(46,230,200,0.75)]" />
              <span className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-dim">
                {label}
              </span>
            </div>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/* ---------------- button ---------------- */
type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "premium";
export function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  full,
  disabled,
  loading,
  onClick,
  radius = "2xl",
}: {
  children?: ReactNode;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  iconRight?: ReactNode;
  full?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  radius?: "xl" | "2xl" | "full";
}) {
  const sizes = {
    sm: "h-9 px-4 text-[13px] gap-1.5",
    md: "h-12 px-6 text-[14.5px] gap-2",
    lg: "h-14 px-8 text-[16px] gap-2.5",
  }[size];
  const rad = { xl: "rounded-xl", "2xl": "rounded-2xl", full: "rounded-full" }[radius];
  const variants: Record<Variant, string> = {
    primary:
      "el-glow bg-gradient-to-b from-[#63f6de] to-teal text-[#04241f] hover:brightness-[1.07] hover:-translate-y-[1px]",
    secondary:
      "el-2 border border-line bg-gradient-to-b from-card to-surface text-ink hover:border-teal/55 hover:-translate-y-[1px]",
    outline:
      "el-1 border border-teal/45 bg-teal/[0.06] text-teal hover:bg-teal/[0.14]",
    ghost: "text-dim hover:bg-white/[0.06] hover:text-ink",
    danger:
      "el-2 bg-gradient-to-b from-[#f4796f] to-down text-[#2b0908] shadow-[0_16px_34px_-16px_rgba(235,99,91,0.85)] hover:brightness-105",
    premium:
      "el-glow-pink bg-gradient-to-r from-pink to-amber text-[#2a0716] hover:brightness-105",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`font-display pressable focus-ring relative inline-flex select-none items-center justify-center overflow-hidden font-semibold transition-all duration-200 ease-[cubic-bezier(.22,1,.36,1)] focus:outline-none active:translate-y-[1px] ${sizes} ${rad} ${variants[variant]} ${full ? "w-full" : ""} ${disabled ? "pointer-events-none opacity-35 grayscale" : ""}`}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
      ) : (
        icon
      )}
      {children}
      {iconRight}
    </button>
  );
}

/* ---------------- chip ---------------- */
export type Tone = "teal" | "wait" | "amber" | "pink" | "up" | "down" | "lime" | "dim";
const toneMap: Record<Tone, string> = {
  teal: "text-teal border-teal/40 bg-teal/10",
  wait: "text-wait border-wait/40 bg-wait/10",
  amber: "text-amber border-amber/40 bg-amber/10",
  pink: "text-pink border-pink/40 bg-pink/10",
  up: "text-up border-up/40 bg-up/10",
  down: "text-down border-down/40 bg-down/10",
  lime: "text-lime border-lime/40 bg-lime/10",
  dim: "text-dim border-line bg-card",
};
export function Chip({
  children,
  tone = "teal",
  icon,
  onClick,
  active,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`el-1 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all duration-200 ${toneMap[tone]} ${onClick ? "hover:-translate-y-[1px]" : "cursor-default"} ${active ? "ring-1 ring-current" : ""}`}
    >
      {icon}
      {children}
    </button>
  );
}

/* ---------------- progress ---------------- */
export function Progress({
  value,
  tone = "teal",
  height = 10,
}: {
  value: number;
  tone?: "teal" | "amber" | "lime" | "pink";
  height?: number;
}) {
  const bar = {
    teal: "from-teal to-wait shadow-[0_0_18px_rgba(46,230,200,0.55)]",
    amber: "from-amber to-pink shadow-[0_0_18px_rgba(240,166,77,0.5)]",
    lime: "from-lime to-up shadow-[0_0_18px_rgba(183,247,57,0.45)]",
    pink: "from-pink to-wait shadow-[0_0_18px_rgba(255,77,148,0.45)]",
  }[tone];
  return (
    <div
      className="el-press w-full overflow-hidden rounded-full bg-bg2"
      style={{ height }}
    >
      <div
        className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-[cubic-bezier(.22,1,.36,1)] ${bar}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/* ---------------- ring progress ---------------- */
export function Ring({
  value,
  size = 92,
  stroke = 9,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`rg${size}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2ee6c8" />
            <stop offset="100%" stopColor="#5aa9ff" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#0a1120" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#rg${size})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c - (c * value) / 100}
          style={{ transition: "stroke-dashoffset .8s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[17px] font-bold text-ink">{value}%</span>
        {label && <span className="text-[9px] uppercase tracking-widest text-dim">{label}</span>}
      </div>
    </div>
  );
}

/* ---------------- copy swatch ---------------- */
export function Swatch({ name, hex }: { name: string; hex: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(hex);
        setCopied(true);
        setTimeout(() => setCopied(false), 1300);
      }}
      className="group text-left"
    >
      <div
        className="el-2 hov-l4 relative h-[86px] w-full overflow-hidden rounded-2xl border border-white/[0.06] transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:-translate-y-1.5"
        style={{ background: hex }}
      >
        <span className="absolute inset-0 bg-gradient-to-b from-white/12 to-transparent" />
        <span
          className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/35 text-white backdrop-blur transition-opacity ${copied ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        >
          {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
        </span>
      </div>
      <p className="mt-2 text-[12.5px] font-semibold text-ink">{name}</p>
      <p className="mono text-[11px] text-dim">{copied ? "copied!" : hex}</p>
    </button>
  );
}

/* ---------------- tabs ---------------- */
export function Tabs({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: number;
  onChange: (i: number) => void;
}) {
  return (
    <div className="el-press inline-flex rounded-2xl bg-bg2 p-1">
      {items.map((t, i) => (
        <button
          key={t}
          onClick={() => onChange(i)}
          className={`font-display rounded-xl px-4 py-2 text-[13px] font-semibold transition-all duration-300 ${
            i === value ? "el-2 bg-card text-teal" : "text-dim hover:text-ink"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

/* ---------------- code ---------------- */
export function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="el-press relative rounded-2xl border border-line/70 bg-[#05090f] p-4">
      <button
        onClick={() => {
          navigator.clipboard?.writeText(children);
          setCopied(true);
          setTimeout(() => setCopied(false), 1300);
        }}
        className="absolute right-3 top-3 rounded-lg border border-line bg-card px-2 py-1 text-[10px] font-semibold text-dim hover:text-teal"
      >
        {copied ? "copied" : "copy"}
      </button>
      <pre className="mono overflow-x-auto text-[12px] leading-relaxed text-dim">
        {children}
      </pre>
    </div>
  );
}
