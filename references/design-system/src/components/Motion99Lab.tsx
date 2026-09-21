import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconBolt,
  IconX,
  IconShield,
  IconWave,
  IconCube,
  IconWallet,
  IconLock,
  IconClock,
} from "./icons";
import { SKILL_CARDS, VictoryModal, type SkillCardData } from "./SkillCardsGallery";

/* =========================================================================
   11.14 · OVERLAY: DRAG + SNAP Interruptible Bottom Sheet
   "Ручка следует 1:1, решение принимается по позиции и скорости, snap можно перехватить."
   ========================================================================= */

interface SnapPoint {
  label: string;
  height: number;
}

const SNAPS: SnapPoint[] = [
  { label: "Peek", height: 86 },
  { label: "Half", height: 320 },
  { label: "Full", height: 520 },
];

export function InterruptibleBottomSheet() {
  const [currentHeight, setCurrentHeight] = useState<number>(SNAPS[1].height);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [currentSnapIdx, setCurrentSnapIdx] = useState<number>(1);
  const [velocity, setVelocity] = useState<number>(0);
  const [interruptCount, setInterruptCount] = useState<number>(0);
  const [swapAmount, setSwapAmount] = useState<number>(0.25);
  const [showNotification, setShowNotification] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const isAnimatingRef = useRef<boolean>(false);
  const lastPointerYRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);
  const currentHeightRef = useRef<number>(SNAPS[1].height);

  useEffect(() => {
    currentHeightRef.current = currentHeight;
  }, [currentHeight]);

  // Physics Spring Animation Engine (Interruptible on pointer touch!)
  const animateTo = useCallback((targetHeight: number, initialVelocity = 0) => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    isAnimatingRef.current = true;

    let pos = currentHeightRef.current;
    let vel = initialVelocity;
    const k = 240; // spring stiffness
    const d = 26;  // spring damping
    let lastT = performance.now();

    const step = (now: number) => {
      const dt = Math.min((now - lastT) / 1000, 0.032);
      lastT = now;

      // Spring physics: F = -k * displacement - d * velocity
      const displacement = pos - targetHeight;
      const springForce = -k * displacement;
      const dampingForce = -d * vel;
      const acceleration = springForce + dampingForce;

      vel += acceleration * dt;
      pos += vel * dt;

      currentHeightRef.current = pos;
      setCurrentHeight(pos);

      // Settle check
      if (Math.abs(displacement) < 0.5 && Math.abs(vel) < 5) {
        currentHeightRef.current = targetHeight;
        setCurrentHeight(targetHeight);
        isAnimatingRef.current = false;
        animFrameRef.current = null;
        return;
      }

      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);
  }, []);

  // Pointer Down — instantly catches/interrupts active spring animation
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (isAnimatingRef.current) {
      // INTERRUPT CAUGHT IN MID-AIR!
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      isAnimatingRef.current = false;
      setInterruptCount((c) => c + 1);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2200);
    }

    setIsDragging(true);
    lastPointerYRef.current = e.clientY;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
  };

  // Pointer Move — 1:1 direct tracking with velocity measurement
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const now = performance.now();
    const dt = now - lastTimeRef.current;
    const dy = e.clientY - lastPointerYRef.current;

    if (dt > 8) {
      const instantV = (-dy / dt) * 1000;
      velocityRef.current = velocityRef.current * 0.4 + instantV * 0.6;
      setVelocity(Math.round(velocityRef.current));
      lastPointerYRef.current = e.clientY;
      lastTimeRef.current = now;
    }

    // Direct 1:1 translation with elastic boundary resistance
    let nextH = currentHeightRef.current - dy;
    const minH = SNAPS[0].height;
    const maxH = SNAPS[2].height;

    if (nextH < minH) {
      const overflow = minH - nextH;
      nextH = minH - overflow * 0.22;
    } else if (nextH > maxH) {
      const overflow = nextH - maxH;
      nextH = maxH + overflow * 0.22;
    }

    currentHeightRef.current = nextH;
    setCurrentHeight(nextH);
  };

  // Pointer Up — evaluate snap target by position AND fling velocity
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    setIsDragging(false);

    const pos = currentHeightRef.current;
    const v = velocityRef.current;

    let targetIdx = 1;
    if (Math.abs(v) > 420) {
      // High velocity fling determines direction regardless of distance
      if (v > 0) {
        targetIdx = pos < SNAPS[1].height ? 1 : 2;
      } else {
        targetIdx = pos > SNAPS[1].height ? 1 : 0;
      }
    } else {
      // Position-based nearest snap point
      let minDist = Infinity;
      SNAPS.forEach((s, idx) => {
        const dist = Math.abs(pos - s.height);
        if (dist < minDist) {
          minDist = dist;
          targetIdx = idx;
        }
      });
    }

    setCurrentSnapIdx(targetIdx);
    animateTo(SNAPS[targetIdx].height, v);
  };

  const backdropOpacity = Math.max(
    0,
    Math.min(0.78, ((currentHeight - SNAPS[0].height) / (SNAPS[2].height - SNAPS[0].height)) * 0.78),
  );

  return (
    <div className="relative mx-auto flex flex-col items-center">
      {/* Benchmark Badge Header */}
      <div className="mb-4 w-full max-w-[360px] text-left">
        <div className="flex items-center gap-2">
          <span className="mono rounded-full bg-teal/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-teal">
            11.14 · OVERLAY
          </span>
          <span className="mono text-[11px] font-bold text-wait">DRAG + SNAP</span>
        </div>
        <h4 className="font-display mt-2 text-[20px] font-bold text-ink">
          Interruptible Bottom Sheet
        </h4>
        <p className="mt-1 text-[12.5px] leading-relaxed text-dim">
          Ручка следует 1:1, решение принимается по позиции и скорости, snap можно перехватить.
        </p>
      </div>

      {/* Interactive Phone Screen Sandbox */}
      <div
        ref={containerRef}
        className="relative h-[610px] w-full max-w-[350px] overflow-hidden rounded-[44px] border border-line/90 bg-[#070c14] shadow-[0_30px_90px_rgba(0,0,0,0.95)]"
      >
        {/* Dynamic Backdrop */}
        <div
          className="pointer-events-none absolute inset-0 bg-black transition-opacity duration-150"
          style={{ opacity: backdropOpacity }}
        />

        {/* Mock background wallet & pool app */}
        <div className="p-5 pt-8">
          <div className="flex items-center justify-between">
            <div>
              <span className="mono text-[10px] text-teal">SIGNAL ARENA DEX</span>
              <h5 className="font-display text-[18px] font-bold text-ink">ETH / USDC Pool</h5>
            </div>
            <div className="el-1 flex h-8 w-8 items-center justify-center rounded-xl bg-card text-dim">
              <IconWallet size={15} />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-line/60 bg-gradient-to-b from-card to-surface p-4">
            <span className="text-[11px] text-dim">Total Liquidity</span>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-display text-[22px] font-bold text-ink">$28,490,120</span>
              <span className="mono rounded-lg bg-up/15 px-2 py-0.5 text-[11px] font-bold text-up">
                +14.8% APR
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-line/40 bg-bg2/80 p-3 text-[12px]"
              >
                <span className="text-dim">Block #{184920 + i} validated</span>
                <span className="mono text-teal">0.142 ETH</span>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-teal/40 bg-teal/[0.04] p-3 text-center">
            <p className="text-[11.5px] text-teal font-medium">
              ↓ Потяните ручку шторки вверх или сделайте резкий свайп
            </p>
          </div>
        </div>

        {/* Catch Notification Toast */}
        <AnimatePresence>
          {showNotification && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="absolute left-4 right-4 top-14 z-30 flex items-center justify-center gap-2 rounded-2xl border border-teal/50 bg-[#0d1a30] px-4 py-2 text-[12px] font-bold text-teal shadow-xl"
            >
              <IconBolt size={14} /> SNAP ПЕРЕХВАЧЕН В ВОЗДУХЕ!
            </motion.div>
          )}
        </AnimatePresence>

        {/* BOTTOM SHEET ELEMENT */}
        <div
          className="absolute inset-x-0 bottom-0 select-none overflow-hidden rounded-t-[36px] border-t border-teal/50 bg-gradient-to-b from-[#142948] via-[#0d1a30] to-[#070c14] shadow-[0_-14px_45px_rgba(0,0,0,0.9)]"
          style={{ height: `${Math.round(currentHeight)}px` }}
        >
          {/* DRAG HANDLE BAR (1:1 tracking) */}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="flex cursor-grab touch-none flex-col items-center justify-center py-3.5 transition-colors active:cursor-grabbing"
          >
            <div
              className={`h-1.5 w-14 rounded-full transition-all ${
                isDragging
                  ? "bg-teal shadow-[0_0_14px_rgba(46,230,200,0.95)] scale-x-110"
                  : "bg-dim/50 hover:bg-teal"
              }`}
            />
            <span className="mono mt-1 text-[9px] uppercase tracking-wider text-dim">
              {isDragging ? "1:1 DIRECT TRACKING" : "DRAG · FLING · INTERRUPT"}
            </span>
          </div>

          {/* Sheet Body Content */}
          <div className="px-5 pb-5">
            <div className="flex items-center justify-between border-b border-line/50 pb-3">
              <div>
                <p className="font-display text-[16px] font-bold text-ink">Swap Token Order</p>
                <p className="text-[11px] text-dim">Dynamic liquidity routing</p>
              </div>
              <span className="rounded-full bg-teal/15 px-2.5 py-1 text-[10px] font-bold text-teal">
                {SNAPS[currentSnapIdx].label}
              </span>
            </div>

            {/* Live Swap UI inside Sheet */}
            <div className="mt-3.5 space-y-2.5">
              <div className="rounded-2xl border border-line/70 bg-[#070c14] p-3">
                <div className="flex justify-between text-[11px] text-dim">
                  <span>Pay with</span>
                  <span>Bal: 1.42 ETH</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <input
                    type="number"
                    step="0.05"
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(parseFloat(e.target.value) || 0)}
                    className="font-display w-28 bg-transparent text-[22px] font-bold text-ink outline-none"
                  />
                  <span className="mono flex items-center gap-1 rounded-xl bg-card px-2.5 py-1 text-[12px] font-bold text-teal">
                    ETH
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-line/70 bg-[#070c14] p-3">
                <div className="flex justify-between text-[11px] text-dim">
                  <span>You receive</span>
                  <span>1 ETH = $3,842</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-display text-[22px] font-bold text-ink">
                    {(swapAmount * 3842).toFixed(2)}
                  </span>
                  <span className="mono flex items-center gap-1 rounded-xl bg-card px-2.5 py-1 text-[12px] font-bold text-wait">
                    USDC
                  </span>
                </div>
              </div>

              <button className="el-glow font-display mt-2 w-full rounded-2xl bg-gradient-to-b from-[#63f6de] to-teal py-3.5 text-[14px] font-black text-[#04241f] active:scale-95">
                Confirm Swap Order →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Realtime Telemetry HUD */}
      <div className="mt-5 grid w-full max-w-[350px] grid-cols-3 gap-2">
        <div className="el-1 rounded-xl border border-line/60 bg-bg2 p-2.5 text-center">
          <span className="mono block text-[9px] uppercase text-dim">Sheet Height</span>
          <span className="mono text-[13px] font-bold text-teal">{Math.round(currentHeight)}px</span>
        </div>
        <div className="el-1 rounded-xl border border-line/60 bg-bg2 p-2.5 text-center">
          <span className="mono block text-[9px] uppercase text-dim">Velocity</span>
          <span className="mono text-[13px] font-bold text-wait">{velocity} px/s</span>
        </div>
        <div className="el-1 rounded-xl border border-line/60 bg-bg2 p-2.5 text-center">
          <span className="mono block text-[9px] uppercase text-dim">Snap Catches</span>
          <span className="mono text-[13px] font-bold text-pink">{interruptCount}</span>
        </div>
      </div>

      {/* Snap Jump Buttons */}
      <div className="mt-3 flex gap-2">
        {SNAPS.map((s, idx) => (
          <button
            key={s.label}
            onClick={() => {
              setCurrentSnapIdx(idx);
              animateTo(s.height);
            }}
            className={`rounded-xl border px-3 py-1.5 text-[11.5px] font-semibold transition-all ${
              currentSnapIdx === idx
                ? "border-teal bg-teal/15 text-teal"
                : "border-line bg-card/60 text-dim hover:text-ink"
            }`}
          >
            Snap {s.label} ({s.height}px)
          </button>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   3.1 · FLIP: shared-element морфинг без библиотек
   "First, Last, Invert, Play: без тяжелых библиотек, нативный transform + rAF"
   ========================================================================= */

interface CryptoCard {
  id: string;
  name: string;
  symbol: string;
  price: string;
  change: string;
  isUp: boolean;
  color: string;
  desc: string;
  tvl: string;
}

const CRYPTO_DATA: CryptoCard[] = [
  { id: "btc", name: "Bitcoin", symbol: "BTC", price: "$68,412.30", change: "+2.41%", isUp: true, color: "#f0a64d", desc: "Decentralized peer-to-peer monetary network secured by SHA-256 Proof-of-Work.", tvl: "$1.34 Trillion" },
  { id: "eth", name: "Ethereum", symbol: "ETH", price: "$3,884.90", change: "+1.12%", isUp: true, color: "#5aa9ff", desc: "Programmable EVM state machine enabling smart contracts, DeFi and zero-knowledge rollups.", tvl: "$468 Billion" },
  { id: "sol", name: "Solana", symbol: "SOL", price: "$182.40", change: "-3.08%", isUp: false, color: "#2ee6c8", desc: "High-throughput monolithic blockchain with Proof-of-History timestamping and parallel runtime.", tvl: "$72 Billion" },
  { id: "avax", name: "Avalanche", symbol: "AVAX", price: "$42.71", change: "+5.66%", isUp: true, color: "#eb635b", desc: "Subnet consensus network with sub-second finality and multi-chain execution engines.", tvl: "$18 Billion" },
];

export function NativeFlipMorph() {
  const [activeCard, setActiveCard] = useState<CryptoCard | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const modalRef = useRef<HTMLDivElement>(null);
  const firstRectRef = useRef<DOMRect | null>(null);

  const handleOpen = (card: CryptoCard) => {
    const el = cardRefs.current.get(card.id);
    if (!el) return;

    // 1. FIRST: Get origin position
    firstRectRef.current = el.getBoundingClientRect();
    setActiveCard(card);
    setIsExpanded(true);
  };

  useEffect(() => {
    if (!isExpanded || !modalRef.current || !firstRectRef.current) return;

    const modalEl = modalRef.current;
    // 2. LAST: Target position
    const lastRect = modalEl.getBoundingClientRect();
    const firstRect = firstRectRef.current;

    // 3. INVERT: Calculate deltas
    const deltaX = firstRect.left - lastRect.left;
    const deltaY = firstRect.top - lastRect.top;
    const scaleX = firstRect.width / lastRect.width;
    const scaleY = firstRect.height / lastRect.height;

    modalEl.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY})`;
    modalEl.style.transformOrigin = "top left";
    modalEl.style.transition = "none";

    // 4. PLAY: Release to identity transform on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        modalEl.style.transition = "transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms ease";
        modalEl.style.transform = "translate3d(0, 0, 0) scale(1, 1)";
      });
    });
  }, [isExpanded]);

  const handleClose = () => {
    if (!modalRef.current || !firstRectRef.current || !activeCard) {
      setIsExpanded(false);
      setActiveCard(null);
      return;
    }

    const modalEl = modalRef.current;
    const firstRect = firstRectRef.current;
    const lastRect = modalEl.getBoundingClientRect();

    const deltaX = firstRect.left - lastRect.left;
    const deltaY = firstRect.top - lastRect.top;
    const scaleX = firstRect.width / lastRect.width;
    const scaleY = firstRect.height / lastRect.height;

    modalEl.style.transition = "transform 360ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease";
    modalEl.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY})`;
    modalEl.style.opacity = "0.3";

    setTimeout(() => {
      setIsExpanded(false);
      setActiveCard(null);
    }, 360);
  };

  return (
    <div className="relative">
      <div className="mb-4 text-left">
        <div className="flex items-center gap-2">
          <span className="mono rounded-full bg-wait/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-wait">
            3.1 · FLIP
          </span>
          <span className="mono text-[11px] font-bold text-teal">ZERO LIBRARIES</span>
        </div>
        <h4 className="font-display mt-2 text-[20px] font-bold text-ink">
          FLIP: shared-element морфинг без библиотек
        </h4>
        <p className="mt-1 text-[12.5px] text-dim">
          First, Last, Invert, Play: без тяжелых библиотек, нативный transform + requestAnimationFrame.
        </p>
      </div>

      {/* Grid of source cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CRYPTO_DATA.map((card) => (
          <div
            key={card.id}
            ref={(el) => {
              if (el) cardRefs.current.set(card.id, el);
              else cardRefs.current.delete(card.id);
            }}
            onClick={() => handleOpen(card)}
            className="el-2 group relative cursor-pointer overflow-hidden rounded-2xl border border-line/70 bg-gradient-to-b from-card to-surface p-4 transition-all hover:-translate-y-1 hover:border-teal/50 active:scale-95"
          >
            <div className="flex items-center justify-between">
              <span
                className="mono flex h-8 w-8 items-center justify-center rounded-xl text-[10px] font-black text-[#070c14]"
                style={{ background: card.color }}
              >
                {card.symbol.slice(0, 3)}
              </span>
              <span className={`mono text-[10.5px] font-bold ${card.isUp ? "text-up" : "text-down"}`}>
                {card.change}
              </span>
            </div>
            <p className="font-display mt-3 text-[15px] font-bold text-ink">{card.name}</p>
            <p className="mono mt-0.5 text-[12px] text-dim">{card.price}</p>
          </div>
        ))}
      </div>

      {/* FLIP Modal Overlay */}
      {isExpanded && activeCard && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={handleClose}
          />
          <div
            ref={modalRef}
            className="el-4 relative z-10 w-full max-w-lg overflow-hidden rounded-[32px] border border-line/80 bg-gradient-to-b from-card via-surface to-[#070c14] p-7 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="mono flex h-12 w-12 items-center justify-center rounded-2xl text-[14px] font-black text-[#070c14]"
                  style={{ background: activeCard.color }}
                >
                  {activeCard.symbol}
                </span>
                <div>
                  <h3 className="font-display text-[22px] font-bold text-ink">{activeCard.name}</h3>
                  <p className="mono text-[12px] text-dim">{activeCard.symbol} · Layer 1 Network</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="el-1 flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-card text-dim hover:text-ink"
              >
                <IconX size={15} />
              </button>
            </div>

            <div className="mt-5 flex items-baseline justify-between border-y border-line/50 py-3.5">
              <div>
                <span className="text-[11px] text-dim">Asset Price</span>
                <p className="font-display text-[26px] font-black text-ink">{activeCard.price}</p>
              </div>
              <span className={`mono rounded-xl px-2.5 py-1 text-[12px] font-bold ${activeCard.isUp ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>
                {activeCard.change} 24h
              </span>
            </div>

            <p className="mt-4 text-[13px] leading-relaxed text-dim">{activeCard.desc}</p>

            <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
              <div className="rounded-xl border border-line/60 bg-bg2 p-3">
                <span className="text-dim">Network TVL</span>
                <p className="mono mt-1 font-bold text-teal">{activeCard.tvl}</p>
              </div>
              <div className="rounded-xl border border-line/60 bg-bg2 p-3">
                <span className="text-dim">Security</span>
                <p className="mono mt-1 font-bold text-ink">Proof of Stake</p>
              </div>
            </div>

            <div className="mt-6 flex gap-2.5">
              <button
                onClick={handleClose}
                className="font-display flex-1 rounded-2xl border border-line bg-bg2 py-3 text-[13px] font-bold text-dim hover:text-ink"
              >
                Close (Reverse FLIP)
              </button>
              <button
                onClick={handleClose}
                className="font-display el-glow flex-1 rounded-2xl bg-gradient-to-b from-[#63f6de] to-teal py-3 text-[13px] font-bold text-[#04241f]"
              >
                Start Module →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   4.4 · Scroll-driven: стопка и прогресс без библиотек
   "Чистый scroll listener, масштабирование стопки (scale) и непрерывный прогресс"
   ========================================================================= */

interface StackCardItem {
  step: string;
  title: string;
  desc: string;
  icon: ReactNode;
  color: string;
}

const STACK_ITEMS: StackCardItem[] = [
  { step: "01", title: "Create Non-Custodial Key", desc: "Generate a 12-word seed phrase protected by PBKDF2 entropy.", icon: <IconShield size={24} />, color: "#2ee6c8" },
  { step: "02", title: "Verify Gas & Slippage", desc: "Estimate base fee (EIP-1559) and set maximum priority tip.", icon: <IconWave size={24} />, color: "#5aa9ff" },
  { step: "03", title: "Sign Offline Payload", desc: "Apply ECDSA curve secp256k1 signature without broadcasting.", icon: <IconCube size={24} />, color: "#ff4d94" },
  { step: "04", title: "Broadcast & Validate", desc: "Mempool propagation and multi-validator block confirmation.", icon: <IconBolt size={24} />, color: "#f0a64d" },
];

export function NativeScrollStack() {
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) return;
    const p = Math.max(0, Math.min(1, el.scrollTop / maxScroll));
    setScrollProgress(p);
  };

  return (
    <div className="relative">
      <div className="mb-3 text-left">
        <div className="flex items-center gap-2">
          <span className="mono rounded-full bg-pink/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-pink">
            4.4 · SCROLL-DRIVEN
          </span>
          <span className="mono text-[11px] text-dim">{Math.round(scrollProgress * 100)}% COMPLETE</span>
        </div>
        <h4 className="font-display mt-2 text-[20px] font-bold text-ink">
          Scroll-driven: стопка и прогресс без библиотек
        </h4>
        <p className="mt-1 text-[12.5px] text-dim">
          Прокрутите список карточек вниз — они складываются в физическую стопку со скейлом.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="relative mb-4 h-2 w-full overflow-hidden rounded-full bg-bg2 border border-line/60">
        <div
          className="h-full bg-gradient-to-r from-teal via-wait to-pink shadow-[0_0_12px_rgba(46,230,200,0.8)] transition-[width] duration-75"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>

      {/* Stacking Card Viewport */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative h-[380px] overflow-y-auto rounded-3xl border border-line/70 bg-gradient-to-b from-[#0a1120] to-[#070c14] p-5 scrollbar-thin"
      >
        <div className="space-y-4 pb-20">
          {STACK_ITEMS.map((item, idx) => {
            const scale = 1 - (STACK_ITEMS.length - 1 - idx) * 0.025;

            return (
              <div
                key={item.step}
                className="sticky top-4 el-3 rounded-2xl border border-line/80 bg-gradient-to-b from-card to-surface p-5 transition-transform"
                style={{
                  top: `${16 + idx * 10}px`,
                  transform: `scale(${scale})`,
                  borderColor: idx <= Math.floor(scrollProgress * STACK_ITEMS.length) ? item.color : "rgba(29, 56, 102, 0.7)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="mono text-[12px] font-black" style={{ color: item.color }}>
                    STEP {item.step}
                  </span>
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-[#070c14]"
                    style={{ background: item.color }}
                  >
                    {item.icon}
                  </span>
                </div>
                <h5 className="font-display mt-2 text-[17px] font-bold text-ink">{item.title}</h5>
                <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   ДОБАВИТЬ КАРУСЕЛЬ ИЗ КАРТ + ИНТЕРАКТИВ
   "Добавить карусель из карт+интерактив"
   ========================================================================= */

export function SkillCardsInteractiveCarousel() {
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(false);
  const [selectedVictoryCard, setSelectedVictoryCard] = useState<SkillCardData | null>(null);
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAutoPlay) return;
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % SKILL_CARDS.length);
    }, 3800);
    return () => clearInterval(interval);
  }, [isAutoPlay]);

  const prev = () => setActiveIdx((i) => (i - 1 + SKILL_CARDS.length) % SKILL_CARDS.length);
  const next = () => setActiveIdx((i) => (i + 1) % SKILL_CARDS.length);

  return (
    <div className="relative">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 text-left">
        <div>
          <div className="flex items-center gap-2">
            <span className="mono rounded-full bg-teal/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-teal">
              КАРУСЕЛЬ ИЗ КАРТ + ИНТЕРАКТИВ
            </span>
            <span className="mono text-[11px] font-bold text-lime">3D COVERFLOW & FLIP</span>
          </div>
          <h4 className="font-display mt-2 text-[20px] font-bold text-ink">
            Интерактивная 3D-карусель карточек навыков
          </h4>
          <p className="mt-1 text-[12.5px] text-dim">
            Листайте стрелками или свайпом. Нажмите <span className="text-teal font-semibold">«Preview»</span> — карточка перевернется в 3D с программой уроков! Нажмите <span className="text-teal font-semibold">«Continue →»</span> — Angry Birds фанфары победы!
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            className={`rounded-2xl border px-3.5 py-2 text-[12px] font-semibold transition-colors ${
              isAutoPlay
                ? "border-teal bg-teal/15 text-teal shadow-[0_0_12px_rgba(46,230,200,0.4)]"
                : "border-line bg-card/60 text-dim hover:text-ink"
            }`}
          >
            {isAutoPlay ? "⏸ Пауза" : "▶ Авто"}
          </button>
          <button
            onClick={prev}
            className="el-1 flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-card text-dim hover:text-ink"
            aria-label="Previous"
          >
            ←
          </button>
          <button
            onClick={next}
            className="el-1 flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-card text-dim hover:text-ink"
            aria-label="Next"
          >
            →
          </button>
        </div>
      </div>

      {/* 3D Coverflow Stage */}
      <div
        className="relative flex h-[580px] items-center justify-center overflow-hidden py-4"
        style={{ perspective: "1400px" }}
      >
        {SKILL_CARDS.map((card, idx) => {
          const offset = idx - activeIdx;
          const isCenter = offset === 0;

          // 3D placement
          const translateX = offset * 280;
          const rotateY = offset * -28;
          const translateZ = isCenter ? 80 : -Math.abs(offset) * 120;
          const scale = isCenter ? 1.03 : Math.max(0.72, 1 - Math.abs(offset) * 0.15);
          const zIndex = 30 - Math.abs(offset) * 6;
          const opacity = Math.abs(offset) > 2 ? 0 : isCenter ? 1 : 0.65;
          const isFlipped = flippedCardId === card.id;

          return (
            <div
              key={card.id}
              onClick={() => {
                if (!isCenter) setActiveIdx(idx);
              }}
              className="absolute w-[330px] cursor-pointer transition-all duration-600 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                zIndex,
                opacity,
                pointerEvents: Math.abs(offset) > 2 ? "none" : "auto",
              }}
            >
              {/* 3D FLIPPABLE CARD CONTAINER */}
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformStyle: "preserve-3d" }}
                className="relative h-full w-full"
              >
                {/* FRONT FACE OF CARD */}
                <div
                  className={`el-3 overflow-hidden rounded-[36px] border bg-[#0d1728] shadow-2xl ${
                    isCenter ? "border-teal/70 shadow-[0_25px_60px_rgba(46,230,200,0.3)]" : "border-line/70"
                  }`}
                  style={{ backfaceVisibility: "hidden" }}
                >
                  {/* Rich Gradient Dome Header */}
                  <div
                    className="relative flex h-[180px] w-full items-center justify-center overflow-hidden rounded-t-[35px] border-b border-white/10"
                    style={{ background: card.headerTheme.bg }}
                  >
                    {card.locked && (
                      <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white/70 backdrop-blur-md">
                        <IconLock size={15} />
                      </div>
                    )}
                    <div
                      className="flex h-20 w-20 items-center justify-center rounded-[24px] text-white"
                      style={{
                        background: card.headerTheme.squircleBg,
                        boxShadow: card.headerTheme.squircleGlow,
                      }}
                    >
                      {card.icon(36)}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5">
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: card.headerTheme.badgeBg,
                          borderColor: card.headerTheme.border,
                          color: card.headerTheme.badgeText,
                        }}
                      >
                        {card.tier}
                      </span>
                      <span className="flex items-center gap-1 rounded-full border border-line/60 bg-[#070c14]/60 px-2.5 py-0.5 text-[10.5px] text-dim">
                        <IconClock size={11} /> {card.duration}
                      </span>
                    </div>

                    <h4 className="font-display mt-2.5 text-[18px] font-bold text-ink leading-tight">
                      {card.title}
                    </h4>
                    <p className="mt-1 text-[12px] leading-relaxed text-dim line-clamp-2">
                      {card.description}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-[11px]">
                      <span className="text-dim">Progress</span>
                      <span className="mono font-bold" style={{ color: card.headerTheme.accent }}>
                        {card.progress}%
                      </span>
                    </div>
                    <div className="relative mt-1 h-2 w-full overflow-hidden rounded-full bg-[#070c14]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${card.progress}%`,
                          background: `linear-gradient(90deg, ${card.headerTheme.accent}, #5aa9ff)`,
                        }}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFlippedCardId(card.id);
                        }}
                        className="font-display flex-1 rounded-2xl border border-line/80 bg-[#070c14]/70 py-2.5 text-[12.5px] font-bold text-teal transition-colors hover:bg-teal/10"
                      >
                        Preview (3D Flip)
                      </button>
                      <button
                        disabled={card.locked}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVictoryCard(card);
                        }}
                        className={`font-display flex flex-1 items-center justify-center gap-1 rounded-2xl py-2.5 text-[12.5px] font-bold ${
                          card.locked
                            ? "cursor-not-allowed border border-line bg-card/60 text-dim/60"
                            : "el-glow bg-gradient-to-b from-[#63f6de] to-teal text-[#04241f]"
                        }`}
                      >
                        {card.locked ? "Locked" : "Continue →"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* BACK FACE OF CARD (3D Flipped Syllabus Details) */}
                <div
                  className="el-3 absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[36px] border border-teal/70 bg-gradient-to-b from-[#132845] via-[#0d1a30] to-[#070c14] p-5 shadow-2xl"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-line/60 pb-3">
                      <div>
                        <span className="mono text-[10px] text-teal">COURSE SYLLABUS</span>
                        <h4 className="font-display text-[17px] font-bold text-ink">{card.title}</h4>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFlippedCardId(null);
                        }}
                        className="el-1 flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-card text-dim hover:text-ink"
                        aria-label="Flip back"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {[
                        { num: "01", name: "Core Architecture & Keys", done: true },
                        { num: "02", name: "Entropy and Security Vectors", done: true },
                        { num: "03", name: "Live Sandbox Simulation", done: card.progress > 40 },
                        { num: "04", name: "Final Knowledge Check", done: card.progress >= 100 },
                      ].map((mod) => (
                        <div
                          key={mod.num}
                          className="flex items-center justify-between rounded-xl border border-line/50 bg-[#070c14]/70 p-2.5 text-[11.5px]"
                        >
                          <span className="flex items-center gap-2">
                            <span className="mono font-bold text-teal">{mod.num}</span>
                            <span className="text-ink">{mod.name}</span>
                          </span>
                          <span className={`text-[11px] font-bold ${mod.done ? "text-up" : "text-dim"}`}>
                            {mod.done ? "✓" : "○"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-line/50 pt-3">
                    <div className="flex justify-between text-[11px] text-dim mb-3">
                      <span>Reward upon completion:</span>
                      <span className="mono text-lime font-bold">+{card.xpEarned} XP</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFlippedCardId(null);
                        setSelectedVictoryCard(card);
                      }}
                      className="el-glow font-display w-full rounded-2xl bg-gradient-to-b from-[#63f6de] to-teal py-3 text-[13px] font-black text-[#04241f]"
                    >
                      Complete & Win Stars →
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Dots navigation */}
      <div className="mt-2 flex items-center justify-center gap-2">
        {SKILL_CARDS.map((card, idx) => (
          <button
            key={card.id}
            onClick={() => setActiveIdx(idx)}
            aria-label={card.title}
            className={`h-2 rounded-full transition-all duration-300 ${
              idx === activeIdx
                ? "w-8 bg-teal shadow-[0_0_10px_rgba(46,230,200,0.8)]"
                : "w-2.5 bg-line hover:bg-dim/50"
            }`}
          />
        ))}
      </div>

      {/* Victory Celebration Modal */}
      <VictoryModal
        card={selectedVictoryCard}
        onClose={() => setSelectedVictoryCard(null)}
      />
    </div>
  );
}

