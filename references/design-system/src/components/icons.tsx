import { useId } from "react";

type P = { className?: string; size?: number; stroke?: number };

const base = (size = 20, stroke = 1.8) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: stroke,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

/* ================= UI icon set ================= */
export const IconHome = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M9.5 21v-6h5v6" />
  </svg>
);
export const IconBook = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
    <path d="M8 7h7M8 11h5" />
  </svg>
);
export const IconChart = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);
export const IconUser = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </svg>
);
export const IconBell = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9Z" />
    <path d="M10 18a2 2 0 0 0 4 0" />
  </svg>
);
export const IconBolt = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
  </svg>
);
export const IconShield = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3l7 3v5.5c0 4.6-3 8-7 9.5-4-1.5-7-4.9-7-9.5V6z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
export const IconWave = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M2 9c2.5-3 5-3 7.5 0S15 12 17.5 9 22 6 22 6" />
    <path d="M2 16c2.5-3 5-3 7.5 0s5.5 3 8-.5" />
  </svg>
);
export const IconCube = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m12 2.8 8 4.4v9.6l-8 4.4-8-4.4V7.2z" />
    <path d="M12 12.2 20 7.6M12 12.2v9M12 12.2 4 7.6" />
  </svg>
);
export const IconSpark = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
  </svg>
);
export const IconCopy = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M5 15V6a2 2 0 0 1 2-2h8" />
  </svg>
);
export const IconCheck = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
);
export const IconX = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const IconArrow = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M5 12h13M13 6.5 18.5 12 13 17.5" />
  </svg>
);
export const IconSearch = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);
export const IconFlame = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3s5 4 5 8a5 5 0 0 1-10 0c0-1.5.7-2.8 1.5-3.7C9 9 10.5 10 10.5 10S10 6 12 3Z" />
  </svg>
);
export const IconTrophy = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
    <path d="M7 5H4v1.5A3.5 3.5 0 0 0 7.5 10M17 5h3v1.5A3.5 3.5 0 0 1 16.5 10" />
    <path d="M12 14v4M8.5 21h7" />
  </svg>
);
export const IconLock = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
  </svg>
);
export const IconGift = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3.5" y="9" width="17" height="11.5" rx="2" />
    <path d="M3.5 13.5h17M12 9v11.5" />
    <path d="M12 9S9 9 8 7.8 8.6 4.5 10 5.2 12 9 12 9s3 0 4-1.2-.6-3.3-2-2.6S12 9 12 9Z" />
  </svg>
);
export const IconClock = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
export const IconLayers = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m12 3 9 4.5-9 4.5-9-4.5z" />
    <path d="m3 12.5 9 4.5 9-4.5" />
  </svg>
);
export const IconGrid = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
  </svg>
);
export const IconType = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 6.5V5h16v1.5M12 5v14M9 19h6" />
  </svg>
);
export const IconWallet = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="6" width="18" height="13" rx="3" />
    <path d="M3 10h18M16.5 14.5h.01" />
  </svg>
);
export const IconPalette = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.9 1.5-1.8-.4-1.2.4-2.2 1.7-2.2H17a4 4 0 0 0 4-4c0-5-4-10-9-10Z" />
    <circle cx="8" cy="11" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="8" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="16" cy="11" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);
export const IconMotion = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3 18C6 18 7 6 12 6s6 12 9 12" />
  </svg>
);
export const IconSend = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M21 3 10.5 13.5M21 3l-7 18-3.5-7L3 10.5z" />
  </svg>
);
export const IconDownload = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 20h16" />
  </svg>
);
export const IconStar = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z" />
  </svg>
);

/* ================= Brand mark: "signal orbit" =================
   One glyph, three licensed versions:
   • color      — gradient orbit + teal planet
   • two-tone   — navy orbit + teal planet
   • mono       — one ink (teal or navy per placement)            */

type GlyphProps = {
  size?: number;
  className?: string;
  orbit?: string;
  planet?: string;
  detail?: boolean;
  glow?: boolean;
};

