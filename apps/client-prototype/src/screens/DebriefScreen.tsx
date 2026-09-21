import type { ScenarioRevealProjection, ScoreResult } from "../types";

const DIMENSION_LABELS: Record<keyof ScoreResult["breakdown"], string> = {
  decision_quality: "качество решения",
  protocol_adherence: "следование протоколу",
  evidence_quality: "качество evidence",
  follow_up_decision_quality: "качество follow-up",
  risk_management: "управление риском",
  invalidation: "инвалидация",
  discipline: "дисциплина",
  entity_resistance: "устойчивость к Entity",
  confidence_calibration: "калибровка уверенности"
};

type DebriefScreenProps = {
  reveal: ScenarioRevealProjection | null;
  score: ScoreResult | null;
  onRematch: () => void;
  onHub: () => void;
};

/**
 * Debrief (stable screen id `debrief`): the server-authored debrief summary
 * plus a personal insight derived from the score breakdown (weakest
 * dimensions first). The insight is a client-side reading of server data —
 * it never changes the score.
 */
export function DebriefScreen({ reveal, score, onRematch, onHub }: DebriefScreenProps) {
  if (!reveal) {
    return (
      <div className="debrief">
        <p className="muted">Debrief доступен после исторического раскрытия.</p>
        <button type="button" className="secondary" onClick={onHub}>
          ← В хаб
        </button>
      </div>
    );
  }

  const weakest = score
    ? (Object.entries(score.breakdown) as Array<[keyof ScoreResult["breakdown"], number]>)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 2)
    : [];

  return (
    <div className="debrief">
      <section aria-label="Разбор сценария">
        <span className="kicker">DEBRIEF · {reveal.evaluationRules.rubricVersion}</span>
        <h2>Разбор</h2>
        <p className="debrief-summary">{reveal.debrief.summary}</p>
      </section>

      {score && (
        <section aria-label="Личный инсайт">
          <h3>Personal Insight</h3>
          {weakest.length > 0 && (
            <ul className="insight-list">
              {weakest.map(([dimension, value]) => (
                <li key={dimension}>
                  <span className="insight-dim">{DIMENSION_LABELS[dimension]}</span>
                  <span className="insight-value">{value}/100</span>
                </li>
              ))}
            </ul>
          )}
          <p className="muted">
            Следующие заходы: фокус на «{weakest[0] ? DIMENSION_LABELS[weakest[0][0]] : "—"}» и «
            {weakest[1] ? DIMENSION_LABELS[weakest[1][0]] : "—"}». Ошибка в процессе важнее
            результата сделки.
          </p>
        </section>
      )}

      <div className="debrief-actions">
        <button type="button" className="ghost" onClick={onHub}>
          ← В хаб
        </button>
        <button type="button" className="primary" onClick={onRematch}>
          Перенос навыка: реванш →
        </button>
      </div>
    </div>
  );
}
