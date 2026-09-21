import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconShield, IconWave, IconCube, IconWallet, IconBolt,
  IconCheck, IconX, IconSearch, IconFlame,
  IconTrophy, IconBook, IconGrid,
} from "./icons";

/* =========================================================================
   01 · SIGNAL ARENA — DECISION WORKSPACE
   Рабочее пространство принятия торговых решений
   ========================================================================= */

type Verdict = "long" | "short" | "wait";

interface SignalRow {
  id: string;
  name: string;
  weight: number;
  score: number;
  verdict: Verdict;
  note: string;
}

const SIGNALS: SignalRow[] = [
  { id: "trend", name: "Trend Structure", weight: 25, score: 82, verdict: "long", note: "HH/HL sequence intact on 4H" },
  { id: "liq", name: "Liquidity Map", weight: 20, score: 74, verdict: "long", note: "Sell-side liquidity swept at 66.2k" },
  { id: "funding", name: "Funding Rate", weight: 15, score: 41, verdict: "wait", note: "Slightly positive, crowded longs" },
  { id: "oi", name: "Open Interest", weight: 15, score: 63, verdict: "long", note: "OI rising with price — healthy" },
  { id: "flow", name: "Spot CVD Flow", weight: 15, score: 28, verdict: "short", note: "Spot sellers absorbing bids" },
  { id: "macro", name: "Macro Regime", weight: 10, score: 55, verdict: "wait", note: "DXY consolidating, CPI in 2 days" },
];

const verdictMeta: Record<Verdict, { label: string; color: string; bg: string }> = {
  long: { label: "LONG", color: "#50c890", bg: "rgba(80,200,144,0.14)" },
  short: { label: "SHORT", color: "#eb635b", bg: "rgba(235,99,91,0.14)" },
  wait: { label: "WAIT", color: "#5aa9ff", bg: "rgba(90,169,255,0.14)" },
};

