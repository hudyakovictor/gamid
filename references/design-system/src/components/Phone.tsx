import { useEffect, useState, type ReactNode } from "react";
import { Progress, Ring } from "./ui";
import {
  IconHome,
  IconBook,
  IconChart,
  IconUser,
  IconBell,
  IconBolt,
  IconShield,
  IconWave,
  IconCube,
  IconSearch,
  IconFlame,
  IconArrow,
  IconCheck,
  IconX,
  IconClock,
  IconGift,
  IconTrophy,
  IconWallet,
  IconLock,
  IconSend,
  IconDownload,
  IconStar,
  IconLayers,
} from "./icons";

/* ============ device shell ============ */
export function Phone({
  children,
  caption,
  className = "",
  glow = "teal",
}: {
  children: ReactNode;
  caption?: string;
  className?: string;
  glow?: "teal" | "pink" | "wait";
}) {
  const g = { teal: "bg-teal/14", pink: "bg-pink/12", wait: "bg-wait/12" }[glow];
  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="relative">
        <div className={`absolute -inset-10 rounded-[70px] ${g} blur-3xl`} />
        <div
          className="tilt relative h-[636px] w-[302px] rounded-[46px] border border-line/80 bg-gradient-to-b from-[#20365a] via-[#101d34] to-[#070c14] p-[3px]"
          style={{
            boxShadow:
              "0 1px 0 rgba(255,255,255,.18) inset, 0 0 0 1px rgba(46,230,200,.08), 0 50px 110px -34px rgba(0,0,0,1)",
          }}
        >
          <div className="relative h-full w-full overflow-hidden rounded-[43px] bg-bg">
            <div className="absolute left-1/2 top-2.5 z-30 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black shadow-[0_1px_0_rgba(255,255,255,.07)]">
              <span className="absolute right-4 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#101c2b] ring-1 ring-white/10" />
            </div>
            <div className="relative z-20 flex items-center justify-between px-6 pb-1 pt-3.5 text-[11px] font-semibold text-dim">
              <span className="mono">9:41</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-teal shadow-[0_0_8px_rgba(46,230,200,.9)]" />
                5G
                <span className="ml-1 inline-block h-2.5 w-5 rounded-[3px] border border-dim/60 p-[1.5px]">
                  <span className="block h-full w-2/3 rounded-[1px] bg-teal" />
                </span>
              </span>
            </div>
            <div className="h-[calc(100%-34px)] overflow-hidden">{children}</div>
            <div className="absolute bottom-1.5 left-1/2 z-30 h-1 w-28 -translate-x-1/2 rounded-full bg-white/25" />
          </div>
        </div>
      </div>
      {caption && (
        <span className="font-display text-[11px] uppercase tracking-[0.28em] text-dim">
          {caption}
        </span>
      )}
    </div>
  );
}

/* ============ tabs ============ */
export const TABS = [
  { key: "home", label: "Home", I: IconHome },
  { key: "learn", label: "Learn", I: IconBook },
  { key: "quiz", label: "Quiz", I: IconBolt },
  { key: "market", label: "Market", I: IconChart },
  { key: "wallet", label: "Wallet", I: IconWallet },
  { key: "profile", label: "Profile", I: IconUser },
] as const;

function TabBar({ active, onTab }: { active: number; onTab: (i: number) => void }) {
  return (
    <div className="absolute inset-x-2.5 bottom-4 z-20 flex items-center justify-between rounded-[26px] border border-line/70 glass px-1 py-1.5 el-3">
      {TABS.map(({ label, I }, i) => (
        <button
          key={label}
          onClick={() => onTab(i)}
          className={`flex flex-1 flex-col items-center gap-1 rounded-[20px] py-1.5 text-[9px] font-semibold transition-all duration-300 ${
            i === active ? "el-1 bg-teal/15 text-teal" : "text-dim hover:text-ink"
          }`}
        >
          <I size={16} />
          {label}
        </button>
      ))}
    </div>
  );
}

const Scroll = ({ children }: { children: ReactNode }) => (
  <div className="h-full overflow-hidden px-4 pb-24 pt-1">{children}</div>
);

