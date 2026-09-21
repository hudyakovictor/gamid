import { useMemo, useState } from "react";

import type { DecisionAction, DecisionTrace } from "../types";

const ACTION_LABELS: Record<DecisionAction, string> = {
  long: "Лонг",
  short: "Шорт",
  wait: "Ждать",
  no_trade: "Без торговли",
  hold_plan: "Держать план",
  reduce_risk: "Снизить риск",
  close_position: "Закрыть позицию",
  move_protection: "Сдвинуть защиту",
  wait_for_confirmation: "Ждать подтверждения",
  do_not_average: "Не усреднять",
  invalidate_idea: "Инвалидировать идею"
};

type WorkspaceScreenProps = {
  scenario: import("../types").ScenarioPublicProjection | null;
  run: import("../types").RunResponse | null;
  decision: DecisionTrace | null;
  sealing: boolean;
  sealed: boolean;
  onBack: () => void;
  onSeal: (decision: DecisionTrace) => void;
  onShowReveal: () => void;
};

/**
 * Decision Workspace (stable screen id `decision_workspace`).
 * The player picks evidence, writes the invalidation, chooses the action and
 * the confidence — then locks the decision in the Decision Dock. After seal
 * the form is frozen: the decision is server-side and immutable.
 */
export function WorkspaceScreen({
  scenario,
  run,
  decision,
  sealing,
  sealed,
  onBack,
  onSeal,
  onShowReveal
}: WorkspaceScreenProps) {
  const [selectedSources, setSelectedSources] = useState<ReadonlySet<string>>(new Set());
  const [action, setAction] = useState<DecisionAction | null>(null);
  const [invalidation, setInvalidation] = useState("");
  const [confidence, setConfidence] = useState(50);

  const sources = useMemo(() => scenario?.availableSources ?? [], [scenario]);

  if (!scenario || !run) {
    return (
      <div className="workspace">
        <p className="muted">Заход не найден. Начни сценарий заново.</p>
        <button type="button" className="secondary" onClick={onBack}>
          ← В хаб
        </button>
      </div>
    );
  }

  const invalidationWords = invalidation.trim() === "" ? 0 : invalidation.trim().split(/\s+/).length;
  const canSeal =
    !sealed &&
    !sealing &&
    selectedSources.size > 0 &&
    action !== null &&
    invalidation.trim().length > 0;

  const toggleSource = (sourceId: string) => {
    if (sealed) {
      return;
    }
    const next = new Set(selectedSources);
    if (next.has(sourceId)) {
      next.delete(sourceId);
    } else {
      next.add(sourceId);
    }
    setSelectedSources(next);
  };

  const handleSeal = () => {
    if (!canSeal || !action) {
      return;
    }
    onSeal({
      action,
      evidenceSourceIds: [...selectedSources],
      invalidation: invalidation.trim(),
      confidence
    });
  };

  return (
    <div className="workspace">
      <section className="ws-head" aria-label="Контекст сценария">
        <span className="kicker">{scenario.mode.toUpperCase()} · {scenario.timeframe}</span>
        <h2>{scenario.assetId}</h2>
        <p className="muted">
          t0: {formatDate(scenario.decisionPoint.t0)} {scenario.decisionPoint.timezone} ·
          run {run.runId.slice(0, 8)}
        </p>
      </section>

      <section className="evidence-panel" aria-label="Выбор evidence">
        <h3>1 · Evidence</h3>
        <p className="hint">Отметь источники, на которые опирается гипотеза. Минимум один.</p>
        <ul>
          {sources.map((source) => {
            const checked = selectedSources.has(source.sourceId);
            return (
              <li key={source.sourceId}>
                <label className={`source-row ${checked ? "checked" : ""} ${sealed ? "locked" : ""}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={sealed}
                    onChange={() => toggleSource(source.sourceId)}
                  />
                  <span className="source-id">{source.sourceId}</span>
                  <span className="chip">{source.sourceGroup}</span>
                  <span className="muted">{source.reliability}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="invalidation-panel" aria-label="Инвалидация">
        <h3>2 · Инвалидация</h3>
        <p className="hint">
          Сформулируй, что опровергнет идею ДО входа. Это обязательный шаг
          протокола.
        </p>
        <textarea
          value={invalidation}
          disabled={sealed}
          rows={3}
          placeholder="Например: закрытие ниже уровня ложного пробоя отменяет сетап."
          onChange={(event) => setInvalidation(event.target.value)}
          aria-label="Текст инвалидации"
        />
        <small className="muted">{invalidationWords} слов(а)</small>
      </section>

      <section className="action-panel" aria-label="Действие">
        <h3>3 · Действие</h3>
        <div className="action-grid" role="radiogroup" aria-label="Допустимые действия">
          {scenario.allowedActions.map((allowed) => (
            <button
              key={allowed}
              type="button"
              role="radio"
              aria-checked={action === allowed}
              className={`action-btn ${action === allowed ? "selected" : ""} ${sealed ? "locked" : ""}`}
              disabled={sealed}
              onClick={() => setAction(allowed)}
            >
              {ACTION_LABELS[allowed] ?? allowed}
            </button>
          ))}
        </div>
      </section>

      <section className="confidence-panel" aria-label="Уверенность">
        <h3>4 · Уверенность</h3>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={confidence}
          disabled={sealed}
          onChange={(event) => setConfidence(Number(event.target.value))}
          aria-label="Уровень уверенности, 0–100"
          aria-valuetext={`${confidence} из 100`}
        />
        <b>{confidence}</b>
      </section>

      <div className="decision-dock" role="region" aria-label="Decision Dock">
        {sealed ? (
          <div className="dock-sealed" role="status">
            <div>
              <b>Решение зафиксировано</b>
              <small className="muted">
                {action ? ACTION_LABELS[action] ?? action : ""} · {selectedSources.size}{" "}
                источник(ов) · уверенность {confidence}. Оценка закреплена сервером.
              </small>
            </div>
            <button type="button" className="primary" onClick={onShowReveal}>
              Показать исход →
            </button>
          </div>
        ) : (
          <div className="dock-active">
            <div>
              <b>Decision Dock</b>
              <small className="muted">
                {canSeal
                  ? "Готово к фиксации. После seal решение изменить нельзя."
                  : "Выбери evidence, действие и заполни инвалидацию."}
              </small>
            </div>
            <button
              type="button"
              className="primary"
              disabled={!canSeal || sealing}
              onClick={handleSeal}
            >
              {sealing ? "Фиксируем…" : "Зафиксировать решение"}
            </button>
          </div>
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
  return date.toISOString().replace("T", " ").slice(0, 16);
}
