import { StrictMode, useEffect } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuthContext, type AuthContextValue } from "../auth/AuthContext";
import { AuthProvider } from "../auth/AuthProvider";
import type { TimerRepository } from "./timer.repository";
import type { Timer, TimerCustomization } from "./timer.types";
import {
  TIMER_PERSISTENCE_UNAVAILABLE_MESSAGE,
  useTimerRepositoryState,
} from "./TimerRepositoryContext";
import { useTimers } from "./useTimers";
import { TimerRepositoryProvider } from "./TimerRepositoryProvider";
import type { Database } from "../../infrastructure/supabase/database.types";
import type { SupabaseBrowserClientState } from "../../infrastructure/supabase/client";

class StubRepository implements TimerRepository {
  readonly label: string;

  constructor(label: string) {
    this.label = label;
  }

  async getAll(): Promise<Timer[]> {
    return [];
  }
  async getById(): Promise<Timer | null> {
    return null;
  }
  async create(timer: Timer): Promise<Timer> {
    return timer;
  }
  async delete(): Promise<void> {
    return undefined;
  }
  async restart(): Promise<Timer> {
    throw new Error("not used");
  }
  async updateCustomization(
    _id: string,
    _customization: Required<TimerCustomization>,
  ): Promise<Timer> {
    throw new Error("not used");
  }
}

const authOperations = {
  signInWithPassword: vi.fn(async () => undefined),
  signOut: vi.fn(async () => undefined),
};

function authValue(
  status: AuthContextValue["status"],
  userId?: string,
  accessToken = "token",
): AuthContextValue {
  const session = userId
    ? ({ access_token: accessToken, user: { id: userId } } as Session)
    : null;
  return {
    status,
    session,
    user: session?.user ?? null,
    error: null,
    pendingOperation: null,
    operationError: null,
    ...authOperations,
  };
}

const client = {} as SupabaseClient<Database>;
const availableClientState: SupabaseBrowserClientState = {
  status: "available",
  client,
};
const unavailableClientState: SupabaseBrowserClientState = {
  status: "unavailable",
  message: "Authentication unavailable",
};

type AuthStateChangeCallback = Parameters<
  SupabaseClient<Database>["auth"]["onAuthStateChange"]
>[0];

let observedRepositories: Array<TimerRepository | null> = [];
let latestTimers: ReturnType<typeof useTimers> | null = null;

function RepositoryProbe({
  name,
  injectedRepository,
}: {
  name: string;
  injectedRepository?: TimerRepository;
}) {
  const repositoryState = useTimerRepositoryState(injectedRepository);
  observedRepositories.push(repositoryState.repository);
  return (
    <>
      <output data-testid={name}>
        {repositoryState.repository
          ? (repositoryState.repository as StubRepository).label
          : "waiting"}
      </output>
      <output data-testid={`${name}-status`}>{repositoryState.status}</output>
    </>
  );
}

function TimerStateProbe({
  injectedRepository,
}: {
  injectedRepository?: TimerRepository;
}) {
  const timers = useTimers(injectedRepository);

  useEffect(() => {
    latestTimers = timers;
  }, [timers]);

  return (
    <>
      <output data-testid="timer-state-loading">
        {timers.isLoading ? "loading" : "ready"}
      </output>
      <output data-testid="timer-state-error">
        {timers.error ?? "no-error"}
      </output>
      <output data-testid="timer-state-timers">
        {timers.timers.map((timer) => timer.id).join(",") || "empty"}
      </output>
    </>
  );
}

function timersApi(): ReturnType<typeof useTimers> {
  if (!latestTimers) throw new Error("Timer hook was not rendered");
  return latestTimers;
}

