import { getKit, WidgetCard, type WidgetSpec } from "@signal-arena/ui-game";

import type { RunResponse, ScenarioPublicProjection } from "../types";

type ArenaScreenProps = {
  onOpenScenario: (scenarioId: string, scenarioVersion: string) => void;
  onNewRun: () => void;
  activeRun: RunResponse | null;
  scenario: ScenarioPublicProjection | null;
};

/**
 * Arena (stable screen id `arena`): practice modes and historical scenarios.
 * Only the seeded foundation scenario is playable in this slice; the other
 * mode cards are registered design-system widgets with the "скоро" state.
 */
export function ArenaScreen({ onOpenScenario, onNewRun, activeRun, scenario }: ArenaScreenProps) {
  const arenaKit = getKit("arena");
  const playableScenario = scenario ?? undefined;

  const widgets: WidgetSpec[] = [
    {
      id: "quick",
      title: playableScenario
        ? `Исторический сценарий · ${playableScenario.assetId}`
        : "Quick Arena Run",
      eyebrow: "HISTORICAL SCENARIO",
      description: playableScenario
        ? `t0: ${formatDate(playableScenario.decisionPoint.t0)} · ${playableScenario.timeframe}. Будущее скрыто до фиксации решения.`
        : "Выбери сценарий из каталога и пройди цикл: evidence → гипотеза → решение.",
      icon: "▶",
      footprint: "large",
      tone: "teal",
      metric: playableScenario ? `${playableScenario.timeframe}` : "8 мин",
      action: "Открыть"
    },
    {
      id: "blind",
      title: "Blind Scenario",
      eyebrow: "12 MINUTES",
      description: "Без имени актива, даты и чужих мнений. Контент каталога готовится.",
      icon: "◉",
      footprint: "square",
      tone: "blue",
      status: "СКОРО"
    },
    {
      id: "conflict",
      title: "Conflict Scenario",
      eyebrow: "10 MINUTES",
      description: "Источники противоречат друг другу. Контент каталога готовится.",
      icon: "⇄",
      footprint: "square",
      tone: "amber",
      status: "СКОРО"
    },
    {
      id: "rematch",
      title: "Rematch",
      eyebrow: "TRANSFER",
      description:
        activeRun && (activeRun.state === "sealed" || activeRun.state === "revealed")
          ? "Заход завершён — доступ к реваншу появится после разбора."
          : "Новый контекст, та же угроза. Открывается после дебрифа.",
      icon: "↻",
      footprint: "wide",
      tone: "green",
      status: "ПОСЛЕ DEBRIEF"
    }
  ];

  return (
    <div className="arena">
      <div className="bento-grid" data-page={arenaKit.id}>
        {widgets.map((spec) => (
          <WidgetCard key={spec.id} spec={spec} />
        ))}
      </div>
      <div className="arena-actions">
        {playableScenario ? (
          <button
            type="button"
            className="primary"
            onClick={() => onOpenScenario(playableScenario.scenarioId, playableScenario.version)}
          >
            Открыть брифинг сценария →
          </button>
        ) : (
          <p className="muted">Загружаем сценарии…</p>
        )}
        {activeRun && (
          <button type="button" className="secondary" onClick={onNewRun}>
            Продолжить активный заход ↗
          </button>
        )}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}