export function DecisionWorkspace() {
  const [weights, setWeights] = useState<Record<string, number>>(
    Object.fromEntries(SIGNALS.map((s) => [s.id, s.weight])),
  );
  const [riskPct, setRiskPct] = useState(1.5);
  const [account, setAccount] = useState(25000);
  const [entry, setEntry] = useState(68412);
  const [stop, setStop] = useState(66800);
  const [target, setTarget] = useState(73200);
  const [committed, setCommitted] = useState(false);

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const compositeScore =
    SIGNALS.reduce((acc, s) => acc + s.score * (weights[s.id] ?? 0), 0) / Math.max(totalWeight, 1);

  const finalVerdict: Verdict =
    compositeScore >= 62 ? "long" : compositeScore <= 38 ? "short" : "wait";

  const riskAmount = (account * riskPct) / 100;
  const stopDistance = Math.abs(entry - stop);
  const positionSize = stopDistance > 0 ? riskAmount / stopDistance : 0;
  const rewardDistance = Math.abs(target - entry);
  const rr = stopDistance > 0 ? rewardDistance / stopDistance : 0;

  const meta = verdictMeta[finalVerdict];

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-line/70 bg-gradient-to-r from-card to-surface px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="el-glow flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-b from-[#63f6de] to-teal text-[#04241f]">
            <IconGrid size={20} />
          </span>
          <div>
            <span className="mono text-[10px] uppercase tracking-[0.22em] text-teal">01 · Decision Workspace</span>
            <h4 className="font-display text-[19px] font-bold text-ink">BTC / USDT · 4H Setup Review</h4>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="mono rounded-full border border-line bg-bg2 px-3 py-1.5 text-[11px] text-dim">
            Session: London → NY
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-up/30 bg-up/10 px-3 py-1.5 text-[11px] font-bold text-up">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-up" /> Live feed
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        {/* Weighted signal matrix */}
        <div className="el-2 rounded-3xl border border-line/70 bg-gradient-to-b from-card to-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-display text-[15px] font-bold text-ink">Weighted Signal Matrix</p>
              <p className="text-[11.5px] text-dim">Двигайте веса — вердикт пересчитывается мгновенно</p>
            </div>
            <span className={`mono rounded-lg px-2 py-1 text-[11px] font-bold ${totalWeight === 100 ? "bg-up/15 text-up" : "bg-amber/15 text-amber"}`}>
              Σ {totalWeight}%
            </span>
          </div>

          <div className="space-y-2.5">
            {SIGNALS.map((s) => {
              const vm = verdictMeta[s.verdict];
              return (
                <div key={s.id} className="rounded-2xl border border-line/60 bg-[#070c14]/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-ink">{s.name}</span>
                        <span
                          className="mono rounded px-1.5 py-0.5 text-[9.5px] font-black"
                          style={{ background: vm.bg, color: vm.color }}
                        >
                          {vm.label}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-dim">{s.note}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="mono text-[15px] font-bold" style={{ color: vm.color }}>
                        {s.score}
                      </span>
                      <span className="mono block text-[9.5px] text-dim">score</span>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={40}
                      value={weights[s.id]}
                      onChange={(e) => setWeights((w) => ({ ...w, [s.id]: +e.target.value }))}
                      className="w-full accent-teal"
                    />
                    <span className="mono w-10 shrink-0 text-right text-[11px] font-bold text-teal">
                      {weights[s.id]}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Verdict + risk engine */}
        <div className="space-y-4">
          {/* Composite verdict */}
          <div
            className="el-3 relative overflow-hidden rounded-3xl border p-5"
            style={{ borderColor: `${meta.color}55`, background: `linear-gradient(180deg, ${meta.color}18, #0b1426)` }}
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl" style={{ background: `${meta.color}44` }} />
            <span className="mono text-[10px] uppercase tracking-[0.22em] text-dim">Composite Verdict</span>
            <div className="mt-2 flex items-end gap-3">
              <motion.span
                key={finalVerdict}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 14, stiffness: 320 }}
                className="font-display text-[42px] font-black leading-none"
                style={{ color: meta.color }}
              >
                {meta.label}
              </motion.span>
              <span className="mono mb-1.5 text-[13px] font-bold text-ink">
                {compositeScore.toFixed(1)} / 100
              </span>
            </div>

            {/* Verdict scale */}
            <div className="relative mt-4 h-3 w-full overflow-hidden rounded-full bg-[#070c14]">
              <div className="absolute inset-y-0 left-0 w-[38%] bg-down/25" />
              <div className="absolute inset-y-0 left-[38%] w-[24%] bg-wait/25" />
              <div className="absolute inset-y-0 left-[62%] right-0 bg-up/25" />
              <motion.div
                animate={{ left: `${compositeScore}%` }}
                transition={{ type: "spring", damping: 22, stiffness: 260 }}
                className="absolute top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_10px_currentColor]"
                style={{ background: meta.color, color: meta.color }}
              />
            </div>
            <div className="mono mt-1.5 flex justify-between text-[9.5px] text-dim">
              <span>SHORT 0–38</span><span>WAIT 38–62</span><span>LONG 62–100</span>
            </div>
          </div>

          {/* Risk sizing engine */}
          <div className="el-2 rounded-3xl border border-line/70 bg-gradient-to-b from-card to-surface p-5">
            <p className="font-display text-[15px] font-bold text-ink">Position Sizing Engine</p>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {([
                ["Account $", account, setAccount, 500],
                ["Entry $", entry, setEntry, 50],
                ["Stop $", stop, setStop, 50],
                ["Target $", target, setTarget, 50],
              ] as [string, number, (v: number) => void, number][]).map(([label, val, setter, step]) => (
                <div key={label} className="rounded-xl border border-line/60 bg-[#070c14] p-2.5">
                  <span className="mono text-[9.5px] uppercase text-dim">{label}</span>
                  <input
                    type="number"
                    step={step}
                    value={val}
                    onChange={(e) => setter(+e.target.value || 0)}
                    className="mono w-full bg-transparent text-[15px] font-bold text-ink outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-dim">Risk per trade</span>
                <span className="mono font-bold text-teal">{riskPct.toFixed(1)}% · ${riskAmount.toFixed(0)}</span>
              </div>
              <input
                type="range" min={0.25} max={5} step={0.25}
                value={riskPct}
                onChange={(e) => setRiskPct(+e.target.value)}
                className="mt-1.5 w-full accent-teal"
              />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ["Size", `${positionSize.toFixed(4)}`, "BTC", "#2ee6c8"],
                ["R:R", `${rr.toFixed(2)}`, rr >= 2 ? "good" : "low", rr >= 2 ? "#50c890" : "#f0a64d"],
                ["Stop", `${((stopDistance / entry) * 100).toFixed(2)}%`, "distance", "#eb635b"],
              ].map(([l, v, sub, c]) => (
                <div key={l} className="rounded-xl border border-line/60 bg-[#070c14] p-2.5 text-center">
                  <span className="mono block text-[9.5px] uppercase text-dim">{l}</span>
                  <span className="font-display text-[16px] font-bold" style={{ color: c }}>{v}</span>
                  <span className="mono block text-[9px] text-dim">{sub}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => { setCommitted(true); setTimeout(() => setCommitted(false), 2400); }}
              className="el-glow font-display mt-4 w-full rounded-2xl bg-gradient-to-b from-[#63f6de] to-teal py-3 text-[13.5px] font-black text-[#04241f] active:scale-95"
            >
              {committed ? "✓ Decision Journaled" : "Commit Decision to Journal →"}
            </button>
          </div>
        </div>
      </div>

      {/* Pre-flight checklist */}
      <div className="el-2 rounded-3xl border border-line/70 bg-gradient-to-b from-card to-surface p-5">
        <p className="font-display text-[15px] font-bold text-ink">Pre-flight Checklist</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { t: "Invalidation defined", ok: stopDistance > 0 },
            { t: "R:R ≥ 2.0", ok: rr >= 2 },
            { t: "Risk ≤ 2% account", ok: riskPct <= 2 },
            { t: "Weights sum = 100%", ok: totalWeight === 100 },
          ].map((c) => (
            <div
              key={c.t}
              className={`flex items-center gap-2.5 rounded-2xl border p-3 text-[12.5px] ${
                c.ok ? "border-up/40 bg-up/[0.07] text-up" : "border-amber/40 bg-amber/[0.07] text-amber"
              }`}
            >
              {c.ok ? <IconCheck size={15} /> : <IconX size={15} />}
              <span className="text-ink">{c.t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   02 · SIGNAL ARENA — INTELLIGENCE HUB
   Центр рыночной разведки: потоки, кластеры, тепловая карта
   ========================================================================= */

interface FeedItem {
  id: number;
  time: string;
  tag: string;
  tone: "up" | "down" | "wait" | "amber" | "pink";
  text: string;
  impact: number;
}

const FEED_SEED: FeedItem[] = [
  { id: 1, time: "09:42", tag: "WHALE", tone: "up", text: "2,140 BTC withdrawn from Binance cold wallet", impact: 88 },
  { id: 2, time: "09:38", tag: "LIQUIDATION", tone: "down", text: "$41.2M longs liquidated across perp venues", impact: 74 },
  { id: 3, time: "09:31", tag: "ON-CHAIN", tone: "wait", text: "Stablecoin netflow to exchanges +$220M", impact: 61 },
  { id: 4, time: "09:24", tag: "GOVERNANCE", tone: "pink", text: "Arbitrum DAO passes treasury diversification", impact: 44 },
  { id: 5, time: "09:17", tag: "MACRO", tone: "amber", text: "US CPI print scheduled in 47 hours", impact: 92 },
];

const HEATMAP = [
  { s: "BTC", v: 2.41 }, { s: "ETH", v: 1.12 }, { s: "SOL", v: -3.08 }, { s: "AVAX", v: 5.66 },
  { s: "LINK", v: 0.84 }, { s: "DOT", v: -0.74 }, { s: "ARB", v: -2.15 }, { s: "OP", v: 3.42 },
  { s: "INJ", v: 7.21 }, { s: "TIA", v: -4.88 }, { s: "SUI", v: 1.95 }, { s: "APT", v: -1.33 },
];

const CLUSTERS = [
  { name: "L1 Majors", icon: <IconCube size={18} />, score: 78, tone: "#2ee6c8", delta: "+2.1%" },
  { name: "DeFi Blue-chip", icon: <IconWave size={18} />, score: 54, tone: "#5aa9ff", delta: "-0.4%" },
  { name: "AI & Compute", icon: <IconBolt size={18} />, score: 91, tone: "#b7f739", delta: "+6.8%" },
  { name: "RWA / Treasury", icon: <IconWallet size={18} />, score: 66, tone: "#f0a64d", delta: "+1.2%" },
];

export function IntelligenceHub() {
  const [feed, setFeed] = useState<FeedItem[]>(FEED_SEED);
  const [filter, setFilter] = useState<string>("ALL");
  const [pulse, setPulse] = useState(0);
  const counterRef = useRef(100);

  // Live feed injection
  useEffect(() => {
    const templates: Omit<FeedItem, "id" | "time">[] = [
      { tag: "WHALE", tone: "up", text: "Unknown wallet accumulates 812 ETH from Kraken", impact: 71 },
      { tag: "LIQUIDATION", tone: "down", text: "$12.8M shorts liquidated on SOL perps", impact: 58 },
      { tag: "ON-CHAIN", tone: "wait", text: "Miner reserves drop to 12-month low", impact: 66 },
      { tag: "MACRO", tone: "amber", text: "DXY breaks below 104 support level", impact: 79 },
    ];
    const t = setInterval(() => {
      const pick = templates[Math.floor(Math.random() * templates.length)];
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      setFeed((f) => [{ ...pick, id: counterRef.current++, time }, ...f].slice(0, 7));
      setPulse((p) => p + 1);
    }, 5200);
    return () => clearInterval(t);
  }, []);

  const toneColor: Record<string, string> = {
    up: "#50c890", down: "#eb635b", wait: "#5aa9ff", amber: "#f0a64d", pink: "#ff4d94",
  };

  const tags = ["ALL", "WHALE", "LIQUIDATION", "ON-CHAIN", "MACRO", "GOVERNANCE"];
  const visible = filter === "ALL" ? feed : feed.filter((f) => f.tag === filter);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-line/70 bg-gradient-to-r from-card to-surface px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-b from-[#74b8ff] to-wait text-[#041224] shadow-[0_10px_28px_-6px_rgba(90,169,255,0.7)]">
            <IconSearch size={20} />
          </span>
          <div>
            <span className="mono text-[10px] uppercase tracking-[0.22em] text-wait">02 · Intelligence Hub</span>
            <h4 className="font-display text-[19px] font-bold text-ink">Market Intelligence Stream</h4>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="mono rounded-full border border-line bg-bg2 px-3 py-1.5 text-[11px] text-dim">
            {feed.length} events buffered
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/10 px-3 py-1.5 text-[11px] font-bold text-teal">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal" /> Streaming · {pulse}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        {/* Live event feed */}
        <div className="el-2 rounded-3xl border border-line/70 bg-gradient-to-b from-card to-surface p-5">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`mono rounded-full border px-2.5 py-1 text-[10px] font-bold transition-all ${
                  filter === t
                    ? "border-teal/60 bg-teal/15 text-teal"
                    : "border-line bg-bg2 text-dim hover:text-ink"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
            <AnimatePresence initial={false}>
              {visible.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -16, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ type: "spring", damping: 26, stiffness: 340 }}
                  className="overflow-hidden rounded-2xl border border-line/60 bg-[#070c14]/80 p-3"
                  style={{ borderLeftWidth: 3, borderLeftColor: toneColor[item.tone] }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="mono text-[10px] text-dim">{item.time}</span>
                      <span
                        className="mono rounded px-1.5 py-0.5 text-[9px] font-black"
                        style={{ background: `${toneColor[item.tone]}22`, color: toneColor[item.tone] }}
                      >
                        {item.tag}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-line/50">
                        <div className="h-full rounded-full" style={{ width: `${item.impact}%`, background: toneColor[item.tone] }} />
                      </div>
                      <span className="mono text-[9.5px] text-dim">{item.impact}</span>
                    </div>
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-snug text-ink">{item.text}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          {/* Sector clusters */}
          <div className="el-2 rounded-3xl border border-line/70 bg-gradient-to-b from-card to-surface p-5">
            <p className="font-display text-[15px] font-bold text-ink">Sector Rotation Clusters</p>
            <div className="mt-3 space-y-2.5">
              {CLUSTERS.map((c) => (
                <div key={c.name} className="rounded-2xl border border-line/60 bg-[#070c14]/70 p-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#070c14]"
                      style={{ background: c.tone }}
                    >
                      {c.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[12.5px] font-semibold text-ink">{c.name}</span>
                        <span className={`mono text-[11px] font-bold ${c.delta.startsWith("+") ? "text-up" : "text-down"}`}>
                          {c.delta}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line/40">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${c.score}%` }}
                          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full rounded-full"
                          style={{ background: c.tone, boxShadow: `0 0 8px ${c.tone}88` }}
                        />
                      </div>
                    </div>
                    <span className="mono shrink-0 text-[13px] font-bold" style={{ color: c.tone }}>{c.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Heatmap */}
          <div className="el-2 rounded-3xl border border-line/70 bg-gradient-to-b from-card to-surface p-5">
            <div className="flex items-center justify-between">
              <p className="font-display text-[15px] font-bold text-ink">24h Heatmap</p>
              <span className="mono text-[10px] text-dim">12 assets</span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {HEATMAP.map((h) => {
                const pos = h.v >= 0;
                const intensity = Math.min(1, Math.abs(h.v) / 7);
                return (
                  <div
                    key={h.s}
                    className="group relative flex aspect-square flex-col items-center justify-center rounded-xl border border-white/5 transition-transform hover:scale-110"
                    style={{
                      background: pos
                        ? `rgba(80,200,144,${0.12 + intensity * 0.55})`
                        : `rgba(235,99,91,${0.12 + intensity * 0.55})`,
                    }}
                  >
                    <span className="mono text-[10.5px] font-black text-ink">{h.s}</span>
                    <span className={`mono text-[9.5px] font-bold ${pos ? "text-up" : "text-down"}`}>
                      {pos ? "+" : ""}{h.v.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Fear & Greed", v: "72", s: "Greed", i: <IconFlame size={16} />, c: "#f0a64d" },
          { l: "BTC Dominance", v: "54.2%", s: "+0.3% 24h", i: <IconShield size={16} />, c: "#2ee6c8" },
          { l: "Total Liq 24h", v: "$182M", s: "68% longs", i: <IconBolt size={16} />, c: "#eb635b" },
          { l: "Signal Accuracy", v: "81.4%", s: "trailing 30d", i: <IconTrophy size={16} />, c: "#b7f739" },
        ].map((k) => (
          <div key={k.l} className="el-1 flex items-center gap-3 rounded-2xl border border-line/60 bg-[#070c14]/70 p-3.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${k.c}1f`, color: k.c }}>
              {k.i}
            </span>
            <div>
              <span className="mono block text-[9.5px] uppercase text-dim">{k.l}</span>
              <span className="font-display text-[18px] font-bold text-ink">{k.v}</span>
              <span className="mono block text-[9.5px] text-dim">{k.s}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   COMBINED WORKSPACES SWITCHER
   ========================================================================= */

export function Workspaces() {
  const [tab, setTab] = useState(0);

  return (
    <div className="mt-8 space-y-5">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {[
          { l: "01 · Decision Workspace", i: <IconGrid size={14} /> },
          { l: "02 · Intelligence Hub", i: <IconSearch size={14} /> },
          { l: "✦ Оба экрана", i: <IconBook size={14} /> },
        ].map((t, idx) => (
          <button
            key={t.l}
            onClick={() => setTab(idx)}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-[12.5px] font-semibold transition-all ${
              tab === idx
                ? "border-teal/60 bg-teal/15 text-teal shadow-[0_0_15px_rgba(46,230,200,0.3)]"
                : "border-line bg-card/60 text-dim hover:text-ink"
            }`}
          >
            {t.i} {t.l}
          </button>
        ))}
      </div>

      {tab === 0 && <DecisionWorkspace />}
      {tab === 1 && <IntelligenceHub />}
      {tab === 2 && (
        <div className="space-y-10">
          <DecisionWorkspace />
          <div className="h-px bg-gradient-to-r from-transparent via-line to-transparent" />
          <IntelligenceHub />
        </div>
      )}
    </div>
  );
}
