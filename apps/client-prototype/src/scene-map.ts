export interface PhaserSceneMapEntry {
  scene: string;
  prototypeScreen: string;
  responsibility: string;
  terminal: boolean;
}

export const runtimeSceneKeys = [
  "BootScene",
  "ScenarioBriefScene",
  "DecisionWorkspaceScene",
  "HistoricalRevealScene",
  "DebriefScene",
  "RematchScene",
  "ErrorScene"
] as const;

export const phaserSceneMap: PhaserSceneMapEntry[] = [
  { scene: 'BootScene', prototypeScreen: 'preload', responsibility: 'Load config, fonts, audio and locale.', terminal: false },
  { scene: 'MainMenuScene', prototypeScreen: 'main-menu', responsibility: 'Route player to Academy, Profile or Mission.', terminal: false },
  { scene: 'AcademyScene', prototypeScreen: 'academy', responsibility: 'Show guided loadout and lesson progression.', terminal: false },
  { scene: 'ScenarioBriefScene', prototypeScreen: 'scenario-brief', responsibility: 'Present asset, timeframe, task and source groups.', terminal: false },
  { scene: 'DecisionWorkspaceScene', prototypeScreen: 'decision-workspace', responsibility: 'Render chart, evidence, cards and Decision Sheet.', terminal: false },
  { scene: 'HistoricalRevealScene', prototypeScreen: 'historical-reveal', responsibility: 'Reveal future segment and hidden entity.', terminal: false },
  { scene: 'ScoreScene', prototypeScreen: 'score', responsibility: 'Show deterministic process score.', terminal: false },
  { scene: 'DebriefScene', prototypeScreen: 'debrief', responsibility: 'Explain market fact, plan consequence and quality.', terminal: false },
  { scene: 'RematchScene', prototypeScreen: 'rematch', responsibility: 'Schedule a delayed practice case.', terminal: true }
];
