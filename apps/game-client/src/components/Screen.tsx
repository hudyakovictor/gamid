import type { ReactNode } from "react";

/**
 * Application viewport: fixed frame, internal scroll only for the content
 * (docs/INTERFACE_SHELL.md). Screen transitions use the fast/standard motion
 * tokens and collapse to zero duration under prefers-reduced-motion.
 */
export function Screen({
  title,
  kicker,
  children,
  backTo,
  onBack,
  reducedMotion = false
}: {
  title: string;
  kicker: string;
  children: ReactNode;
  backTo?: string;
  onBack?: () => void;
  reducedMotion?: boolean;
}) {
  return (
    <section
      className={`screen ${reducedMotion ? "reduced-motion" : ""}`}
      aria-labelledby="screen-title"
    >
      <header className="screen-head">
        {backTo && onBack && (
          <button
            type="button"
            className="back-btn"
            onClick={onBack}
            aria-label={`Назад: ${backTo}`}
          >
            ←
          </button>
        )}
        <div>
          <span className="kicker">{kicker}</span>
          <h1 id="screen-title">{title}</h1>
        </div>
      </header>
      <div className="screen-body">{children}</div>
    </section>
  );
}
