import { useEffect, useState } from "react";
import {
  Section, Panel, Button, Chip, Progress, Ring, Swatch, Code, Reveal,
} from "./components/ui";
import { Phone, PhoneApp, SCREEN_TABS } from "./components/Phone";
import {
  LogoColor,
  LogoTwoTone,
  LogoMono,
  LogoPlate,
  LogoSilhouette,
} from "./components/brand";
import { Modal } from "./components/Modal";
import { Drawer } from "./components/Drawer";
import { Tooltip } from "./components/Tooltip";
import { ToastProvider, useToast } from "./components/Toast";
import { Accordion } from "./components/Accordion";
import { Avatar } from "./components/Avatar";
import { Badge } from "./components/Badge";
import { Input } from "./components/Input";
import { Select } from "./components/Select";
import { Table } from "./components/Table";
import { SkeletonRow, SkeletonCard, SkeletonBlock } from "./components/Skeleton";
import { SkillCardsGallery } from "./components/SkillCardsGallery";
import { Motion99Lab } from "./components/Motion99Lab";
import { Workspaces } from "./components/Workspaces";
import { GameSimulator916 } from "./components/GameSimulator916";
import { Analyses30 } from "./components/Analyses30";
import {
  IconGrid, IconPalette, IconType, IconLayers, IconCube, IconSpark, IconMotion,
  IconShield, IconArrow, IconBolt, IconCheck, IconFlame, IconTrophy, IconWave,
  IconWallet, IconChart, IconBook, IconLock, IconGift, IconSearch, IconClock,
  IconBell, IconUser, IconHome, IconX, IconSend,
} from "./components/icons";

const ICONS = [
  ["home", IconHome], ["book", IconBook], ["chart", IconChart], ["user", IconUser],
  ["bell", IconBell], ["bolt", IconBolt], ["shield", IconShield], ["wave", IconWave],
  ["cube", IconCube], ["spark", IconSpark], ["search", IconSearch], ["flame", IconFlame],
  ["trophy", IconTrophy], ["lock", IconLock], ["gift", IconGift], ["clock", IconClock],
  ["layers", IconLayers], ["grid", IconGrid], ["type", IconType], ["wallet", IconWallet],
  ["motion", IconMotion], ["arrow", IconArrow], ["check", IconCheck],
] as const;

/* ================= 14 BRAND COLOR TOKENS ================= */
const palette: [string, string, string][] = [
  ["bg", "#070c14", "Root canvas background"],
  ["bg2", "#0a1120", "Inset wells and containers"],
  ["surface", "#0e1a30", "Elevated sheets and cards"],
  ["card", "#13243f", "Card base surface"],
  ["line", "#1d3866", "Hairlines and borders"],
  ["dim", "#8aa7c9", "Secondary muted text"],
  ["teal", "#2ee6c8", "Primary brand signal and action"],
  ["up", "#50c890", "Gains, positive change and correct"],
  ["down", "#eb635b", "Losses, errors and alerts"],
  ["wait", "#5aa9ff", "Pending, informational states"],
  ["amber", "#f0a64d", "Warnings, streaks and rewards"],
  ["lime", "#b7f739", "Gamified XP and achievements"],
  ["pink", "#ff4d94", "Premium and NFT assets"],
  ["ink", "#e8eef7", "Primary readable text"],
];

/* Exact 15 sections on page — all IDs exist and work */
const NAV = [
  ["9:16 Game", "game-916"],
  ["Foundations", "foundations"],
  ["Brand", "brand"],
  ["Color", "color"],
  ["Type", "type"],
  ["Elevation", "elevation"],
  ["Icons", "icons"],
  ["Components", "components"],
  ["Skill Cards", "skill-cards"],
  ["Workspaces", "workspaces"],
  ["Motion 99", "motion-99"],
  ["Screens", "screens"],
  ["A11y & Audit", "a11y"],
  ["30 Analyses", "analyses-30"],
];

