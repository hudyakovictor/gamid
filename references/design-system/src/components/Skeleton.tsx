export {};

interface BlockProps {
  width?: number | string;
  height?: number | string;
  radius?: string;
  className?: string;
}

export function SkeletonBlock({ width = "100%", height = 20, radius = "12px", className = "" }: BlockProps) {
  return (
    <div
      className={`shimmer bg-line/60 ${className}`}
      style={{ width, height, borderRadius: radius }}
    />
  );
}

interface RowProps {
  avatar?: boolean;
  lines?: number;
  className?: string;
}

export function SkeletonRow({ avatar = true, lines = 2, className = "" }: RowProps) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      {avatar && <SkeletonBlock width={40} height={40} radius="14px" />}
      <div className="flex-1 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBlock
            key={i}
            height={12}
            width={i === lines - 1 ? "60%" : "100%"}
            radius="6px"
          />
        ))}
      </div>
    </div>
  );
}

interface CardProps {
  className?: string;
}

export function SkeletonCard({ className = "" }: CardProps) {
  return (
    <div className={`el-2 overflow-hidden rounded-3xl border border-line/60 bg-card ${className}`}>
      <SkeletonBlock height={140} radius="0" />
      <div className="space-y-3 p-4">
        <SkeletonBlock height={14} width="70%" radius="7px" />
        <SkeletonBlock height={12} width="100%" radius="6px" />
        <SkeletonBlock height={12} width="40%" radius="6px" />
      </div>
    </div>
  );
}
