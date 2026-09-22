/**
 * Notifications (stable screen id `notifications`): the notification center.
 * No notification service exists in the foundation slice — the screen keeps
 * the dismiss route and the empty state honest.
 */
export function NotificationsScreen() {
  return (
    <div className="notifications">
      <span className="kicker">NOTIFICATIONS</span>
      <h2>Уведомления</h2>
      <div className="empty-state" role="status">
        <span className="empty-icon">🔔</span>
        <b>Тишина</b>
        <p className="muted">
          Здесь будут турнирные напоминания, результаты и обновление сценариев.
        </p>
      </div>
    </div>
  );
}
