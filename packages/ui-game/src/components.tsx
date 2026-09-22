import type { CSSProperties } from 'react';
import type { WidgetProps } from './types';

const tone = (t = 'teal') => `tone-${t}`;

export function WidgetCard({ spec, onAction }: WidgetProps) {
  const style = {
    '--col':
      spec.footprint === 'full' ||
      spec.footprint === 'hero' ||
      spec.footprint === 'banner'
        ? 12
        : spec.footprint === 'large'
          ? 8
          : spec.footprint === 'wide'
            ? 6
            : spec.footprint === 'tall'
              ? 4
              : 4,
    '--row':
      spec.footprint === 'hero' || spec.footprint === 'large'
        ? 2
        : spec.footprint === 'tall'
          ? 2
          : 1
  } as CSSProperties;

  // A widget is a passive card; only its footer CTA is interactive. The
  // native <button> is the single focusable control and provides correct
  // keyboard semantics (Enter on keydown, Space on keyup) on its own. We do
  // NOT add a parent key handler or make the <article> focusable: doing so
  // nested a second interactive control inside the card and let keyboard
  // events bubble from the button to the article, firing onAction twice.
  return (
    <article
      className={`widget ${tone(spec.tone)} fp-${spec.footprint}`}
      style={style}
      aria-label={`${spec.eyebrow}: ${spec.title}`}
    >
      <header>
        <span className="eyebrow">{spec.eyebrow}</span>
        {spec.status && <span className="status">{spec.status}</span>}
      </header>
      <div className="widget-main">
        <span className="widget-icon">{spec.icon}</span>
        <div>
          <h3>{spec.title}</h3>
          <p>{spec.description}</p>
        </div>
      </div>
      <footer>
        {spec.metric && <strong>{spec.metric}</strong>}
        {spec.action && (
          <button type="button" onClick={onAction}>
            {spec.action}
            <span>→</span>
          </button>
        )}
      </footer>
    </article>
  );
}

export function TopBar() {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">S</span>
        <div>
          <b>SIGNAL ARENA</b>
          <small>DESIGN SYSTEM LAB</small>
        </div>
      </div>
      <div className="currencies">
        <span>
          LVL <b>07</b>
        </span>
        <span>
          ⚡ <b>5/5</b>
        </span>
        <span>
          ★ <b>48</b>
        </span>
        <span>
          ◉ <b>320</b>
        </span>
        <button aria-label="Notifications">●</button>
        <button aria-label="Settings">⚙</button>
      </div>
    </header>
  );
}

export function ShapeLegend() {
  return (
    <div className="shape-legend">
      <span>
        <i className="shape square" />
        Square
      </span>
      <span>
        <i className="shape wide" />
        Wide
      </span>
      <span>
        <i className="shape large" />
        Large
      </span>
      <span>
        <i className="shape hero" />
        Hero
      </span>
    </div>
  );
}

export const componentRegistry = { widget: WidgetCard, topbar: TopBar } as const;
