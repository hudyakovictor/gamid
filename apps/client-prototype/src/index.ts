export type Screen =
  | 'preload'
  | 'main-menu'
  | 'academy'
  | 'scenario-brief'
  | 'decision-workspace'
  | 'historical-reveal'
  | 'score'
  | 'debrief'
  | 'rematch';

export type DecisionAction = 'LONG' | 'SHORT' | 'WAIT' | 'NO_TRADE';
export type SourceGroup = 'PRICE' | 'CONTEXT' | 'FLOW' | 'EVENT' | 'PROJECT';

export interface ScenarioPackage {
  id: string;
  version: string;
  asset: string;
  timeframe: string;
  decisionPoint: string;
  publicLayer: {
    task: string;
    sourceGroups: SourceGroup[];
    cards: string[];
    priceSeries: number[];
  };
  decisionSpec: {
    allowedActions: DecisionAction[];
    requiredFields: Array<'action' | 'evidence' | 'invalidation' | 'confidence'>;
  };

}

export interface DecisionState {
  screen: Screen;
  scenario: ScenarioPackage;
  action?: DecisionAction;
  evidence: string[];
  invalidation?: string;
  confidence?: number;
  revealed: boolean;

}

export const starterScenario: ScenarioPackage = {
  id: 'false-breakout-001',
  version: '1.0.0',
  asset: 'BTC/USDT',
  timeframe: '1h',
  decisionPoint: '2024-02-14T12:00:00Z',
  publicLayer: {
    task: 'Is the breakout confirmed?',
    sourceGroups: ['PRICE', 'FLOW'],
    cards: ['Market Structure', 'Volume Confirmation', 'Wait for Retest', 'Define Invalidation'],
    priceSeries: [100, 102, 101, 104, 107, 106, 105, 104]
  },
  decisionSpec: {
    allowedActions: ['LONG', 'SHORT', 'WAIT', 'NO_TRADE'],
    requiredFields: ['action', 'evidence', 'invalidation', 'confidence']
  },

};


export function createInitialState(scenario: ScenarioPackage = starterScenario): DecisionState {
  return { screen: 'preload', scenario, evidence: [], revealed: false };
}

export function reveal(state: DecisionState): DecisionState {
  return { ...state, screen: 'historical-reveal', revealed: true };
}