/* ============ HOME ============ */
function HomeScreen({ onTab }: { onTab: (i: number) => void }) {
  return (
    <div className="relative h-full grain">
      <Scroll>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-dim">Good morning</p>
            <p className="font-display text-[17px] font-bold text-ink">Alex Nova</p>
          </div>
          <div className="flex gap-2">
            <div className="el-2 relative flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-card text-dim">
              <IconBell size={17} />
              <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-pink" />
            </div>
            <div className="el-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal/25 to-wait/20 font-display text-[13px] font-bold text-teal">
              AN
            </div>
          </div>
        </div>

        <div className="el-3 mt-4 flex items-center gap-4 rounded-3xl border border-teal/25 bg-gradient-to-br from-[#0f3a37] via-card to-surface p-4">
          <Ring value={34} size={78} stroke={8} label="course" />
          <div className="flex-1">
            <span className="mono text-[9.5px] uppercase tracking-[0.2em] text-teal">
              Blockchain basics
            </span>
            <p className="font-display mt-1 text-[19px] font-bold leading-tight text-ink">
              Lesson 8 <span className="text-[13px] text-dim">/ 24</span>
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-dim">
              <IconClock size={12} /> 6 min left
              <span className="ml-auto flex items-center gap-1 rounded-full bg-amber/15 px-2 py-0.5 font-bold text-amber">
                <IconFlame size={11} /> 12
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="font-display text-[13px] font-bold text-ink">Your tracks</p>
          <button onClick={() => onTab(1)} className="text-[10.5px] text-teal">
            See all
          </button>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          {[
            { t: "Wallet Safety", I: IconShield, p: 80, c: "from-teal/55 to-teal/20" },
            { t: "DeFi 101", I: IconWave, p: 45, c: "from-wait/60 to-wait/20" },
            { t: "On-chain", I: IconCube, p: 20, c: "from-pink/55 to-pink/20" },
            { t: "Trading", I: IconChart, p: 62, c: "from-amber/60 to-amber/20" },
          ].map((x) => (
            <button
              key={x.t}
              onClick={() => onTab(1)}
              className="el-2 rounded-2xl border border-line/70 bg-gradient-to-b from-card to-surface p-3 text-left transition-transform duration-400 hover:-translate-y-0.5"
            >
              <div
                className={`el-1 mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white ${x.c}`}
              >
                <x.I size={17} />
              </div>
              <p className="font-display text-[12.5px] font-semibold text-ink">{x.t}</p>
              <p className="mb-2 mono text-[9.5px] text-dim">{x.p}% complete</p>
              <Progress value={x.p} height={5} tone={x.p > 70 ? "lime" : "teal"} />
            </button>
          ))}
        </div>

        <button
          onClick={() => onTab(2)}
          className="el-2 mt-3 flex w-full items-center gap-3 rounded-2xl border border-line/70 bg-card p-3 text-left"
        >
          <div className="el-glow flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-[#63f6de] to-teal text-[#04241f]">
            <IconBolt size={18} />
          </div>
          <div className="flex-1">
            <p className="font-display text-[12.5px] font-semibold text-ink">Daily quiz</p>
            <p className="text-[10px] text-dim">Earn 50 XP in 2 minutes</p>
          </div>
          <IconArrow className="text-teal" size={16} />
        </button>
      </Scroll>
    </div>
  );
}

