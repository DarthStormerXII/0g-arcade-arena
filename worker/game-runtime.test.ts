import { describe, expect, it } from "vitest";
import type { GamePlayer } from "../src/lib/game-pack";
import { applyRoomMove, cancelRoom, createRoom, getRoomView, joinRoom, startRoom } from "./game-runtime";

const host: GamePlayer = {
  id: "wallet-a",
  kind: "human",
  displayName: "Wallet A",
  ownerWallet: "0x1111111111111111111111111111111111111111",
};

const guest: GamePlayer = {
  id: "wallet-b",
  kind: "human",
  displayName: "Wallet B",
  ownerWallet: "0x2222222222222222222222222222222222222222",
};

describe("Arcade room runtime", () => {
  it("creates, joins, starts, and resolves a real Grid Four room", () => {
    let room = createRoom({
      roomId: "ROOM-1234",
      host,
      seed: "seed-grid-four-e2e",
      wagerWei: "100000000000000",
      now: "2026-06-23T00:00:00.000Z",
    });
    expect(room.roomId).toBe("room-1234");
    expect(room.status).toBe("waiting");
    expect(room.state).toBeNull();

    room = joinRoom(room, { player: guest, now: "2026-06-23T00:00:01.000Z" });
    expect(room.players.map((player) => player.id)).toEqual(["wallet-a", "wallet-b"]);
    expect(room.status).toBe("ready");

    room = startRoom(room, "2026-06-23T00:00:02.000Z");
    expect(room.status).toBe("active");
    expect(getRoomView(room).currentPlayerIds).toEqual(["wallet-a"]);

    expect(() => applyRoomMove(room, { playerId: "wallet-b", move: { column: 0 } })).toThrow(
      "not current player",
    );
    expect(() => applyRoomMove(room, { playerId: "wallet-a", move: { column: 9 } })).toThrow(
      "column out of range",
    );

    for (const [playerId, column] of [
      ["wallet-a", 0],
      ["wallet-b", 1],
      ["wallet-a", 0],
      ["wallet-b", 1],
      ["wallet-a", 0],
      ["wallet-b", 1],
      ["wallet-a", 0],
    ] as const) {
      room = applyRoomMove(room, { playerId, move: { column } });
    }

    expect(room.status).toBe("finished");
    expect(room.result?.winnerIds).toEqual(["wallet-a"]);
    expect(room.replay?.moves).toHaveLength(7);
    expect(getRoomView(room).replayHash).toMatch(/^0x/);
    expect(getRoomView(room).resultHash).toMatch(/^0x/);
  });

  it("does not add the same player twice and rejects a third player", () => {
    const third: GamePlayer = { id: "wallet-c", kind: "human", displayName: "Wallet C" };
    let room = createRoom({ roomId: "same-player-room", host });

    room = joinRoom(room, { player: host });
    expect(room.players).toHaveLength(1);

    room = joinRoom(room, { player: guest });
    expect(room.players).toHaveLength(2);
    expect(() => joinRoom(room, { player: third })).toThrow("room already has two players");
  });

  it("lets only the host cancel before start and blocks cancelled rooms", () => {
    let room = createRoom({ roomId: "cancel-room", host, wagerWei: "100000000000000" });

    expect(() => cancelRoom(room, { playerId: guest.id })).toThrow("only the host can cancel this room");

    room = cancelRoom(room, { playerId: host.id, now: "2026-06-24T00:00:00.000Z" });
    expect(room.status).toBe("cancelled");
    expect(() => startRoom(joinRoom(room, { player: guest }))).toThrow("room is cancelled");
  });

  it("rejects cancellation after a match starts", () => {
    let room = createRoom({ roomId: "active-cancel-room", host });
    room = joinRoom(room, { player: guest });
    room = startRoom(room);

    expect(() => cancelRoom(room, { playerId: host.id })).toThrow("active matches cannot be cancelled");
  });
});
