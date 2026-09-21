import type { ScenarioPublicProjection } from "../types";

const GROUP_LABELS: Record<string, string> = {
  PRICE: "Цена",
  CONTEXT: "Контекст",
  FLOW: "Поток",
  EVENT: "События",
  PROJECT: "Проект"
};

const RELIABILITY_LABELS: Record<string, string> = {
  high: "высокая",
  medium: "средняя",
  low: "низкая"
};

type ScenarioBriefScreenProps = {
  scenario: ScenarioPublicProjection | null;
  onBack: () => void;
  onStart: () => void;
};

/**
 * Scenario brief (stable screen id `scenario_brief`): everything the player
 * may see BEFORE the decision — the public projection only. No outcome, no
 * future segment, no evaluation rules; those fields do not exist on the
 * public contract at all.
 */
export function ScenarioBriefScreen({ scenario, onBack, onStart }: ScenarioBriefScreenProps) {
  if (!scenario) {
    return (
      <div className="brief">
        <p className="muted">Сценарий не загружен.</p>
        <button type="button" className="secondary" onClick={onBack}>
          ← В хаб
        </button>
      </div>
    );
  }

  return (
    <div className="brief">
      <section className="brief-hero" aria-label="Сценарий">
        <span className="kicker">
          {scenario.mode.toUpperCase()} · SCENARIO LEVEL {scenario.scenarioLevel}
        </span>
        <h2>{scenario.assetId}</h2>
        <p className="muted">
          {scenario.assetClass} · {scenario.marketSegment} · {scenario.timeframe}
        </p>
        <dl className="brief-meta">
          <div>
            <dt>Точка решения (t0)</dt>
            <dd>{formatDate(scenario.decisionPoint.t0)} {scenario.decisionPoint.timezone}</dd>
          </div>
          <div>
            <dt>Доступные группы источников</dt>
            <dd>{scenario.availableSourceGroups.map((group) => GROUP_LABELS[group] ?? group).join(" · ")}</dd>
          </div>
          <div>
            <dt>Карты</dt>
            <dd>{scenario.availableCards.join(", ")}</dd>
          </div>
          <div>
            <dt>Протоколы</dt>
            <dd>{scenario.activeProtocols.join(", ")}</dd>
          </div>
        </dl>
        <p className="brief-secret" role="note">
          ◉ Будущее рынка после t0 скрыто сервером. Решение оценивается до
          раскрытия исхода.
        </p>
      </section>

      <section aria-label="Доступные источники">
        <h3>Evidence · источники на t0</h3>
        <ul className="source-list">
          {scenario.availableSources.map((source) => (
            <li key={source.sourceId}>
              <span className={`chip group-${source.sourceGroup.toLowerCase()}`}>
                {GROUP_LABELS[source.sourceGroup] ?? source.sourceGroup}
              </span>
              <span className="source-id">{source.sourceId}</span>
              <span className="muted">
                reliability: {RELIABILITY_LABELS[source.reliability] ?? source.reliability}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Допустимые действия">
        <h3>Допустимые действия</h3>
        <div className="action-chips">
          {scenario.allowedActions.map((action) => (
            <span key={action} className="chip">
              {action}
            </span>
          ))}
        </div>
      </section>

      <div className="brief-actions">
        <button type="button" className="ghost" onClick={onBack}>
          ← Назад
        </button>
        <button type="button" className="primary" onClick={onStart}>
          Начать заход →
        </button>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toISOString().replace("T", " ").slice(0, 16);
}
