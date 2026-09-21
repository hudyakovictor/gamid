import { useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  title?: string;
  className?: string;
  glow?: "teal" | "wait" | "pink";
  showFrame?: boolean;
}

/* =========================================================================
   9:16 MOBILE VIEWPORT FRAME
   Simulates authentic flagship smartphone (390×844 or 412×915 ~9:16 ratio)
   Features:
   - Dynamic Island / Pill notch with camera & sensors
   - iOS-style 9:41 status bar with battery, 5G, and wifi
   - Bottom home indicator bar
   - Anti-glare rim lighting and physical button bevels
   - Responsive zoom & full-screen presentation mode
   ========================================================================= */

export function Phone916Frame({
  children,
  title,
  className = "",
  glow = "teal",
  showFrame = true,
}: Props) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [time] = useState("09:41");

  const glowShadow = {
    teal: "0 40px 100px -25px rgba(46,230,200,0.35), 0 0 0 1px rgba(46,230,200,0.25)",
    wait: "0 40px 100px -25px rgba(90,169,255,0.35), 0 0 0 1px rgba(90,169,255,0.25)",
    pink: "0 40px 100px -25px rgba(255,77,148,0.35), 0 0 0 1px rgba(255,77,148,0.25)",
  }[glow];

  if (!showFrame) {
    return (
      <div className={`relative h-[844px] w-[390px] overflow-hidden rounded-[44px] bg-[#070c14] ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Phone Hardware Chassis (Strict 9:16 / 390×844 Aspect) */}
      <div
        className="relative transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          width: isZoomed ? "420px" : "390px",
          height: isZoomed ? "900px" : "844px",
        }}
      >
        {/* Ambient colored backdrop illumination */}
        <div
          className="pointer-events-none absolute -inset-10 rounded-[80px] opacity-70 blur-3xl transition-opacity"
          style={{
            background:
              glow === "teal"
                ? "radial-gradient(circle, rgba(46,230,200,0.25) 0%, transparent 70%)"
                : glow === "wait"
                  ? "radial-gradient(circle, rgba(90,169,255,0.25) 0%, transparent 70%)"
                  : "radial-gradient(circle, rgba(255,77,148,0.25) 0%, transparent 70%)",
          }}
        />

        {/* Outer Titanium Body Bezel */}
        <div
          className="relative h-full w-full overflow-hidden rounded-[52px] border-[3.5px] border-[#22395d] bg-[#0a1120] p-[3px]"
          style={{
            boxShadow: `${glowShadow}, inset 0 1px 1px rgba(255,255,255,0.2), 0 50px 120px -30px rgba(0,0,0,0.95)`,
          }}
        >
          {/* Inner OLED Glass Screen */}
          <div className="relative h-full w-full overflow-hidden rounded-[46px] bg-[#070c14] text-[#e8eef7]">
            {/* Top Hardware Dynamic Island */}
            <div className="absolute left-1/2 top-3 z-50 flex h-[28px] w-[114px] -translate-x-1/2 items-center justify-between rounded-full bg-black px-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.1)]">
              {/* Camera Lens */}
              <span className="h-3 w-3 rounded-full bg-[#0a1120] ring-1 ring-white/10 flex items-center justify-center">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1b2b48]" />
              </span>
              {/* Sensor LED indicator */}
              <span className="h-2 w-2 rounded-full bg-[#10243d]" />
              {/* Microphone Pill */}
              <span className="h-1.5 w-4 rounded-full bg-[#14233a]" />
            </div>

            {/* iOS System Status Bar */}
            <div className="relative z-40 flex items-center justify-between px-7 pt-3.5 pb-1 text-[12px] font-semibold text-[#8aa7c9]">
              <span className="mono font-bold tracking-tight text-white">{time}</span>
              <div className="flex items-center gap-1.5">
                {/* 5G icon */}
                <span className="mono text-[10px] font-bold text-white">5G</span>
                {/* Signal Bars */}
                <div className="flex items-end gap-0.5 h-2.5">
                  <span className="w-0.5 h-1 bg-white rounded-full" />
                  <span className="w-0.5 h-1.5 bg-white rounded-full" />
                  <span className="w-0.5 h-2 bg-white rounded-full" />
                  <span className="w-0.5 h-2.5 bg-white rounded-full" />
                </div>
                {/* Battery Pill */}
                <div className="relative ml-1 flex h-3 w-5.5 items-center rounded-[4px] border border-white/60 p-[1.5px]">
                  <span className="h-full w-4/5 rounded-[2px] bg-teal" />
                  <span className="absolute -right-1 top-1/2 h-1 w-0.5 -translate-y-1/2 rounded-r-[1px] bg-white/60" />
                </div>
              </div>
            </div>

            {/* Screen Content Container (Scrollable 9:16 Canvas) */}
            <div className="relative h-[calc(100%-38px)] w-full overflow-hidden">
              {children}
            </div>

            {/* Bottom iOS Home Indicator Line */}
            <div className="pointer-events-none absolute bottom-1.5 left-1/2 z-50 h-1 w-32 -translate-x-1/2 rounded-full bg-white/30 backdrop-blur" />
          </div>
        </div>

        {/* Hardware volume buttons & power button visuals */}
        <span className="absolute -left-[5.5px] top-28 h-10 w-[3.5px] rounded-l-md bg-[#243e68]" />
        <span className="absolute -left-[5.5px] top-42 h-12 w-[3.5px] rounded-l-md bg-[#243e68]" />
        <span className="absolute -left-[5.5px] top-58 h-12 w-[3.5px] rounded-l-md bg-[#243e68]" />
        <span className="absolute -right-[5.5px] top-36 h-16 w-[3.5px] rounded-r-md bg-[#243e68]" />
      </div>

      {/* Frame footer title & zoom toggle */}
      <div className="mt-3.5 flex items-center gap-3">
        {title && (
          <span className="mono text-[11px] uppercase tracking-[0.25em] text-[#8aa7c9]">
            {title}
          </span>
        )}
        <button
          onClick={() => setIsZoomed((z) => !z)}
          className="rounded-lg border border-[#1d3866] bg-[#0e1a30] px-2 py-0.5 text-[10.5px] text-[#8aa7c9] hover:text-white"
        >
          {isZoomed ? "390×844" : "420×900 (Zoom)"}
        </button>
      </div>
    </div>
  );
}
