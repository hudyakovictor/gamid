import type { ScoreResult } from "@signal-arena/contracts/src";

const DIMENSION_LABELS: Record<keyof ScoreResult["breakdown"], string> = {
  decision_quality: "Качество решения",
  protocol_adherence: "Следование протоколу",
  evidence_quality: "Качество evidence",
  follow_up_decision_quality: "Качество follow-up",
  risk_management: "Управление риском",
  invalidation: "Инвалидация",
  discipline: "Дисциплина",
  entity_resistance: "Устойчивость к Entity",
  confidence_calibration: "Калибровка уверенности"
};

export function ScoreBreakdown({ score }: { score: ScoreResult }) {
  const entries = Object.entries(score.breakdown) as Array<
    [keyof ScoreResult["breakdown"], number]
  >;

  return (
    <div className="score-panel">
      <div className="score-head">
        <div className="score-total" aria-label={`Process score ${score.score} из 100`}>
          <b>{score.score}</b>
          <span>/100</span>
        </div>
        <div className="score-meta">
          <span className="kicker">PROCESS SCORE</span>
          <small>rubric {score.rubricVersion}</small>
        </div>
      </div>
      <ul className="score-bars">
        {entries.map(([dimension, value]) => (
          <li key={dimension}>
            <span className="score-label" title={dimension}>
              {DIMENSION_LABELS[dimension]}
            </span>
            <span
              className="score-track"
              role="img"
              aria-label={`${DIMENSION_LABELS[dimension]}: ${value} из 100`}
            >
              <span className="score-fill" style={{ width: `${value}%` }} />
            </span>
            <span className="score-value">{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
