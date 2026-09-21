type SettingsScreenProps = {
  authSource: "fixture" | "telegram" | null;
  reducedMotion: boolean;
  onLogout: () => void;
};

/**
 * Settings (stable screen id `settings`): auth mode, motion preference
 * (read from prefers-reduced-motion) and logout.
 */
export function SettingsScreen({ authSource, reducedMotion, onLogout }: SettingsScreenProps) {
  return (
    <div className="settings">
      <span className="kicker">SETTINGS</span>
      <h2>Настройки</h2>

      <dl className="settings-list">
        <div>
          <dt>Режим аутентификации</dt>
          <dd>
            {authSource === "telegram"
              ? "Telegram (initData, server-verified)"
              : authSource === "fixture"
                ? "Fixture (локальная разработка)"
                : "не определён"}
          </dd>
        </div>
        <div>
          <dt>Reduced motion</dt>
          <dd>{reducedMotion ? "включён (prefers-reduced-motion)" : "выключен"}</dd>
        </div>
        <div>
          <dt>Стек сценария</dt>
          <dd>server-authoritative: seal → reveal → score</dd>
        </div>
      </dl>

      <div className="settings-actions">
        <button type="button" className="danger" onClick={onLogout}>
          Выйти
        </button>
      </div>
    </div>
  );
}
