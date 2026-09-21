import type {ComponentType} from 'react';
export type PageId='hub'|'academy'|'arena'|'tournaments'|'shop';
export type Footprint='square'|'wide'|'tall'|'large'|'banner'|'hero'|'full';
export type Density='compact'|'standard'|'expanded';
export type WidgetSpec={id:string;title:string;eyebrow:string;description:string;metric?:string;action?:string;icon:string;footprint:Footprint;density?:Density;tone?:'teal'|'blue'|'amber'|'red'|'green';status?:string};
export type PagePreset={id:string;label:string;description:string;widgets:WidgetSpec[]};
export type PageKit={id:PageId;label:string;description:string;accent:string;presets:PagePreset[];allowedWidgets:string[]};
export type WidgetProps={spec:WidgetSpec};
export type ComponentRegistry=Record<string,ComponentType<WidgetProps>>;