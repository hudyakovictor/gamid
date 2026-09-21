export const designSystemConfig={
 colors:{canvas:'#070c14',canvas2:'#0a1120',surface:'#0e1a30',card:'#13243f',line:'#1d3866',ink:'#e8eef7',dim:'#8aa7c9',teal:'#2ee6c8',blue:'#5aa9ff',green:'#50c890',amber:'#f0a64d',red:'#eb635b'},
 typography:{display:{size:32,line:1.1,weight:800},h1:{size:28,line:1.15,weight:800},h2:{size:22,line:1.2,weight:750},h3:{size:17,line:1.25,weight:700},body:{size:14,line:1.5,weight:400},label:{size:12,line:1.2,weight:700},caption:{size:11,line:1.35,weight:500},hud:{size:10,line:1.2,weight:700}},
 spacing:[0,4,8,12,16,20,24,32,48,64],
 shapes:{rounded:{radius:12},soft:{radius:20},panel:{radius:24},sheet:{radius:32},circle:{radius:999},cutCorner:{radius:8},collectible:{radius:16,ratio:'3 / 4'},portrait:{radius:20,ratio:'3 / 4'}},
 shapeFamilies:{system:{control:'rounded',card:'soft',panel:'panel'},editorial:{control:'rounded',card:'soft',panel:'sheet'},tactical:{control:'cutCorner',card:'panel',panel:'cutCorner'},competitive:{control:'rounded',card:'panel',panel:'sheet'},catalog:{control:'rounded',card:'soft',panel:'sheet'}},
 motion:{instant:60,fast:120,standard:180,emphasis:240,reveal:400,celebration:600},
 breakpoints:{mobile:0,tablet:720,desktop:1100},
 grid:{mobile:4,tablet:8,desktop:12,gap:14,row:92},
 pageThemes:{hub:{accent:'#2ee6c8',shapeFamily:'system'},academy:{accent:'#5aa9ff',shapeFamily:'editorial'},arena:{accent:'#2ee6c8',shapeFamily:'tactical'},tournaments:{accent:'#f0a64d',shapeFamily:'competitive'},shop:{accent:'#50c890',shapeFamily:'catalog'}}
} as const;
export type DesignSystemConfig=typeof designSystemConfig;
export function cssVariables(){const c=designSystemConfig.colors;return Object.entries(c).map(([k,v])=>`--${k}:${v}`).join(';')};