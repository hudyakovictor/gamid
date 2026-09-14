export type InterfaceScreen='preload'|'home'|'academy'|'mission'|'brief'|'workspace'|'reveal'|'debrief'|'profile'|'collection'|'store';
export type PanelId='price'|'flow'|'cards'|'decision'|'attachments'|'notifications'|'settings'|'menu'|'quality';
export type PanelState='closed'|'opening'|'open'|'expanded'|'collapsed'|'loading'|'empty'|'locked'|'error'|'completed';
export type Presentation='modal'|'bottom-sheet'|'side-panel';
export interface PanelShell{id:PanelId;title:string;state:PanelState;presentation:Presentation;scrollable:boolean;dismissible:boolean}
export interface RailState{id:'academy'|'mission'|'skills';index:number;count:number;keyboard:boolean;swipe:boolean}
export interface InterfaceShellState{screen:InterfaceScreen;activePanel?:PanelId;step:number;action?:'LONG'|'SHORT'|'WAIT'|'NO_TRADE';rails:RailState[];reducedMotion:boolean;viewport:'desktop'|'tablet'|'mobile'}
export const panels:PanelShell[]=[
{id:'price',title:'PRICE Source Group',state:'closed',presentation:'bottom-sheet',scrollable:true,dismissible:true},
{id:'flow',title:'FLOW Source Group',state:'closed',presentation:'bottom-sheet',scrollable:true,dismissible:true},
{id:'cards',title:'Skill Hand',state:'closed',presentation:'bottom-sheet',scrollable:true,dismissible:true},
{id:'decision',title:'Decision Sheet',state:'closed',presentation:'bottom-sheet',scrollable:true,dismissible:false},
{id:'attachments',title:'Attachments',state:'closed',presentation:'bottom-sheet',scrollable:true,dismissible:true},
{id:'notifications',title:'Notifications',state:'closed',presentation:'side-panel',scrollable:true,dismissible:true},
{id:'settings',title:'Settings',state:'closed',presentation:'side-panel',scrollable:true,dismissible:true},
{id:'menu',title:'Navigation',state:'closed',presentation:'bottom-sheet',scrollable:false,dismissible:true},
{id:'quality',title:'Decision Quality',state:'closed',presentation:'bottom-sheet',scrollable:true,dismissible:true}
];
export const interfaceScreens=[
{id:'preload',shell:'boot',terminal:false},{id:'home',shell:'routes',terminal:false},{id:'academy',shell:'guided academy rail',terminal:false},{id:'mission',shell:'mission rail',terminal:false},{id:'brief',shell:'scenario brief',terminal:false},{id:'workspace',shell:'fixed chart + decision dock',terminal:false},{id:'reveal',shell:'historical reveal',terminal:false},{id:'debrief',shell:'debrief blocks',terminal:false},{id:'profile',shell:'decision trace',terminal:false},{id:'collection',shell:'entity collection',terminal:false},{id:'store',shell:'catalog shell',terminal:true}
];
export function openPanel(state:InterfaceShellState,id:PanelId):InterfaceShellState{return{...state,activePanel:id,rails:state.rails}}
export function closePanel(state:InterfaceShellState):InterfaceShellState{const{activePanel:_activePanel,...withoutPanel}=state;return withoutPanel}
export function shiftRail(rail:RailState,delta:number):RailState{return{...rail,index:Math.max(0,Math.min(rail.count-1,rail.index+delta))}}
