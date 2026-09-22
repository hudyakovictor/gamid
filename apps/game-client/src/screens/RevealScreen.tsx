import { ScoreBreakdown } from "../components/ScoreBreakdown";
import type { RunResponse, ScenarioRevealProjection, ScoreResult } from "../types";

type RevealScreenProps = {
  run: RunResponse | null;
  reveal: ScenarioRevealProjection | null;
  score: ScoreResult | null;
  onDebrief: () => void;
  onHub: () => void;
  onRematch: () => void;
};

/**
 * Historical Reveal + Score (stable screen ids `historical_reveal` and
 * `score`). This screen is reachable only after the server seal: the reveal
 * projection and the process score arrive from the API and are validated
 * through the contracts before rendering.
 */
export function RevealScreen({ run, reveal, score, onDebrief, onHub, onRematch }: RevealScreenProps) {
  if (!run || !reveal) {
    return (
      <div className="reveal">
        <p className="muted">
          Исход доступен только после фиксации решения. Заверши заход в рабочем
          пространстве.
        </p>
        <button type="button" className="secondary" onClick={onHub}>
          ← В хаб
        </button>
      </div>
    );
  }

  return (
    <div className="reveal">
      <section className="reveal-outcome" aria-label="Исторический исход">
        <span className="kicker">SERVER REVEAL · {run.state.toUpperCase()}</span>
        <h2>Исторический исход</h2>
        <p className="outcome-summary">{reveal.historicalOutcome.summary}</p>
        <dl className="reveal-meta">
          <div>
            <dt>Сегмент будущего</dt>
            <dd>
              {formatDate(reveal.historicalFutureSegment.from)} →{" "}
              {formatDate(reveal.historicalFutureSegment.to)}
            </dd>
          </div>
          <div>
            <dt>Хеш сегмента</dt>
            <dd className="hash">{reveal.historicalFutureSegment.contentHash}</dd>
          </div>
          <div>
            <dt>Entity сценария (канонические имена)</dt>
            <dd className="entity-list">
              {reveal.hiddenEntities.map((entity) => (
                <span key={entity} className="chip entity">
                  {entity}
                </span>
              ))}
            </dd>
          </div>
        </dl>
      </section>

      {score && (
        <section aria-label="Process score">
          <h3>Process Score</h3>
          <ScoreBreakdown score={score} />
        </section>
      )}

      <div className="reveal-actions">
        <button type="button" className="ghost" onClick={onHub}>
          ← В хаб
        </button>
        <button type="button" className="secondary" onClick={onRematch}>
          Реванш
        </button>
        <button type="button" className="primary" onClick={onDebrief}>
          К дебрифу →
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
  return date.toISOString().replace("T", " ").slice(0, 16) + "Z";
}
