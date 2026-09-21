import { z } from "zod";

import { SourceGroupSchema } from "../../contracts/src/scenario.js";

/**
 * Learning content registry (P1-6).
 *
 * Canonical structure from docs/academy_plan.md:
 * - display numbers 00–14 (stable IDs, not display numbers, are used by
 *   CMS, analytics, progression and rematch);
 * - Content ladder: Theory Module → Worked Example → Skill Card → Card
 *   Header → Recall → Decision → Debrief → Delayed Rematch;
 * - Scenario Level is an integer 1–99 and the module level ranges must
 *   cover it exactly;
 * - canonical Entity names remain exact English in every locale.
 *
 * This registry is the executable link between curriculum, Cards,
 * Protocols, Entities and Scenario Levels. It is data, not logic: the
 * validator in `validateContentRegistry` is what keeps it honest.
 */

export const ContentCardSchema = z
  .object({
    cardId: z.string().regex(/^c\d{2}_[a-z0-9_]+$/),
    displayTitle: z.string().min(2),
    assetId: z.string().min(1)
  })
  .strict();

export const ContentProtocolSchema = z
  .object({
    protocolId: z.string().regex(/^p\d{2}_[a-z0-9_]+$/),
    displayTitle: z.string().min(2)
  })
  .strict();

export const ContentEntitySchema = z
  .object({
    entityId: z.string().regex(/^[a-z0-9]+(_[a-z0-9]+)*$/),
    canonicalName: z.string().min(2),
    assetId: z.string().min(1)
  })
  .strict();

export const ContentChapterSchema = z
  .object({
    chapterId: z.string().regex(/^m\d{2}-ch\d{2}$/),
    moduleId: z.string().regex(/^m\d{2}(_[a-z0-9_]+)?$/),
    title: z.string().min(3)
  })
  .strict();

export const CardPolicySchema = z.enum(["fixed", "personal", "loadout"]);

export const TheoryModuleSchema = z
  .object({
    moduleId: z.string().regex(/^m\d{2}(_[a-z0-9_]+)?$/),
    displayNumber: z.string().regex(/^(00|0[1-9]|1[0-4])$/),
    title: z.string().min(2),
    /** Scenario levels the module owns. The onboarding module has none. */
    levelRange: z
      .tuple([z.number().int().min(1).max(99), z.number().int().max(99)])
      .optional(),
    sourceGroups: z.array(SourceGroupSchema).min(1).max(5),
    cardIds: z.array(z.string().min(1)),
    protocolIds: z.array(z.string().min(1)),
    entityIds: z.array(z.string().min(1)),
    chapterIds: z.array(z.string().min(1)),
    cardPolicy: CardPolicySchema
  })
  .strict();

export type ContentCard = z.infer<typeof ContentCardSchema>;
export type ContentProtocol = z.infer<typeof ContentProtocolSchema>;
export type ContentEntity = z.infer<typeof ContentEntitySchema>;
export type ContentChapter = z.infer<typeof ContentChapterSchema>;
export type TheoryModule = z.infer<typeof TheoryModuleSchema>;

/* ------------------------------------------------------------------ */
/* Cards — stable IDs match assets/skill-cards/*.svg (asset manifest)  */
/* ------------------------------------------------------------------ */

