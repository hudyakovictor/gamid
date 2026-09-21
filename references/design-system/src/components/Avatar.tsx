import type { ReactNode } from "react";

interface Props {
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  ring?: boolean;
  badge?: ReactNode;
  color?: string;
}

const sizes = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-[12px]",
  md: "h-11 w-11 text-[14px]",
  lg: "h-14 w-14 text-[18px]",
  xl: "h-20 w-20 text-[24px]",
};

const colors = [
  "from-teal to-wait",
  "from-pink to-amber",
  "from-lime to-up",
  "from-wait to-pink",
  "from-amber to-down",
];

export function Avatar({ name, size = "md", ring = false, badge, color }: Props) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const bg = color ?? colors[hash % colors.length];

  return (
    <div className="relative inline-flex">
      <div
        className={`flex items-center justify-center rounded-2xl bg-gradient-to-br ${bg} font-display font-bold text-bg ${sizes[size]} ${
          ring ? "ring-2 ring-teal/50 ring-offset-2 ring-offset-bg" : ""
        }`}
      >
        {initials}
      </div>
      {badge && (
        <div className="absolute -right-1 -top-1">{badge}</div>
      )}
    </div>
  );
}
