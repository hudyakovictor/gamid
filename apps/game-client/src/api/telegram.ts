/**
 * Telegram Mini App bridge.
 *
 * Inside the Telegram client the platform injects `window.Telegram.WebApp`.
 * We only read `initData` and hand it to the API — the server verifies the
 * HMAC against the bot token. Outside Telegram (local browser, QA) the
 * bridge reports "unavailable" and the app falls back to the fixture
 * auth mode configured on the API.
 */

type TelegramWebApp = {
  initData?: string;
  init?: () => void;
  ready?: () => void;
  expand?: () => void;
  platform?: string;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function readTelegramInitData(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  const webApp = window.Telegram?.WebApp;
  if (!webApp) {
    return undefined;
  }
  try {
    webApp.init?.();
  } catch {
    // init may throw in non-Telegram webviews; initData may still exist
  }
  const initData = webApp.initData;
  return initData && initData.length > 0 ? initData : undefined;
}