export const contentCards: ContentCard[] = [
  { cardId: "c01_market_structure", displayTitle: "Market Structure", assetId: "skill_card_c01_market_structure_art" },
  { cardId: "c02_higher_timeframe", displayTitle: "Higher Timeframe", assetId: "skill_card_c02_higher_timeframe_art" },
  { cardId: "c03_volume_confirmation", displayTitle: "Volume Confirmation", assetId: "skill_card_c03_volume_confirmation_art" },
  { cardId: "c04_liquidity_map", displayTitle: "Liquidity Map", assetId: "skill_card_c04_liquidity_map_art" },
  { cardId: "c05_volatility_context", displayTitle: "Volatility Context", assetId: "skill_card_c05_volatility_context_art" },
  { cardId: "c06_correlation_check", displayTitle: "Correlation Check", assetId: "skill_card_c06_correlation_check_art" },
  { cardId: "c07_derivatives_pulse", displayTitle: "Derivatives Pulse", assetId: "skill_card_c07_derivatives_pulse_art" },
  { cardId: "c08_news_context", displayTitle: "News Context", assetId: "skill_card_c08_news_context_art" },
  { cardId: "c09_social_sentiment", displayTitle: "Social Sentiment", assetId: "skill_card_c09_social_sentiment_art" },
  { cardId: "c10_macro_context", displayTitle: "Macro Context", assetId: "skill_card_c10_macro_context_art" },
  { cardId: "c11_onchain_flow", displayTitle: "On-Chain Flow", assetId: "skill_card_c11_onchain_flow_art" },
  { cardId: "c12_tokenomics_review", displayTitle: "Tokenomics Review", assetId: "skill_card_c12_tokenomics_review_art" },
  { cardId: "c13_unlock_calendar", displayTitle: "Unlock Calendar", assetId: "skill_card_c13_unlock_calendar_art" },
  { cardId: "c14_infrastructure_risk", displayTitle: "Infrastructure Risk", assetId: "skill_card_c14_infrastructure_risk_art" },
  { cardId: "c15_source_quality", displayTitle: "Source Quality", assetId: "skill_card_c15_source_quality_art" },
  { cardId: "c16_enter_now", displayTitle: "Enter Now", assetId: "skill_card_c16_enter_now_art" },
  { cardId: "c17_wait_for_retest", displayTitle: "Wait for Retest", assetId: "skill_card_c17_wait_for_retest_art" },
  { cardId: "c18_define_entry_zone", displayTitle: "Define Entry Zone", assetId: "skill_card_c18_define_entry_zone_art" },
  { cardId: "c19_define_invalidation", displayTitle: "Define Invalidation", assetId: "skill_card_c19_define_invalidation_art" },
  { cardId: "c20_set_structural_stop", displayTitle: "Set Structural Stop", assetId: "skill_card_c20_set_structural_stop_art" },
  { cardId: "c21_target_liquidity", displayTitle: "Target Liquidity", assetId: "skill_card_c21_target_liquidity_art" },
  { cardId: "c22_minimum_r_multiple", displayTitle: "Minimum R-Multiple", assetId: "skill_card_c22_minimum_r_multiple_art" },
  { cardId: "c23_scale_out", displayTitle: "Scale Out", assetId: "skill_card_c23_scale_out_art" },
  { cardId: "c24_no_trade_is_a_decision", displayTitle: "No Trade Is a Decision", assetId: "skill_card_c24_no_trade_is_a_decision_art" },
  { cardId: "c25_evidence_only", displayTitle: "Evidence Only", assetId: "skill_card_c25_evidence_only_art" },
  { cardId: "c26_noise_quarantine", displayTitle: "Noise Quarantine", assetId: "skill_card_c26_noise_quarantine_art" },
  { cardId: "c27_risk_first_mode", displayTitle: "Risk-First Mode", assetId: "skill_card_c27_risk_first_mode_art" },
  { cardId: "c28_no_confirmation_no_trade", displayTitle: "No Confirmation No Trade", assetId: "skill_card_c28_no_confirmation_no_trade_art" },
  { cardId: "c29_higher_timeframe_check", displayTitle: "Higher Timeframe Check", assetId: "skill_card_c29_higher_timeframe_check_art" },
  { cardId: "c30_after_a_loss", displayTitle: "After a Loss", assetId: "skill_card_c30_after_a_loss_art" },
  { cardId: "c31_discipline_over_profit", displayTitle: "Discipline Over Profit", assetId: "skill_card_c31_discipline_over_profit_art" },
  { cardId: "c32_out_of_market_is_normal", displayTitle: "Out of Market Is Normal", assetId: "skill_card_c32_out_of_market_is_normal_art" },
  { cardId: "c33_news_is_not_a_signal", displayTitle: "News Is Not a Signal", assetId: "skill_card_c33_news_is_not_a_signal_art" },
  { cardId: "c34_wait_for_stabilization", displayTitle: "Wait for Stabilization", assetId: "skill_card_c34_wait_for_stabilization_art" },
  { cardId: "c35_do_not_chase", displayTitle: "Do Not Chase", assetId: "skill_card_c35_do_not_chase_art" },
  { cardId: "c36_avoid_revenge_trading", displayTitle: "Avoid Revenge Trading", assetId: "skill_card_c36_avoid_revenge_trading_art" },
  { cardId: "c37_no_averaging_without_a_plan", displayTitle: "No Averaging Without a Plan", assetId: "skill_card_c37_no_averaging_without_a_plan_art" },
  { cardId: "c38_risk_cap", displayTitle: "Risk Cap", assetId: "skill_card_c38_risk_cap_art" },
  { cardId: "c39_confidence_check", displayTitle: "Confidence Check", assetId: "skill_card_c39_confidence_check_art" },
  { cardId: "c40_preserve_the_system", displayTitle: "Preserve the System", assetId: "skill_card_c40_preserve_the_system_art" }
];

/* ------------------------------------------------------------------ */
/* Protocols — p01 is canonical in the foundation ScenarioPackage      */
/* ------------------------------------------------------------------ */

export const contentProtocols: ContentProtocol[] = [
  { protocolId: "p01_evidence_only", displayTitle: "Evidence Only" },
  { protocolId: "p02_risk_first_mode", displayTitle: "Risk-First Mode" },
  { protocolId: "p03_discipline_over_profit", displayTitle: "Discipline Over Profit" },
  { protocolId: "p04_no_confirmation_no_trade", displayTitle: "No Confirmation No Trade" },
  { protocolId: "p05_higher_timeframe_check", displayTitle: "Higher Timeframe Check" },
  { protocolId: "p06_noise_quarantine", displayTitle: "Noise Quarantine" },
  { protocolId: "p07_after_a_loss", displayTitle: "After a Loss" },
  { protocolId: "p08_preserve_the_system", displayTitle: "Preserve the System" },
  { protocolId: "p09_confidence_check", displayTitle: "Confidence Check" }
];

