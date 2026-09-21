import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SharedTopBar } from "./SharedTopBar";
import { IconCheck, IconLock } from "./icons";

/* =========================================================================
   CANONICAL DECISION CHART WORKSPACE (9:16 MOBILE GAME OPTIMIZED)
   Recreated from 01-signal-arena-decision-workspace.html & 00-INTEGRATION-GUIDE-RU.md:

   Cycle:
   Context -> Evidence sources -> Invalidation level on chart -> Hypothesis ->
   Decision actions (ENTER, WAIT, NO_TRADE) -> Confidence (1-5) ->
   Skill cards hand -> SEAL -> Historical Reveal -> Process Score Evaluation
   ========================================================================= */

type Step = "FACTS" | "CHART" | "DECISION" | "SEAL" | "REVEAL";
type DecisionAction = "LONG" | "SHORT" | "WAIT" | "NO_TRADE" | null;
type SourceTab = "PRICE" | "CONTEXT" | "FLOW" | "EVENT" | "PROJ";

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 18 Past candles up to t0 (Known data)
const PAST_CANDLES: Candle[] = [
  { time: "00:00", open: 66200, high: 66500, low: 66100, close: 66450, volume: 420 },
  { time: "04:00", open: 66450, high: 66900, low: 66300, close: 66820, volume: 580 },
  { time: "08:00", open: 66820, high: 67100, low: 66700, close: 67050, volume: 610 },
  { time: "12:00", open: 67050, high: 67200, low: 66600, close: 66750, volume: 730 },
  { time: "16:00", open: 66750, high: 66950, low: 66200, close: 66380, volume: 890 },
  { time: "20:00", open: 66380, high: 66600, low: 66150, close: 66220, volume: 640 },
  { time: "00:00", open: 66220, high: 66800, low: 66180, close: 66700, volume: 550 },
  { time: "04:00", open: 66700, high: 67400, low: 66650, close: 67350, volume: 920 },
  { time: "08:00", open: 67350, high: 67600, low: 67100, close: 67220, volume: 680 },
  { time: "12:00", open: 67220, high: 67550, low: 66900, close: 67100, volume: 510 },
  { time: "16:00", open: 67100, high: 67800, low: 67050, close: 67740, volume: 1100 },
  { time: "20:00", open: 67740, high: 68100, low: 67600, close: 68020, volume: 1250 },
  { time: "00:00", open: 68020, high: 68450, low: 67800, close: 68350, volume: 1340 },
  { time: "04:00", open: 68350, high: 68900, low: 68100, close: 68412, volume: 1680 },
];

// 6 Future candles (Hidden until Seal, then revealed!)
const FUTURE_CANDLES: Candle[] = [
  { time: "08:00", open: 68412, high: 69200, low: 68350, close: 69150, volume: 1820 },
  { time: "12:00", open: 69150, high: 70400, low: 69000, close: 70180, volume: 2240 },
  { time: "16:00", open: 70180, high: 71800, low: 70050, close: 71650, volume: 3100 },
  { time: "20:00", open: 71650, high: 72400, low: 71400, close: 72100, volume: 2800 },
  { time: "00:00", open: 72100, high: 73500, low: 71900, close: 73250, volume: 3400 },
  { time: "04:00", open: 73250, high: 74200, low: 72900, close: 73800, volume: 2900 },
];

interface EvidenceCard {
  id: string;
  tab: SourceTab;
  category: "fact" | "supporting" | "contradicting";
  label: string;
  detail: string;
  selected: boolean;
}

const INITIAL_EVIDENCE: EvidenceCard[] = [
  { id: "e1", tab: "PRICE", category: "supporting", label: "Higher Low Sequence", detail: "4H structure holding key liquidity sweep at 66,200", selected: true },
  { id: "e2", tab: "FLOW", category: "supporting", label: "Perp CVD Divergence", detail: "Open interest rising alongside spot aggressive market bids", selected: false },
  { id: "e3", tab: "CONTEXT", category: "fact", label: "Major Liquidity Pool", detail: "$84M short liquidation cluster resting at 70,800", selected: false },
  { id: "e4", tab: "EVENT", category: "contradicting", label: "Macro CPI in 48h", detail: "Federal Reserve policy risk window opening Thursday", selected: false },
  { id: "e5", tab: "PROJ", category: "fact", label: "Network Hashrate Peak", detail: "EVM layer 1 fee burn rate accelerated 18% weekly", selected: false },
];