/* =========================================================================
   MOTION 99 LAB MASTER COMPONENT
   ========================================================================= */

export function Motion99Lab() {
  const [selectedTab, setSelectedTab] = useState<number>(0);

  const tabs = [
    { label: "11.14 Overlay (Drag+Snap)", id: "drag" },
    { label: "3.1 FLIP Morphing", id: "flip" },
    { label: "4.4 Scroll Stacking", id: "stack" },
    { label: "Карусель из карт + Интерактив", id: "carousel" },
    { label: "✦ Все 4 эксперимента", id: "all" },
  ];

  return (
    <div className="mt-8 space-y-6">
      {/* Experiment Selector Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {tabs.map((tab, idx) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(idx)}
            className={`rounded-2xl border px-4 py-2.5 text-[12.5px] font-semibold transition-all ${
              selectedTab === idx
                ? "border-teal/60 bg-teal/15 text-teal shadow-[0_0_15px_rgba(46,230,200,0.3)]"
                : "border-line bg-card/60 text-dim hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. SINGLE TAB: 11.14 DRAG + SNAP */}
      {selectedTab === 0 && (
        <div className="el-2 rounded-3xl border border-line/70 bg-gradient-to-b from-card to-surface p-6 sm:p-8">
          <InterruptibleBottomSheet />
        </div>
      )}

      {/* 2. SINGLE TAB: 3.1 FLIP MORPHING */}
      {selectedTab === 1 && (
        <div className="el-2 rounded-3xl border border-line/70 bg-gradient-to-b from-card to-surface p-6 sm:p-8">
          <NativeFlipMorph />
        </div>
      )}

      {/* 3. SINGLE TAB: 4.4 SCROLL STACKING */}
      {selectedTab === 2 && (
        <div className="el-2 rounded-3xl border border-line/70 bg-gradient-to-b from-card to-surface p-6 sm:p-8">
          <NativeScrollStack />
        </div>
      )}

      {/* 4. SINGLE TAB: КАРУСЕЛЬ ИЗ КАРТ */}
      {selectedTab === 3 && (
        <div className="el-2 rounded-3xl border border-line/70 bg-gradient-to-b from-card to-surface p-6 sm:p-8">
          <SkillCardsInteractiveCarousel />
        </div>
      )}

      {/* 5. ALL 4 EXPERIMENTS DISPLAYED TOGETHER */}
      {selectedTab === 4 && (
        <div className="space-y-8">
          <div className="el-2 rounded-3xl border border-line/70 bg-gradient-to-b from-card to-surface p-6 sm:p-8">
            <SkillCardsInteractiveCarousel />
          </div>
          <div className="el-2 rounded-3xl border border-line/70 bg-gradient-to-b from-card to-surface p-6 sm:p-8">
            <InterruptibleBottomSheet />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="el-2 rounded-3xl border border-line/70 bg-gradient-to-b from-card to-surface p-6">
              <NativeFlipMorph />
            </div>
            <div className="el-2 rounded-3xl border border-line/70 bg-gradient-to-b from-card to-surface p-6">
              <NativeScrollStack />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