/* ------------------------------------------------------------------ */
/* Entities — canonical exact-English names; one unified Entity group  */
/* ------------------------------------------------------------------ */

const entity = (entityId: string, canonicalName: string): ContentEntity => ({
  entityId,
  canonicalName,
  assetId: `entity_${entityId}_portrait`
});

export const contentEntities: ContentEntity[] = [
  entity("anchor_golem", "Anchor Golem"),
  entity("approval_leech", "Approval Leech"),
  entity("averaging_maw", "Averaging Maw"),
  entity("bridge_wraith", "Bridge Wraith"),
  entity("certainty_siren", "Certainty Siren"),
  entity("confirmation_bias_cult", "Confirmation Bias Cult"),
  entity("correlation_spider", "Correlation Spider"),
  entity("cycle_ouroboros", "Cycle Ouroboros"),
  entity("dopamine_imp", "Dopamine Imp"),
  entity("drawdown_leviathan", "Drawdown Leviathan"),
  entity("expectancy_sphinx", "Expectancy Sphinx"),
  entity("fake_breakout_phantom", "Fake Breakout Phantom"),
  entity("fomo_wraith", "FOMO Wraith"),
  entity("governance_golem", "Governance Golem"),
  entity("headline_titan", "Headline Titan"),
  entity("honeypot_mimic", "Honeypot Mimic"),
  entity("hubris_dragon", "Hubris Dragon"),
  entity("indicator_cult", "Indicator Cult"),
  entity("insider_syndicate", "Insider Syndicate"),
  entity("leverage_goblin", "Leverage Goblin"),
  entity("liquidity_hydra", "Liquidity Hydra"),
  entity("loss_aversion_wraith", "Loss Aversion Wraith"),
  entity("meme_mirage", "Meme Mirage"),
  entity("narrative_siren", "Narrative Siren"),
  entity("paper_hands_poltergeist", "Paper-Hands Poltergeist"),
  entity("regime_shifter", "Regime Shifter"),
  entity("revenge_wraith", "Revenge Wraith"),
  entity("risk_mirage", "Risk Mirage"),
  entity("routine_rot", "Routine Rot"),
  entity("rug_pull_phantom", "Rug Pull Phantom"),
  entity("slippage_slime", "Slippage Slime"),
  entity("social_echo", "Social Echo"),
  entity("stop_hunt_kraken", "Stop-Hunt Kraken"),
  entity("system_breaker", "System Breaker"),
  entity("token_parasite", "Token Parasite"),
  entity("unlock_titan", "Unlock Titan"),
  entity("volatility_chimera", "Volatility Chimera"),
  entity("whale_syndicate", "Whale Syndicate"),
  entity("wick_mimic", "Wick Mimic"),
  entity("yield_chimera", "Yield Chimera")
];

/* ------------------------------------------------------------------ */
/* Chapters — titles from docs/academy_plan.md (display copy)          */
/* ------------------------------------------------------------------ */

type ChapterSeed = { moduleId: string; titles: string[] };

