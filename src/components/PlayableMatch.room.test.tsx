import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlayableMatch } from "./PlayableMatch";
import { getRoom } from "../lib/room-api";

type MockRoomInput = {
  gameId: string;
  roomId: string;
  move: unknown;
  state: Record<string, unknown>;
};

function mockRoom({ gameId, roomId, move, state }: MockRoomInput) {
  return {
    roomId,
    matchId: `match-${roomId}`,
    gameId,
    seed: `${gameId}-ui-seed`,
    opponentMode: "human",
    wagerWei: "0",
    players: [
      {
        id: "browser-player",
        kind: "human",
        displayName: "Browser Player",
        ownerWallet: "0x1111111111111111111111111111111111111111",
      },
      {
        id: "wallet-b",
        kind: "human",
        displayName: "Wallet B",
        ownerWallet: "0x2222222222222222222222222222222222222222",
      },
    ],
    status: "active",
    state,
    replay: null,
    result: null,
    score: null,
    currentPlayerIds: ["browser-player"],
    legalMoves: [move],
    replayHash: null,
    resultHash: null,
    createdAt: "2026-06-24T00:00:00.000Z",
    updatedAt: "2026-06-24T00:00:01.000Z",
  };
}

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ user: { id: "browser-player", email: { address: "player@example.test" } } }),
  useWallets: () => ({ wallets: [{ address: "0x1111111111111111111111111111111111111111" }] }),
}));

vi.mock("../lib/room-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/room-api")>();
  return {
    ...actual,
    getRoom: vi.fn(async (roomId: string) => {
      if (roomId === "tile-live-room") {
        return mockRoom({
          gameId: "tile-race",
          roomId,
          move: { direction: "up" },
          state: {
            gameId: "tile-race",
            version: "1.0.0",
            seed: "tile-ui-seed",
            players: [{ id: "browser-player" }],
            boards: { "browser-player": [[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]] },
            scores: { "browser-player": 0 },
            turn: 0,
            activePlayerIndex: 0,
            moves: [],
            result: null,
          },
        });
      }
      if (roomId === "draft-live-room") {
        return mockRoom({
          gameId: "world-cup-draft",
          roomId,
          move: { pickId: "arg-fw" },
          state: {
            gameId: "world-cup-draft",
            version: "1.0.0",
            seed: "draft-ui-seed",
            players: [{ id: "browser-player" }],
            teams: { "browser-player": { playerId: "browser-player", picks: [] } },
            pool: [{ id: "arg-fw", name: "Argentina Forward" }],
            turn: 0,
            activePlayerIndex: 0,
            moves: [],
            result: null,
          },
        });
      }
      return mockRoom({
        gameId: "fleet-duel",
        roomId: "fd-live-room",
        move: { x: 0, y: 0 },
        state: {
          gameId: "fleet-duel",
          version: "1.0.0",
          seed: "fleet-ui-seed",
          players: [],
          fleets: {},
          shots: {},
          turn: 0,
          activePlayerIndex: 0,
          moves: [],
          result: null,
        },
      });
    }),
    joinRoom: vi.fn(),
    playRoomMove: vi.fn(),
    playAgentMove: vi.fn(),
  };
});

describe("PlayableMatch live rooms", () => {
  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it.each([
    { gameId: "fleet-duel", roomId: "fd-live-room", moveLabel: "Fire 0,0" },
    { gameId: "tile-race", roomId: "tile-live-room", moveLabel: "up" },
    { gameId: "world-cup-draft", roomId: "draft-live-room", moveLabel: "Draft arg-fw" },
  ])("renders a $gameId live room from the room API", async ({ gameId, roomId, moveLabel }) => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <PlayableMatch matchId={`match-${roomId}`} gameId={gameId} roomId={roomId} />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    expect(getRoom).toHaveBeenCalledWith(roomId);
    expect(container.textContent).toContain("Shared room match");
    expect(container.textContent).toContain(`Room: ${roomId}`);
    expect(container.textContent).toContain(`Game: ${gameId}`);
    expect(container.textContent).toContain("Current player: browser-player");
    expect(container.textContent).toContain(moveLabel);

    await act(async () => root.unmount());
  });
});
