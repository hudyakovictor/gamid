import { getKit, WidgetCard, type WidgetSpec } from "@signal-arena/ui-game";

/**
 * Tournaments (stable screen id `tournaments`): registration, live events,
 * seasons and results. Live scheduling is not part of the foundation slice.
 */
export function TournamentsScreen() {
  const tournamentsKit = getKit("tournaments");

  const widgets: WidgetSpec[] = [
    {
      id: "hero",
      title: "Sunday Blind Archive #09",
      eyebrow: "WEEKLY TOURNAMENT",
      description: "Один срез, одинаковые данные и server scoring. Регистрация откроется с сеткой турнира.",
      icon: "♜",
      footprint: "hero",
      tone: "amber",
      status: "ВСТАВКА ОТСУТСТВУЕТ"
    },
    {
      id: "qual",
      title: "Квалификация",
      eyebrow: "REQUIREMENTS",
      description: "Onboarding, 3 solo runs, 15 Mastery Stars.",
      icon: "✓",
      footprint: "wide",
      tone: "blue",
      metric: "0/3 runs"
    },
    {
      id: "rules",
      title: "Правила",
      eyebrow: "FAIR PLAY",
      description: "Speed — только объявленный tie-breaker. Score v1.",
      icon: "§",
      footprint: "wide",
      tone: "teal"
    },
    {
      id: "my",
      title: "Мои турниры",
      eyebrow: "HISTORY",
      description: "Результаты и зарегистрированные события появятся здесь.",
      icon: "◫",
      footprint: "full",
      tone: "green",
      metric: "0 событий"
    }
  ];

  return (
    <div className="tournaments">
      <div className="bento-grid" data-page={tournamentsKit.id}>
        {widgets.map((spec) => (
          <WidgetCard key={spec.id} spec={spec} />
        ))}
      </div>
    </div>
  );
}