const chapterSeeds: ChapterSeed[] = [
  {
    moduleId: "m00_intro",
    titles: [
      "Рынок не твой наставник. Он бухгалтер.",
      "Почему игра скрывает будущее, дату и имя сущности.",
      "Почему PnL не является главным score.",
      "Как читать Decision Sheet.",
      "Как работают Cards: не кнопки победы, а инструменты проверки.",
      "Как работают Entities: не монстры, а повторяющиеся причины плохих решений.",
      "Что такое решение на 99 баллов."
    ]
  },
  {
    moduleId: "m01_decision_foundations",
    titles: [
      "Хорошее решение ≠ хороший исход",
      "Long, Short, Wait, No Trade: четыре законных действия",
      "Факт, интерпретация, гипотеза, мнение: отделение костей от супа",
      "Evidence Only: доказательство должно наблюдаться, а не нравиться",
      "Иерархия evidence: цена, структура, объём, контекст, источник",
      "Инвалидация до входа: где идея умирает",
      "Risk-First Mode: сначала риск, потом желание",
      "Confidence Check: индекс веры в график",
      "Decision Sheet на 99 баллов"
    ]
  },
  {
    moduleId: "m02_price_structure",
    titles: [
      "Свеча — не сигнал, а след сделки",
      "Тренд, диапазон, переход: три режима, три набора рисков",
      "HH/HL и LH/LL: кто контролирует цену",
      "Слом структуры или шум: как не принять фитиль за революцию",
      "Уровни как зоны: рынок не обязан уважать твою линию",
      "Принятие и отвержение цены",
      "Entry Zone: вход зоной, а не молитвой на одну цену",
      "Когда структура говорит “Wait”",
      "Что структура не может доказать без контекста"
    ]
  },
  {
    moduleId: "m03_breakout_validation",
    titles: [
      "Пробой — это факт, не разрешение на Long",
      "Анатомия пробоя: уровень, импульс, объём, закрепление, ретест",
      "Volume Confirmation: когда объём подтверждает, а когда выдаёт ловушку",
      "Wait for Retest: рынок должен доказать, что уровень теперь работает",
      "Ложный пробой: рынок открыл дверь, чтобы проверить, кто побежит",
      "Stop-Hunt: очевидная ликвидность как публичный буфет",
      "Enter Now: когда агрессивный вход допустим",
      "No Confirmation, No Trade: отсутствие сделки как фильтр выживания"
    ]
  },
  {
    moduleId: "m04_higher_timeframe",
    titles: [
      "Почему локальный сигнал может быть шумом",
      "Старший ТФ как карта территории",
      "Старший тренд против младшего входа",
      "Диапазон на HTF: красивые сетапы внутри клетки",
      "Согласование таймфреймов",
      "HTF и место для target",
      "HTF и structural stop",
      "Как не утонуть в бесконечном анализе"
    ]
  },
  {
    moduleId: "m05_risk_invalidation",
    titles: [
      "Риск — это не расстояние до стопа",
      "Инвалидация: точка смерти идеи",
      "Structural Stop: защита за причиной, а не за надеждой",
      "Volatility Context: одинаковый паттерн, разная цена ошибки",
      "Risk Cap: предел, после которого начинается ритуал самообмана",
      "Risk Profile: aggressive, conservative, conditional, no trade",
      "Risk/Reward: правильная идея может быть плохой сделкой",
      "Когда лучший риск — отсутствие позиции"
    ]
  },
  {
    moduleId: "m06_liquidity_targets",
    titles: [
      "Что такое ликвидность в игровом анализе",
      "Где стоят очевидные стопы",
      "Liquidity Map: карта чужих обязательств",
      "Target Liquidity: цель там, где есть причина для движения",
      "Minimum R-Multiple: рынок может быть прав, а сделка — нет",
      "Близкая цель и дорогой риск",
      "Scale Out: частичный выход до эмоций",
      "Liquidity Hydra: когда целей много, а ясности мало"
    ]
  },
  {
    moduleId: "m07_position_management",
    titles: [
      "План не заканчивается на входе",
      "Hold Plan: ничего не делать тоже действие",
      "Reduce Risk: снижение риска без паники",
      "Close Position: выход как признание факта",
      "Move Protection: защита двигается за структурой, не за страхом",
      "Do Not Average: усреднение без плана — культ спасения утопающего",
      "Paper Hands: ранний выход из хорошей идеи",
      "Loss Aversion: отказ признать смерть плана",
      "In-Position Decision Sheet на 99 баллов"
    ]
  },
  {
    moduleId: "m08_discipline",
    titles: [
      "FOMO: страх не успеть к чужой прибыли",
      "Do Not Chase: если точка риска ушла, ушла и сделка",
      "Revenge Trading: рынок не обязан возвращать самооценку",
      "Overtrading: тяга к действию как налог на скуку",
      "Hubris после серии успехов",
      "Drawdown Leviathan: просадка как проверка системы",
      "Out of Market Is Normal: вне рынка — не поражение",
      "Routine Rot: старый шаблон в новом режиме",
      "System Breaker: сознательное нарушение протокола"
    ]
  },
  {
    moduleId: "m09_information_quality",
    titles: [
      "Источник, пересказ, слух: три стадии разложения факта",
      "Source Quality: кто сказал, что именно, и можно ли это проверить",
      "News Context: событие против реакции рынка",
      "News Is Not a Signal: департамент громких заголовков закрыт",
      "Social Sentiment: стадо шумит, но не подписывает твой риск",
      "Narrative Siren: красивая история как дорогая ловушка",
      "Confirmation Bias: когда ты нанимаешь факты защищать твоё мнение",
      "Noise Quarantine: мусор в карантин, план — в Decision Sheet"
    ]
  },
  {
    moduleId: "m10_flow_derivatives_regime",
    titles: [
      "Correlation Check: связанный актив подал сигнал тревоги",
      "Relative Strength: кто сильнее рынка, а кто просто громче",
      "Derivatives Pulse: OI, funding, ликвидации и переполненная сторона",
      "Funding: стоимость веры в позицию",
      "Liquidations: принудительный выход как топливо движения",
      "Volume vs Price: когда движение не получает поддержки",
      "Regime Shifter: рынок сменил сезон, а ты пришёл в прошлогодней форме",
      "Когда flow противоречит гипотезе"
    ]
  },
  {
    moduleId: "m11_token_web3_risk",
    titles: [
      "Токен — не свеча, а договор о будущей боли",
      "Tokenomics Review: эмиссия, float, распределение, utility",
      "Unlock Calendar: будущая продажа ещё не случилась, но риск уже здесь",
      "On-Chain Flow: крупный перевод — факт, намерение — нет",
      "Whale Syndicate: кит двинулся, толпа написала легенду",
      "Infrastructure Risk: контракт, мост, ликвидность, выход",
      "Honeypot и Approval Risk: купить можно, выйти — это DLC",
      "Governance и Insider Asymmetry",
      "Yield Chimera: высокий APY как рекламный плакат над ямой"
    ]
  },
  {
    moduleId: "m12_macro_uncertainty",
    titles: [
      "Macro Context: фон вероятностей, не кнопка направления",
      "Event Risk: рынок ждёт новость, а игрок уже празднует",
      "Risk-on / Risk-off: аппетит к риску как коллективное настроение",
      "Сценарное мышление: если A, если B, если ничего",
      "Confidence Calibration при неполных данных",
      "Wait перед событием: скучное решение, которое спасает систему",
      "Macro conflict: когда график и внешний фон спорят"
    ]
  },
  {
    moduleId: "m13_mastery_personal_system",
    titles: [
      "Account Level ≠ PnL, часы, клики или коллекция карт",
      "Decision Trace: рынок забыл, система записала",
      "Personal Baseline: сравнение с собой, а не с легендой из чата",
      "Blind Spot: повторяющаяся слепая зона",
      "Weak Pattern: ошибка, которая умеет менять костюм",
      "Strong Edge: что ты действительно делаешь стабильно хорошо",
      "7-day Edge Plan: неделя без героизма, только ремонт системы",
      "Rematch: не тот же сценарий, а та же угроза в новой маске",
      "Transfer Across Contexts: актив, режим, таймфрейм, позиция, серия"
    ]
  },
  {
    moduleId: "m14_tournament_preparation",
    titles: [
      "Турнир — не гонка кликов",
      "Equal Scenario: одинаковая ситуация, разные головы",
      "Минимально достаточный анализ",
      "Protocol under pressure",
      "Evidence quality как главный турнирный фильтр",
      "Follow-up decision: второй ход часто выдаёт первый самообман",
      "Speed tie-breaker: быстро ошибиться можно и без турнира"
    ]
  }
];

