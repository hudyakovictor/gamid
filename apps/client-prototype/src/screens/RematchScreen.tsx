import type { ScenarioRevealProjection } from "../types";

type RematchScreenProps = {
  reveal: ScenarioRevealProjection | null;
  onNewRun: () => void;
  onHub: () => void;
};

/**
 * Rematch (stable screen id `rematch`): transfer test — the same threat in a
 * new context. The rematch logic comes from the server reveal; the new run
 * is a fresh idempotency key so the history stays clean.
 */
export function RematchScreen({ reveal, onNewRun, onHub }: RematchScreenProps) {
  if (!reveal) {
    return (
      <div className="rematch">
        <p className="muted">Реванш открывается после дебрифа завершённого захода.</p>
        <button type="button" className="secondary" onClick={onHub}>
          ← В хаб
        </button>
      </div>
    );
  }

  return (
    <div className="rematch">
      <span className="kicker">TRANSFER TEST</span>
      <h2>Реванш</h2>
      <p>
        Другой актив, та же угроза. Проверь, что навык переносится в новый
        контекст, а не только запоминается на одном кейсе.
      </p>
      <dl className="rematch-meta">
        <div>
          <dt>Целевой навык</dt>
          <dd>{reveal.rematchLogic.targetSkillId}</dd>
        </div>
        <div>
          <dt>Ограничения сценария</dt>
          <dd className="entity-list">
            {reveal.rematchLogic.scenarioConstraints.map((constraint) => (
              <span key={constraint} className="chip">
                {constraint}
              </span>
            ))}
          </dd>
        </div>
      </dl>
      <div className="rematch-actions">
        <button type="button" className="ghost" onClick={onHub}>
          ← В хаб
        </button>
        <button type="button" className="primary" onClick={onNewRun}>
          Новый заход →
        </button>
      </div>
    </div>
  );
}
