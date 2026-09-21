import type { UserBalance } from "@signal-arena/contracts/src";

/**
 * One-row compact top bar (no logo) per docs/INTERFACE_SHELL.md and
 * docs/topbar_currency_ui_spec.md.
 *
 * All values are server-derived (GET /api/v1/users/:userId/balance) and
 * display-only: the client never computes progression or balances. When
 * the balance snapshot has not loaded yet, the slots render placeholders
 * instead of inventing numbers.
 */

export function ProductTopBar({
  balance,
  onNotifications,
  onSettings
}: {
  balance?: UserBalance | null;
  onNotifications: () => void;
  onSettings: () => void;
}) {
  const level = balance?.accountLevel ?? null;
  const xpIntoLevel = balance?.xpIntoLevel ?? null;
  const xpToNext = balance?.xpToNext ?? null;
  const energy = balance?.energy ?? null;
  const energyCap = balance?.energyCap ?? null;
  const masteryStars = balance?.masteryStars ?? null;
  const coins = balance?.coins ?? null;

  return (
    <header className="topbar">
      <div
        className="topbar-currencies"
        aria-label={balance ? "Баланс аккаунта (серверные значения)" : "Баланс аккаунта (загрузка)"}
      >
        <span
          className="slot"
          title={
            level === null
              ? "LVL —"
              : `LVL ${level} · ${xpIntoLevel}/${xpToNext} XP`
          }
        >
          LVL <b>{level ?? "—"}</b>
          <small>
            {xpIntoLevel === null || xpToNext === null
              ? "—/— XP"
              : `${xpIntoLevel}/${xpToNext} XP`}
          </small>
        </span>
        <span className="slot" title={energy === null ? "⚡ —" : `⚡ ${energy}/${energyCap}`}>
          ⚡{" "}
          <b>{energy === null ? "—" : `${energy}/${energyCap}`}</b>
        </span>
        <span className="slot" title={masteryStars === null ? "★ —" : `★ ${masteryStars}`}>
          ★ <b>{masteryStars ?? "—"}</b>
        </span>
        <span className="slot" title={coins === null ? "◉ —" : `◉ ${coins}`}>
          ◉ <b>{coins ?? "—"}</b>
        </span>
        <button type="button" className="icon-btn" onClick={onNotifications} aria-label="Уведомления">
          🔔
        </button>
        <button type="button" className="icon-btn" onClick={onSettings} aria-label="Настройки">
          ⚙
        </button>
      </div>
    </header>
  );
}