export function LogoGlyph({
  size = 64,
  className = "",
  orbit = "#2ee6c8",
  planet = "#2ee6c8",
  detail = false,
  glow = false,
}: GlyphProps) {
  const id = useId().replace(/[:]/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={glow ? { filter: "drop-shadow(0 0 8px rgba(46,230,200,.55))" } : undefined}
    >
      <defs>
        <linearGradient id={`og${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#63f6de" />
          <stop offset="100%" stopColor="#2ee6c8" />
        </linearGradient>
      </defs>
      <ellipse
        cx="12"
        cy="12"
        rx="9.8"
        ry="4.3"
        stroke={orbit === "gradient" ? `url(#og${id})` : orbit}
        strokeWidth="2.5"
        strokeLinecap="round"
        transform="rotate(-22 12 12)"
      />
      <circle cx="12" cy="12" r="3.9" fill={orbit === "gradient" ? `url(#og${id})` : planet} />
      {detail && (
        <circle cx="19.6" cy="7.2" r="1.9" fill={planet} opacity="0.95" />
      )}
    </svg>
  );
}

/* ---------- 1. Color / primary: navy plate + gradient glyph ---------- */
export function LogoColor({
  size = 96,
  radius,
  detail = true,
  className = "",
}: {
  size?: number;
  radius?: number;
  detail?: boolean;
  className?: string;
}) {
  const r = radius ?? size * 0.26;
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background:
          "linear-gradient(160deg,#13243f 0%,#0e1a30 45%,#070c14 100%)",
        boxShadow:
          "0 1px 0 rgba(255,255,255,.14) inset, 0 0 0 1px rgba(46,230,200,.22), 0 14px 34px -12px rgba(46,230,200,.45), 0 20px 50px -20px rgba(0,0,0,1)",
      }}
    >
      <span
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 26% 18%, rgba(46,230,200,.28), transparent 58%)",
        }}
      />
      <LogoGlyph
        size={size * 0.62}
        orbit="gradient"
        planet="#2ee6c8"
        detail={detail}
        glow
      />
    </div>
  );
}

/* ---------- 2. Two-tone: navy orbit + teal planet ---------- */
export function LogoTwoTone({ size = 96, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`flex shrink-0 items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <LogoGlyph size={size} orbit="#5aa9ff" planet="#2ee6c8" />
    </div>
  );
}

/* ---------- 3. Mono: single ink ---------- */
export function LogoMono({
  size = 64,
  tone = "#e8eef7",
  className = "",
}: {
  size?: number;
  tone?: string;
  className?: string;
}) {
  return (
    <div className={`flex shrink-0 items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <LogoGlyph size={size} orbit={tone} planet={tone} />
    </div>
  );
}

/* ---------- App-icon plates: iOS squircle / adaptive circle / light ---------- */
export function LogoPlate({
  size = 96,
  kind = "dark",
  shape = "squircle",
  className = "",
}: {
  size?: number;
  kind?: "dark" | "light" | "mono";
  shape?: "squircle" | "circle";
  className?: string;
}) {
  const bg =
    kind === "light"
      ? "linear-gradient(160deg,#ffffff 0%,#e8eef7 100%)"
      : kind === "mono"
        ? "#070c14"
        : "linear-gradient(160deg,#13243f 0%,#0e1a30 45%,#070c14 100%)";
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: shape === "circle" ? "999px" : size * 0.26,
        background: bg,
        boxShadow:
          kind === "light"
            ? "0 1px 0 rgba(255,255,255,.9) inset, 0 0 0 1px rgba(7,12,20,.08), 0 14px 30px -12px rgba(2,6,14,.7)"
            : "0 1px 0 rgba(255,255,255,.13) inset, 0 0 0 1px rgba(46,230,200,.2), 0 16px 36px -14px rgba(0,0,0,1)",
      }}
    >
      {kind === "mono" ? (
        <LogoMono size={size * 0.6} tone="#e8eef7" />
      ) : kind === "light" ? (
        <LogoGlyph size={size * 0.62} orbit="#0e1a30" planet="#2ee6c8" />
      ) : (
        <LogoGlyph size={size * 0.62} orbit="gradient" planet="#2ee6c8" />
      )}
    </div>
  );
}

/* ---------- lockup: glyph + wordmark ---------- */
export function LogoWordmark({ size = 30 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoColor size={size} detail={false} />
      <div className="leading-none">
        <p className="font-display text-[15px] font-bold tracking-tight text-ink">
          SIGNAL<span className="text-teal">ARENA</span>
        </p>
        <p className="mono mt-0.5 text-[8.5px] uppercase tracking-[0.3em] text-dim">
          design system
        </p>
      </div>
    </div>
  );
}

export const LogoMark = LogoGlyph;