export const contentChapters: ContentChapter[] = chapterSeeds.flatMap((seed) =>
  seed.titles.map((title, index) => {
    const modulePrefix = seed.moduleId.slice(0, 3);
    return {
      chapterId: `${modulePrefix}-ch${String(index + 1).padStart(2, "0")}`,
      moduleId: seed.moduleId,
      title
    };
  })
);

/* ------------------------------------------------------------------ */
/* Theory modules — display numbers 00–14, levels cover 1–99 exactly   */
/* ------------------------------------------------------------------ */

export const theoryModules: TheoryModule[] = [
  {
    moduleId: "m00_intro",
    displayNumber: "00",
    title: "Вход в Академию: “Ты здесь не за сигналами”",
    sourceGroups: ["PRICE"],
    cardIds: ["c25_evidence_only", "c24_no_trade_is_a_decision"],
    protocolIds: ["p01_evidence_only"],
    entityIds: [],
    chapterIds: contentChapters
      .filter((chapter) => chapter.moduleId === "m00_intro")
      .map((chapter) => chapter.chapterId),
    cardPolicy: "fixed"
  },
  {
    moduleId: "m01_decision_foundations",
    displayNumber: "01",
    title: "Decision Foundations / Фундамент решения",
    levelRange: [1, 7],
    sourceGroups: ["PRICE", "CONTEXT"],
    cardIds: ["c25_evidence_only", "c19_define_invalidation", "c24_no_trade_is_a_decision", "c39_confidence_check"],
    protocolIds: ["p02_risk_first_mode", "p03_discipline_over_profit"],
    entityIds: ["certainty_siren", "expectancy_sphinx", "fomo_wraith", "system_breaker"],
    chapterIds: contentChapters
      .filter((chapter) => chapter.moduleId === "m01_decision_foundations")
      .map((chapter) => chapter.chapterId),
    cardPolicy: "fixed"
  },
  {
    moduleId: "m02_price_structure",
    displayNumber: "02",
    title: "Price Structure / Рыночная структура",
    levelRange: [8, 14],
    sourceGroups: ["PRICE"],
    cardIds: ["c01_market_structure", "c18_define_entry_zone", "c16_enter_now", "c17_wait_for_retest"],
    protocolIds: ["p01_evidence_only", "p04_no_confirmation_no_trade"],
    entityIds: ["wick_mimic", "fake_breakout_phantom", "routine_rot", "regime_shifter"],
    chapterIds: contentChapters
      .filter((chapter) => chapter.moduleId === "m02_price_structure")
      .map((chapter) => chapter.chapterId),
    cardPolicy: "fixed"
  },
  {
    moduleId: "m03_breakout_validation",
    displayNumber: "03",
    title: "Breakout Validation / Проверка пробоя",
    levelRange: [15, 21],
    sourceGroups: ["PRICE", "FLOW"],
    cardIds: ["c03_volume_confirmation", "c17_wait_for_retest", "c01_market_structure", "c28_no_confirmation_no_trade"],
    protocolIds: ["p04_no_confirmation_no_trade", "p01_evidence_only"],
    entityIds: ["fake_breakout_phantom", "stop_hunt_kraken", "wick_mimic", "fomo_wraith"],
    chapterIds: contentChapters
      .filter((chapter) => chapter.moduleId === "m03_breakout_validation")
      .map((chapter) => chapter.chapterId),
    cardPolicy: "fixed"
  },
  {
    moduleId: "m04_higher_timeframe",
    displayNumber: "04",
    title: "Higher Timeframe / Старший таймфрейм",
    levelRange: [22, 28],
    sourceGroups: ["PRICE", "CONTEXT"],
    cardIds: ["c02_higher_timeframe", "c29_higher_timeframe_check", "c01_market_structure", "c21_target_liquidity"],
    protocolIds: ["p05_higher_timeframe_check"],
    entityIds: ["routine_rot", "regime_shifter", "certainty_siren"],
    chapterIds: contentChapters
      .filter((chapter) => chapter.moduleId === "m04_higher_timeframe")
      .map((chapter) => chapter.chapterId),
    cardPolicy: "fixed"
  },
  {
    moduleId: "m05_risk_invalidation",
    displayNumber: "05",
    title: "Risk & Invalidation / Риск и инвалидация",
    levelRange: [29, 35],
    sourceGroups: ["PRICE", "FLOW", "CONTEXT"],
    cardIds: ["c19_define_invalidation", "c20_set_structural_stop", "c05_volatility_context", "c38_risk_cap", "c22_minimum_r_multiple"],
    protocolIds: ["p02_risk_first_mode"],
    entityIds: ["risk_mirage", "leverage_goblin", "loss_aversion_wraith", "slippage_slime"],
    chapterIds: contentChapters
      .filter((chapter) => chapter.moduleId === "m05_risk_invalidation")
      .map((chapter) => chapter.chapterId),
    cardPolicy: "fixed"
  },
  {
    moduleId: "m06_liquidity_targets",
    displayNumber: "06",
    title: "Liquidity & Targets / Ликвидность и цели",
    levelRange: [36, 42],
    sourceGroups: ["PRICE", "FLOW"],
    cardIds: ["c04_liquidity_map", "c21_target_liquidity", "c22_minimum_r_multiple", "c23_scale_out"],
    protocolIds: ["p02_risk_first_mode", "p01_evidence_only"],
    entityIds: ["stop_hunt_kraken", "liquidity_hydra", "slippage_slime", "risk_mirage"],
    chapterIds: contentChapters
      .filter((chapter) => chapter.moduleId === "m06_liquidity_targets")
      .map((chapter) => chapter.chapterId),
    cardPolicy: "fixed"
  },
  {
    moduleId: "m07_position_management",
    displayNumber: "07",
    title: "Position Management / Управление позицией",
    levelRange: [43, 49],
    sourceGroups: ["PRICE", "FLOW", "CONTEXT"],
    cardIds: ["c37_no_averaging_without_a_plan", "c40_preserve_the_system", "c38_risk_cap", "c23_scale_out", "c19_define_invalidation"],
    protocolIds: ["p03_discipline_over_profit", "p08_preserve_the_system"],
    entityIds: ["averaging_maw", "loss_aversion_wraith", "paper_hands_poltergeist", "anchor_golem"],
    chapterIds: contentChapters
      .filter((chapter) => chapter.moduleId === "m07_position_management")
      .map((chapter) => chapter.chapterId),
    cardPolicy: "fixed"
  },
  {
    moduleId: "m08_discipline",
    displayNumber: "08",
    title: "Discipline / Дисциплина под давлением",
    levelRange: [50, 56],
    sourceGroups: ["PRICE", "CONTEXT", "EVENT"],
    cardIds: ["c35_do_not_chase", "c36_avoid_revenge_trading", "c30_after_a_loss", "c32_out_of_market_is_normal", "c40_preserve_the_system"],
    protocolIds: ["p07_after_a_loss", "p03_discipline_over_profit"],
    entityIds: ["fomo_wraith", "revenge_wraith", "dopamine_imp", "hubris_dragon", "drawdown_leviathan", "system_breaker"],
    chapterIds: contentChapters
      .filter((chapter) => chapter.moduleId === "m08_discipline")
      .map((chapter) => chapter.chapterId),
    cardPolicy: "fixed"
  },
  {
    moduleId: "m09_information_quality",
    displayNumber: "09",
    title: "Information Quality / Качество информации",
    levelRange: [57, 63],
    sourceGroups: ["EVENT", "PRICE", "CONTEXT"],
    cardIds: ["c15_source_quality", "c08_news_context", "c09_social_sentiment", "c25_evidence_only", "c26_noise_quarantine", "c33_news_is_not_a_signal"],
    protocolIds: ["p01_evidence_only", "p06_noise_quarantine"],
    entityIds: ["headline_titan", "narrative_siren", "meme_mirage", "social_echo", "confirmation_bias_cult"],
    chapterIds: contentChapters
      .filter((chapter) => chapter.moduleId === "m09_information_quality")
      .map((chapter) => chapter.chapterId),
    cardPolicy: "fixed"
  },
  {
    moduleId: "m10_flow_derivatives_regime",
    displayNumber: "10",
    title: "Flow, Derivatives & Regime / Поток, деривативы и режим",
    levelRange: [64, 70],
    sourceGroups: ["FLOW", "CONTEXT", "PRICE"],
    cardIds: ["c06_correlation_check", "c07_derivatives_pulse", "c03_volume_confirmation", "c05_volatility_context"],
    protocolIds: ["p01_evidence_only", "p09_confidence_check"],
    entityIds: ["correlation_spider", "volatility_chimera", "regime_shifter", "slippage_slime"],
    chapterIds: contentChapters
      .filter((chapter) => chapter.moduleId === "m10_flow_derivatives_regime")
      .map((chapter) => chapter.chapterId),
    cardPolicy: "fixed"
  },
  {
    moduleId: "m11_token_web3_risk",
    displayNumber: "11",
    title: "Token & Web3 Risk / Токен, ончейн и инфраструктура",
    levelRange: [71, 77],
    sourceGroups: ["PROJECT", "FLOW", "EVENT", "PRICE"],
    cardIds: ["c12_tokenomics_review", "c13_unlock_calendar", "c11_onchain_flow", "c14_infrastructure_risk", "c15_source_quality"],
    protocolIds: ["p01_evidence_only", "p06_noise_quarantine", "p02_risk_first_mode"],
    entityIds: ["unlock_titan", "whale_syndicate", "honeypot_mimic", "approval_leech", "token_parasite", "governance_golem", "insider_syndicate", "yield_chimera", "bridge_wraith"],
    chapterIds: contentChapters
      .filter((chapter) => chapter.moduleId === "m11_token_web3_risk")
      .map((chapter) => chapter.chapterId),
    cardPolicy: "fixed"
  },
  {
    moduleId: "m12_macro_uncertainty",
    displayNumber: "12",
    title: "Macro & Uncertainty / Макро и неопределённость",
    levelRange: [78, 84],
    sourceGroups: ["EVENT", "CONTEXT", "PRICE"],
    cardIds: ["c10_macro_context", "c39_confidence_check", "c08_news_context", "c25_evidence_only"],
    protocolIds: ["p09_confidence_check", "p02_risk_first_mode"],
    entityIds: ["certainty_siren", "narrative_siren", "headline_titan", "regime_shifter"],
    chapterIds: contentChapters
      .filter((chapter) => chapter.moduleId === "m12_macro_uncertainty")
      .map((chapter) => chapter.chapterId),
    cardPolicy: "fixed"
  },
  {
    moduleId: "m13_mastery_personal_system",
    displayNumber: "13",
    title: "Mastery & Personal System / Мастерство и личная система",
    levelRange: [85, 92],
    sourceGroups: ["PRICE", "CONTEXT", "FLOW", "EVENT", "PROJECT"],
    cardIds: ["c39_confidence_check", "c38_risk_cap", "c40_preserve_the_system", "c24_no_trade_is_a_decision"],
    protocolIds: ["p03_discipline_over_profit", "p08_preserve_the_system"],
    // Docs: “все, по истории столкновений” — the personal loadout is
    // resolved at runtime from the player's entity history.
    entityIds: contentEntities.map((contentEntity) => contentEntity.entityId),
    chapterIds: contentChapters
      .filter((chapter) => chapter.moduleId === "m13_mastery_personal_system")
      .map((chapter) => chapter.chapterId),
    cardPolicy: "personal"
  },
  {
    moduleId: "m14_tournament_preparation",
    displayNumber: "14",
    title: "Tournament Preparation / Турнирное мышление",
    levelRange: [93, 99],
    sourceGroups: ["PRICE", "CONTEXT", "FLOW", "EVENT", "PROJECT"],
    cardIds: ["c25_evidence_only", "c28_no_confirmation_no_trade", "c22_minimum_r_multiple"],
    protocolIds: ["p03_discipline_over_profit", "p08_preserve_the_system"],
    entityIds: ["fomo_wraith", "certainty_siren", "revenge_wraith"],
    chapterIds: contentChapters
      .filter((chapter) => chapter.moduleId === "m14_tournament_preparation")
      .map((chapter) => chapter.chapterId),
    cardPolicy: "loadout"
  }
];

