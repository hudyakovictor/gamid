import { useState, useEffect } from "react";
import { SharedTopBar } from "./SharedTopBar";

interface Props {
  onOpenScenario?: () => void;
  onOpenRematch?: () => void;
  onOpenDailyFix?: () => void;
}

export function IntelligenceHubMobile({
  onOpenScenario,
  onOpenRematch,
  onOpenDailyFix,
}: Props) {
  const [timer, setTimer] = useState("02:14:08");

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const s = 59 - now.getSeconds();
      const m = 13;
      const h = 2;
      setTimer(`0${h}:${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s : s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex h-full flex-col bg-[#070c14] text-[#e8eef7]">
      {/* 1. SHARED_TOP_BAR_LOCKED */}
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

      {/* 2. Sub-header & Session Banner from 02-intelligence-hub */}
      <div className="border-b border-[#1d3866]/60 bg-[#09111e] px-4 py-2.5">
        <p className="mono text-[10px] uppercase tracking-wider text-teal">
          МАРШРУТ ОТКРЫТ · БУДУЩЕЕ СКРЫТО
        </p>
        <p className="font-display text-[12.5px] font-semibold text-white leading-tight mt-0.5">
          Добрый вечер, Виктор. Паника уже началась без тебя.
        </p>
      </div>

      {/* Scrollable Hub Body */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 pt-3 space-y-4 scrollbar-thin">
        {/* 4.1 FEATURED SCENARIO: CASE 014 (Canonical Hero Card) */}
        <div className="el-3 relative overflow-hidden rounded-3xl border border-teal/40 bg-gradient-to-br from-[#103038] via-[#0e1a30] to-[#070c14] p-5 shadow-2xl">
          <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-teal/20 blur-3xl" />

          <div className="flex items-center justify-between">
            <span className="mono rounded-full bg-teal/20 px-2.5 py-0.5 text-[9.5px] font-black uppercase text-teal">
              ARENA CASE 014 · ПРОДОЛЖИТЬ
            </span>
            <span className="mono text-[10px] text-[#8aa7c9]">4H · ≈ 6 МИН</span>
          </div>

          <h3 className="font-display mt-2.5 text-[20px] font-black leading-tight text-white">
            Ликвидность перед импульсом
          </h3>

          <p className="mt-1.5 text-[12px] leading-relaxed text-[#8aa7c9]">
            Гипотеза собрана на 62%. Остался шаг, который отличает план от надежды: зафиксировать инвалидацию до раскрытия будущего.
          </p>

          {/* Progress bar */}
          <div className="mt-3.5">
            <div className="flex justify-between text-[10.5px] mono mb-1">
              <span className="text-[#8aa7c9]">Прогресс кейса</span>
              <span className="text-teal font-bold">62%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#070c14] border border-[#1d3866]">
              <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-teal to-[#5aa9ff]" />
            </div>
          </div>

          {/* Action CTA */}
          <button
            onClick={onOpenScenario}
            className="el-glow font-display mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b from-[#63f6de] to-teal py-3 text-[13.5px] font-black text-[#04241f] active:scale-95"
          >
            Войти в Decision Workspace →
          </button>
        </div>

        {/* 4.3 PERSONAL INSIGHT CARD: "ПЛАН ОПАЗДЫВАЕТ" */}
        <div className="el-2 rounded-3xl border border-[#f0a64d]/30 bg-gradient-to-b from-[#251b0e] via-[#0e1a30] to-[#070c14] p-4.5">
          <div className="flex items-center justify-between">
            <span className="mono text-[10px] font-bold uppercase text-[#f0a64d]">
              ЛИЧНЫЙ ИНСАЙТ · 6 РЕШЕНИЙ
            </span>
            <span className="text-sm">⚠️</span>
          </div>

          <h4 className="font-display mt-2 text-[16px] font-bold text-white">
            Сигнал найден. План опаздывает.
          </h4>

          <p className="mt-1 text-[11.5px] leading-relaxed text-[#8aa7c9]">
            В 4 из 6 последних решений действие появилось раньше инвалидации. Ты не принимаешь решение быстрее — ты раньше перестаёшь проверять себя.
          </p>

          <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
            {[
              { l: "QUALITY", v: "76/100", c: "text-white" },
              { l: "DISCIPLINE", v: "68", c: "text-[#f0a64d]" },
              { l: "EVIDENCE", v: "84", c: "text-teal" },
              { l: "TREND", v: "+7.2%", c: "text-[#50c890]" },
            ].map((stat) => (
              <div key={stat.l} className="rounded-xl border border-[#1d3866]/60 bg-[#070c14]/70 p-2">
                <span className="mono block text-[8px] text-[#8aa7c9]">{stat.l}</span>
                <span className={`font-display text-[12.5px] font-bold ${stat.c}`}>{stat.v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 4.4 SUNDAY BLIND TOURNAMENT CARD */}
        <div className="el-2 rounded-3xl border border-[#5aa9ff]/30 bg-gradient-to-b from-[#0f233f] via-[#0e1a30] to-[#070c14] p-4.5">
          <div className="flex items-center justify-between">
            <span className="mono rounded-full bg-[#5aa9ff]/15 px-2.5 py-0.5 text-[9.5px] font-bold text-[#5aa9ff]">
              ТУРНИР НЕДЕЛИ · РЕГИСТРАЦИЯ
            </span>
            <span className="mono text-[11px] font-bold text-[#5aa9ff]">{timer}</span>
          </div>

          <h4 className="font-display mt-2 text-[16px] font-bold text-white">
            Sunday Blind Archive #09
          </h4>

          <p className="mt-1 text-[11.5px] text-[#8aa7c9]">
            Один исторический срез. Одинаковое время. Никаких имён и удобных нарративов. Побеждает качество процесса.
          </p>

          <div className="mt-3 flex items-center justify-between text-[11px] border-t border-[#1d3866]/50 pt-2.5">
            <span className="mono text-[#8aa7c9]">1 284 УЧАСТНИКА · SILVER II</span>
            <span className="mono font-bold text-teal">БЕСПЛАТНО</span>
          </div>
        </div>

        {/* 4.5 ARENA MODES (Quick Run, Blind, Rematch, Post-Loss) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="mono text-[10.5px] uppercase tracking-wider text-teal">
              РЕЖИМЫ АРЕНЫ
            </span>
            <span className="text-[10px] text-[#8aa7c9]">5 РЕЖИМОВ</span>
          </div>

          <div className="space-y-2">
            {[
              { id: "quick", title: "Quick Arena Run", desc: "Смешанный сценарий со случайной колодой", cost: "1 ЭНЕРГИЯ", time: "8 МИН", action: onOpenScenario },
              { id: "blind", title: "Blind Scenario", desc: "Без имени актива, даты и чужих мнений", cost: "1 ЭНЕРГИЯ", time: "12 МИН", action: onOpenScenario },
              { id: "rematch", title: "Rematch Ready (2)", desc: "Другой актив, та же ошибка. Проверка навыка", cost: "БЕЗ НАГРАДЫ", time: "5 МИН", action: onOpenRematch },
              { id: "post-loss", title: "Post-Loss Protocol", desc: "Верни дисциплину до возвращения на рынок", cost: "РЕКОМЕНДУЕМ", time: "6 МИН", action: onOpenDailyFix },
            ].map((mode) => (
              <div
                key={mode.id}
                onClick={mode.action}
                className="el-1 flex cursor-pointer items-center justify-between rounded-2xl border border-[#1d3866] bg-[#0e1a30] p-3.5 transition-all hover:border-teal/40 active:scale-98"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[13.5px] font-bold text-white">{mode.title}</span>
                    <span className="mono rounded bg-[#070c14] px-1.5 py-0.5 text-[9px] font-bold text-teal">{mode.time}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#8aa7c9]">{mode.desc}</p>
                </div>
                <span className="text-teal text-lg">›</span>
              </div>
            ))}
          </div>
        </div>

        {/* 4.6 DECISION PROFILE SUMMARY (6 Dimensions) */}
        <div className="el-2 rounded-3xl border border-[#1d3866] bg-[#0e1a30] p-4.5">
          <div className="flex items-center justify-between mb-2">
            <span className="mono text-[10.5px] uppercase tracking-wider text-white">
              ПРОФИЛЬ КАЧЕСТВА (30 ДНЕЙ)
            </span>
            <span className="mono text-[11px] font-bold text-teal">76.4 AVG</span>
          </div>

          <div className="space-y-2">
            {[
              { dim: "Evidence Collection", score: 84, color: "#2ee6c8" },
              { dim: "Context Awareness", score: 82, color: "#5aa9ff" },
              { dim: "Confidence Calibration", score: 77, color: "#b7f739" },
              { dim: "Risk Sizing", score: 71, color: "#f0a64d" },
              { dim: "Discipline & Rules", score: 68, color: "#ff4d94" },
              { dim: "Invalidation Timing", score: 61, color: "#eb635b" },
            ].map((d) => (
              <div key={d.dim}>
                <div className="flex justify-between text-[10.5px]">
                  <span className="text-[#8aa7c9]">{d.dim}</span>
                  <span className="mono font-bold" style={{ color: d.color }}>{d.score}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#070c14]">
                  <div className="h-full rounded-full" style={{ width: `${d.score}%`, background: d.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
