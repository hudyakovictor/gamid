/**
 * Collection (stable screen id `collection`): cosmetics the player owns.
 * Empty state in the foundation slice — no purchases or entitlements exist
 * yet, and the UI must not imply ownership.
 */
export function CollectionScreen() {
  return (
    <div className="collection">
      <span className="kicker">COLLECTION</span>
      <h2>Коллекция</h2>
      <div className="empty-state" role="status">
        <span className="empty-icon">▣</span>
        <b>Пока пусто</b>
        <p className="muted">
          Cosmetics (Profile Frames, Card Skins, Decision Seal Skins) появятся
          здесь после первой покупки. Оформление не влияет на score.
        </p>
      </div>
    </div>
  );
}