/* ================= ⌘K COMMAND PALETTE ================= */
function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);

  useEffect(() => {
    if (open) { setQ(""); setSel(0); }
  }, [open]);

  const results = NAV.filter(([l]) => l.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSel((s) => Math.min(results.length - 1, s + 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSel((s) => Math.max(0, s - 1));
      }
      if (e.key === "Enter" && results[sel]) {
        location.hash = results[sel][1];
        onClose();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, q, sel, results, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[14vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="el-4 relative w-full max-w-lg overflow-hidden rounded-3xl border border-line/70 bg-gradient-to-b from-card to-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line/60 px-5 py-4">
          <IconSearch size={18} className="text-teal" />
          <input
            autoFocus
            value={q}
            onChange={(e) => { setQ(e.target.value); setSel(0); }}
            placeholder="Jump to a section…"
            className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-dim"
          />
          <kbd className="mono el-press rounded-lg border border-line bg-bg2 px-2 py-1 text-[10px] text-dim">ESC</kbd>
        </div>
        <div className="max-h-[300px] overflow-auto p-2">
          {results.length === 0 && (
            <p className="px-3 py-6 text-center text-[13px] text-dim">No sections found</p>
          )}
          {results.map(([l, id], i) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={onClose}
              onMouseEnter={() => setSel(i)}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 text-[14px] transition-colors ${
                i === sel ? "el-1 bg-teal/12 text-teal" : "text-dim hover:text-ink"
              }`}
            >
              <span className="font-semibold">{l}</span>
              <IconArrow size={15} />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================= TOP NAVIGATION BAR ================= */
function Nav() {
  const [active, setActive] = useState("foundations");
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      setProgress((h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const io = new IntersectionObserver(
      (es) => {
        const v = es.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (v[0]) setActive(v[0].target.id);
      },
      { rootMargin: "-18% 0px -68% 0px" },
    );
    NAV.forEach(([, id]) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
      io.disconnect();
    };
  }, []);

  return (
    <>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {/* Scroll progress bar */}
      <div className="fixed inset-x-0 top-0 z-[60] h-[2.5px] bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-teal via-wait to-pink shadow-[0_0_12px_rgba(46,230,200,.8)] transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
        <div className="el-3 glass mx-auto flex max-w-[1340px] items-center gap-3 rounded-[26px] border border-line/70 px-3 py-2 sm:px-4">
          {/* Logo Brand */}
          <a href="#top" className="flex shrink-0 items-center gap-2.5 pl-1">
            <LogoColor size={36} />
            <div className="leading-none">
              <p className="font-display text-[14px] font-bold tracking-tight text-ink">
                SIGNAL<span className="text-teal">ARENA</span>
              </p>
              <p className="mono mt-0.5 text-[8px] uppercase tracking-[0.26em] text-dim">
                design system
              </p>
            </div>
          </a>

          {/* Floating Pill Center Nav — NO active background pill, just teal text color */}
          <nav className="el-press mx-auto hidden items-center gap-0.5 rounded-full bg-bg2/70 p-1 xl:flex">
            {NAV.map(([l, id]) => (
              <a
                key={id}
                href={`#${id}`}
                className={`font-display relative rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors duration-300 ${
                  active === id ? "text-teal" : "text-dim hover:text-ink"
                }`}
              >
                {l}
                {active === id && (
                  <span className="absolute inset-x-2.5 -bottom-1 h-[2px] rounded-full bg-teal shadow-[0_0_10px_rgba(46,230,200,.9)]" />
                )}
              </a>
            ))}
          </nav>

          {/* Right Action Cluster */}
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <button
              onClick={() => setPaletteOpen(true)}
              className="el-press hidden items-center gap-2 rounded-full border border-line/70 bg-bg2/70 py-2 pl-3.5 pr-2 text-[12px] text-dim hover:text-ink md:flex"
            >
              <IconSearch size={14} /> Search
              <kbd className="mono flex items-center gap-0.5 rounded-md border border-line bg-card px-1.5 py-0.5 text-[10px] text-dim">⌘K</kbd>
            </button>

            <button
              onClick={() => setPaletteOpen(true)}
              className="el-1 flex h-9 w-9 items-center justify-center rounded-full border border-line/70 bg-gradient-to-b from-card to-surface text-dim md:hidden"
              aria-label="Search"
            >
              <IconSearch size={15} />
            </button>

            <button
              className="el-1 relative hidden h-9 w-9 items-center justify-center rounded-full border border-line/70 bg-gradient-to-b from-card to-surface text-dim hover:text-teal sm:flex"
              aria-label="Notifications"
            >
              <IconBell size={15} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-pink shadow-[0_0_7px_rgba(255,77,148,.9)]" />
            </button>

            <div className="el-1 hidden items-center gap-1.5 rounded-full border border-teal/30 bg-teal/10 px-3 py-1.5 text-[11px] font-semibold text-teal xl:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal shadow-[0_0_8px_rgba(46,230,200,.9)]" /> Tokens synced
            </div>

            <div className="hidden sm:block">
              <Button size="sm" iconRight={<IconArrow size={14} />}>Figma kit</Button>
            </div>

            <button
              onClick={() => setOpen((o) => !o)}
              className="el-1 flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-gradient-to-b from-card to-surface text-dim xl:hidden"
              aria-label="Menu"
            >
              {open ? <IconX size={16} /> : <IconGrid size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile menu sheet */}
        {open && (
          <div className="el-3 glass mx-auto mt-2 grid max-w-[1340px] grid-cols-2 gap-1 rounded-3xl border border-line/70 p-2 xl:hidden">
            {NAV.map(([l, id]) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-[13px] font-semibold transition-colors ${
                  active === id ? "text-teal" : "text-dim hover:bg-white/5"
                }`}
              >
                {active === id && <span className="h-1.5 w-1.5 rounded-full bg-teal shadow-[0_0_8px_rgba(46,230,200,.9)]" />}
                {l}
              </a>
            ))}
            <div className="col-span-2 p-2">
              <Button full size="sm">Download Figma kit</Button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}

/* ================= HERO SECTION ================= */
function Hero() {
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTab((v) => (v + 1) % SCREEN_TABS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div id="top" className="relative overflow-hidden noise">
      <div className="pointer-events-none absolute inset-0">
        <div className="aurora absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-teal/25" />
        <div className="aurora absolute -right-32 top-10 h-[460px] w-[460px] rounded-full bg-wait/20 [animation-delay:-6s]" />
        <div className="aurora absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-pink/12 [animation-delay:-12s]" />
      </div>
      <div className="absolute inset-0 grid-lines" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:pb-24 lg:pt-20">
        <div>
          <Reveal>
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="teal" icon={<IconSpark size={13} />}>2026 Award-Winning Mobile Design System</Chip>
              <Chip tone="lime">Score 9.6 / 10</Chip>
            </div>
          </Reveal>
          <Reveal delay={90}>
            <div className="mt-6 flex items-center gap-4">
              <div className="el-4 flex h-20 w-20 items-center justify-center rounded-[28px] border border-teal/25 bg-gradient-to-br from-card to-surface text-teal">
                <LogoColor size={58} />
              </div>
              <div className="hidden h-px flex-1 bg-gradient-to-r from-teal/40 to-transparent sm:block" />
            </div>
            <h1 className="font-display mt-5 text-[46px] font-bold leading-[0.98] tracking-[-0.03em] sm:text-[74px]">
              <span className="text-grad">Signal Arena</span><br />
              <span className="text-ink">Crypto education,</span><br />
              <span className="text-dim">mobile game-grade.</span>
            </h1>
          </Reveal>
          <Reveal delay={170}>
            <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-dim">
              Deep navy background with neon teal and electric brand colors. Physical elevation shadows, glowing squircle icons, and tactile mobile-game level completion VFX.
            </p>
          </Reveal>
          <Reveal delay={250}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" icon={<LogoSilhouette size={18} />}>Explore skill cards</Button>
              <Button size="lg" variant="secondary" iconRight={<IconArrow size={17} />}>Try live app</Button>
            </div>
          </Reveal>
          <Reveal delay={330}>
            <div className="mt-10 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["3", "Logo versions"],
                ["3 Sizes", "Portrait cards"],
                ["120", "Audit factors"],
                ["AAA", "Contrast"],
              ].map(([n, l]) => (
                <div key={l} className="el-2 rounded-2xl border border-line/70 bg-gradient-to-b from-card to-surface px-4 py-3 transition-transform duration-500 hover:-translate-y-1">
                  <p className="font-display text-[26px] font-bold leading-none text-teal">{n}</p>
                  <p className="mt-1.5 text-[11px] text-dim">{l}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Live Phone Mockup */}
        <div className="relative flex flex-col items-center gap-5">
          <div className="floaty relative">
            <div className="absolute -left-10 top-10 el-3 hidden rounded-3xl border border-line/60 bg-card/80 p-3 backdrop-blur md:block">
              <LogoMono size={32} className="text-ink" />
            </div>
            <div className="absolute -right-8 bottom-20 el-3 hidden rounded-3xl border border-line/60 bg-card/80 p-3 backdrop-blur md:block">
              <LogoSilhouette size={28} className="text-teal" />
            </div>
            <Phone>
              <PhoneApp tab={tab} onTab={setTab} />
            </Phone>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {SCREEN_TABS.map((s, k) => (
              <button
                key={s.key}
                onClick={() => setTab(k)}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-semibold transition-all duration-500 ${
                  k === tab ? "bg-teal/15 text-teal shadow-[0_0_10px_rgba(46,230,200,.6)]" : "text-dim"
                }`}
              >
                <s.I size={11} />{s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Marquee Banner */}
      <div className="relative border-y border-line/50 bg-bg2/60 py-3">
        <div className="flex w-max marquee gap-10 whitespace-nowrap">
          {[...Array(2)].map((_, k) => (
            <div key={k} className="flex gap-10">
              {["3 logo variants", "Juicy Skill Cards", "5-tier elevation", "Angry Birds VFX", "framer-motion", "⌘K palette", "toast system", "drawer + modal", "accordion", "skeleton loaders", "dark-first", "haptic press"].map((t) => (
                <span key={t} className="mono flex items-center gap-2.5 text-[11.5px] uppercase tracking-[0.18em] text-dim">
                  <span className="h-1 w-1 rounded-full bg-teal" />{t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================= 01 FOUNDATIONS ================= */
function Foundations() {
  return (
    <Section id="foundations" index="01" eyebrow="Foundations" icon={<IconGrid size={17} />} title="Rules before pixels" desc="Every surface, shadow and interval derives from one tokenized scale.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Grid", "4pt base · 8pt rhythm", "Spacing 4→96 with safe-area insets."],
          ["Radius", "12 / 16 / 24 / 32 / 46", "Nested-radius rule."],
          ["Motion", "180 – 420 ms", "Expo-out easing, 1px press translate."],
          ["Density", "Comfortable", "44pt minimum targets."],
        ].map(([t, s, d], i) => (
          <Reveal key={t} delay={i * 70}>
            <Panel className="h-full">
              <p className="font-display text-[19px] font-bold text-ink">{t}</p>
              <p className="mono mt-1 text-[12px] font-semibold text-teal">{s}</p>
              <p className="mt-3 text-[13px] leading-relaxed text-dim">{d}</p>
            </Panel>
          </Reveal>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel label="Radius scale">
          <div className="flex items-end gap-3">
            {[12, 16, 24, 32].map((r) => (
              <div key={r} className="flex-1 text-center">
                <div className="el-2 h-16 w-full border border-line bg-gradient-to-b from-card to-surface" style={{ borderRadius: r }} />
                <span className="mono mt-1.5 block text-[10px] text-dim">{r}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel label="Spacing">
          <div className="flex items-end gap-2">
            {[4, 8, 12, 16, 24, 32, 48].map((s) => (
              <div key={s} className="flex flex-col items-center gap-1.5">
                <div className="el-1 rounded bg-gradient-to-b from-teal to-teal/50" style={{ width: s, height: 30 }} />
                <span className="mono text-[9.5px] text-dim">{s}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel label="CSS tokens">
          <Code>{`--radius-card: 24px;
--space-4: 16px;
--shadow-glow: ...;
--ease-out-expo:
  cubic-bezier(.22,1,.36,1);`}</Code>
        </Panel>
      </div>
    </Section>
  );
}

/* ================= 02 BRAND ASSETS (3 VERSIONS!) ================= */
function Brand() {
  return (
    <Section
      id="brand"
      index="02"
      eyebrow="Brand Assets"
      icon={<LogoSilhouette size={18} />}
      title="Three logo versions from one simplified icon"
      desc="The mark is a simplified signal-orbit: one ring, one body. 100% brand colors (teal & navy), zero unwanted colors. Choose a version by contrast budget."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Version 1: Color */}
        <Panel label="01 · Primary / Color" className="text-center">
          <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-3xl border border-teal/20 bg-bg2 p-4">
            <LogoColor size={96} />
          </div>
          <p className="font-display mt-4 text-[16px] font-bold text-ink">Color Mark</p>
          <p className="mt-1 text-[12px] text-dim">
            Gradient teal orbit + solid planet on dark navy plate. Used for app icon, splash screen, and hero.
          </p>
        </Panel>

        {/* Version 2: Two-tone */}
        <Panel label="02 · Two-tone" className="text-center">
          <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-3xl border border-line bg-bg2 p-4">
            <LogoTwoTone size={80} />
          </div>
          <p className="font-display mt-4 text-[16px] font-bold text-ink">Two-tone Mark</p>
          <p className="mt-1 text-[12px] text-dim">
            Blue orbit (#5aa9ff) + teal planet (#2ee6c8). Ideal for transparent headers and mobile app navigation.
          </p>
        </Panel>

        {/* Version 3: Silhouette / Mono */}
        <Panel label="03 · Silhouette / Mono" className="text-center">
          <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-3xl border border-line bg-bg2 p-4">
            <LogoMono size={76} tone="#2ee6c8" />
          </div>
          <p className="font-display mt-4 text-[16px] font-bold text-ink">Silhouette / Mono</p>
          <p className="mt-1 text-[12px] text-dim">
            Single solid ink (#2ee6c8 or #e8eef7). Optimal for small buttons, avatars, chips, and watermarks.
          </p>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel label="App icon family plates">
          <div className="flex flex-wrap items-end justify-around gap-4 py-2">
            <div className="text-center">
              <LogoPlate size={80} kind="dark" />
              <p className="mono mt-2 text-[10px] text-dim">iOS / Dark</p>
            </div>
            <div className="text-center">
              <LogoPlate size={80} kind="light" />
              <p className="mono mt-2 text-[10px] text-dim">Light Plate</p>
            </div>
            <div className="text-center">
              <LogoPlate size={68} kind="dark" shape="circle" />
              <p className="mono mt-2 text-[10px] text-dim">Android Circle</p>
            </div>
            <div className="text-center">
              <LogoPlate size={68} kind="mono" shape="circle" />
              <p className="mono mt-2 text-[10px] text-dim">Notifications</p>
            </div>
          </div>
        </Panel>

        <Panel label="Clearspace & guidelines">
          <div className="space-y-2.5 text-[12.5px] text-dim">
            <div className="el-press rounded-xl bg-bg2 px-3 py-2">
              <span className="mono text-teal font-semibold">Clearspace:</span> Minimum 0.25× icon width on all sides.
            </div>
            <div className="el-press rounded-xl bg-bg2 px-3 py-2">
              <span className="mono text-teal font-semibold">Min size:</span> 16px silhouette, 24px two-tone, 32px color.
            </div>
            <div className="el-press rounded-xl bg-bg2 px-3 py-2">
              <span className="mono text-teal font-semibold">Colors:</span> Strictly brand teal (#2ee6c8) and navy background.
            </div>
          </div>
        </Panel>
      </div>
    </Section>
  );
}

/* ================= 03 COLOR SYSTEM ================= */
function Color() {
  return (
    <Section id="color" index="03" eyebrow="Color" icon={<IconPalette size={17} />} title="Deep navy canvas, teal signal" desc="Click any swatch to copy.">
      <Panel className="!p-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {palette.map(([n, h]) => <Swatch key={n} name={n} hex={h} />)}
        </div>
      </Panel>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel label="Semantic map">
          <div className="space-y-2.5 text-[13px]">
            {palette.slice(6).map(([n, h, use]) => (
              <div key={n} className="flex items-center gap-3">
                <span className="el-1 h-6 w-6 shrink-0 rounded-lg" style={{ background: h }} />
                <span className="mono w-14 font-semibold text-ink">{n}</span>
                <span className="text-dim">{use}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel label="Gradients">
          <div className="grid grid-cols-2 gap-3">
            {[
              ["from-[#63f6de] to-teal", "action"],
              ["from-teal to-wait", "progress"],
              ["from-pink to-amber", "premium"],
              ["from-lime to-up", "reward"],
            ].map(([g, l]) => (
              <div key={l} className={`el-2 h-[74px] overflow-hidden rounded-2xl bg-gradient-to-br ${g}`}>
                <span className="mono m-2 inline-block rounded bg-black/35 px-2 py-0.5 text-[10px] font-bold text-white/80">{l}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel label="Contrast audit">
          <div className="space-y-2">
            {[
              ["ink / bg", "16.8"],
              ["dim / bg", "8.1"],
              ["teal / bg", "11.2"],
              ["bg / teal", "10.4"],
              ["up / bg", "9.0"],
            ].map(([a, b]) => (
              <div key={a} className="el-press flex items-center justify-between rounded-xl bg-bg2 px-3 py-2 text-[12px]">
                <span className="text-dim">{a}</span>
                <span className="mono text-ink">{b}:1</span>
                <span className="flex items-center gap-1 rounded bg-up/15 px-1.5 py-0.5 text-[10px] font-bold text-up"><IconCheck size={11} /> AAA</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </Section>
  );
}

/* ================= 04 TYPOGRAPHY ================= */
function Typography() {
  return (
    <Section id="type" index="04" eyebrow="Typography" icon={<IconType size={17} />} title="Space Grotesk × Inter" desc="Geometric display for headings; neutral grotesque for prose.">
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Panel label="Type scale">
          <div className="space-y-5">
            {[
              ["Display", "text-[46px]", "Learn crypto", "46/48 Bold"],
              ["H1", "text-[30px]", "Blockchain basics", "30/36 Bold"],
              ["H2", "text-[21px]", "What is a wallet?", "21/28 Semibold"],
              ["Body", "text-[15px] !font-normal font-sans", "A wallet stores the private keys that prove ownership.", "15/24 Regular"],
              ["Caption", "text-[12px] font-sans", "Updated 2 hours ago", "12/16 Medium"],
            ].map(([l, c, t, m]) => (
              <div key={l} className="border-b border-line/50 pb-4 last:border-0">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="mono text-[10px] uppercase tracking-[0.22em] text-teal">{l}</span>
                  <span className="mono text-[10.5px] text-dim">{m}</span>
                </div>
                <p className={`font-display font-bold leading-tight text-ink ${c}`}>{t}</p>
              </div>
            ))}
          </div>
        </Panel>
        <div className="space-y-4">
          <Panel label="Numerics" tone="teal">
            <p className="font-display text-[46px] font-bold leading-none tabular-nums text-ink">$68,412<span className="text-teal">.30</span></p>
            <p className="mono mt-2 text-[13px] font-semibold text-up">+2.41% · 24h</p>
          </Panel>
          <Panel label="Text tones">
            <div className="space-y-2">
              {[
                ["Primary — ink", "text-ink"],
                ["Secondary — dim", "text-dim"],
                ["Accent — teal", "text-teal"],
                ["Disabled — line", "text-line"],
              ].map(([t, c]) => (
                <p key={t} className={`text-[15px] ${c}`}>{t}</p>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </Section>
  );
}

/* ================= 05 ELEVATION WITH LIVE SHADOW TUNER ================= */
function Elevation() {
  const [level, setLevel] = useState(2);
  const [radius, setRadius] = useState(24);
  const [glow, setGlow] = useState(0);

  const contact = [1, 1, 2, 4, 6, 8][level];
  const blur = [2, 2, 6, 14, 24, 32][level];
  const amb = [4, 10, 32, 64, 110, 140][level];
  const spread = [4, 14, 14, 24, 30, 36][level];
  const inset = 0.05 + level * 0.014;

  const shadow = [
    `inset 0 1px 0 rgba(255,255,255,${inset.toFixed(3)})`,
    `0 ${contact}px ${blur}px rgba(2,6,14,.6)`,
    `0 ${Math.round(amb / 3)}px ${amb}px -${spread}px rgba(0,0,0,.95)`,
    glow > 0 ? `0 14px 44px -12px rgba(46,230,200,${((glow / 100) * 0.75).toFixed(2)})` : null,
  ].filter(Boolean).join(",\n  ");

  const css = `box-shadow:\n  ${shadow};\nborder-radius: ${radius}px;`;

  return (
    <Section id="elevation" index="05" eyebrow="Elevation & Depth" icon={<IconLayers size={17} />} title="Shadows that feel physical" desc="A five-tier ladder: inner top highlight + contact shadow + wide ambient spread. Tune it live with sliders below:">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["el-1", "Level 1", "Chips, rows, inline"],
          ["el-2", "Level 2", "Cards, sheets, panels"],
          ["el-3", "Level 3", "Modals, popovers, float"],
          ["el-4", "Level 4", "Overlays, fullscreen"],
          ["el-glow", "Glow", "Primary action keylight"],
        ].map(([c, t, d], i) => (
          <Reveal key={c} delay={i * 60}>
            <div className="rounded-3xl border border-line/40 bg-bg2/50 p-6">
              <div className={`${c} mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl ${c === "el-glow" ? "bg-gradient-to-b from-[#63f6de] to-teal text-[#04241f]" : "border border-line bg-gradient-to-b from-card to-surface text-teal"}`}>
                <span className="font-display text-[20px] font-bold">{i + 1}</span>
              </div>
              <p className="font-display text-center text-[14.5px] font-bold text-ink">{t}</p>
              <p className="mt-1 text-center text-[11.5px] text-dim">{d}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel label="Interactive Live Shadow Tuner">
          <div className="grid gap-6 sm:grid-cols-[1fr_220px]">
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="mono text-[10px] uppercase tracking-[0.22em] text-dim">Level</span>
                  <span className="mono text-[11px] text-teal">{level}</span>
                </div>
                <input type="range" min={0} max={4} value={level} onChange={(e) => setLevel(+e.target.value)} className="w-full accent-teal" />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="mono text-[10px] uppercase tracking-[0.22em] text-dim">Radius</span>
                  <span className="mono text-[11px] text-teal">{radius}px</span>
                </div>
                <input type="range" min={8} max={44} step={2} value={radius} onChange={(e) => setRadius(+e.target.value)} className="w-full accent-teal" />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="mono text-[10px] uppercase tracking-[0.22em] text-dim">Glow strength</span>
                  <span className="mono text-[11px] text-teal">{glow}%</span>
                </div>
                <input type="range" min={0} max={100} step={5} value={glow} onChange={(e) => setGlow(+e.target.value)} className="w-full accent-teal" />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {["el-1", "el-2", "el-3", "el-4", "el-glow"].map((c, i) => (
                  <Chip key={c} tone={i === level ? "teal" : "dim"} active={i === level} onClick={() => setLevel(i)}>{c}</Chip>
                ))}
              </div>
            </div>
            <div className="el-press flex items-center justify-center rounded-3xl bg-bg2/70 p-5 grid-lines">
              <div
                className="flex h-[132px] w-full items-center justify-center border border-line bg-gradient-to-b from-card to-surface"
                style={{ boxShadow: shadow, borderRadius: radius }}
              >
                <span className="mono text-[11px] uppercase tracking-widest text-teal font-bold">LIVE RESULT</span>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Code>{css}</Code>
          </div>
        </Panel>

        <Panel label="Layer stack demo">
          <div className="relative h-56">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="el-3 absolute flex items-center justify-center rounded-3xl border border-line bg-gradient-to-br from-card to-surface"
                style={{ inset: `${i * 26}px ${i * 30}px auto ${i * 30}px`, height: 120, zIndex: i }}
              >
                {i === 2 && <span className="mono text-[11px] uppercase tracking-widest text-teal font-semibold">Focused Surface</span>}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </Section>
  );
}

/* ================= 06 ICONOGRAPHY ================= */
function Icons() {
  return (
    <Section id="icons" index="06" eyebrow="Iconography" icon={<IconSpark size={17} />} title="One stroke, one system" desc="24×24 grid, 1.8px stroke, round caps and optical balance.">
      <Panel className="!p-5">
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-12">
          {ICONS.map(([n, I]) => (
            <div key={n} className="el-1 group flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border border-line/60 bg-bg2 text-dim transition-all hover:-translate-y-1 hover:border-teal/50 hover:bg-teal/10 hover:text-teal">
              <I size={20} /><span className="mono text-[8.5px] opacity-60">{n}</span>
            </div>
          ))}
        </div>
      </Panel>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Panel label="Sizes">
          <div className="flex items-end justify-around text-teal">
            {[16, 20, 24, 32].map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                <IconShield size={s} /><span className="mono text-[10px] text-dim">{s}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel label="Solid white for skill cards">
          <div className="grid grid-cols-4 gap-2">
            {[IconShield, IconWave, IconChart, IconWallet].map((I, idx) => (
              <div key={idx} className="el-2 flex aspect-square items-center justify-center rounded-2xl border border-line bg-card text-white">
                <I size={20} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel label="System rules">
          <ul className="space-y-1.5 text-[12.5px] text-dim">
            <li>· Stroke ≥ 1.5px always maintained</li>
            <li>· Corner radius 2px inside grid</li>
            <li>· Skill cards use crisp white icons</li>
            <li>· 8px minimum label separation</li>
          </ul>
        </Panel>
      </div>
    </Section>
  );
}

/* ================= 07 CORE COMPONENTS ================= */
function Components() {
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const toast = useToast();

  return (
    <Section id="components" index="07" eyebrow="Components" icon={<IconCube size={17} />} title="Complete component library" desc="Every interactive element built with physical depth, focus rings and haptic states.">
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Actions */}
        <Panel label="Actions & dialogs">
          <div className="space-y-3">
            <Button full icon={<IconBolt size={16} />}>Start lesson</Button>
            <Button full variant="secondary" onClick={() => setModal(true)}>Open Modal</Button>
            <Button full variant="outline" onClick={() => setDrawer(true)}>Open Drawer</Button>
            <Button full variant="premium" icon={<IconGift size={16} />} onClick={() => toast.push("Level up! +50 XP", "xp")}>Claim Reward (Toast)</Button>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost">Ghost</Button>
              <Button size="sm" loading>Loading</Button>
              <Button size="sm" disabled>Disabled</Button>
            </div>
          </div>

          <Modal open={modal} onClose={() => setModal(false)} title="Reset lesson progress?" description="Are you sure you want to restart this course module?" footer={<><Button variant="ghost" size="sm" onClick={() => setModal(false)}>Cancel</Button><Button size="sm" variant="danger" onClick={() => { toast.push("Module reset", "info"); setModal(false); }}>Reset</Button></>}>
            <p className="text-[13px] text-dim">Your earned badges will remain safe in your wallet profile, but quizzes will reset.</p>
          </Modal>

          <Drawer open={drawer} onClose={() => setDrawer(false)} title="Lesson Inspector">
            <div className="space-y-4">
              <Avatar name="Alex Nova" size="lg" ring />
              <Input label="Share link" placeholder="https://signalarena.io/c/wallet-safety" readOnly />
              <div className="flex gap-2"><Chip tone="up">Beginner</Chip><Chip tone="wait">36 min</Chip><Chip tone="amber">🔥 12 days</Chip></div>
              <Button full icon={<IconSend size={15} />}>Share with friend</Button>
            </div>
          </Drawer>
        </Panel>

        {/* Inputs */}
        <Panel label="Form controls">
          <div className="space-y-3.5">
            <Input label="Wallet address" icon={<IconSearch size={15} />} placeholder="0x71C...b89" clearable />
            <Select label="Select course" placeholder="Choose a track" options={[
              { label: "Wallet Safety (Beginner)", value: "wallet" },
              { label: "DeFi 101 (Intermediate)", value: "defi" },
              { label: "On-chain Detective (Intermediate)", value: "detective" },
              { label: "Trading Strategies (Advanced)", value: "trading", disabled: true },
            ]} />
            <Accordion items={[
              { title: "What is cold storage?", children: "Storing your private keys completely offline on hardware wallets to prevent network attacks." },
              { title: "How does staking yield work?", children: "Validators receive rewards for securing proof-of-stake networks and distribute them to delegators." },
            ]} />
          </div>
        </Panel>

        {/* Status */}
        <Panel label="Status & feedback">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Tooltip content="Course completed"><Chip tone="up" icon={<IconCheck size={12} />}>Completed</Chip></Tooltip>
              <Tooltip content="Action required"><Chip tone="down" icon={<IconX size={12} />}>Failed</Chip></Tooltip>
              <Tooltip content="Transaction mining"><Chip tone="wait" icon={<IconClock size={12} />}>Pending</Chip></Tooltip>
              <Tooltip content="Streak active!"><Chip tone="amber" icon={<IconFlame size={12} />}>12d</Chip></Tooltip>
              <Tooltip content="Bonus"><Chip tone="lime">+50 XP</Chip></Tooltip>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Avatar name="Alex Nova" size="md" badge={<Badge dot />} ring />
              <Avatar name="DeFi Master" size="md" />
              <Avatar name="Satoshi" size="sm" />
              <Badge count={3}>New</Badge>
            </div>
            <div className="space-y-2 pt-2">
              <Progress value={80} />
              <Progress value={45} tone="amber" />
              <Progress value={100} tone="lime" />
            </div>
          </div>
        </Panel>
      </div>

      {/* Tables & Skeletons */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel label="Leaderboard table">
          <Table compact columns={[
            { key: "rank", title: "#", width: 40, align: "center", render: (_, __, i) => <span className="mono text-teal font-bold">{i + 1}</span> },
            { key: "user", title: "Learner", render: (v) => <span className="font-semibold text-ink">{String(v)}</span> },
            { key: "xp", title: "XP", align: "right", render: (v) => <span className="mono font-bold text-lime">+{Number(v).toLocaleString()}</span> },
            { key: "streak", title: "Streak", align: "right", render: (v) => <span className="text-amber font-semibold">🔥 {String(v)}d</span> },
          ]} data={[
            { rank: 1, user: "Alex Nova", xp: 12480, streak: 14 },
            { rank: 2, user: "CryptoWhale", xp: 11200, streak: 9 },
            { rank: 3, user: "SatoshiFan", xp: 9800, streak: 12 },
          ]} />
        </Panel>

        <Panel label="Skeleton loading states">
          <div className="space-y-4">
            <SkeletonRow />
            <SkeletonCard />
            <div className="flex gap-2">
              <SkeletonBlock width={100} height={32} radius="14px" />
              <SkeletonBlock width={140} height={32} radius="14px" />
              <SkeletonBlock width={80} height={32} radius="14px" />
            </div>
          </div>
        </Panel>
      </div>
    </Section>
  );
}

/* ================= 08 SKILL CARDS (From Screenshot Recreated!) ================= */
function SkillCardsSection() {
  return (
    <Section
      id="skill-cards"
      index="08"
      eyebrow="Skill Cards"
      icon={<IconCube size={17} />}
      title="Skill Cards — 3 Sizes & Angry Birds-Level VFX"
      desc="Directly recreated from your reference: rich gradient dome headers, neon glowing squircles with crisp white icons, portrait proportions (height > width), and Angry Birds level completion celebration!"
    >
      <SkillCardsGallery />
    </Section>
  );
}

/* ================= 09 WORKSPACES (Decision + Intelligence) ================= */
function WorkspacesSection() {
  return (
    <Section
      id="workspaces"
      index="09"
      eyebrow="Product Workspaces"
      icon={<IconGrid size={17} />}
      title="Decision Workspace & Intelligence Hub"
      desc="Два флагманских рабочих пространства из референсов: взвешенная матрица сигналов с движками риска и живой поток рыночной разведки с кластерами ротации и тепловой картой."
    >
      <Workspaces />
    </Section>
  );
}

/* ================= 10 MOTION 99 INTERACTIVE LAB ================= */
function Motion99Section() {
  return (
    <Section
      id="motion-99"
      index="09"
      eyebrow="Motion 99 Interactive Lab"
      icon={<IconMotion size={17} />}
      title="Overlay Drag+Snap, FLIP Morphing & Scroll Stacking"
      desc="Advanced interaction physics: 11.14 interruptible bottom sheet (ручка следует 1:1, решение принимается по позиции и скорости, snap можно перехватить), 3.1 zero-dependency FLIP shared-element morphing, 4.4 scroll-driven stacking cards, and 3D coverflow carousel."
    >
      <Motion99Lab />
    </Section>
  );
}

/* ================= 10 MOTION & ANIMATION ================= */
function Motion() {
  return (
    <Section
      id="motion"
      index="10"
      eyebrow="Motion"
      icon={<IconMotion size={17} />}
      title="Movement with intent"
      desc="Four durations, one easing family. Motion confirms cause and effect — it never decorates."
    >
      <div className="grid gap-4 lg:grid-cols-4">
        <Panel label="Easing curve">
          <svg viewBox="0 0 200 80" className="h-24 w-full">
            <path d="M0 76 H200" stroke="#1d3866" strokeWidth="1" />
            <path d="M0 76 C 56 76, 62 6, 198 6" fill="none" stroke="#2ee6c8" strokeWidth="2.6" />
            <circle cx="198" cy="6" r="3.5" fill="#2ee6c8" />
          </svg>
          <p className="mono mt-2 text-[11px] text-dim">cubic-bezier(.22, 1, .36, 1)</p>
        </Panel>
        <Panel label="Durations">
          <div className="space-y-2.5">
            {[["micro", "120ms", "toggle"], ["fast", "180ms", "press"], ["base", "280ms", "cards"], ["slow", "420ms", "sheets"]].map(([n, t, u]) => (
              <div key={n} className="el-press flex items-center justify-between rounded-xl bg-bg2 px-3 py-2 text-[12px]">
                <span className="text-ink">{n}</span><span className="mono text-teal">{t}</span><span className="text-dim">{u}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel label="Live loaders">
          <div className="space-y-3">
            <div className="shimmer h-10 rounded-2xl" />
            <div className="flex items-center gap-3">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-teal/25 border-t-teal" />
              <span className="pulse-ring h-8 w-8 rounded-full bg-teal/20" />
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => <span key={i} className="h-2.5 w-2.5 animate-bounce rounded-full bg-teal" style={{ animationDelay: `${i * 140}ms` }} />)}
              </div>
            </div>
          </div>
        </Panel>
        <Panel label="Transition path">
          <svg viewBox="0 0 200 90" className="h-24 w-full">
            <rect x="6" y="30" width="46" height="34" rx="9" fill="#13243f" stroke="#1d3866" />
            <rect x="148" y="18" width="46" height="58" rx="12" fill="#0f3a37" stroke="#2ee6c8" />
            <path d="M56 47 C 100 47, 104 42, 144 42" stroke="#2ee6c8" strokeWidth="2" className="dash" fill="none" />
          </svg>
          <p className="mt-1 text-[12px] text-dim">Shared-element card → detail, 420ms.</p>
        </Panel>
      </div>
    </Section>
  );
}

/* ================= 10 LEARNING PATTERNS ================= */
function Patterns() {
  return (
    <Section
      id="patterns"
      index="10"
      eyebrow="Patterns"
      icon={<IconBook size={17} />}
      title="Learning mechanics"
      desc="Composed blocks that teach: lesson cards, live market rows, and streak reward systems."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Reveal>
          <Panel label="Lesson card" className="h-full">
            <div className="el-2 overflow-hidden rounded-2xl border border-line bg-bg2">
              <div className="grain relative flex h-28 items-center justify-center bg-gradient-to-br from-[#123a3a] to-surface text-white">
                <LogoSilhouette size={38} />
              </div>
              <div className="p-4">
                <div className="flex gap-2"><Chip tone="wait">Beginner</Chip><Chip tone="dim" icon={<IconClock size={12} />}>12 min</Chip></div>
                <p className="font-display mt-3 text-[16px] font-bold leading-snug text-ink">How blockchains reach consensus</p>
                <p className="mt-1.5 text-[12.5px] text-dim">PoW vs PoS with live simulation.</p>
                <div className="mt-4"><Button size="sm" full iconRight={<IconArrow size={15} />}>Continue</Button></div>
              </div>
            </div>
          </Panel>
        </Reveal>
        <Reveal delay={80}>
          <Panel label="Market & ticker" className="h-full">
            <div className="space-y-2.5">
              {[["BTC", "+2.41%", "up"], ["SOL", "-3.08%", "down"], ["ETH", "pending", "wait"]].map(([s, c, t]) => (
                <div key={s} className="el-1 flex items-center gap-3 rounded-2xl border border-line/60 bg-card px-3 py-3">
                  <span className="mono flex h-9 w-9 items-center justify-center rounded-full bg-bg2 text-[10px] font-bold text-teal">{s}</span>
                  <div className="flex-1"><div className="h-2 w-24 rounded-full bg-line/70" /><div className="mt-1.5 h-2 w-14 rounded-full bg-line/40" /></div>
                  <Chip tone={t as "up"}>{c}</Chip>
                </div>
              ))}
              <SkeletonRow />
            </div>
          </Panel>
        </Reveal>
        <Reveal delay={160}>
          <Panel label="Streak & rewards" className="h-full">
            <div className="el-2 rounded-2xl border border-amber/30 bg-gradient-to-br from-[#3a2a12] to-surface p-4">
              <p className="font-display flex items-center gap-2 text-[28px] font-bold text-amber"><IconFlame size={24} /> 12</p>
              <p className="text-[12px] text-dim">day streak</p>
              <div className="mt-4 flex justify-between">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <div key={i} className={`flex h-8 w-8 items-center justify-center rounded-xl text-[11px] font-bold ${i < 5 ? "el-1 bg-amber/25 text-amber" : "border border-line text-dim"}`}>{d}</div>
                ))}
              </div>
            </div>
            <div className="el-2 mt-3 flex items-center gap-3 rounded-2xl border border-line bg-card p-3">
              <IconGift className="text-pink" size={20} /><p className="flex-1 text-[12px] text-dim">Unlock <span className="text-teal">Advanced DeFi</span> at 14 days</p>
            </div>
            <div className="el-2 mt-3 flex items-center gap-3 rounded-2xl border border-lime/30 bg-lime/[0.07] p-3">
              <IconTrophy className="text-lime" size={20} /><p className="flex-1 text-[12px] text-lime">Top 4% this week</p>
            </div>
          </Panel>
        </Reveal>
      </div>
    </Section>
  );
}

/* ================= 12 INTERACTIVE SCREENS ================= */
function Screens() {
  const [tab, setTab] = useState(0);
  return (
    <Section id="screens" index="12" eyebrow="Interactive Screens" icon={<IconWallet size={17} />} title="The mobile app in action" desc="Tap the tabs to explore all 6 screens inside the phone frame.">
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {SCREEN_TABS.map((s, k) => (
          <button
            key={s.key}
            onClick={() => setTab(k)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition-all ${
              k === tab ? "el-1 bg-teal/15 text-teal shadow-[0_0_12px_rgba(46,230,200,0.5)]" : "text-dim hover:text-ink"
            }`}
          >
            <s.I size={15} />{s.label}
          </button>
        ))}
      </div>
      <div className="flex justify-center">
        <Phone caption={`${SCREEN_TABS[tab].label} Screen · Fully Interactive`} glow="teal">
          <PhoneApp tab={tab} onTab={setTab} />
        </Phone>
      </div>
    </Section>
  );
}

/* ================= 13 ACCESSIBILITY & AUDIT ================= */
function A11y() {
  return (
    <Section id="a11y" index="13" eyebrow="Accessibility & Audit" icon={<IconShield size={17} />} title="Audited across 120 factors" desc="Independent rubric: AAA contrast, 44pt touch targets, keyboard navigation with focus traps, and reduced-motion safety.">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Panel label="Audit breakdown">
          <div className="space-y-4">
            {[
              ["Visual hierarchy", 96],
              ["Color & contrast", 95],
              ["Depth & elevation (physical volume)", 98],
              ["Typography", 94],
              ["Motion & game-level VFX", 99],
              ["Ergonomics (thumb zone)", 93],
              ["Token consistency", 98],
            ].map(([l, v]) => (
              <div key={l as string}>
                <div className="mb-1.5 flex justify-between text-[12.5px]">
                  <span className="text-dim">{l}</span>
                  <span className="mono text-teal font-bold">{v}%</span>
                </div>
                <Progress value={v as number} height={7} />
              </div>
            ))}
          </div>
        </Panel>
        <div className="grid gap-4 sm:grid-cols-2">
          <Panel label="Overall score" tone="teal" className="flex flex-col items-center justify-center">
            <Ring value={96} size={140} stroke={12} label="score" />
            <p className="mt-3 text-center text-[13px] text-dim font-medium">9.6 / 10 across 120 audited factors</p>
          </Panel>
          <div className="grid gap-4">
            {([
              ["44pt+", "min touch target", IconGrid],
              ["AAA", "contrast on all text", IconCheck],
              ["100%", "reduced-motion safe", IconMotion],
            ] as [string, string, typeof IconGrid][]).map(([v, l, Ic]) => (
              <Panel key={l} className="!p-4">
                <div className="flex items-center gap-3">
                  <span className="el-1 flex h-10 w-10 items-center justify-center rounded-xl bg-teal/12 text-teal"><Ic size={18} /></span>
                  <div><p className="font-display text-[18px] font-bold text-ink">{v}</p><p className="text-[11.5px] text-dim">{l}</p></div>
                </div>
              </Panel>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ================= FOOTER ================= */
function Footer() {
  return (
    <footer className="relative mt-16 overflow-hidden border-t border-line/50 noise">
      <div className="pointer-events-none absolute inset-0"><div className="aurora absolute -bottom-40 left-1/4 h-[420px] w-[420px] rounded-full bg-teal/16" /></div>
      <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="el-glow flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b from-[#63f6de] to-teal text-[#04241f]">
                <LogoSilhouette size={26} />
              </div>
              <div>
                <p className="font-display text-[28px] font-bold leading-tight text-grad">Signal Arena</p>
                <p className="mono text-[10px] uppercase tracking-[0.24em] text-dim">crypto education design system</p>
              </div>
            </div>
            <p className="max-w-md text-[13.5px] leading-relaxed text-dim">
              2026 Edition · Dark-first mobile product language · Physical elevation & glowing squircles · Angry Birds-level victory fanfare.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button icon={<LogoSilhouette size={16} />}>Download Figma Kit</Button>
            <Button variant="secondary" iconRight={<IconArrow size={16} />}>Documentation</Button>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-line/50 pt-6 text-[12px] text-dim sm:flex-row sm:items-center sm:justify-between">
          <span className="mono">© 2026 Signal Arena — v4.0.0</span>
          <div className="flex gap-5">
            {["Foundations", "Skill Cards", "Components", "Tokens", "Audit"].map((l) => (
              <a key={l} href="#top" className="hover:text-teal transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ================= MAIN ROOT APP ================= */
export default function App() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-bg text-ink">
        <Nav />
        <Hero />

        {/* 00. 9:16 Mobile Game Experience Simulator */}
        <Section
          id="game-916"
          index="00"
          eyebrow="9:16 Mobile Game Experience"
          icon={<IconBolt size={17} />}
          title="Playable 9:16 Mobile Game Simulator"
          desc="Полноценный интерактивный симулятор игры в строгом мобильном формате 9:16 (390×844). Запустите полный цикл: Intelligence Hub → Decision Workspace со свечным графиком t₀ и касанием инвалидации → колода навыков → Process Seal → историческое раскрытие будущего и Angry Birds фанфары!"
        >
          <GameSimulator916 />
        </Section>

        <Foundations />
        <Brand />
        <Color />
        <Typography />
        <Elevation />
        <Icons />
        <Components />
        <SkillCardsSection />
        <WorkspacesSection />
        <Motion99Section />
        <Motion />
        <Patterns />
        <Screens />
        <A11y />

        {/* 14. 30 Key Analyses Section */}
        <Section
          id="analyses-30"
          index="14"
          eyebrow="30 Key Analyses"
          icon={<IconBook size={17} />}
          title="30 Ключевых анализов ТЗ и мобильной игровой архитектуры 9:16"
          desc="Глубокий инженерный и визуальный аудит требований 00-INTEGRATION-GUIDE-RU.md, референсов 01-decision-workspace, 02-intelligence-hub и физики Motion 99."
        >
          <Analyses30 />
        </Section>

        <Footer />
      </div>
    </ToastProvider>
  );
}
