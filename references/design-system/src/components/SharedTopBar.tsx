import { useState } from "react";
import { IconBell, IconBolt } from "./icons";

interface Props {
  level?: number;
  xp?: number;
  xpMax?: number;
  attempts?: number;
  maxAttempts?: number;
  stars?: number;
  coins?: number;
  hasNotification?: boolean;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  className?: string;
  compact?: boolean;
}

/* =========================================================================
   CANONICAL SHARED_TOP_BAR_LOCKED
   Specified in 00-INTEGRATION-GUIDE-RU.md (Section 3.2):
   Slots:
   - LVL (Level badge)
   - XP (XP bar and numeric value)
   - Attempts (Energy / hearts / attempt charges: 3/3)
   - Stars (Mastery stars count)
   - Coins (Arena reward tokens)
   - Notification (with badge alert)
   - Settings (cog icon)
   ========================================================================= */

export function SharedTopBar({
  level = 7,
  xp = 2480,
  xpMax = 3000,
  attempts = 3,
  maxAttempts = 3,
  stars = 48,
  coins = 1842,
  hasNotification = true,
  onOpenSettings,
  onOpenNotifications,
  className = "",
  compact = false,
}: Props) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const xpPercentage = Math.min(100, Math.round((xp / xpMax) * 100));

  return (
    <div
      className={`sticky top-0 z-30 select-none border-b border-[#1d3866]/80 bg-[#070c14]/92 px-3.5 py-2.5 backdrop-blur-xl ${className}`}
    >
      <div className="flex items-center justify-between gap-1.5">
        {/* Left cluster: Level + XP Progress Bar */}
        <div className="flex items-center gap-2">
          {/* LVL Badge */}
          <div
            onClick={() => setShowTooltip(showTooltip === "lvl" ? null : "lvl")}
            className="el-glow relative flex h-7.5 items-center gap-1 cursor-pointer rounded-xl bg-gradient-to-r from-[#63f6de] to-teal px-2 text-[#04241f] active:scale-95 transition-transform"
          >
            <span className="mono text-[10px] font-black uppercase">LVL</span>
            <span className="font-display text-[13px] font-black leading-none">{level}</span>
          </div>

          {/* XP Bar Slot */}
          {!compact && (
            <div
              onClick={() => setShowTooltip(showTooltip === "xp" ? null : "xp")}
              className="flex flex-col gap-0.5 cursor-pointer"
            >
              <div className="flex items-center justify-between text-[9px]">
                <span className="mono text-[#8aa7c9]">XP</span>
                <span className="mono text-teal font-bold">{xp}/{xpMax}</span>
              </div>
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#0a1120] border border-[#1d3866]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal to-[#5aa9ff] transition-all duration-500"
                  style={{ width: `${xpPercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Center Cluster: Attempts + Mastery Stars + Arena Coins */}
        <div className="flex items-center gap-1.5">
          {/* Attempts Slot (Energy Charges) */}
          <div
            onClick={() => setShowTooltip(showTooltip === "attempts" ? null : "attempts")}
            className="flex items-center gap-1 rounded-xl border border-[#1d3866] bg-[#0e1a30]/80 px-2 py-1 cursor-pointer hover:border-teal/50"
          >
            <span className="text-teal text-[11px]"><IconBolt size={12} /></span>
            <span className="mono text-[11px] font-bold text-[#e8eef7]">
              {attempts}/{maxAttempts}
            </span>
          </div>

          {/* Stars Slot */}
          <div
            onClick={() => setShowTooltip(showTooltip === "stars" ? null : "stars")}
            className="flex items-center gap-1 rounded-xl border border-[#1d3866] bg-[#0e1a30]/80 px-2 py-1 cursor-pointer hover:border-[#f0a64d]/50"
          >
            <span className="text-[#f0a64d] text-[11px]">★</span>
            <span className="mono text-[11px] font-bold text-[#e8eef7]">
              {stars}
            </span>
          </div>

          {/* Coins Slot */}
          <div
            onClick={() => setShowTooltip(showTooltip === "coins" ? null : "coins")}
            className="hidden xs:flex items-center gap-1 rounded-xl border border-[#1d3866] bg-[#0e1a30]/80 px-2 py-1 cursor-pointer hover:border-teal/50"
          >
            <span className="text-teal text-[10px] font-bold">🪙</span>
            <span className="mono text-[11px] font-bold text-teal">
              {coins.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Right cluster: Notifications + Settings */}
        <div className="flex items-center gap-1.5">
          {/* Notifications Button */}
          <button
            onClick={onOpenNotifications}
            className="el-1 relative flex h-7.5 w-7.5 items-center justify-center rounded-xl border border-[#1d3866] bg-[#0e1a30] text-[#8aa7c9] hover:text-[#e8eef7] active:scale-95"
            aria-label="Notifications"
          >
            <IconBell size={13} />
            {hasNotification && (
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#ff4d94] shadow-[0_0_6px_#ff4d94]" />
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="el-1 flex h-7.5 w-7.5 items-center justify-center rounded-xl border border-[#1d3866] bg-[#0e1a30] text-[#8aa7c9] hover:text-[#e8eef7] active:scale-95"
            aria-label="Settings"
          >
            <span className="text-[12px] leading-none">⚙</span>
          </button>
        </div>
      </div>

      {/* Interactive Tooltip Dropdown when user taps a slot */}
      {showTooltip && (
        <div className="mt-2 rounded-2xl border border-teal/40 bg-[#0e1a30] p-2.5 text-[11.5px] text-[#e8eef7] shadow-xl flex items-center justify-between">
          <span>
            {showTooltip === "lvl" && `Level ${level}: Veteran Signal Analyst`}
            {showTooltip === "xp" && `${xpMax - xp} XP needed to reach Level ${level + 1}`}
            {showTooltip === "attempts" && `${attempts} daily Arena cases remaining (replenishes in 04:12:00)`}
            {showTooltip === "stars" && `${stars} Mastery Stars accumulated from perfect 100% Process Seals`}
            {showTooltip === "coins" && `${coins} Arena Coins ready for Skill Deck upgrades`}
          </span>
          <button
            onClick={() => setShowTooltip(null)}
            className="mono ml-2 text-teal font-bold hover:underline"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
