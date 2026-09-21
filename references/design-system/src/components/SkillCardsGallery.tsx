import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, type ReactNode } from "react";
import {
  IconShield,
  IconWave,
  IconCube,
  IconChart,
  IconStar,
  IconLock,
  IconClock,
  IconBook,
  IconArrow,
} from "./icons";

export type CardTier = "beginner" | "intermediate" | "advanced";

export interface SkillCardData {
  id: string;
  title: string;
  description: string;
  tier: CardTier;
  duration: string;
  lessons: string;
  tags: string[];
  progress: number;
  xpEarned: number;
  totalXp: number;
  locked?: boolean;
  headerTheme: {
    bg: string;
    border: string;
    squircleBg: string;
    squircleGlow: string;
    accent: string;
    badgeBg: string;
    badgeText: string;
  };
  icon: (size?: number) => ReactNode;
}

export const SKILL_CARDS: SkillCardData[] = [
  {
    id: "wallet-safety",
    title: "Wallet Safety",
    description: "Learn to manage private keys, recognise phishing attempts and use hardware wallets safely.",
    tier: "beginner",
    duration: "36 min",
    lessons: "8 lessons",
    tags: ["seed", "phishing"],
    progress: 80,
    xpEarned: 1240,
    totalXp: 1500,
    headerTheme: {
      bg: "linear-gradient(180deg, #12574e 0%, #0d3b35 55%, #0a2723 100%)",
      border: "rgba(46, 230, 200, 0.35)",
      squircleBg: "linear-gradient(145deg, #4ef8dc, #1dc4a6)",
      squircleGlow: "0 14px 34px -4px rgba(46, 230, 200, 0.7), 0 0 50px rgba(46, 230, 200, 0.35)",
      accent: "#2ee6c8",
      badgeBg: "rgba(46, 230, 200, 0.14)",
      badgeText: "#2ee6c8",
    },
    icon: (s = 28) => <IconShield size={s} />,
  },
  {
    id: "defi-101",
    title: "DeFi 101",
    description: "Understand AMMs, liquidity pools, lending markets and yield strategies with real simulations.",
    tier: "intermediate",
    duration: "58 min",
    lessons: "12 lessons",
    tags: ["AMM", "staking"],
    progress: 45,
    xpEarned: 1820,
    totalXp: 2200,
    headerTheme: {
      bg: "linear-gradient(180deg, #1a3f78 0%, #122950 55%, #0b1a34 100%)",
      border: "rgba(90, 169, 255, 0.35)",
      squircleBg: "linear-gradient(145deg, #74b8ff, #388ae8)",
      squircleGlow: "0 14px 34px -4px rgba(90, 169, 255, 0.7), 0 0 50px rgba(90, 169, 255, 0.35)",
      accent: "#5aa9ff",
      badgeBg: "rgba(90, 169, 255, 0.14)",
      badgeText: "#5aa9ff",
    },
    icon: (s = 28) => <IconWave size={s} />,
  },
  {
    id: "on-chain-detective",
    title: "On-chain Detective",
    description: "Follow transactions, decode calldata, identify contracts and trace fund flows.",
    tier: "intermediate",
    duration: "42 min",
    lessons: "9 lessons",
    tags: ["explorer", "tracing"],
    progress: 20,
    xpEarned: 720,
    totalXp: 1800,
    headerTheme: {
      bg: "linear-gradient(180deg, #6b214d 0%, #441331 55%, #25091a 100%)",
      border: "rgba(255, 77, 148, 0.35)",
      squircleBg: "linear-gradient(145deg, #ff6fa9, #e62877)",
      squircleGlow: "0 14px 34px -4px rgba(255, 77, 148, 0.7), 0 0 50px rgba(255, 77, 148, 0.35)",
      accent: "#ff4d94",
      badgeBg: "rgba(255, 77, 148, 0.14)",
      badgeText: "#ff4d94",
    },
    icon: (s = 28) => <IconCube size={s} />,
  },
  {
    id: "trading-strategies",
    title: "Trading Strategies",
    description: "Master technical analysis, orderbook depth, funding rates and risk-hedged positions.",
    tier: "advanced",
    duration: "64 min",
    lessons: "14 lessons",
    tags: ["orderbook", "hedging"],
    progress: 62,
    xpEarned: 2450,
    totalXp: 3200,
    headerTheme: {
      bg: "linear-gradient(180deg, #6d4b1a 0%, #462f0e 55%, #281905 100%)",
      border: "rgba(240, 166, 77, 0.35)",
      squircleBg: "linear-gradient(145deg, #ffba6b, #e08b26)",
      squircleGlow: "0 14px 34px -4px rgba(240, 166, 77, 0.7), 0 0 50px rgba(240, 166, 77, 0.35)",
      accent: "#f0a64d",
      badgeBg: "rgba(240, 166, 77, 0.14)",
      badgeText: "#f0a64d",
    },
    icon: (s = 28) => <IconChart size={s} />,
  },
  {
    id: "nft-deep-dive",
    title: "NFT Deep Dive",
    description: "Smart contract standards, rarity mechanics, dynamic metadata and marketplace protocols.",
    tier: "beginner",
    duration: "30 min",
    lessons: "7 lessons",
    tags: ["ERC-721", "metadata"],
    progress: 100,
    xpEarned: 1100,
    totalXp: 1100,
    headerTheme: {
      bg: "linear-gradient(180deg, #446416 0%, #2b400c 55%, #182505 100%)",
      border: "rgba(183, 247, 57, 0.35)",
      squircleBg: "linear-gradient(145deg, #caff4f, #9ddc1e)",
      squircleGlow: "0 14px 34px -4px rgba(183, 247, 57, 0.7), 0 0 50px rgba(183, 247, 57, 0.35)",
      accent: "#b7f739",
      badgeBg: "rgba(183, 247, 57, 0.14)",
      badgeText: "#b7f739",
    },
    icon: (s = 28) => <IconStar size={s} />,
  },
  {
    id: "advanced-security",
    title: "Advanced Security",
    description: "Auditing EVM bytecode, reentrancy guards, multi-sig ceremony and cold-storage operations.",
    tier: "advanced",
    duration: "80 min",
    lessons: "16 lessons",
    tags: ["bytecode", "multisig"],
    progress: 0,
    xpEarned: 0,
    totalXp: 3600,
    locked: true,
    headerTheme: {
      bg: "linear-gradient(180deg, #641c19 0%, #3d100d 55%, #220705 100%)",
      border: "rgba(235, 99, 91, 0.35)",
      squircleBg: "linear-gradient(145deg, #ff7b73, #d9473f)",
      squircleGlow: "0 14px 34px -4px rgba(235, 99, 91, 0.7), 0 0 50px rgba(235, 99, 91, 0.35)",
      accent: "#eb635b",
      badgeBg: "rgba(235, 99, 91, 0.14)",
      badgeText: "#eb635b",
    },
    icon: (s = 28) => <IconLock size={s} />,
  },
];

