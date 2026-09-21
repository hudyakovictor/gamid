import { getKit, WidgetCard, type WidgetSpec } from "@signal-arena/ui-game";

/**
 * Shop (stable screen id `shop`): catalog without pay-to-win. The SKU
 * composition is canonical in docs/catalog_sku_spec.md; purchases (Telegram
 * Stars checkout) are not part of this slice, so the cards are informational.
 */
export function ShopScreen() {
  const shopKit = getKit("shop");

  const widgets: WidgetSpec[] = [
    {
      id: "coins",
      title: "Coin Packs",
      eyebrow: "BALANCE",
      description: "Telegram Stars используются только в checkout. Coins — единственный внутренний валютный счёт.",
      icon: "◉",
      footprint: "hero",
      tone: "teal",
      metric: "скоро",
      status: "CHECKOUT ОТСУТСТВУЕТ"
    },
    {
      id: "cosmetic",
      title: "Decision Seal Skin",
      eyebrow: "COSMETIC",
      description: "Меняет оформление печати решения, но не score.",
      icon: "◇",
      footprint: "wide",
      tone: "blue",
      metric: "400 Coins"
    },
    {
      id: "premium",
      title: "Premium · 30 дней",
      eyebrow: "FEATURED",
      description: "Расширенная аналитика, история и profile theme.",
      icon: "✦",
      footprint: "wide",
      tone: "green",
      metric: "599 Coins"
    },
    {
      id: "founder",
      title: "Founder Support",
      eyebrow: "LIMITED",
      description: "Поддержка инфраструктуры без инвестиционных обещаний.",
      icon: "◆",
      footprint: "full",
      tone: "amber",
      metric: "299 Coins"
    }
  ];

  return (
    <div className="shop">
      <p className="shop-note" role="note">
        Foundation: витрина без pay-to-win. Coins, XP, Energy и Mastery Stars
        никогда не влияют на score, исход, рейтинг или риск.
      </p>
      <div className="bento-grid" data-page={shopKit.id}>
        {widgets.map((spec) => (
          <WidgetCard key={spec.id} spec={spec} />
        ))}
      </div>
    </div>
  );
}
