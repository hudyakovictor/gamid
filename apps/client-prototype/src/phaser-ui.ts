import Phaser from "phaser";

export const COLORS = {
  background: 0x07131c,
  surface: 0x102b3a,
  surfaceMuted: 0x0b202b,
  line: 0x2c596b,
  text: "#e8f5f8",
  muted: "#86a7b2",
  cyan: 0x19d9ff,
  green: 0x53f2b2,
  gold: 0xffd54a,
  red: 0xff6f91
} as const;

export function announce(message: string): void {
  const element = document.getElementById("sr-status");
  if (element) {
    element.textContent = message;
  }
}

export function addText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  fontSize = 18,
  color: string = COLORS.text
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: "Inter, Segoe UI, sans-serif",
    fontSize: `${fontSize}px`,
    color,
    lineSpacing: 6
  });
}

export function addButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  onClick: () => void,
  primary = false
): Phaser.GameObjects.Container {
  const background = scene.add.rectangle(
    0,
    0,
    width,
    height,
    primary ? COLORS.cyan : COLORS.surfaceMuted,
    1
  );
  background.setStrokeStyle(1, primary ? COLORS.cyan : COLORS.line, 1);
  const text = addText(
    scene,
    0,
    0,
    label,
    15,
    primary ? "#03131a" : COLORS.text
  );
  text.setOrigin(0.5);
  const container = scene.add.container(x, y, [background, text]);
  container.setSize(width, height);
  container.setInteractive({ useHandCursor: true });
  container.on("pointerover", () => {
    background.setFillStyle(primary ? 0x63e7ff : 0x173646, 1);
  });
  container.on("pointerout", () => {
    background.setFillStyle(primary ? COLORS.cyan : COLORS.surfaceMuted, 1);
  });
  container.on("pointerdown", onClick);
  return container;
}

export function addPanel(
  scene: Phaser.Scene,
  width: number,
  height: number,
  title: string,
  eyebrow = "SIGNAL ARENA"
): Phaser.GameObjects.Container {
  const panel = scene.add.container(0, 0);
  const background = scene.add.rectangle(width / 2, height / 2, width, height, COLORS.background, 1);
  panel.add(background);
  addText(scene, 24, 20, eyebrow, 12, "#19d9ff");
  addText(scene, 24, 48, title, 30);
  return panel;
}

export function addSectionCard(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number
): Phaser.GameObjects.Rectangle {
  const card = scene.add.rectangle(x, y, width, height, COLORS.surface, 1);
  card.setOrigin(0, 0);
  card.setStrokeStyle(1, COLORS.line, 1);
  return card;
}

export function addChartFrame(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  graphics.fillStyle(COLORS.surfaceMuted, 1);
  graphics.fillRoundedRect(x, y, width, height, 14);
  graphics.lineStyle(1, COLORS.line, 1);
  graphics.strokeRoundedRect(x, y, width, height, 14);

  const chartX = x + 28;
  const chartY = y + 34;
  const chartWidth = width - 56;
  const chartHeight = height - 72;
  graphics.lineStyle(1, 0x214354, 0.7);
  for (let index = 1; index < 5; index += 1) {
    const rowY = chartY + (chartHeight / 5) * index;
    graphics.lineBetween(chartX, rowY, chartX + chartWidth, rowY);
  }

  const candles = [0.42, 0.45, 0.39, 0.52, 0.49, 0.61, 0.58, 0.67, 0.64, 0.71, 0.68, 0.57];
  candles.forEach((value, index) => {
    const candleX = chartX + 18 + (chartWidth - 36) * (index / (candles.length - 1));
    const candleY = chartY + chartHeight * (1 - value);
    const previous = index === 0 ? value : candles[index - 1] ?? value;
    const color = value >= previous ? COLORS.green : COLORS.red;
    graphics.lineStyle(2, color, 1);
    graphics.lineBetween(candleX, candleY - 12, candleX, candleY + 12);
    graphics.fillStyle(color, 1);
    graphics.fillRect(candleX - 5, candleY - 7, 10, 14);
  });

  addText(scene, x + 18, y + height - 28, "Illustrative pre-t0 frame · future segment hidden", 12, COLORS.muted);
  return graphics;
}

export function addInvalidationInput(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  value: string,
  onChange: (value: string) => void
): Phaser.GameObjects.DOMElement {
  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.placeholder = "Example: close below the failed breakout level";
  input.setAttribute("aria-label", "Define invalidation");
  input.style.width = `${width}px`;
  input.style.height = "42px";
  input.style.padding = "0 12px";
  input.style.border = "1px solid #2c596b";
  input.style.borderRadius = "8px";
  input.style.background = "#0b202b";
  input.style.color = "#e8f5f8";
  input.style.font = "15px Inter, Segoe UI, sans-serif";
  input.addEventListener("input", () => onChange(input.value));
  const element = scene.add.dom(x, y, input);
  element.setOrigin(0, 0.5);
  return element;
}