/* ===== Angry-Birds-level Victory Fanfare Modal ===== */
export function VictoryModal({
  card,
  onClose,
}: {
  card: SkillCardData | null;
  onClose: () => void;
}) {
  if (!card) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Confetti Rain */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 48 }).map((_, i) => {
            const colors = ["#2ee6c8", "#5aa9ff", "#ff4d94", "#b7f739", "#f0a64d", "#fff"];
            const color = colors[i % colors.length];
            const left = (i * 2.1) + "%";
            const delay = (i % 8) * 0.08;
            const size = 6 + (i % 6);
            return (
              <motion.div
                key={i}
                initial={{ y: -40, x: 0, rotate: 0, opacity: 1 }}
                animate={{
                  y: "110vh",
                  x: (i % 2 === 0 ? 1 : -1) * (40 + (i % 60)),
                  rotate: (i % 2 === 0 ? 360 : -360) * 2,
                  opacity: [1, 1, 0],
                }}
                transition={{
                  duration: 2.4 + (i % 5) * 0.3,
                  delay,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
                className="absolute rounded-sm"
                style={{
                  left,
                  width: size,
                  height: size * 1.5,
                  background: color,
                }}
              />
            );
          })}
        </div>

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.3, y: 120, opacity: 0, rotate: -4 }}
          animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.5, y: 120, opacity: 0 }}
          transition={{ type: "spring", damping: 16, stiffness: 240 }}
          className="relative z-10 w-full max-w-md overflow-hidden rounded-[40px] border border-teal/40 bg-gradient-to-b from-[#132845] via-[#0d1a30] to-[#070c14] p-7 text-center shadow-[0_30px_90px_rgba(46,230,200,0.35),0_0_0_1px_rgba(255,255,255,0.1)_inset]"
        >
          {/* Radial light blast */}
          <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-gradient-to-b from-teal/30 via-wait/20 to-transparent blur-3xl" />

          {/* Golden Ribbon Banner */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", damping: 12 }}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber to-pink px-4 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-[#1c0812] shadow-lg"
          >
            ★ LEVEL COMPLETED! ★
          </motion.div>

          {/* 3 Angry-Birds-Style Bouncing Stars */}
          <div className="mt-5 flex items-center justify-center gap-3">
            {[0, 1, 2].map((idx) => (
              <motion.div
                key={idx}
                initial={{ scale: 0, rotate: -180, y: 40 }}
                animate={{ scale: idx === 1 ? 1.25 : 1, rotate: 0, y: idx === 1 ? -6 : 0 }}
                transition={{
                  delay: 0.4 + idx * 0.18,
                  type: "spring",
                  damping: 10,
                  stiffness: 320,
                }}
                className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${
                  idx === 1
                    ? "border-amber/70 bg-gradient-to-b from-[#ffd36b] to-amber text-[#2b1802] shadow-[0_12px_30px_rgba(240,166,77,0.8)]"
                    : "border-amber/50 bg-gradient-to-b from-[#ffe08a] to-amber text-[#2b1802] shadow-[0_8px_20px_rgba(240,166,77,0.5)]"
                }`}
              >
                <span className="text-2xl font-black">★</span>
              </motion.div>
            ))}
          </div>

          {/* Card Icon in Squircle */}
          <motion.div
            initial={{ scale: 0, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ delay: 0.8, type: "spring" }}
            className="mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-3xl"
            style={{
              background: card.headerTheme.squircleBg,
              boxShadow: card.headerTheme.squircleGlow,
            }}
          >
            <div className="text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
              {card.icon(38)}
            </div>
          </motion.div>

          <motion.h3
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="font-display mt-4 text-[26px] font-black text-ink"
          >
            {card.title}
          </motion.h3>

          <p className="mt-1 text-[13px] text-dim">
            Mastery achieved · All 8 lessons passed with 100% accuracy
          </p>

          {/* XP Fanfare Counter */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-5 flex items-center justify-between rounded-2xl border border-teal/40 bg-teal/10 px-5 py-3"
          >
            <span className="mono text-[12px] font-bold text-teal">REWARD UNLOCKED</span>
            <span className="font-display text-[20px] font-black text-lime">
              +{card.xpEarned} XP
            </span>
          </motion.div>

          {/* CTA Buttons */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="font-display flex-1 rounded-2xl border border-line bg-card/80 py-3.5 text-[14px] font-bold text-dim transition-colors hover:text-ink active:scale-95"
            >
              Back to Track
            </button>
            <button
              onClick={onClose}
              className="font-display el-glow flex-1 rounded-2xl bg-gradient-to-b from-[#63f6de] to-teal py-3.5 text-[14px] font-black text-[#04241f] transition-transform active:scale-95"
            >
              Claim & Next →
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/* ===== Individual Skill Card Component ===== */
export function SkillCard({
  card,
  size = "md",
  onOpenVictory,
}: {
  card: SkillCardData;
  size?: "sm" | "md" | "lg";
  onOpenVictory: (card: SkillCardData) => void;
}) {
  const [hovered, setHovered] = useState(false);

  // Size configurations — portrait ratio: height significantly greater than width!
  const cfg = {
    sm: {
      width: "w-[270px]",
      headerHeight: "h-[160px]",
      squircle: 60,
      iconSize: 26,
      title: "text-[16px]",
      desc: "text-[11.5px] line-clamp-2",
      bodyPad: "p-4",
      ringSize: 48,
      ringStroke: 5,
    },
    md: {
      width: "w-[330px]",
      headerHeight: "h-[190px]",
      squircle: 72,
      iconSize: 32,
      title: "text-[19px]",
      desc: "text-[12.5px] line-clamp-3",
      bodyPad: "p-5",
      ringSize: 56,
      ringStroke: 6,
    },
    lg: {
      width: "w-[380px]",
      headerHeight: "h-[220px]",
      squircle: 86,
      iconSize: 40,
      title: "text-[22px]",
      desc: "text-[13.5px] line-clamp-3",
      bodyPad: "p-6",
      ringSize: 64,
      ringStroke: 7,
    },
  }[size];

  const ringRadius = (cfg.ringSize - cfg.ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (ringCircumference * card.progress) / 100;

  return (
    <motion.div
      layout
      whileHover={{ y: -8, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 380, damping: 24 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={`group relative flex flex-col overflow-hidden rounded-[36px] border border-line/70 bg-[#0d1728] shadow-[0_20px_60px_-15px_rgba(2,6,14,0.95)] ${cfg.width}`}
      style={{
        boxShadow: hovered
          ? `0 28px 70px -15px rgba(0,0,0,0.9), 0 0 35px -8px ${card.headerTheme.accent}44`
          : undefined,
      }}
    >
      {/* 1. TOP HEADER — Rich juicy gradient dome matching screenshot! */}
      <div
        className={`relative flex ${cfg.headerHeight} w-full items-center justify-center overflow-hidden rounded-t-[35px] border-b border-white/10`}
        style={{ background: card.headerTheme.bg }}
      >
        {/* Subtle mesh overlay */}
        <div className="absolute inset-0 bg-radial from-white/15 via-transparent to-black/25 opacity-60" />

        {/* Lock indicator in top-right corner if locked */}
        {card.locked && (
          <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white/70 backdrop-blur-md">
            <IconLock size={15} />
          </div>
        )}

        {/* Floating Glowing Squircle with Icon */}
        <motion.div
          animate={
            hovered && !card.locked
              ? { y: [-2, -8, -2], rotate: [0, -2, 2, 0] }
              : { y: 0, rotate: 0 }
          }
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="relative flex items-center justify-center rounded-[24px] text-white"
          style={{
            width: cfg.squircle,
            height: cfg.squircle,
            background: card.headerTheme.squircleBg,
            boxShadow: card.headerTheme.squircleGlow,
          }}
        >
          {/* Inner highlight */}
          <div className="absolute inset-0 rounded-[24px] bg-gradient-to-b from-white/35 to-transparent opacity-80" />
          <div className="relative drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
            {card.icon(cfg.iconSize)}
          </div>
        </motion.div>
      </div>

      {/* 2. CARD BODY — Deep navy with chips, typography, progress & CTA */}
      <div className={`flex flex-1 flex-col justify-between ${cfg.bodyPad}`}>
        <div>
          {/* Metadata Chips: Tier, Duration, Lessons */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: card.headerTheme.badgeBg,
                borderColor: card.headerTheme.border,
                color: card.headerTheme.badgeText,
              }}
            >
              {card.tier}
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-line/60 bg-[#070c14]/60 px-3 py-1 text-[11px] text-dim">
              <IconClock size={12} /> {card.duration}
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-line/60 bg-[#070c14]/60 px-3 py-1 text-[11px] text-dim">
              <IconBook size={12} /> {card.lessons}
            </span>
          </div>

          {/* Title */}
          <h3 className={`font-display mt-3.5 font-bold leading-tight text-ink ${cfg.title}`}>
            {card.title}
          </h3>

          {/* Description */}
          <p className={`mt-1.5 leading-relaxed text-dim ${cfg.desc}`}>
            {card.description}
          </p>

          {/* Hashtags */}
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-lg border border-line/50 bg-[#070c14]/60 px-2 py-0.5 text-[10.5px] font-medium text-dim/90"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* 3. Progress Row + Circular Ring */}
        <div className="mt-5 border-t border-line/50 pt-4">
          <div className="flex items-center gap-3">
            {/* SVG Circular Ring */}
            <div
              className="relative shrink-0"
              style={{ width: cfg.ringSize, height: cfg.ringSize }}
            >
              <svg width={cfg.ringSize} height={cfg.ringSize} className="-rotate-90">
                <circle
                  cx={cfg.ringSize / 2}
                  cy={cfg.ringSize / 2}
                  r={ringRadius}
                  stroke="#13243f"
                  strokeWidth={cfg.ringStroke}
                  fill="none"
                />
                <circle
                  cx={cfg.ringSize / 2}
                  cy={cfg.ringSize / 2}
                  r={ringRadius}
                  stroke={card.headerTheme.accent}
                  strokeWidth={cfg.ringStroke}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  style={{ transition: "stroke-dashoffset 1s ease" }}
                />
              </svg>
              <span className="font-display absolute inset-0 flex items-center justify-center text-[12px] font-bold text-ink">
                {card.progress}%
              </span>
            </div>

            {/* Horizontal Bar + Info */}
            <div className="flex-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-dim">Progress</span>
                <span className="mono font-bold" style={{ color: card.headerTheme.accent }}>
                  {card.progress}%
                </span>
              </div>
              <div className="relative mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#070c14]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${card.progress}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${card.headerTheme.accent}, #5aa9ff)`,
                    boxShadow: `0 0 10px ${card.headerTheme.accent}88`,
                  }}
                />
              </div>
              <p className="mt-1 text-[10.5px] text-dim/80">
                +{card.xpEarned} XP earned
              </p>
            </div>
          </div>

          {/* 4. Action Buttons: Preview + Glowing Continue CTA */}
          <div className="mt-4 flex items-center gap-2.5">
            <button
              onClick={() => onOpenVictory(card)}
              className="font-display flex-1 rounded-2xl border border-line/80 bg-[#070c14]/70 py-3 text-[13px] font-semibold text-dim transition-colors hover:border-teal/40 hover:text-ink active:scale-95"
            >
              Preview
            </button>
            <button
              disabled={card.locked}
              onClick={() => onOpenVictory(card)}
              className={`font-display flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-3 text-[13px] font-bold transition-transform active:scale-95 ${
                card.locked
                  ? "cursor-not-allowed border border-line bg-card/60 text-dim/60"
                  : "el-glow bg-gradient-to-b from-[#63f6de] to-teal text-[#04241f] hover:brightness-105"
              }`}
            >
              {card.locked ? (
                <>
                  <IconLock size={14} /> Locked
                </>
              ) : (
                <>
                  Continue <IconArrow size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ===== Skill Cards Gallery Section with Carousel & 3 Sizes ===== */
export function SkillCardsGallery() {
  const [viewMode, setViewMode] = useState<"carousel" | "grid">("carousel");
  const [size, setSize] = useState<"sm" | "md" | "lg">("md");
  const [selectedCard, setSelectedCard] = useState<SkillCardData | null>(null);
  const [activeCardIdx, setActiveCardIdx] = useState<number>(1);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(false);

  // Auto-play for 3D carousel
  useEffect(() => {
    if (!isAutoPlay || viewMode !== "carousel") return;
    const interval = setInterval(() => {
      setActiveCardIdx((prev) => (prev + 1) % SKILL_CARDS.length);
    }, 3600);
    return () => clearInterval(interval);
  }, [isAutoPlay, viewMode]);

  const prevCard = () =>
    setActiveCardIdx((i) => (i - 1 + SKILL_CARDS.length) % SKILL_CARDS.length);
  const nextCard = () =>
    setActiveCardIdx((i) => (i + 1) % SKILL_CARDS.length);

  return (
    <div className="mt-8">
      {/* View Switcher & Size Bar */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="mono text-[10px] uppercase tracking-wider text-teal">
              INTERACTIVE 3D SKILL CARDS
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-teal shadow-[0_0_8px_rgba(46,230,200,0.9)]" />
          </div>
          <h3 className="font-display mt-0.5 text-[22px] font-bold text-ink">
            {viewMode === "carousel"
              ? "3D CoverFlow Carousel"
              : "Portrait Grid — 3 Proportions"}
          </h3>
          <p className="mt-1 text-[13px] text-dim">
            Tap <span className="text-teal font-semibold">"Continue →"</span> on any card to trigger the Angry Birds level-complete celebration!
          </p>
        </div>

        {/* Mode Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Carousel vs Grid View */}
          <div className="el-press flex rounded-2xl bg-bg2 p-1 border border-line">
            <button
              onClick={() => setViewMode("carousel")}
              className={`font-display rounded-xl px-4 py-2 text-[12.5px] font-semibold transition-all ${
                viewMode === "carousel" ? "el-2 bg-card text-teal" : "text-dim hover:text-ink"
              }`}
            >
              🎡 3D Carousel
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`font-display rounded-xl px-4 py-2 text-[12.5px] font-semibold transition-all ${
                viewMode === "grid" ? "el-2 bg-card text-teal" : "text-dim hover:text-ink"
              }`}
            >
              ⊞ Grid View
            </button>
          </div>

          {/* If Grid View: Size Selector */}
          {viewMode === "grid" && (
            <div className="el-press flex rounded-2xl bg-bg2 p-1 border border-line">
              {[
                { id: "sm", label: "Small (270px)" },
                { id: "md", label: "Medium (330px)" },
                { id: "lg", label: "Large (380px)" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSize(tab.id as "sm" | "md" | "lg")}
                  className={`font-display rounded-xl px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
                    size === tab.id ? "el-2 bg-card text-teal" : "text-dim hover:text-ink"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* If Carousel: Play / Nav Controls */}
          {viewMode === "carousel" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAutoPlay(!isAutoPlay)}
                className={`rounded-2xl border px-3.5 py-2 text-[12px] font-semibold transition-colors ${
                  isAutoPlay
                    ? "border-teal bg-teal/15 text-teal shadow-[0_0_10px_rgba(46,230,200,0.3)]"
                    : "border-line bg-card/60 text-dim hover:text-ink"
                }`}
              >
                {isAutoPlay ? "⏸ Pause" : "▶ Auto Play"}
              </button>
              <button
                onClick={prevCard}
                className="el-1 flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-card text-dim hover:text-ink"
                aria-label="Previous card"
              >
                ←
              </button>
              <button
                onClick={nextCard}
                className="el-1 flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-card text-dim hover:text-ink"
                aria-label="Next card"
              >
                →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 1. 3D COVERFLOW CAROUSEL VIEW */}
      {viewMode === "carousel" && (
        <div className="relative overflow-hidden py-6">
          <div
            className="relative flex h-[580px] items-center justify-center"
            style={{ perspective: "1300px" }}
          >
            {SKILL_CARDS.map((card, idx) => {
              const offset = idx - activeCardIdx;
              const isCenter = offset === 0;

              // 3D parameters for coverflow
              const translateX = offset * 260;
              const rotateY = offset * -26;
              const translateZ = isCenter ? 60 : -Math.abs(offset) * 110;
              const scale = isCenter ? 1.02 : Math.max(0.72, 1 - Math.abs(offset) * 0.14);
              const zIndex = 30 - Math.abs(offset) * 6;
              const opacity = Math.abs(offset) > 2 ? 0 : isCenter ? 1 : 0.62;

              return (
                <div
                  key={card.id}
                  onClick={() => {
                    if (!isCenter) setActiveCardIdx(idx);
                  }}
                  className="absolute cursor-pointer transition-all duration-600 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{
                    transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                    zIndex,
                    opacity,
                    pointerEvents: Math.abs(offset) > 2 ? "none" : "auto",
                  }}
                >
                  <SkillCard
                    card={card}
                    size="md"
                    onOpenVictory={(c) => setSelectedCard(c)}
                  />
                </div>
              );
            })}
          </div>

          {/* Carousel Step Dots */}
          <div className="mt-4 flex items-center justify-center gap-2">
            {SKILL_CARDS.map((card, idx) => (
              <button
                key={card.id}
                onClick={() => setActiveCardIdx(idx)}
                aria-label={card.title}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === activeCardIdx
                    ? "w-8 bg-teal shadow-[0_0_10px_rgba(46,230,200,0.8)]"
                    : "w-2.5 bg-line hover:bg-dim/50"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* 2. REGULAR GRID VIEW (WITH 3 SIZES) */}
      {viewMode === "grid" && (
        <div className="flex flex-wrap items-stretch justify-center gap-6">
          {SKILL_CARDS.map((card) => (
            <SkillCard
              key={card.id}
              card={card}
              size={size}
              onOpenVictory={setSelectedCard}
            />
          ))}
        </div>
      )}

      {/* Victory Celebration Modal */}
      <VictoryModal
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
      />
    </div>
  );
}