export function DecisionChartWorkspaceMobile({
  onExit,
}: {
  onExit?: () => void;
}) {
  void onExit;
  const [currentStep, setCurrentStep] = useState<Step>("CHART");
  const [activeTab, setActiveTab] = useState<SourceTab>("PRICE");
  const [evidenceList, setEvidenceList] = useState<EvidenceCard[]>(INITIAL_EVIDENCE);
  const [invalidationPrice, setInvalidationPrice] = useState<number>(66800);
  const [action, setAction] = useState<DecisionAction>(null);
  const [confidence, setConfidence] = useState<number>(4);
  const [isSealed, setIsSealed] = useState<boolean>(false);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [showSkillHand, setShowSkillHand] = useState<boolean>(false);
  const [selectedCards, setSelectedCards] = useState<string[]>(["c01"]);
  const [processScore, setProcessScore] = useState<number>(0);

  // SVG Chart Dimensions
  const chartWidth = 350;
  const chartHeight = 210;
  const minPrice = 65800;
  const maxPrice = 74500;
  const priceRange = maxPrice - minPrice;

  const yForPrice = (p: number) => chartHeight - ((p - minPrice) / priceRange) * chartHeight;
  const priceForY = (y: number) => Math.round(maxPrice - (y / chartHeight) * priceRange);

  // Toggle evidence selection
  const toggleEvidence = (id: string) => {
    setEvidenceList((prev) =>
      prev.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e)),
    );
  };

  // Seal Decision Transition
  const handleSeal = () => {
    if (!action) return;
    setIsSealed(true);
    setCurrentStep("SEAL");

    // Reveal sequence
    setTimeout(() => {
      setIsRevealed(true);
      setCurrentStep("REVEAL");
      setProcessScore(88); // 88% process quality
    }, 1800);
  };

  const steps: Step[] = ["FACTS", "CHART", "DECISION", "SEAL", "REVEAL"];

  return (
    <div className="relative flex h-full flex-col bg-[#070c14] text-[#e8eef7]">
      {/* 1. SHARED_TOP_BAR_LOCKED (Section 3.2 Canonical) */}
      <SharedTopBar
        level={7}
        xp={2480}
        xpMax={3000}
        attempts={3}
        maxAttempts={3}
        stars={48}
        coins={1842}
        compact
      />

      {/* 2. Context Bar (Anonymous Asset & Stage Header) */}
      <div className="flex items-center justify-between border-b border-[#1d3866]/60 bg-[#0a1120] px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="mono rounded-md bg-[#13243f] px-2 py-0.5 text-[10px] font-bold text-teal">
            {isRevealed ? "BTC / USDT" : "BLIND CASE #014"}
          </span>
          <span className="mono text-[10px] text-[#8aa7c9]">4H TIMEFRAME</span>
        </div>
        <div className="flex items-center gap-1.5">
          {steps.map((st, i) => (
            <span
              key={st}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                st === currentStep
                  ? "w-5 bg-teal shadow-[0_0_8px_#2ee6c8]"
                  : i < steps.indexOf(currentStep)
                    ? "w-2 bg-[#50c890]"
                    : "w-2 bg-[#1d3866]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Scrollable Workspace Body */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-2 scrollbar-thin">
        {/* CHART WORKSPACE: CANDLESTICKS + t0 DIVIDER + FUTURE FOG */}
        <div className="relative mt-2 overflow-hidden rounded-3xl border border-[#1d3866] bg-[#09111e] p-3 shadow-2xl">
          <div className="flex items-center justify-between text-[11px] text-[#8aa7c9]">
            <span className="mono font-semibold text-white">PRICE ACTION AT t₀</span>
            <span className="mono text-[10px] text-teal">
              {isRevealed ? "FUTURE REVEALED" : "FUTURE OBSCURED UNTIL SEAL"}
            </span>
          </div>

          {/* Candlestick SVG Rendering */}
          <div className="relative mt-2 h-[210px] w-full">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="h-full w-full select-none"
              onClick={(e) => {
                if (isSealed) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const clickY = e.clientY - rect.top;
                const price = priceForY((clickY / rect.height) * chartHeight);
                setInvalidationPrice(price);
              }}
            >
              {/* Grid Lines */}
              <line x1="0" y1="50" x2={chartWidth} y2="50" stroke="#1d3866" strokeWidth="0.8" strokeDasharray="3 3" />
              <line x1="0" y1="105" x2={chartWidth} y2="105" stroke="#1d3866" strokeWidth="0.8" strokeDasharray="3 3" />
              <line x1="0" y1="160" x2={chartWidth} y2="160" stroke="#1d3866" strokeWidth="0.8" strokeDasharray="3 3" />

              {/* t0 Vertical Dividing Line */}
              <line
                x1="240"
                y1="0"
                x2="240"
                y2={chartHeight}
                stroke="#2ee6c8"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text x="244" y="16" fill="#2ee6c8" fontSize="9" fontFamily="monospace" fontWeight="bold">
                t₀ DECISION
              </text>

              {/* Past Candlesticks (14 candles) */}
              {PAST_CANDLES.map((c, i) => {
                const x = 12 + i * 16;
                const isGreen = c.close >= c.open;
                const top = yForPrice(Math.max(c.open, c.close));
                const bottom = yForPrice(Math.min(c.open, c.close));
                const height = Math.max(2, bottom - top);
                const color = isGreen ? "#50c890" : "#eb635b";

                return (
                  <g key={i}>
                    {/* Wick */}
                    <line
                      x1={x + 4}
                      y1={yForPrice(c.high)}
                      x2={x + 4}
                      y2={yForPrice(c.low)}
                      stroke={color}
                      strokeWidth="1"
                    />
                    {/* Candle Body */}
                    <rect
                      x={x}
                      y={top}
                      width="8"
                      height={height}
                      fill={color}
                      rx="1"
                    />
                  </g>
                );
              })}

              {/* Future Candlesticks (Only shown when REVEALED!) */}
              {isRevealed &&
                FUTURE_CANDLES.map((c, i) => {
                  const x = 246 + i * 16;
                  const isGreen = c.close >= c.open;
                  const top = yForPrice(Math.max(c.open, c.close));
                  const bottom = yForPrice(Math.min(c.open, c.close));
                  const height = Math.max(2, bottom - top);
                  const color = isGreen ? "#50c890" : "#eb635b";

                  return (
                    <g key={i}>
                      <line
                        x1={x + 4}
                        y1={yForPrice(c.high)}
                        x2={x + 4}
                        y2={yForPrice(c.low)}
                        stroke={color}
                        strokeWidth="1.2"
                      />
                      <rect
                        x={x}
                        y={top}
                        width="8"
                        height={height}
                        fill={color}
                        rx="1"
                      />
                    </g>
                  );
                })}

              {/* Invalidation Level Horizontal Marker */}
              <line
                x1="0"
                y1={yForPrice(invalidationPrice)}
                x2={chartWidth}
                y2={yForPrice(invalidationPrice)}
                stroke="#eb635b"
                strokeWidth="1.8"
              />
              <rect
                x="4"
                y={yForPrice(invalidationPrice) - 9}
                width="118"
                height="16"
                fill="#eb635b"
                rx="4"
              />
              <text
                x="8"
                y={yForPrice(invalidationPrice) + 3}
                fill="#070c14"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
              >
                INVALIDATION ${invalidationPrice.toLocaleString()}
              </text>
            </svg>

            {/* Fog of War / Obscured future overlay until sealed */}
            {!isRevealed && (
              <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-[110px] bg-gradient-to-r from-transparent via-[#070c14]/85 to-[#070c14] flex flex-col items-center justify-center">
                <IconLock size={20} className="text-[#8aa7c9]/60" />
                <span className="mono mt-1 text-[8.5px] uppercase tracking-wider text-[#8aa7c9]/80">
                  LOCKED
                </span>
              </div>
            )}
          </div>

          <p className="mt-2 text-[10.5px] text-[#8aa7c9]">
            👆 Коснитесь графика в любой точке, чтобы установить точный уровень инвалидации
          </p>
        </div>

        {/* EVIDENCE SOURCE TABS (Price, Context, Flow, Event, Project) */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="mono text-[10.5px] uppercase tracking-wider text-teal">
              СВИДЕТЕЛЬСТВА (ОТКРОЙТЕ 2+)
            </span>
            <span className="mono text-[10px] text-[#8aa7c9]">
              {evidenceList.filter((e) => e.selected).length}/5 ВЫБРАНО
            </span>
          </div>

          {/* Source Tabs */}
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {(["PRICE", "CONTEXT", "FLOW", "EVENT", "PROJ"] as SourceTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`mono rounded-xl px-3 py-1.5 text-[10.5px] font-bold transition-colors ${
                  activeTab === tab
                    ? "bg-teal/20 text-teal border border-teal/40"
                    : "bg-[#0e1a30] text-[#8aa7c9] border border-[#1d3866]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Evidence Cards for active tab */}
          <div className="mt-2 space-y-2">
            {evidenceList
              .filter((e) => e.tab === activeTab || activeTab === "PRICE")
              .slice(0, 2)
              .map((e) => (
                <div
                  key={e.id}
                  onClick={() => toggleEvidence(e.id)}
                  className={`flex cursor-pointer items-start justify-between rounded-2xl border p-3 transition-all ${
                    e.selected
                      ? "border-teal bg-teal/[0.08]"
                      : "border-[#1d3866] bg-[#0e1a30]/80 hover:border-[#1d3866]"
                  }`}
                >
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          e.category === "supporting"
                            ? "bg-[#50c890]"
                            : e.category === "contradicting"
                              ? "bg-[#eb635b]"
                              : "bg-[#5aa9ff]"
                        }`}
                      />
                      <span className="text-[12.5px] font-bold text-white">{e.label}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#8aa7c9] leading-snug">{e.detail}</p>
                  </div>
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border ${
                      e.selected ? "border-teal bg-teal text-[#04241f]" : "border-[#1d3866]"
                    }`}
                  >
                    {e.selected && <IconCheck size={12} />}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* DECISION ACTIONS (ENTER LONG/SHORT, WAIT, NO TRADE — EQUAL STANDING) */}
        <div className="mt-5">
          <span className="mono text-[10.5px] uppercase tracking-wider text-teal">
            ВЫБЕРИТЕ ДЕЙСТВИЕ
          </span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              { id: "LONG", label: "LONG", desc: "Вверх", color: "#50c890" },
              { id: "SHORT", label: "SHORT", desc: "Вниз", color: "#eb635b" },
              { id: "WAIT", label: "WAIT", desc: "Ждать сигнал", color: "#5aa9ff" },
              { id: "NO_TRADE", label: "NO TRADE", desc: "Вне рынка", color: "#8aa7c9" },
            ].map((btn) => (
              <button
                key={btn.id}
                disabled={isSealed}
                onClick={() => setAction(btn.id as DecisionAction)}
                className={`flex flex-col items-center justify-center rounded-2xl border py-3 transition-all active:scale-95 ${
                  action === btn.id
                    ? "border-current bg-white/10 shadow-[0_0_18px_rgba(46,230,200,0.3)]"
                    : "border-[#1d3866] bg-[#0e1a30] hover:border-teal/40"
                }`}
                style={{ color: action === btn.id ? btn.color : undefined }}
              >
                <span className="font-display text-[15px] font-black">{btn.label}</span>
                <span className="text-[10px] text-[#8aa7c9]">{btn.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* CONFIDENCE SELECTOR (1 to 5) */}
        <div className="mt-4 rounded-2xl border border-[#1d3866] bg-[#0e1a30] p-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="mono uppercase text-[#8aa7c9]">УВЕРЕННОСТЬ (КАЛИБРОВКА)</span>
            <span className="mono font-bold text-teal">{confidence} / 5</span>
          </div>
          <div className="mt-2 flex gap-1.5">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                disabled={isSealed}
                onClick={() => setConfidence(lvl)}
                className={`flex-1 rounded-xl py-2 text-[12px] font-bold transition-all ${
                  confidence >= lvl
                    ? "bg-gradient-to-r from-teal to-[#5aa9ff] text-[#04241f]"
                    : "bg-[#070c14] text-[#8aa7c9]"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* SKILL HAND DECK TRIGGER BUTTON */}
        <div className="mt-4">
          <button
            onClick={() => setShowSkillHand(true)}
            className="flex w-full items-center justify-between rounded-2xl border border-teal/40 bg-teal/10 px-4 py-3 text-left transition-colors hover:bg-teal/15"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-teal">🃏</span>
              <div>
                <p className="font-display text-[13px] font-bold text-white">Колода навыков</p>
                <p className="text-[10.5px] text-[#8aa7c9]">
                  {selectedCards.length} карты экипировано в руку
                </p>
              </div>
            </div>
            <span className="mono text-[11px] font-bold text-teal">Открыть руку →</span>
          </button>
        </div>

        {/* SEALED CONFIRMATION / REVEAL BOX */}
        {isSealed && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-5 rounded-3xl border border-teal/60 bg-gradient-to-br from-[#0f3a37] via-[#0e1a30] to-[#070c14] p-5 text-center shadow-2xl"
          >
            <span className="mono text-[10px] font-bold uppercase tracking-widest text-teal">
              РЕШЕНИЕ ЗАПЕЧАТАНО (DECISION TRACE)
            </span>
            <p className="font-display mt-2 text-[22px] font-black text-white">
              {action} · Калибровка {confidence}/5
            </p>
            <p className="mt-1 text-[12px] text-[#8aa7c9]">
              Хеш зафиксирован в блокчейне арены до раскрытия будущего
            </p>

            {isRevealed && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 border-t border-[#1d3866] pt-3 text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#8aa7c9]">Качество процесса:</span>
                  <span className="mono font-display text-[18px] font-black text-[#50c890]">
                    {processScore} / 100
                  </span>
                </div>
                <p className="mt-1 text-[11.5px] text-[#8aa7c9]">
                  ✓ Инвалидация зафиксирована до действия (+30)<br />
                  ✓ Использовано 2 независимых источника (+28)<br />
                  ✓ Калибровка уверенности совпала с исходом (+30)
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>

      {/* FIXED BOTTOM ACTION BAR (SEAL BUTTON) */}
      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-[#1d3866] bg-[#070c14]/95 px-4 py-3 backdrop-blur-xl">
        {!isSealed ? (
          <button
            disabled={!action}
            onClick={handleSeal}
            className={`font-display flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-black tracking-wide transition-all active:scale-95 ${
              action
                ? "el-glow bg-gradient-to-b from-[#63f6de] to-teal text-[#04241f]"
                : "cursor-not-allowed border border-[#1d3866] bg-[#0e1a30] text-[#8aa7c9]/60"
            }`}
          >
            ЗАПЕЧАТАТЬ РЕШЕНИЕ (PROCESS SEAL) →
          </button>
        ) : (
          <button
            onClick={() => {
              setIsSealed(false);
              setIsRevealed(false);
              setAction(null);
            }}
            className="font-display w-full rounded-2xl border border-teal/40 bg-teal/10 py-3.5 text-[14px] font-bold text-teal"
          >
            Следующий сценарий Арены →
          </button>
        )}
      </div>

      {/* BOTTOM SHEET SKILL HAND (4 CANONICAL COLORS: Green, Yellow, Blue, Red) */}
      <AnimatePresence>
        {showSkillHand && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowSkillHand(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative z-10 w-full max-w-[390px] rounded-t-[36px] border-t border-teal/50 bg-gradient-to-b from-[#13243f] to-[#070c14] p-5 shadow-2xl"
            >
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" />
              <div className="flex items-center justify-between pb-3 border-b border-[#1d3866]">
                <h4 className="font-display text-[16px] font-bold text-white">Колода навыков (Рука)</h4>
                <button onClick={() => setShowSkillHand(false)} className="text-[#8aa7c9]">✕</button>
              </div>

              {/* 4 Canonical Deck Color Groups */}
              <div className="mt-3 grid grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                {[
                  { id: "c01", name: "Entropy Shield", color: "#2E7F5C", tag: "Security", bonus: "+15 XP" },
                  { id: "c02", name: "Slippage Sensor", color: "#D0B24A", tag: "Execution", bonus: "+20 XP" },
                  { id: "c03", name: "Order Flow Scan", color: "#4C6180", tag: "Analytics", bonus: "+25 XP" },
                  { id: "c04", name: "Liquidation Trap", color: "#C56861", tag: "Risk Guard", bonus: "+30 XP" },
                ].map((card) => {
                  const isEquipped = selectedCards.includes(card.id);
                  return (
                    <div
                      key={card.id}
                      onClick={() => {
                        setSelectedCards((prev) =>
                          prev.includes(card.id)
                            ? prev.filter((x) => x !== card.id)
                            : [...prev, card.id],
                        );
                      }}
                      className="cursor-pointer rounded-2xl border p-3 transition-transform active:scale-95"
                      style={{
                        backgroundColor: `${card.color}20`,
                        borderColor: isEquipped ? card.color : "#1d3866",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="mono text-[9px] font-bold text-white uppercase">{card.tag}</span>
                        <span className="mono text-[10px] font-bold text-lime">{card.bonus}</span>
                      </div>
                      <p className="font-display mt-2 text-[13px] font-bold text-white">{card.name}</p>
                      <span className="mono mt-2 block text-[9.5px]" style={{ color: card.color }}>
                        {isEquipped ? "✓ В РУКЕ" : "+ ЭКИПИРОВАТЬ"}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setShowSkillHand(false)}
                className="el-glow font-display mt-4 w-full rounded-2xl bg-gradient-to-b from-[#63f6de] to-teal py-3 text-[13px] font-black text-[#04241f]"
              >
                Применить в решение ({selectedCards.length})
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
