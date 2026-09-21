import { useState } from "react";
import { Phone916Frame } from "./Phone916Frame";
import { DecisionChartWorkspaceMobile } from "./DecisionChartWorkspaceMobile";
import { IntelligenceHubMobile } from "./IntelligenceHubMobile";
import { VictoryModal, SKILL_CARDS } from "./SkillCardsGallery";

export function GameSimulator916() {
  const [activeScreen, setActiveScreen] = useState<"hub" | "chart" | "victory">("hub");
  const [glowColor, setGlowColor] = useState<"teal" | "wait" | "pink">("teal");

  return (
    <div className="flex flex-col items-center">
      {/* Simulation Controls Top Strip */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
        <span className="mono mr-2 text-[11px] font-bold uppercase tracking-wider text-teal">
          9:16 СИМУЛЯТОР ИГРЫ:
        </span>
        <button
          onClick={() => {
            setActiveScreen("hub");
            setGlowColor("wait");
          }}
          className={`rounded-2xl border px-4 py-2 text-[12px] font-bold transition-all ${
            activeScreen === "hub"
              ? "border-teal bg-teal/20 text-teal shadow-[0_0_12px_rgba(46,230,200,0.4)]"
              : "border-line bg-card/60 text-dim hover:text-ink"
          }`}
        >
          01 · Intelligence Hub
        </button>

        <button
          onClick={() => {
            setActiveScreen("chart");
            setGlowColor("teal");
          }}
          className={`rounded-2xl border px-4 py-2 text-[12px] font-bold transition-all ${
            activeScreen === "chart"
              ? "border-teal bg-teal/20 text-teal shadow-[0_0_12px_rgba(46,230,200,0.4)]"
              : "border-line bg-card/60 text-dim hover:text-ink"
          }`}
        >
          02 · Decision Workspace (График & Seal)
        </button>

        <button
          onClick={() => {
            setActiveScreen("victory");
            setGlowColor("pink");
          }}
          className={`rounded-2xl border px-4 py-2 text-[12px] font-bold transition-all ${
            activeScreen === "victory"
              ? "border-pink bg-pink/20 text-pink shadow-[0_0_12px_rgba(255,77,148,0.4)]"
              : "border-line bg-card/60 text-dim hover:text-ink"
          }`}
        >
          03 · Angry Birds Фанфары Победы
        </button>
      </div>

      {/* Flagship 9:16 Smartphone Frame */}
      <Phone916Frame
        title={`Signal Arena 2026 · ${activeScreen.toUpperCase()} MODE · FORMAT 9:16`}
        glow={glowColor}
      >
        {activeScreen === "hub" && (
          <IntelligenceHubMobile
            onOpenScenario={() => {
              setActiveScreen("chart");
              setGlowColor("teal");
            }}
            onOpenRematch={() => {
              setActiveScreen("chart");
              setGlowColor("teal");
            }}
            onOpenDailyFix={() => {
              setActiveScreen("chart");
              setGlowColor("teal");
            }}
          />
        )}

        {activeScreen === "chart" && (
          <DecisionChartWorkspaceMobile
            onExit={() => {
              setActiveScreen("hub");
              setGlowColor("wait");
            }}
          />
        )}

        {activeScreen === "victory" && (
          <div className="relative h-full w-full bg-[#070c14]">
            <DecisionChartWorkspaceMobile
              onExit={() => {
                setActiveScreen("hub");
                setGlowColor("wait");
              }}
            />
            <VictoryModal
              card={SKILL_CARDS[0]}
              onClose={() => {
                setActiveScreen("hub");
                setGlowColor("wait");
              }}
            />
          </div>
        )}
      </Phone916Frame>
    </div>
  );
}