function renderProvider(
  auth: AuthContextValue,
  options: {
    clientState?: SupabaseBrowserClientState;
    localRepository?: TimerRepository;
    localRepositoryFactory?: () => TimerRepository;
    factory?: (
      client: SupabaseClient<Database>,
      userId: string,
    ) => TimerRepository;
  } = {},
) {
  const localRepository = options.localRepository;
  const factory =
    options.factory ??
    vi.fn((_client, userId) => new StubRepository(`remote:${userId}`));

  const view = render(
    <AuthContext.Provider value={auth}>
      <TimerRepositoryProvider
        clientState={options.clientState ?? availableClientState}
        localRepository={localRepository}
        localRepositoryFactory={options.localRepositoryFactory}
        supabaseRepositoryFactory={factory}
      >
        <RepositoryProbe name="first" />
        <RepositoryProbe name="second" />
      </TimerRepositoryProvider>
    </AuthContext.Provider>,
  );

  return { ...view, factory, localRepository };
}

describe("TimerRepositoryProvider", () => {
  it("keeps useTimers loading without constructing or reading local persistence while auth initializes", () => {
    observedRepositories = [];
    latestTimers = null;
    const factory = vi.fn(
      (_client: SupabaseClient<Database>, userId: string) =>
        new StubRepository(`remote:${userId}`),
    );
    const localRepositoryFactory = vi.fn(() => new StubRepository("local"));

    render(
      <AuthContext.Provider value={authValue("initializing")}>
        <TimerRepositoryProvider
          clientState={availableClientState}
          localRepositoryFactory={localRepositoryFactory}
          supabaseRepositoryFactory={factory}
        >
          <RepositoryProbe name="initializing" />
          <TimerStateProbe />
        </TimerRepositoryProvider>
      </AuthContext.Provider>,
    );

    expect(screen.getByTestId("initializing")).toHaveTextContent("waiting");
    expect(screen.getByTestId("initializing-status")).toHaveTextContent(
      "initializing",
    );
    expect(screen.getByTestId("timer-state-loading")).toHaveTextContent(
      "loading",
    );
    expect(screen.getByTestId("timer-state-timers")).toHaveTextContent("empty");
    expect(observedRepositories).toEqual([null]);
    expect(localRepositoryFactory).not.toHaveBeenCalled();
    expect(factory).not.toHaveBeenCalled();
  });

  it.each([
    ["anonymous auth", availableClientState],
    ["unavailable auth", unavailableClientState],
  ])("uses one shared local repository for %s", (_name, clientState) => {
    observedRepositories = [];
    const localRepository = new StubRepository("chosen-local");

    renderProvider(authValue("anonymous"), { clientState, localRepository });

    expect(screen.getAllByText("chosen-local")).toHaveLength(2);
    expect(observedRepositories).toEqual([localRepository, localRepository]);
    expect(screen.getAllByText("available")).toHaveLength(2);
  });

  it("binds one shared Supabase repository to the authenticated user", () => {
    observedRepositories = [];
    const factory = vi.fn(
      (_client: SupabaseClient<Database>, userId: string) =>
        new StubRepository(`remote:${userId}`),
    );

    renderProvider(authValue("authenticated", "user-a"), { factory });

    expect(screen.getAllByText("remote:user-a")).toHaveLength(2);
    expect(factory).toHaveBeenCalledOnce();
    expect(factory).toHaveBeenCalledWith(client, "user-a");
    expect(observedRepositories[0]).toBe(observedRepositories[1]);
  });

  it("uses provider-selected Supabase state instead of an injected repository", () => {
    observedRepositories = [];
    const injectedRepository = new StubRepository("injected-local");
    const factory = vi.fn(
      (_client: SupabaseClient<Database>, userId: string) =>
        new StubRepository(`remote:${userId}`),
    );

    render(
      <AuthContext.Provider value={authValue("authenticated", "user-a")}>
        <TimerRepositoryProvider
          clientState={availableClientState}
          supabaseRepositoryFactory={factory}
        >
          <RepositoryProbe
            name="provider-authority"
            injectedRepository={injectedRepository}
          />
        </TimerRepositoryProvider>
      </AuthContext.Provider>,
    );

    expect(screen.getByTestId("provider-authority")).toHaveTextContent(
      "remote:user-a",
    );
    expect(observedRepositories).not.toContain(injectedRepository);
  });

  it.each([
    [
      "authenticated with Supabase",
      authValue("authenticated", "user-a"),
      availableClientState,
    ],
    [
      "authenticated without Supabase",
      authValue("authenticated", "user-a"),
      unavailableClientState,
    ],
  ])(
    "does not construct local persistence for %s",
    (_name, auth, clientState) => {
      const localRepositoryFactory = vi.fn(() => new StubRepository("local"));

      renderProvider(auth, { clientState, localRepositoryFactory });

      expect(localRepositoryFactory).not.toHaveBeenCalled();
    },
  );

  it("constructs local persistence lazily once and reuses it across anonymous renders", async () => {
    observedRepositories = [];
    const localRepository = new StubRepository("lazy-local");
    const localRepositoryFactory = vi.fn(() => localRepository);
    const factory = vi.fn(
      (_client: SupabaseClient<Database>, userId: string) =>
        new StubRepository(`remote:${userId}`),
    );
    const view = renderProvider(authValue("anonymous"), {
      localRepositoryFactory,
      factory,
    });
    await waitFor(() => expect(localRepositoryFactory).toHaveBeenCalledOnce());
    const firstRepository = observedRepositories.at(-1);

    view.rerender(
      <AuthContext.Provider value={authValue("anonymous")}>
        <TimerRepositoryProvider
          clientState={availableClientState}
          localRepositoryFactory={localRepositoryFactory}
          supabaseRepositoryFactory={factory}
        >
          <RepositoryProbe name="first" />
          <RepositoryProbe name="second" />
        </TimerRepositoryProvider>
      </AuthContext.Provider>,
    );

    expect(localRepositoryFactory).toHaveBeenCalledOnce();
    expect(firstRepository).toBe(localRepository);
    expect(observedRepositories.at(-1)).toBe(firstRepository);
  });

  it("constructs one local repository under StrictMode", async () => {
    observedRepositories = [];
    const localRepository = new StubRepository("strict-local");
    const localRepositoryFactory = vi.fn(() => localRepository);

    render(
      <StrictMode>
        <AuthContext.Provider value={authValue("anonymous")}>
          <TimerRepositoryProvider
            clientState={availableClientState}
            localRepositoryFactory={localRepositoryFactory}
          >
            <RepositoryProbe name="strict-local" />
          </TimerRepositoryProvider>
        </AuthContext.Provider>
      </StrictMode>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("strict-local")).toHaveTextContent(
        "strict-local",
      ),
    );
    expect(localRepositoryFactory).toHaveBeenCalledOnce();
    expect(observedRepositories.at(-1)).toBe(localRepository);
  });

  it("fails closed for authenticated auth when Supabase is unavailable", async () => {
    observedRepositories = [];
    latestTimers = null;
    const factory = vi.fn(
      (_client: SupabaseClient<Database>, userId: string) =>
        new StubRepository(`remote:${userId}`),
    );
    const localRepository = new StubRepository("local");
    const localOperations = [
      vi.spyOn(localRepository, "getAll"),
      vi.spyOn(localRepository, "getById"),
      vi.spyOn(localRepository, "create"),
      vi.spyOn(localRepository, "delete"),
      vi.spyOn(localRepository, "restart"),
      vi.spyOn(localRepository, "updateCustomization"),
    ];

    render(
      <AuthContext.Provider value={authValue("authenticated", "user-a")}>
        <TimerRepositoryProvider
          clientState={unavailableClientState}
          localRepository={localRepository}
          supabaseRepositoryFactory={factory}
        >
          <RepositoryProbe
            name="unavailable"
            injectedRepository={localRepository}
          />
          <TimerStateProbe injectedRepository={localRepository} />
        </TimerRepositoryProvider>
      </AuthContext.Provider>,
    );

    expect(screen.getByTestId("unavailable")).toHaveTextContent("waiting");
    expect(screen.getByTestId("unavailable-status")).toHaveTextContent(
      "unavailable",
    );
    expect(factory).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByTestId("timer-state-loading")).toHaveTextContent(
        "ready",
      ),
    );
    expect(screen.getByTestId("timer-state-error")).toHaveTextContent(
      TIMER_PERSISTENCE_UNAVAILABLE_MESSAGE,
    );

    const results = await act(async () =>
      Promise.all([
        timersApi().reload(),
        timersApi().create({
          type: "counter",
          title: "Blocked local timer",
          timeZone: "UTC",
          startAt: "2026-09-14T00:00:00Z",
        }),
        timersApi().remove("timer-id"),
        timersApi().restart("timer-id"),
        timersApi().updateCustomization("timer-id", {
          accent: "green",
          icon: "leaf",
        }),
      ]),
    );

    expect(results).toEqual([false, false, false, false, false]);
    for (const operation of localOperations)
      expect(operation).not.toHaveBeenCalled();
  });

  it("uses an explicitly injected repository only when no provider exists", async () => {
    latestTimers = null;
    const injectedRepository = new StubRepository("isolated");
    const getAll = vi.spyOn(injectedRepository, "getAll");

    render(<TimerStateProbe injectedRepository={injectedRepository} />);

    await waitFor(() =>
      expect(screen.getByTestId("timer-state-loading")).toHaveTextContent(
        "ready",
      ),
    );
    expect(getAll).toHaveBeenCalledOnce();
  });

  it("fails fast when neither a provider nor an injected repository exists", () => {
    latestTimers = null;
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    try {
      expect(() => render(<TimerStateProbe />)).toThrowError(
        new Error(
          "useTimerRepositoryState must be used within TimerRepositoryProvider or receive an injected repository",
        ),
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it("returns to the same lazy local repository across anonymous to authenticated to anonymous", async () => {
    observedRepositories = [];
    const factory = vi.fn(
      (_client: SupabaseClient<Database>, userId: string) =>
        new StubRepository(`remote:${userId}`),
    );
    const localRepository = new StubRepository("local");
    const localRepositoryFactory = vi.fn(() => localRepository);
    const view = renderProvider(authValue("anonymous"), {
      factory,
      localRepositoryFactory,
    });
    await waitFor(() => expect(localRepositoryFactory).toHaveBeenCalledOnce());
    const firstLocalRepository = observedRepositories.at(-1);

    view.rerender(
      <AuthContext.Provider value={authValue("authenticated", "user-a")}>
        <TimerRepositoryProvider
          clientState={availableClientState}
          localRepositoryFactory={localRepositoryFactory}
          supabaseRepositoryFactory={factory}
        >
          <RepositoryProbe name="first" />
          <RepositoryProbe name="second" />
        </TimerRepositoryProvider>
      </AuthContext.Provider>,
    );

    const remoteRepository = observedRepositories.at(-1);
    expect(remoteRepository).not.toBe(firstLocalRepository);

    view.rerender(
      <AuthContext.Provider value={authValue("anonymous")}>
        <TimerRepositoryProvider
          clientState={availableClientState}
          localRepositoryFactory={localRepositoryFactory}
          supabaseRepositoryFactory={factory}
        >
          <RepositoryProbe name="first" />
          <RepositoryProbe name="second" />
        </TimerRepositoryProvider>
      </AuthContext.Provider>,
    );

    expect(screen.getAllByText("local")).toHaveLength(2);
    expect(observedRepositories.at(-1)).toBe(firstLocalRepository);
    expect(localRepositoryFactory).toHaveBeenCalledOnce();
  });

  it("keeps the repository for a same-user token refresh but replaces it for a new identity", () => {
    observedRepositories = [];
    const factory = vi.fn(
      (_client: SupabaseClient<Database>, userId: string) =>
        new StubRepository(`remote:${userId}`),
    );
    const localRepository = new StubRepository("local");
    const view = renderProvider(authValue("authenticated", "user-a"), {
      factory,
      localRepository,
    });
    const firstRepository = observedRepositories.at(-1);

    view.rerender(
      <AuthContext.Provider
        value={authValue("authenticated", "user-a", "refreshed-token")}
      >
        <TimerRepositoryProvider
          clientState={availableClientState}
          localRepository={localRepository}
          supabaseRepositoryFactory={factory}
        >
          <RepositoryProbe name="first" />
          <RepositoryProbe name="second" />
        </TimerRepositoryProvider>
      </AuthContext.Provider>,
    );

    expect(factory).toHaveBeenCalledOnce();
    expect(observedRepositories.at(-1)).toBe(firstRepository);

    view.rerender(
      <AuthContext.Provider value={authValue("authenticated", "user-b")}>
        <TimerRepositoryProvider
          clientState={availableClientState}
          localRepository={localRepository}
          supabaseRepositoryFactory={factory}
        >
          <RepositoryProbe name="first" />
          <RepositoryProbe name="second" />
        </TimerRepositoryProvider>
      </AuthContext.Provider>,
    );

    expect(factory).toHaveBeenCalledTimes(2);
    expect(factory).toHaveBeenLastCalledWith(client, "user-b");
    expect(observedRepositories.at(-1)).not.toBe(firstRepository);
    expect(screen.getAllByText("remote:user-b")).toHaveLength(2);
  });

  it("preserves repository identity for an AuthProvider TOKEN_REFRESHED event", () => {
    observedRepositories = [];
    let authCallback!: AuthStateChangeCallback;
    const onAuthStateChange = vi.fn((callback: AuthStateChangeCallback) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    const authClient = {
      auth: { onAuthStateChange },
    } as unknown as SupabaseClient<Database>;
    const clientState: SupabaseBrowserClientState = {
      status: "available",
      client: authClient,
    };
    const factory = vi.fn(
      (_client: SupabaseClient<Database>, userId: string) =>
        new StubRepository(`remote:${userId}`),
    );

    render(
      <AuthProvider clientState={clientState}>
        <TimerRepositoryProvider
          clientState={clientState}
          supabaseRepositoryFactory={factory}
        >
          <RepositoryProbe name="token-refresh" />
        </TimerRepositoryProvider>
      </AuthProvider>,
    );

    act(() =>
      authCallback(
        "INITIAL_SESSION",
        authValue("authenticated", "user-a").session,
      ),
    );
    const firstRepository = observedRepositories.at(-1);
    expect(screen.getByTestId("token-refresh")).toHaveTextContent(
      "remote:user-a",
    );

    act(() =>
      authCallback(
        "TOKEN_REFRESHED",
        authValue("authenticated", "user-a", "refreshed-token").session,
      ),
    );

    expect(factory).toHaveBeenCalledOnce();
    expect(observedRepositories.at(-1)).toBe(firstRepository);
  });

  it("cancels queued anonymous local repository initialization when auth becomes authenticated", async () => {
    observedRepositories = [];

    const localRepositoryFactory = vi.fn(
      () => new StubRepository("stale-local"),
    );
    const supabaseRepositoryFactory = vi.fn(
      (_client: SupabaseClient<Database>, userId: string) =>
        new StubRepository(`remote:${userId}`),
    );

    const view = renderProvider(authValue("anonymous"), {
      localRepositoryFactory,
      factory: supabaseRepositoryFactory,
    });

    // Critical ordering:
    // do NOT await here. The anonymous effect has queued local initialization,
    // but its queueMicrotask callback has not been allowed to run yet.
    view.rerender(
      <AuthContext.Provider value={authValue("authenticated", "user-a")}>
        <TimerRepositoryProvider
          clientState={availableClientState}
          localRepositoryFactory={localRepositoryFactory}
          supabaseRepositoryFactory={supabaseRepositoryFactory}
        >
          <RepositoryProbe name="first" />
          <RepositoryProbe name="second" />
        </TimerRepositoryProvider>
      </AuthContext.Provider>,
    );

    // Now allow the stale anonymous microtask to run.
    await act(async () => {
      await Promise.resolve();
    });

    expect(localRepositoryFactory).not.toHaveBeenCalled();
    expect(supabaseRepositoryFactory).toHaveBeenCalledOnce();
    expect(supabaseRepositoryFactory).toHaveBeenCalledWith(client, "user-a");
    expect(screen.getAllByText("remote:user-a")).toHaveLength(2);
    expect(observedRepositories).not.toContainEqual(
      expect.objectContaining({ label: "stale-local" }),
    );
  });
});