/* ------------------------------------------------------------------ */
/* Validator                                                           */
/* ------------------------------------------------------------------ */

const CYRILLIC = /[\u0400-\u04FF]/;

export function validateContentRegistry(): string[] {
  const issues: string[] = [];
  const cardIds = new Set(contentCards.map((card) => card.cardId));
  const protocolIds = new Set(contentProtocols.map((protocol) => protocol.protocolId));
  const entityIds = new Set(contentEntities.map((contentEntity) => contentEntity.entityId));
  const chapterIds = new Set(contentChapters.map((chapter) => chapter.chapterId));
  const moduleIds = new Set(theoryModules.map((module) => module.moduleId));

  // Stable IDs must be unique.
  if (cardIds.size !== contentCards.length) issues.push("Duplicate cardId in content cards");
  if (protocolIds.size !== contentProtocols.length) issues.push("Duplicate protocolId in content protocols");
  if (entityIds.size !== contentEntities.length) issues.push("Duplicate entityId in content entities");
  if (chapterIds.size !== contentChapters.length) issues.push("Duplicate chapterId in content chapters");
  if (moduleIds.size !== theoryModules.length) issues.push("Duplicate moduleId in theory modules");

  // Canonical Entity names remain exact English (no transliteration, no
  // Cyrillic) in every locale.
  for (const contentEntity of contentEntities) {
    if (CYRILLIC.test(contentEntity.canonicalName)) {
      issues.push(
        `Entity ${contentEntity.entityId} canonical name must remain exact English: ${contentEntity.canonicalName}`
      );
    }
    if (contentEntity.canonicalName !== contentEntity.canonicalName.trim()) {
      issues.push(`Entity ${contentEntity.entityId} canonical name has padding whitespace`);
    }
  }

  // Display numbers are exactly 00–14, each used once.
  const displayNumbers = theoryModules.map((module) => module.displayNumber).sort();
  const expectedNumbers = Array.from({ length: 15 }, (_, index) =>
    String(index).padStart(2, "0")
  );
  if (JSON.stringify(displayNumbers) !== JSON.stringify(expectedNumbers)) {
    issues.push(
      `Theory module display numbers must be exactly 00–14 once each, got: ${displayNumbers.join(", ")}`
    );
  }

  for (const module of theoryModules) {
    // Module schema parse (also enforced by the data above, but this keeps
    // the validator self-contained for external callers).
    const parsed = TheoryModuleSchema.safeParse(module);
    if (!parsed.success) {
      issues.push(`Module ${module.moduleId} failed schema: ${parsed.error.issues[0]?.message ?? "unknown"}`);
      continue;
    }

    for (const cardId of module.cardIds) {
      if (!cardIds.has(cardId)) {
        issues.push(`Module ${module.moduleId} references unknown card ${cardId}`);
      }
    }
    for (const protocolId of module.protocolIds) {
      if (!protocolIds.has(protocolId)) {
        issues.push(`Module ${module.moduleId} references unknown protocol ${protocolId}`);
      }
    }
    for (const entityId of module.entityIds) {
      if (!entityIds.has(entityId)) {
        issues.push(`Module ${module.moduleId} references unknown entity ${entityId}`);
      }
    }
    for (const chapterId of module.chapterIds) {
      if (!chapterIds.has(chapterId)) {
        issues.push(`Module ${module.moduleId} references unknown chapter ${chapterId}`);
      }
    }

    if (module.levelRange) {
      const [from, to] = module.levelRange;
      if (to < from) {
        issues.push(`Module ${module.moduleId} level range is inverted: ${from}..${to}`);
      }
    }
  }

  // Chapters must belong to their owning module.
  for (const chapter of contentChapters) {
    if (!moduleIds.has(chapter.moduleId)) {
      issues.push(`Chapter ${chapter.chapterId} belongs to unknown module ${chapter.moduleId}`);
    }
  }

  // Scenario levels 1–99 must be covered exactly once by the leveled
  // modules (the onboarding module owns no levels).
  const coverage = new Array<number>(99).fill(0);
  for (const module of theoryModules) {
    if (!module.levelRange) {
      continue;
    }
    const [from, to] = module.levelRange;
    for (let level = from; level <= to; level += 1) {
      coverage[level - 1] = (coverage[level - 1] ?? 0) + 1;
    }
  }
  for (let level = 1; level <= 99; level += 1) {
    const count = coverage[level - 1] ?? 0;
    if (count === 0) {
      issues.push(`Scenario level ${level} is not owned by any theory module`);
    } else if (count > 1) {
      issues.push(`Scenario level ${level} is owned by ${count} theory modules`);
    }
  }

  return issues;
}
