import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { type ReactNode, useRef, useState } from "react";
import { Ring } from "./ui";
import { IconCheck, IconArrow, IconClock, IconBook, IconLock } from "./icons";

type Level = "beginner" | "intermediate" | "advanced";
type Size = "sm" | "md" | "lg";

interface SkillCardProps {
  title: string;
  description: string;
  level: Level;
  duration: string;
  lessons: number;
  progress: number;
  xp: number;
  icon: ReactNode;
  tags: string[];
  locked?: boolean;
  size?: Size;
  onContinue?: () => void;
  onPreview?: () => void;
  accent?: string;
  delay?: number;
}

const levelColors: Record<Level, { bg: string; text: string; glow: string }> = {
  beginner: { bg: "bg-teal/20", text: "text-teal", glow: "shadow-[0_0_20px_rgba(46,230,200,0.3)]" },
  intermediate: { bg: "bg-wait/20", text: "text-wait", glow: "shadow-[0_0_20px_rgba(90,169,255,0.3)]" },
  advanced: { bg: "bg-pink/20", text: "text-pink", glow: "shadow-[0_0_20px_rgba(255,77,148,0.3)]" },
};

const sizeConfig = {
  sm: { icon: 56, iconBox: 80, ring: 52, ringStroke: 6, title: "text-[15px]", desc: "text-[11px]", card: "w-[260px]" },
  md: { icon: 64, iconBox: 96, ring: 64, ringStroke: 7, title: "text-[17px]", desc: "text-[12px]", card: "w-[320px]" },
  lg: { icon: 72, iconBox: 108, ring: 76, ringStroke: 8, title: "text-[19px]", desc: "text-[13px]", card: "w-[380px]" },
};

/* ===== particle burst ===== */
function ParticleBurst({ active, color = "#2ee6c8" }: { active: boolean; color?: string }) {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * 360;
        const rad = (angle * Math.PI) / 180;
        const dist = 60 + Math.random() * 40;
        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full"
            style={{ background: color }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{
              x: Math.cos(rad) * dist,
              y: Math.sin(rad) * dist,
              scale: [0, 1.5, 0],
              opacity: [1, 1, 0],
            }}
            transition={{ duration: 0.7, delay: i * 0.03, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

/* ===== confetti burst ===== */
function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;
  const colors = ["#2ee6c8", "#50c890", "#f0a64d", "#ff4d94", "#b7f739", "#5aa9ff"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 24 }).map((_, i) => {
        const x = Math.random() * 100;
        const color = colors[i % colors.length];
        const rotation = Math.random() * 720 - 360;
        return (
          <motion.div
            key={i}
            className="absolute h-2 w-2 rounded-sm"
            style={{ background: color, left: `${x}%`, top: -10 }}
            initial={{ y: -20, rotate: 0, opacity: 1, scale: 1 }}
            animate={{
              y: 400 + Math.random() * 200,
              rotate: rotation,
              opacity: [1, 1, 0],
              scale: [1, 1.2, 0.5],
            }}
            transition={{
              duration: 1.2 + Math.random() * 0.6,
              delay: Math.random() * 0.4,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        );
      })}
    </div>
  );
}

/* ===== star burst ===== */
function StarBurst({ active, color = "#f0a64d" }: { active: boolean; color?: string }) {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * 360;
        const rad = (angle * Math.PI) / 180;
        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 text-lg"
            style={{ color }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{
              x: Math.cos(rad) * 70,
              y: Math.sin(rad) * 70,
              scale: [0, 1.8, 0],
              opacity: [1, 1, 0],
            }}
            transition={{ duration: 0.8, delay: i * 0.06, ease: "backOut" }}
          >
            ★
          </motion.div>
        );
      })}
    </div>
  );
}

