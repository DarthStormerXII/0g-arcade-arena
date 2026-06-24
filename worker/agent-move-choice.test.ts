import { afterEach, describe, expect, it, vi } from "vitest";
import type { GamePlayer } from "../src/lib/game-pack";
import { createRoom, getRoomView, joinRoom, startRoom } from "./game-runtime";
import { chooseAgentMove } from "./index";

const agent: GamePlayer = {
  id: "agent-grid-warden",
  kind: "agent",
  displayName: "Grid Warden",
  agentId: "agent-grid-warden",
};

const human: GamePlayer = {
  id: "wallet-a",
  kind: "human",
  displayName: "Wallet A",
  ownerWallet: "0x1111111111111111111111111111111111111111",
};

function makeActiveAgentRoom() {
  return startRoom(
    joinRoom(
      createRoom({
        roomId: "agent-compute-test",
        host: agent,
        seed: "agent-compute-seed",
        now: "2026-06-24T00:00:00.000Z",
      }),
      { player: human },
    ),
  );
}

function makeActiveTileAgentRoom() {
  return startRoom(
    joinRoom(
      createRoom({
        roomId: "agent-tile-compute-test",
        gameId: "tile-race",
        host: agent,
        seed: "agent-tile-compute-seed",
        now: "2026-06-24T00:00:00.000Z",
      }),
      { player: human },
    ),
  );
}

function makeEnv() {
  return {
    ZEROG_ROUTER_API_KEY: "test-router-key",
    ZEROG_COMPUTE_ROUTER: "https://compute.test/v1",
    ZEROG_COMPUTE_MODEL: "glm-5.1",
  } as never;
}

function mockComputeContent(content: string, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content } }],
          x_0g_trace: {
            provider: "mock-provider",
            request_id: "mock-request",
            tee_verified: true,
          },
        }),
        { status: ok ? 200 : 500, headers: { "content-type": "application/json" } },
      );
    }),
  );
}

describe("0G Compute agent move selection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts a legal mocked 0G Compute move", async () => {
    mockComputeContent('```json\n{"move":{"column":3},"confidence":1.4,"reasoningSummary":"Take center."}\n```');

    const choice = await chooseAgentMove(makeActiveAgentRoom(), makeEnv());

    expect(choice.computeMode).toBe("0g-compute");
    expect(choice.move).toEqual({ column: 3 });
    expect(choice.confidence).toBe(1);
    expect(choice.provider).toBe("mock-provider");
    expect(choice.requestId).toBe("mock-request");
    expect(choice.verified).toBe(true);
    expect(choice.fallbackReason).toBeNull();
  });

  it("falls back when mocked 0G Compute returns malformed content", async () => {
    mockComputeContent("play the center");

    const choice = await chooseAgentMove(makeActiveAgentRoom(), makeEnv());

    expect(choice.computeMode).toBe("deterministic-fallback");
    expect(choice.move).toEqual({ column: 3 });
    expect(choice.fallbackReason).toBe("0G Compute response did not contain JSON.");
  });

  it("falls back when mocked 0G Compute returns an illegal move", async () => {
    mockComputeContent('{"move":{"column":99},"confidence":0.9,"reasoningSummary":"Bad column."}');

    const choice = await chooseAgentMove(makeActiveAgentRoom(), makeEnv());

    expect(choice.computeMode).toBe("deterministic-fallback");
    expect(choice.move).toEqual({ column: 3 });
    expect(choice.fallbackReason).toContain("0G Compute returned an illegal move");
  });

  it("accepts a legal mocked 0G Compute move for Tile Race", async () => {
    const room = makeActiveTileAgentRoom();
    const legalMove = getRoomView(room).legalMoves[0];
    mockComputeContent(
      JSON.stringify({ move: legalMove, confidence: 0.8, reasoningSummary: "Slide toward merges." }),
    );

    const choice = await chooseAgentMove(room, makeEnv());

    expect(legalMove).toBeTruthy();
    expect(choice.computeMode).toBe("0g-compute");
    expect(choice.move).toEqual(legalMove);
    expect(choice.provider).toBe("mock-provider");
    expect(choice.requestId).toBe("mock-request");
    expect(choice.verified).toBe(true);
    expect(choice.fallbackReason).toBeNull();
  });
});