/* ============ LESSON ============ */
function LessonScreen() {
  const [step, setStep] = useState(0);
  const blocks = [1204, 1205, 1206];
  return (
    <div className="relative h-full grain">
      <Scroll>
        <div className="el-3 relative overflow-hidden rounded-3xl border border-line/70 bg-gradient-to-br from-[#123a3a] via-card to-surface p-5">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-teal/20 blur-2xl" />
          <span className="el-glow flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b from-[#63f6de] to-teal text-[#04241f]">
            <IconCube size={24} />
          </span>
          <p className="font-display mt-3 text-[20px] font-bold leading-tight text-ink">
            How blocks are chained
          </p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-dim">
            Each block carries the hash of the one before it — rewriting history breaks
            every link that follows.
          </p>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5">
          {blocks.map((b, i) => (
            <div key={b} className="flex items-center gap-1.5">
              <button
                onClick={() => setStep(i)}
                className={`el-2 flex h-14 w-14 items-center justify-center rounded-2xl border text-[9px] font-bold transition-all duration-400 ${
                  i <= step
                    ? "border-teal/50 bg-teal/12 text-teal"
                    : "border-line bg-card text-dim"
                }`}
              >
                #{b}
              </button>
              {i < 2 && (
                <span
                  className={`h-px w-4 transition-colors duration-500 ${i <= step - 1 ? "bg-teal/70" : "bg-line"}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="el-2 mt-4 rounded-2xl border border-line/70 bg-card p-3.5">
          <p className="mono text-[9.5px] uppercase tracking-widest text-dim">
            Block #{blocks[step]} header
          </p>
          <div className="mono mt-2 space-y-1 text-[10px] leading-relaxed">
            <p className="text-dim">
              prevHash <span className="text-teal">0x8f2a…c41d</span>
            </p>
            <p className="text-dim">
              merkle <span className="text-wait">0x33be…90fa</span>
            </p>
            <p className="text-dim">
              nonce <span className="text-amber">{1928441 + step * 7}</span>
            </p>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          {[
            { I: IconLock, l: "Immutable", c: "text-teal" },
            { I: IconWallet, l: "Verifiable", c: "text-wait" },
            { I: IconBolt, l: "Fast", c: "text-amber" },
          ].map((x) => (
            <div
              key={x.l}
              className="el-1 flex-1 rounded-2xl border border-line/60 bg-bg2 p-3 text-center"
            >
              <x.I className={`mx-auto ${x.c}`} size={16} />
              <p className="mt-1 text-[10px] text-dim">{x.l}</p>
            </div>
          ))}
        </div>
      </Scroll>
      <div className="absolute inset-x-4 bottom-[86px] z-20 flex gap-2">
        <button className="el-2 font-display rounded-2xl border border-line bg-card px-5 py-3.5 text-[13px] font-semibold text-dim">
          Skip
        </button>
        <button
          onClick={() => setStep((s) => Math.min(2, s + 1))}
          className="el-glow pressable font-display flex-1 rounded-2xl bg-gradient-to-b from-[#63f6de] to-teal py-3.5 text-[14px] font-bold text-[#04241f] active:translate-y-[1px]"
        >
          Next block
        </button>
      </div>
    </div>
  );
}

/* ============ QUIZ ============ */
function QuizScreen() {
  const [picked, setPicked] = useState<number | null>(1);
  const opts = [
    "Mining hardware power",
    "Validators staking capital",
    "Centralized approval",
    "Random block lottery",
  ];
  return (
    <div className="relative h-full grain">
      <Scroll>
        <div className="flex items-center justify-between text-[11px] text-dim">
          <span className="flex items-center gap-1.5">
            <span className="rotate-180">
              <IconArrow size={14} />
            </span>
            Quiz 3 / 8
          </span>
          <span className="mono flex items-center gap-1 font-semibold text-amber">
            <IconClock size={13} /> 00:24
          </span>
        </div>
        <div className="mt-3">
          <Progress value={62} tone="lime" height={7} />
        </div>

        <div className="el-3 mt-4 rounded-3xl border border-line/70 bg-gradient-to-b from-card to-surface p-4">
          <span className="mono rounded-full bg-wait/15 px-2 py-1 text-[9.5px] font-bold tracking-widest text-wait">
            CONSENSUS
          </span>
          <p className="font-display mt-3 text-[17px] font-bold leading-snug text-ink">
            What secures a Proof-of-Stake network?
          </p>
        </div>

        <div className="mt-3.5 space-y-2.5">
          {opts.map((o, i) => {
            const state =
              picked === null ? "idle" : i === 1 ? "correct" : picked === i ? "wrong" : "idle";
            return (
              <button
                key={o}
                onClick={() => setPicked(i)}
                className={`el-2 pressable flex w-full items-center justify-between gap-2 rounded-2xl border px-4 py-3.5 text-left text-[12.5px] font-semibold transition-all duration-300 ${
                  state === "correct"
                    ? "border-up/60 bg-up/15 text-up"
                    : state === "wrong"
                      ? "border-down/50 bg-down/12 text-down"
                      : "border-line/70 bg-card text-ink"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border text-[9px] ${state === "idle" ? "border-line text-dim" : "border-current"}`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  {o}
                </span>
                {state === "correct" && <IconCheck size={15} />}
                {state === "wrong" && <IconX size={15} />}
              </button>
            );
          })}
        </div>

        {picked !== null && (
          <div className="el-2 mt-3 flex gap-2 rounded-2xl border border-up/30 bg-up/[0.08] p-3 text-[11px] leading-relaxed text-up">
            <IconStar size={14} className="mt-0.5 shrink-0" />
            Validators lock capital as collateral — dishonest behaviour gets slashed.
          </div>
        )}
      </Scroll>
      <div className="absolute inset-x-4 bottom-[86px] z-20">
        <button className="el-glow pressable font-display w-full rounded-2xl bg-gradient-to-b from-[#63f6de] to-teal py-3.5 text-[14.5px] font-bold text-[#04241f] active:translate-y-[1px]">
          Continue · +50 XP
        </button>
      </div>
    </div>
  );
}

/* ============ MARKET (live) ============ */
const seed = [
  { s: "BTC", n: "Bitcoin", p: 68412, c: 2.41 },
  { s: "ETH", n: "Ethereum", p: 3884, c: 1.12 },
  { s: "SOL", n: "Solana", p: 182.4, c: -3.08 },
  { s: "AVAX", n: "Avalanche", p: 42.71, c: 5.66 },
  { s: "DOT", n: "Polkadot", p: 8.94, c: -0.74 },
];

function MarketScreen() {
  const [rows, setRows] = useState(seed);
  const [range, setRange] = useState(1);
  useEffect(() => {
    const id = setInterval(() => {
      setRows((r) =>
        r.map((x) => {
          const d = (Math.random() - 0.5) * 0.9;
          return {
            ...x,
            p: +(x.p * (1 + d / 100)).toFixed(x.p > 500 ? 0 : 2),
            c: +(x.c + d).toFixed(2),
          };
        }),
      );
    }, 1700);
    return () => clearInterval(id);
  }, []);

  const paths = [
    "M0 56 L30 49 L60 53 L90 32 L120 39 L150 20 L180 27 L210 11 L240 18",
    "M0 62 L30 44 L60 50 L90 26 L120 34 L150 14 L180 24 L210 8 L240 12",
    "M0 40 L30 52 L60 34 L90 46 L120 22 L150 36 L180 16 L210 28 L240 10",
    "M0 58 L30 56 L60 44 L90 48 L120 30 L150 26 L180 32 L210 18 L240 22",
  ];

  return (
    <div className="relative h-full grain">
      <Scroll>
        <div className="flex items-center justify-between">
          <p className="font-display text-[17px] font-bold text-ink">Market</p>
          <span className="flex items-center gap-1.5 rounded-full border border-up/30 bg-up/10 px-2 py-1 text-[9.5px] font-bold text-up">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-up" /> LIVE
          </span>
        </div>
        <div className="el-press mt-3 flex items-center gap-2 rounded-2xl border border-line bg-bg2 px-3 py-2.5 text-[12px] text-dim">
          <IconSearch size={15} /> Search assets
        </div>

        <div className="el-3 mt-3.5 rounded-3xl border border-line/70 bg-gradient-to-b from-card to-surface p-4">
          <p className="text-[10.5px] text-dim">Portfolio value</p>
          <p className="font-display text-[26px] font-bold tabular-nums text-ink">
            $12,840.22
          </p>
          <p className="mono text-[10.5px] font-semibold text-up">+$482.10 (3.9%) today</p>
          <svg viewBox="0 0 240 72" className="mt-2 h-[68px] w-full">
            <defs>
              <linearGradient id="fill1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2ee6c8" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#2ee6c8" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="ln1" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#5aa9ff" />
                <stop offset="100%" stopColor="#2ee6c8" />
              </linearGradient>
            </defs>
            <path d={`${paths[range]} L240 72 L0 72Z`} fill="url(#fill1)" />
            <path
              d={paths[range]}
              fill="none"
              stroke="url(#ln1)"
              strokeWidth="2.6"
              strokeLinejoin="round"
              style={{ transition: "d .5s ease" }}
            />
            <circle cx="240" cy="18" r="3.6" fill="#2ee6c8" />
          </svg>
          <div className="el-press mt-1 flex rounded-xl bg-bg2 p-0.5">
            {["1D", "1W", "1M", "1Y"].map((t, i) => (
              <button
                key={t}
                onClick={() => setRange(i)}
                className={`mono flex-1 rounded-lg py-1 text-center text-[10px] font-bold transition-colors ${i === range ? "el-1 bg-card text-teal" : "text-dim"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {rows.map((r) => (
            <div
              key={r.s}
              className="el-1 flex items-center gap-3 rounded-2xl border border-line/60 bg-card/80 px-3 py-2.5"
            >
              <div className="mono flex h-8 w-8 items-center justify-center rounded-full bg-bg2 text-[9px] font-bold text-teal">
                {r.s}
              </div>
              <div className="flex-1">
                <p className="text-[12px] font-semibold text-ink">{r.n}</p>
                <p className="mono text-[10px] tabular-nums text-dim">
                  ${r.p.toLocaleString()}
                </p>
              </div>
              <span
                className={`mono rounded-lg px-2 py-1 text-[10px] font-bold tabular-nums transition-colors duration-500 ${
                  r.c >= 0 ? "bg-up/15 text-up" : "bg-down/15 text-down"
                }`}
              >
                {r.c >= 0 ? "+" : ""}
                {r.c.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </Scroll>
    </div>
  );
}

/* ============ WALLET ============ */
function WalletScreen() {
  return (
    <div className="relative h-full grain">
      <Scroll>
        <div className="el-3 relative overflow-hidden rounded-3xl border border-teal/30 bg-gradient-to-br from-[#0f3a37] via-surface to-card p-4">
          <div className="absolute -left-8 -top-10 h-28 w-28 rounded-full bg-teal/20 blur-2xl" />
          <div className="flex items-center justify-between">
            <span className="mono text-[9.5px] uppercase tracking-[0.2em] text-teal">
              Total balance
            </span>
            <span className="flex items-center gap-1 rounded-full bg-teal/15 px-2 py-0.5 text-[9px] font-bold text-teal">
              <IconShield size={10} /> secured
            </span>
          </div>
          <p className="font-display mt-2 text-[27px] font-bold tabular-nums text-ink">
            $12,840<span className="text-teal">.22</span>
          </p>
          <p className="mono text-[10.5px] text-up">+3.9% · 24h</p>
          <div className="mt-4 flex gap-2">
            <button className="el-glow font-display flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b from-[#63f6de] to-teal py-2.5 text-[12px] font-bold text-[#04241f]">
              <IconSend size={14} /> Send
            </button>
            <button className="el-2 font-display flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-line bg-card py-2.5 text-[12px] font-bold text-ink">
              <IconDownload size={14} /> Receive
            </button>
          </div>
        </div>

        <p className="font-display mt-4 text-[13px] font-bold text-ink">Assets</p>
        <div className="mt-2 space-y-2">
          {[
            { s: "BTC", n: "0.0842", v: "$5,760.12", c: "+2.4%", up: true },
            { s: "ETH", n: "1.2400", v: "$4,816.16", c: "+1.1%", up: true },
            { s: "SOL", n: "12.40", v: "$2,261.76", c: "-3.1%", up: false },
          ].map((a) => (
            <div
              key={a.s}
              className="el-2 flex items-center gap-3 rounded-2xl border border-line/70 bg-card px-3 py-3"
            >
              <div className="mono flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal/25 to-wait/15 text-[9px] font-bold text-teal">
                {a.s}
              </div>
              <div className="flex-1">
                <p className="font-display text-[12.5px] font-semibold text-ink">{a.s}</p>
                <p className="mono text-[10px] text-dim">{a.n}</p>
              </div>
              <div className="text-right">
                <p className="mono text-[11.5px] tabular-nums text-ink">{a.v}</p>
                <p className={`mono text-[10px] ${a.up ? "text-up" : "text-down"}`}>{a.c}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="el-2 mt-3 flex items-center gap-3 rounded-2xl border border-wait/30 bg-wait/[0.08] p-3">
          <span className="el-1 flex h-9 w-9 items-center justify-center rounded-xl bg-wait/15 text-wait">
            <IconLock size={16} />
          </span>
          <p className="flex-1 text-[11px] leading-snug text-wait">
            Back up your seed phrase — 3 words missing
          </p>
          <IconArrow size={15} className="text-wait" />
        </div>

        <div className="el-1 mt-3 flex items-center gap-3 rounded-2xl border border-line/60 bg-bg2 p-3">
          <IconLayers className="text-dim" size={16} />
          <p className="flex-1 text-[11px] text-dim">
            Network fee estimate <span className="mono text-teal">$0.42</span>
          </p>
        </div>
      </Scroll>
    </div>
  );
}

/* ============ PROFILE ============ */
function ProfileScreen() {
  return (
    <div className="relative h-full grain">
      <Scroll>
        <div className="flex flex-col items-center pt-2">
          <div className="el-glow pulse-ring flex h-[72px] w-[72px] items-center justify-center rounded-3xl bg-gradient-to-br from-[#63f6de] to-teal font-display text-[24px] font-black text-[#04241f]">
            AN
          </div>
          <p className="font-display mt-3 text-[17px] font-bold text-ink">Alex Nova</p>
          <p className="mono text-[10.5px] text-dim">Level 7 · 2,480 XP</p>
        </div>

        <div className="el-2 mt-4 rounded-3xl border border-line/70 bg-gradient-to-b from-card to-surface p-4">
          <div className="flex items-center justify-between text-[10.5px] text-dim">
            <span>Progress to Level 8</span>
            <span className="mono text-teal">2480 / 3000</span>
          </div>
          <div className="mt-2">
            <Progress value={82} tone="lime" height={8} />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {[
            { I: IconFlame, v: "12", l: "streak", c: "text-amber" },
            { I: IconTrophy, v: "9", l: "badges", c: "text-lime" },
            { I: IconBook, v: "38", l: "lessons", c: "text-wait" },
          ].map((x) => (
            <div
              key={x.l}
              className="el-2 rounded-2xl border border-line/70 bg-card p-3 text-center"
            >
              <x.I className={`mx-auto ${x.c}`} size={18} />
              <p className="font-display mt-1 text-[17px] font-bold text-ink">{x.v}</p>
              <p className="text-[9.5px] uppercase tracking-wider text-dim">{x.l}</p>
            </div>
          ))}
        </div>

        <p className="font-display mt-4 text-[12.5px] font-bold text-ink">Achievements</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {[IconShield, IconCube, IconWave, IconGift, IconBolt, IconLock, IconChart, IconTrophy].map(
            (I, i) => (
              <div
                key={i}
                className={`el-2 flex aspect-square items-center justify-center rounded-2xl border ${
                  i < 5 ? "border-teal/35 bg-teal/10 text-teal" : "border-line/60 bg-bg2 text-line"
                }`}
              >
                <I size={18} />
              </div>
            ),
          )}
        </div>

        <div className="el-2 mt-3 flex items-center gap-3 rounded-2xl border border-pink/30 bg-gradient-to-r from-pink/12 to-amber/10 p-3">
          <IconGift className="text-pink" size={20} />
          <p className="flex-1 text-[11px] text-dim">
            Unlock <span className="font-semibold text-pink">Advanced DeFi</span> at 14 days
          </p>
        </div>
      </Scroll>
    </div>
  );
}

/* ============ interactive app ============ */
export function PhoneApp({
  tab,
  onTab,
}: {
  tab: number;
  onTab: (i: number) => void;
}) {
  return (
    <div className="relative h-full">
      <div key={tab} className="reveal in h-full">
        {tab === 0 && <HomeScreen onTab={onTab} />}
        {tab === 1 && <LessonScreen />}
        {tab === 2 && <QuizScreen />}
        {tab === 3 && <MarketScreen />}
        {tab === 4 && <WalletScreen />}
        {tab === 5 && <ProfileScreen />}
      </div>
      <TabBar active={tab} onTab={onTab} />
    </div>
  );
}

export const SCREEN_TABS = TABS;