/* ===== glow ring pulse ===== */
function GlowPulse({ color = "#2ee6c8" }: { color?: string }) {
  return (
    <motion.div
      className="absolute inset-0 rounded-3xl"
      style={{ border: `2px solid ${color}` }}
      animate={{
        boxShadow: [
          `0 0 0 0px ${color}00`,
          `0 0 30px 8px ${color}40`,
          `0 0 0 0px ${color}00`,
        ],
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/* ===== main skill card ===== */
export function SkillCard({
  title, description, level, duration, lessons, progress, xp, icon, tags,
  locked, size = "md", onContinue, onPreview, accent, delay = 0,
}: SkillCardProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [burst, setBurst] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-100, 100], [5, -5]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-100, 100], [-5, 5]), { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current || locked) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set(e.clientX - cx);
    y.set(e.clientY - cy);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    x.set(0);
    y.set(0);
  };

  const handleContinue = () => {
    setPressed(true);
    setBurst(true);
    setTimeout(() => {
      setCompleted(true);
      setBurst(false);
      onContinue?.();
    }, 600);
    setTimeout(() => setPressed(false), 200);
  };

  const cfg = sizeConfig[size];
  const lc = levelColors[level];
  const accentColor = accent || (level === "beginner" ? "#2ee6c8" : level === "intermediate" ? "#5aa9ff" : "#ff4d94");

  return (
    <motion.div
      ref={ref}
      className={`relative ${cfg.card}`}
      initial={{ opacity: 0, y: 60, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: 800 }}
    >
      <motion.div
        className="relative overflow-hidden rounded-3xl border border-line/60 bg-gradient-to-b from-card via-surface to-bg2"
        style={{ rotateX: locked ? 0 : rotateX, rotateY: locked ? 0 : rotateY, transformStyle: "preserve-3d" }}
        whileHover={locked ? {} : { scale: 1.02, y: -4 }}
        whileTap={locked ? {} : { scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {/* glow effect */}
        <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: `radial-gradient(circle at 50% 20%, ${accentColor}18, transparent 70%)` }} />

        {/* top gradient bar */}
        <div className="relative h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}60)` }} />

        {/* icon area */}
        <div className="relative flex items-center justify-center py-6">
          {hovered && <GlowPulse color={accentColor} />}
          <motion.div
            className="relative flex items-center justify-center rounded-2xl"
            style={{
              width: cfg.iconBox,
              height: cfg.iconBox,
              background: `linear-gradient(135deg, ${accentColor}25, ${accentColor}10)`,
              boxShadow: `0 8px 32px ${accentColor}30, inset 0 1px 0 rgba(255,255,255,0.15)`,
            }}
            animate={pressed ? {
              scale: [1, 1.3, 0.9, 1.1, 1],
              rotate: [0, -10, 10, -5, 0],
            } : {}}
            transition={{ duration: 0.5, ease: "backOut" }}
          >
            <motion.span
              style={{ color: accentColor, fontSize: cfg.icon }}
              animate={hovered && !locked ? { scale: [1, 1.15, 1], y: [0, -3, 0] } : {}}
              transition={{ duration: 0.6, repeat: hovered ? Infinity : 0, repeatDelay: 0.4 }}
            >
              {icon}
            </motion.span>
          </motion.div>
          <ParticleBurst active={burst} color={accentColor} />
          <ConfettiBurst active={completed && burst === false} />
          <StarBurst active={completed} color={accentColor} />
        </div>

        {/* content */}
        <div className="relative px-5 pb-5">
          {/* level + meta chips */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider ${lc.bg} ${lc.text}`}>
              {level}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-bg2/80 px-2.5 py-1 text-[10px] text-dim">
              <IconClock size={11} /> {duration}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-bg2/80 px-2.5 py-1 text-[10px] text-dim">
              <IconBook size={11} /> {lessons} lessons
            </span>
          </div>

          {/* title & desc */}
          <h3 className={`font-display font-bold text-ink leading-tight ${cfg.title}`}>{title}</h3>
          <p className={`mt-1.5 leading-relaxed text-dim line-clamp-2 ${cfg.desc}`}>{description}</p>

          {/* tags */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="rounded-lg bg-bg2/80 px-2 py-0.5 text-[9.5px] font-medium text-dim">#{t}</span>
            ))}
          </div>

          {/* progress section */}
          <div className="mt-4 flex items-center gap-3">
            <Ring value={progress} size={cfg.ring} stroke={cfg.ringStroke} label="progress" />
            <div className="flex-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-dim">Progress</span>
                <span className="mono font-bold" style={{ color: accentColor }}>{progress}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-bg2">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${accentColor}, ${accentColor}aa)`,
                    boxShadow: `0 0 12px ${accentColor}60`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1.2, delay: delay + 0.3, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-dim">+{xp.toLocaleString()} XP earned</p>
            </div>
          </div>

          {/* buttons */}
          <div className="mt-4 flex gap-2.5">
            <motion.button
              onClick={onPreview}
              className="flex-1 rounded-xl border border-line/60 bg-bg2/60 py-2.5 text-[12.5px] font-semibold text-dim transition-colors hover:border-line hover:text-ink"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              Preview
            </motion.button>
            <motion.button
              onClick={handleContinue}
              className="flex-1 rounded-xl py-2.5 text-[12.5px] font-bold transition-all"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                color: level === "advanced" ? "#fff" : "#04241f",
                boxShadow: `0 4px 20px ${accentColor}50, inset 0 1px 0 rgba(255,255,255,0.25)`,
              }}
              whileHover={{ scale: 1.03, boxShadow: `0 8px 32px ${accentColor}70` }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              {completed ? (
                <span className="flex items-center justify-center gap-1">
                  <IconCheck size={14} /> Completed
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1">
                  Continue <IconArrow size={13} />
                </span>
              )}
            </motion.button>
          </div>
        </div>

        {/* locked overlay */}
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/60 backdrop-blur-sm">
            <motion.div
              className="flex flex-col items-center gap-2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <div className="el-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-line/30 text-dim">
                <IconLock size={20} />
              </div>
              <span className="text-[12px] font-semibold text-dim">Locked</span>
            </motion.div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
