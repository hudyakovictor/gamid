export type InterfaceScreen =
  | 'preload'
  | 'home'
  | 'academy'
  | 'mission'
  | 'brief'
  | 'workspace'
  | 'reveal'
  | 'debrief'
  | 'profile'
  | 'collection'
  | 'store';

export type PanelId =
  | 'helper'
  | 'pause'
  | 'price'
  | 'context'
  | 'flow'
  | 'event'
  | 'project'
  | 'cards'
  | 'decision'
  | 'market'
  | 'consequence'
  | 'quality';

export type PanelState = 'closed' | 'opening' | 'open' | 'expanded' | 'collapsed' | 'loading' | 'empty' | 'locked' | 'error' | 'completed';

export interface PanelShell { id: PanelId; title: string; state: PanelState; mobilePresentation: 'bottom-sheet' | 'fullscreen' | 'inline'; }
export interface InterfaceShellState { screen: InterfaceScreen; activePanel?: PanelId; panels: PanelShell[]; step: number; reducedMotion: boolean; }

export const panelShells: PanelShell[] = [
  { id: 'helper', title: 'The Helper', state: 'closed', mobilePresentation: 'bottom-sheet' },
  { id: 'pause', title: 'Pause Menu', state: 'closed', mobilePresentation: 'fullscreen' },
  { id: 'price', title: 'PRICE Source Group', state: 'closed', mobilePresentation: 'bottom-sheet' },
  { id: 'context', title: 'CONTEXT Source Group', state: 'closed', mobilePresentation: 'bottom-sheet' },
  { id: 'flow', title: 'FLOW Source Group', state: 'closed', mobilePresentation: 'bottom-sheet' },
  { id: 'event', title: 'EVENT Source Group', state: 'closed', mobilePresentation: 'bottom-sheet' },
  { id: 'project', title: 'PROJECT Source Group', state: 'closed', mobilePresentation: 'bottom-sheet' },
  { id: 'cards', title: 'Skill Hand', state: 'closed', mobilePresentation: 'bottom-sheet' },
  { id: 'decision', title: 'Decision Sheet', state: 'closed', mobilePresentation: 'bottom-sheet' },
  { id: 'market', title: 'Market Fact', state: 'closed', mobilePresentation: 'bottom-sheet' },
  { id: 'consequence', title: 'Plan Consequence', state: 'closed', mobilePresentation: 'bottom-sheet' },
  { id: 'quality', title: 'Decision Quality', state: 'closed', mobilePresentation: 'bottom-sheet' }
];

export const interfaceScreens: Array<{ id: InterfaceScreen; shell: string; terminal: boolean }> = [
  { id: 'preload', shell: 'boot and loading shell', terminal: false },
  { id: 'home', shell: 'main menu with route cards', terminal: false },
  { id: 'academy', shell: 'guided learning modules', terminal: false },
  { id: 'mission', shell: 'scenario selection', terminal: false },
  { id: 'brief', shell: 'scenario metadata and entry CTA', terminal: false },
  { id: 'workspace', shell: 'chart, tray, skill hand and decision panel frames', terminal: false },
  { id: 'reveal', shell: 'future data and entity reveal frames', terminal: false },
  { id: 'debrief', shell: 'market fact, consequence and quality frames', terminal: false },
  { id: 'profile', shell: 'decision trace and progress frames', terminal: false },
  { id: 'collection', shell: 'entity collection frames', terminal: false },
  { id: 'store', shell: 'catalog and entitlement frames', terminal: true }
];

export function openPanel(state: InterfaceShellState, id: PanelId): InterfaceShellState {
  return { ...state, activePanel: id, panels: state.panels.map(panel => panel.id === id ? { ...panel, state: 'open' } : panel) };
}

export function closePanel(state: InterfaceShellState): InterfaceShellState {
  return { ...state, activePanel: undefined, panels: state.panels.map(panel => panel.state === 'open' ? { ...panel, state: 'closed' } : panel) };
}
