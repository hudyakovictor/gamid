import { useEffect, useState } from "react";

import { ApiClient, type RunSummary } from "../api/client";

type ProfileScreenProps = {
  userId: string | null;
  onOpenRuns: () => void;
};

/**
 * Profile (stable screen id `profile`): the authenticated identity and the
 * server-side run history — the "persistence" surface of the vertical slice.
 */
export function ProfileScreen({ userId, onOpenRuns }: ProfileScreenProps) {
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const api = new ApiClient();

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setRuns(null);
      return;
    }
    void (async () => {
      try {
        const history = await api.listRuns(userId);
        if (!cancelled) {
          setRuns(history);
        }
      } catch {
        if (!cancelled) {
          setRuns([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, userId]);

  return (
    <div className="profile">
      <section className="profile-head" aria-label="Аккаунт">
        <span className="kicker">ACCOUNT</span>
        <h2>Профиль</h2>
        <p className="muted">user: {userId ?? "—"}</p>
      </section>

      <section aria-label="История заходов">
        <h3>История заходов</h3>
        {runs === null ? (
          <p className="muted">Загружаем историю…</p>
        ) : runs.length === 0 ? (
          <p className="muted">Заходов пока нет. Начни первый сценарий на арене.</p>
        ) : (
          <ul className="profile-runs">
            {runs.map((run) => (
              <li key={run.runId}>
                <span className={`run-state state-${run.state}`}>{run.state}</span>
                <span className="run-scenario">{run.scenarioId}</span>
                <span className="muted">{formatDate(run.createdAt)}</span>
                <span className="run-score">
                  {run.score !== null ? `${run.score}/100` : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="profile-actions">
        <button type="button" className="secondary" onClick={onOpenRuns}>
          В хаб →
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
