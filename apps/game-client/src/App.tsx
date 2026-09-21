import { useCallback, useEffect, useMemo, useReducer, useState } from "react";

import { cssVariables } from "@signal-arena/ui-game";

import { ApiClient, ApiError, type RunResponse } from "./api/client";
import { readTelegramInitData } from "./api/telegram";
import {
  initialFlowState,
  planRecovery,
  reduceFlow,
  type FlowEvent
} from "./flow/flow";
import { createIdempotencyKey, createRunStorage } from "./flow/persistence";
import { ProductTopBar } from "./components/ProductTopBar";
import { Screen } from "./components/Screen";
import { AcademyScreen } from "./screens/AcademyScreen";
import { ArenaScreen } from "./screens/ArenaScreen";
import { CollectionScreen } from "./screens/CollectionScreen";
import { DebriefScreen } from "./screens/DebriefScreen";
import { HubScreen } from "./screens/HubScreen";
import { NotificationsScreen } from "./screens/NotificationsScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { RematchScreen } from "./screens/RematchScreen";
import { ScenarioBriefScreen } from "./screens/ScenarioBriefScreen";
import { RevealScreen } from "./screens/RevealScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ShopScreen } from "./screens/ShopScreen";
import { TournamentsScreen } from "./screens/TournamentsScreen";
import { WorkspaceScreen } from "./screens/WorkspaceScreen";

export type ScreenId =
  | "arena_hub"
  | "academy"
  | "arena"
  | "shop"
  | "tournaments"
  | "profile"
  | "collection"
  | "scenario_brief"
  | "decision_workspace"
  | "historical_reveal"
  | "score"
  | "debrief"
  | "rematch"
  | "notifications"
  | "settings";

const SCREEN_ROUTES: ReadonlyArray<{ id: ScreenId; label: string }> = [
  { id: "arena_hub", label: "Хаб" },
  { id: "academy", label: "Академия" },
  { id: "arena", label: "Арена" },
  { id: "tournaments", label: "Турниры" },
  { id: "profile", label: "Профиль" }
];

function readHashRoute(): ScreenId {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const known = SCREEN_ROUTES.find((route) => route.id === hash)?.id;
  if (known) {
    return known;
  }
  switch (hash) {
    case "scenario_brief":
    case "decision_workspace":
    case "historical_reveal":
    case "score":
    case "debrief":
    case "rematch":
    case "notifications":
    case "settings":
      return hash;
    default:
      return "arena_hub";
  }
}

function writeHashRoute(id: ScreenId): void {
  window.location.hash = `/${id}`;
}

type Notice = {
  id: number;
  text: string;
  tone: "info" | "warn";
};

