import { useEffect, useMemo, useState } from "react";

import { getKit, WidgetCard, type WidgetSpec } from "@signal-arena/ui-game";

import { ApiClient, type RunResponse, type RunSummary, type ScenarioSummary } from "../api/client";

type HubScreenProps = {
  onOpenHubAction: () => void;
  onOpenScenario: (scenarioId: string, scenarioVersion: string) => void;
  activeRun: RunResponse | null;
  onContinue?: () => void;
};

/**
 * Hub (stable screen id `arena_hub`): the personal start page.
 * The featured card and the run history are driven by the API; the drill and
 * insight widgets are design-system placeholders until the economy and
 * personal-insight services exist.
 */
export function HubScreen({ onOpenHubAction, onOpenScenario, activeRun, onContinue }: HubScreenProps) {
  const [scenarios, setScenarios] = useState<ScenarioSummary[] | null>(null);
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const api = useMemo(() => new ApiClient(), []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [scenarioList, me] = await Promise.all([api.listScenarios(), api.me()]);
        if (cancelled) {
          return;
        }
        setScenarios(scenarioList);
        try {
          const history = await api.listRuns(me.userId);
          if (!cancelled) {
            setRuns(history);
          }
        } catch {
          if (!cancelled) {
            setRuns([]);
          }
        }
      } catch {
        if (!cancelled) {
          setScenarios([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  const featured = scenarios?.[0];
  const hubKit = getKit("hub");

  const widgets: WidgetSpec[] = [
    {
      id: "featured",
      title: featured ? "Ликвидность перед импульсом" : "Сценарий фонда",
      eyebrow: "FEATURED SCENARIO",
      description: featured
        ? `${featured.assetId} · ${featured.timeframe} · уровень ${featured.scenarioLevel}. Гипотеза строится на evidence, инвалидация — до действия.`
        : "Загружаем каталог сценариев…",
      icon: "◈",
      footprint: "hero",
      tone: "teal",
      metric: featured ? `${featured.timeframe}` : undefined,
      action: "Открыть брифинг",
      status: featured?.mode === "academy" ? "ACADEMY" : undefined
    },
    {
      id: "continue",
      title: activeRun ? "Завершить заход" : "Свободная практика",
      eyebrow: "NEXT BEST ACTION",
      description: activeRun
        ? "Есть незавершённый заход — решение ещё можно зафиксировать."
        : "Выбери режим на арене и пройди один полный цикл решения.",
      icon: "↗",
      footprint: "wide",
      tone: "blue",
      metric: activeRun ? "1 заход" : "Арена",
      action: activeRun ? "Продолжить" : "В арену"
    },
    {
      id: "insight",
      title: runs?.length ? "Личный инсайт" : "Personal Insight",
      eyebrow: "PERSONAL INSIGHT",
      description:
        runs?.length
          ? `Заходов: ${runs.length}. Средний process score: ${averageScore(runs) ?? "—"}.`
          : "После первого захода сервер покажет повторяющиеся ошибки процесса.",
      icon: "◎",
      footprint: "full",
      tone: runs?.length ? "green" : "red",
      metric: averageScore(runs) ?? "0/100",
      action: runs?.length ? "Профиль" : undefined
    }
  ];

  return (
    <div className="hub">
      <div className="bento-grid" data-page={hubKit.id}>
        {widgets.map((spec) => {
          const onAction =
            spec.id === "featured" && featured
              ? () => onOpenScenario(featured.scenarioId, featured.version)
              : spec.id === "continue" && onContinue
                ? onContinue
                : undefined;
          return <WidgetCard key={spec.id} spec={spec} onAction={onAction} />;
        })}
      </div>
      <div className="hub-actions">
        {featured && (
          <button
            type="button"
            className="primary"
            onClick={() => onOpenScenario(featured.scenarioId, featured.version)}
          >
            Открыть сценарий →
          </button>
        )}
        {onContinue && activeRun && (
          <button type="button" className="secondary" onClick={onContinue}>
            Продолжить заход ↗
          </button>
        )}
        <button type="button" className="ghost" onClick={onOpenHubAction}>
          Все режимы
        </button>
      </div>
      {runs !== null && runs.length > 0 && (
        <section className="run-history" aria-label="Мои заходы">
          <h2>Мои заходы</h2>
          <ul>
            {runs.slice(0, 5).map((run) => (
              <li key={run.runId}>
                <span className="run-state state-{run.state}">{run.state}</span>
                <span className="run-scenario">{run.scenarioId}</span>
                <span className="run-score">
                  {run.score !== null ? `${run.score}/100` : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function averageScore(runs: RunSummary[] | null): string | null {
  if (!runs) {
    return null;
  }
  const scored = runs.filter((run) => run.score !== null);
  if (scored.length === 0) {
    return null;
  }
  const sum = scored.reduce((acc, run) => acc + (run.score ?? 0), 0);
  return String(Math.round(sum / scored.length));
}