export function App() {
  const [state, dispatch] = useReducer(reduceFlow, initialFlowState);
  const [route, setRoute] = useState<ScreenId>(() => readHashRoute());
  const [notice, setNotice] = useState<Notice | null>(null);
  const [authSource, setAuthSource] = useState<"fixture" | "telegram" | null>(null);
  const [balance, setBalance] = useState<import("@signal-arena/contracts/src").UserBalance | null>(null);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const api = useMemo(() => {
    const readCsrfCookie = (): string | undefined => {
      const match = document.cookie
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("sa_csrf="));
      return match ? decodeURIComponent(match.slice("sa_csrf=".length)) || undefined : undefined;
    };
    return new ApiClient({ csrfCookie: readCsrfCookie });
  }, []);

  const runStorage = useMemo(() => createRunStorage(window.localStorage), []);

  const pushNotice = useCallback((text: string, tone: Notice["tone"] = "info") => {
    setNotice({ id: Date.now(), text, tone });
  }, []);

  // The Top Bar renders server-derived values only; failures are silent so a
  // balance hiccup never blocks the player (the bar falls back to "—").
  const refreshBalance = useCallback(
    async (userId: string) => {
      try {
        setBalance(await api.getBalance(userId));
      } catch {
        // display-only data; never fail the flow over it
      }
    },
    [api]
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const onHashChange = () => setRoute(readHashRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((id: ScreenId) => {
    writeHashRoute(id);
    setRoute(id);
  }, []);

  const fail = useCallback((error: unknown) => {
    if (error instanceof ApiError) {
      dispatch({ type: "FAILED", code: error.code, message: error.message });
      return;
    }
    dispatch({
      type: "FAILED",
      code: "unknown",
      message: error instanceof Error ? error.message : "Неизвестная ошибка"
    });
  }, []);

  // Bootstrap: authenticate (Telegram when available, fixture otherwise),
  // then recover an in-progress run from local persistence — if any.
  useEffect(() => {
    let cancelled = false;

    const recover = async (userId: string) => {
      const saved = runStorage.load();
      const plan = planRecovery(saved);
      if (plan.action === "none") {
        return;
      }
      try {
        const scenario = await api.getScenario(
          saved?.scenarioId ?? "",
          saved?.scenarioVersion ?? ""
        );
        if (cancelled) {
          return;
        }
        dispatch({ type: "SCENARIO_LOADED", scenario });

        if (plan.action === "resume-workspace") {
          const started = await api.startRun({
            scenarioId: scenario.scenarioId,
            scenarioVersion: scenario.version,
            idempotencyKey: plan.idempotencyKey
          });
          if (cancelled) {
            return;
          }
          dispatch({ type: "RUN_STARTED", run: started.run });
          runStorage.save({
            scenarioId: scenario.scenarioId,
            scenarioVersion: scenario.version,
            runId: started.run.runId,
            idempotencyKey: plan.idempotencyKey,
            phase: "workspace",
            savedAt: new Date().toISOString()
          });
          setRoute("decision_workspace");
          return;
        }

        // sealed/revealed: ask the server for the authoritative state again (POST reveal)
        const revealed = await api.revealRun(plan.runId);
        if (cancelled) {
          return;
        }
        dispatch({
          type: "RUN_RESTORED",
          run: {
            ...revealed.run,
            state: "sealed"
          }
        });
        dispatch({ type: "REVEAL_START" });
        dispatch({
          type: "REVEAL_OK",
          run: revealed.run,
          reveal: revealed.reveal,
          score: revealed.run.score ?? null
        });
        setRoute("historical_reveal");
      } catch (error) {
        if (cancelled) {
          return;
        }
        runStorage.clear();
        if (error instanceof ApiError && (error.code === "scenario_run_not_found" || error.code === "scenario_not_found")) {
          pushNotice("Сохранённый заход больше не существует на сервере.", "warn");
          setRoute("arena_hub");
          return;
        }
        fail(error);
      }
    };

    const boot = async () => {
      try {
        const identity = await api.me();
        if (cancelled) {
          return;
        }
        setAuthSource("fixture");
        dispatch({ type: "BOOT_OK", userId: identity.userId });
        void refreshBalance(identity.userId);
        await recover(identity.userId);
      } catch (firstError) {
        const initData = readTelegramInitData();
        if (!initData) {
          fail(firstError);
          return;
        }
        try {
          await api.authTelegram(initData);
          const identity = await api.me();
          if (cancelled) {
            return;
          }
          setAuthSource("telegram");
          dispatch({ type: "BOOT_OK", userId: identity.userId });
          void refreshBalance(identity.userId);
          await recover(identity.userId);
        } catch (secondError) {
          fail(secondError);
        }
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the reducer's transient errors visible as a notice for in-flow
  // failures (a boot failure lands on the error state instead).
  useEffect(() => {
    if (state.error && state.phase !== "booting") {
      pushNotice(state.error.message, "warn");
    }
  }, [state.error, state.phase, pushNotice]);

  const startScenario = useCallback(
    async (scenarioId: string, scenarioVersion: string) => {
      try {
        const scenario = await api.getScenario(scenarioId, scenarioVersion);
        dispatch({ type: "SCENARIO_LOADED", scenario });
        navigate("scenario_brief");
      } catch (error) {
        fail(error);
        navigate("arena_hub");
      }
    },
    [api, fail, navigate]
  );

  const startRun = useCallback(
    async (idempotencyKey?: string) => {
      if (!state.scenario) {
        return;
      }
      const key = idempotencyKey ?? createIdempotencyKey();
      try {
        const started = await api.startRun({
          scenarioId: state.scenario.scenarioId,
          scenarioVersion: state.scenario.version,
          idempotencyKey: key
        });
        dispatch({ type: "RUN_STARTED", run: started.run });
        runStorage.save({
          scenarioId: state.scenario.scenarioId,
          scenarioVersion: state.scenario.version,
          runId: started.run.runId,
          idempotencyKey: key,
          phase: "workspace",
          savedAt: new Date().toISOString()
        });
        navigate("decision_workspace");
      } catch (error) {
        fail(error);
      }
    },
    [api, fail, navigate, runStorage, state.run, state.scenario]
  );

  const sealDecision = useCallback(
    async (decision: import("@signal-arena/contracts/src").DecisionTrace) => {
      if (!state.run) {
        return;
      }
      dispatch({ type: "SEAL_START", decision });
      try {
        const sealed = await api.sealRun(state.run.runId, decision);
        dispatch({ type: "SEAL_OK", run: sealed });
        if (state.scenario) {
          runStorage.save({
            scenarioId: state.scenario.scenarioId,
            scenarioVersion: state.scenario.version,
            runId: sealed.runId,
            idempotencyKey: runStorage.load()?.idempotencyKey ?? createIdempotencyKey(),
            phase: "sealed",
            savedAt: new Date().toISOString()
          });
        }
      } catch (error) {
        if (error instanceof ApiError && error.code === "scenario_run_already_sealed") {
          // Duplicate submit: the first seal already won. Recover the sealed
          // state from the server instead of failing the player.
          try {
            const current = await api.revealRun(state.run.runId);
            dispatch({ type: "SEAL_OK", run: current.run });
            dispatch({ type: "REVEAL_START" });
            dispatch({
              type: "REVEAL_OK",
              run: current.run,
              reveal: current.reveal,
              score: current.run.score ?? null
            });
            if (state.scenario) {
              runStorage.save({
                scenarioId: state.scenario.scenarioId,
                scenarioVersion: state.scenario.version,
                runId: current.run.runId,
                idempotencyKey: createIdempotencyKey(),
                phase: "sealed",
                savedAt: new Date().toISOString()
              });
            }
            navigate("historical_reveal");
            return;
          } catch (recoveryError) {
            fail(recoveryError);
            return;
          }
        }
        fail(error);
      }
    },
    [api, fail, navigate, runStorage, state.run, state.scenario]
  );

  const showReveal = useCallback(async () => {
    if (!state.run) {
      return;
    }
    dispatch({ type: "REVEAL_START" });
    try {
      const revealed = await api.revealRun(state.run.runId);
      dispatch({
        type: "REVEAL_OK",
        run: revealed.run,
        reveal: revealed.reveal,
        score: revealed.run.score ?? null
      });
      if (state.userId) {
        void refreshBalance(state.userId);
      }
      navigate("historical_reveal");
    } catch (error) {
      fail(error);
    }
  }, [api, fail, navigate, refreshBalance, state.run, state.userId]);

  const finishToHub = useCallback(() => {
    runStorage.clear();
    dispatch({ type: "GO_HUB" });
    navigate("arena_hub");
  }, [navigate, runStorage]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // logout is best-effort in the prototype
    }
    window.location.hash = "/arena_hub";
    window.location.reload();
  }, [api]);

  const renderScreen = () => {
    switch (route) {
      case "academy":
        return <AcademyScreen />;
      case "arena":
        return (
          <ArenaScreen
            onOpenScenario={startScenario}
            onNewRun={() => navigate("decision_workspace")}
            activeRun={state.run}
            scenario={state.scenario}
          />
        );
      case "shop":
        return <ShopScreen />;
      case "tournaments":
        return <TournamentsScreen />;
      case "profile":
        return (
          <ProfileScreen
            userId={state.userId}
            onOpenRuns={finishToHub}
          />
        );
      case "collection":
        return <CollectionScreen />;
      case "notifications":
        return <NotificationsScreen />;
      case "settings":
        return (
          <SettingsScreen
            authSource={authSource}
            reducedMotion={reducedMotion}
            onLogout={() => void logout()}
          />
        );
      case "scenario_brief":
        return (
          <ScenarioBriefScreen
            scenario={state.scenario}
            onBack={finishToHub}
            onStart={() => void startRun()}
          />
        );
      case "decision_workspace":
        return (
          <WorkspaceScreen
            scenario={state.scenario}
            run={state.run}
            decision={state.decision}
            sealing={state.phase === "sealing"}
            sealed={state.phase === "sealed" || state.phase === "reveal" || state.phase === "revealing"}
            onBack={finishToHub}
            onSeal={(decision) => void sealDecision(decision)}
            onShowReveal={() => void showReveal()}
          />
        );
      case "historical_reveal":
      case "score":
        return (
          <RevealScreen
            run={state.run}
            reveal={state.reveal}
            score={state.score}
            onDebrief={() => navigate("debrief")}
            onHub={finishToHub}
            onRematch={() => navigate("rematch")}
          />
        );
      case "debrief":
        return (
          <DebriefScreen
            reveal={state.reveal}
            score={state.score}
            onRematch={() => navigate("rematch")}
            onHub={finishToHub}
          />
        );
      case "rematch":
        return (
          <RematchScreen
            reveal={state.reveal}
            onNewRun={() => void startRun(createIdempotencyKey())}
            onHub={finishToHub}
          />
        );
      case "arena_hub":
      default:
        return (
          <HubScreen
            onOpenHubAction={() => navigate("arena")}
            onOpenScenario={startScenario}
            activeRun={state.run}
            onContinue={
              state.run && state.phase === "workspace"
                ? () => navigate("decision_workspace")
                : undefined
            }
          />
        );
    }
  };

  const inFlow = route !== "arena_hub";

  return (
    <div className="app" data-token-snapshot={cssVariables()}>
      <ProductTopBar
        balance={balance}
        onNotifications={() => navigate("notifications")}
        onSettings={() => navigate("settings")}
      />
      {notice && (
        <div className={`notice tone-${notice.tone}`} role="status">
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Скрыть">
            ×
          </button>
        </div>
      )}
      <main className="main" data-screen={route}>
        {state.phase === "booting" ? (
          <Screen title="ЗАГРУЗКА" kicker="SIGNAL ARENA">
            <p className="muted">Соединяемся с сервером сценариев…</p>
          </Screen>
        ) : (
          <Screen
            title={SCREEN_TITLES[route]}
            kicker={route.toUpperCase()}
            reducedMotion={reducedMotion}
            backTo={inFlow ? "arena_hub" : undefined}
            onBack={finishToHub}
          >
            {renderScreen()}
          </Screen>
        )}
      </main>
      <nav className="bottomnav" aria-label="Основные разделы">
        {SCREEN_ROUTES.map((screen) => (
          <button
            key={screen.id}
            type="button"
            className={route === screen.id ? "active" : ""}
            onClick={() => navigate(screen.id)}
            aria-current={route === screen.id ? "page" : undefined}
          >
            <span>{screen.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

const SCREEN_TITLES: Record<ScreenId, string> = {
  arena_hub: "Хаб",
  academy: "Академия",
  arena: "Арена",
  shop: "Магазин",
  tournaments: "Турниры",
  profile: "Профиль",
  collection: "Коллекция",
  scenario_brief: "Брифинг сценария",
  decision_workspace: "Рабочее пространство решения",
  historical_reveal: "Исторический исход",
  score: "Разбор оценки",
  debrief: "Debrief",
  rematch: "Реванш",
  notifications: "Уведомления",
  settings: "Настройки"
};
