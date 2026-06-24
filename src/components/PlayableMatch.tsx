import { useWallets } from "@privy-io/react-auth";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { FleetState } from "../../games/fleet-duel/rules";
import type { GridFourState } from "../../games/grid-four/rules";
import type { TileRaceState } from "../../games/tile-race/rules";
import type { DraftState } from "../../games/world-cup-draft/rules";
import { chooseFallbackMove, demoPlayers } from "../lib/agents";
import { getGame } from "../lib/game-registry";
import { makeMatchRecord, saveMatchRecord } from "../lib/match-records";
import { getRoom, joinRoom, playAgentMove, playRoomMove, type ArcadeRoomView } from "../lib/room-api";
import { useArcadePlayer } from "../lib/use-arcade-player";
import { settleWager, type EthereumWallet } from "../lib/wager";
import { Button } from "./ui/button";
import { Panel, StatusPill } from "./ui/panel";

type PlayableMatchProps = {
  matchId: string;
  gameId: string;
  roomId?: string;
};

export function PlayableMatch({ matchId, gameId, roomId }: PlayableMatchProps) {
  if (roomId) return <LiveRoomMatch matchId={matchId} gameId={gameId} roomId={roomId} />;
  if (gameId === "grid-four") return <GridFourMatch matchId={matchId} />;
  if (gameId === "fleet-duel") return <StepMatch matchId={matchId} gameId={gameId} label="Fire next legal shot" />;
  if (gameId === "tile-race") return <TileRaceMatch matchId={matchId} />;
  return <StepMatch matchId={matchId} gameId={gameId} label="Draft next player" />;
}

function LiveRoomMatch({ matchId, gameId, roomId }: { matchId: string; gameId: string; roomId: string }) {
  const player = useArcadePlayer();
  const { wallets } = useWallets();
  const activeWallet = wallets[0] as unknown as EthereumWallet | undefined;
  const [room, setRoom] = useState<ArcadeRoomView | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [settleTx, setSettleTx] = useState("");
  const [agentMoveAttempt, setAgentMoveAttempt] = useState("");
  const liveGameId = room?.gameId ?? gameId;
  const isPlayer = room?.players.some((item) => item.id === player.id) ?? false;
  const isMyTurn = room?.currentPlayerIds.includes(player.id) ?? false;
  const currentPlayer = room?.players.find((item) => item.id === room.currentPlayerIds[0]);
  const latestComputeProof = room?.computeProofs?.at(-1);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const next = await getRoom(roomId);
        if (cancelled) return;
        setRoom(next);
        if (next.replay && next.score) {
          saveMatchRecord(makeMatchRecord(matchId, next.gameId, next.replay, next.score));
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load room");
      }
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [matchId, roomId]);

  useEffect(() => {
    if (!room || busy || room.status !== "active" || currentPlayer?.kind !== "agent") return;
    const attemptKey = `${room.roomId}:${room.updatedAt}:${room.currentPlayerIds[0]}`;
    if (agentMoveAttempt === attemptKey) return;
    let cancelled = false;
    async function moveAgent() {
      setAgentMoveAttempt(attemptKey);
      setBusy(true);
      setError("");
      try {
        const next = await playAgentMove(roomId);
        if (cancelled) return;
        setRoom(next);
        if (next.replay && next.score) {
          saveMatchRecord(makeMatchRecord(matchId, next.gameId, next.replay, next.score));
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Agent move rejected");
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    void moveAgent();
    return () => {
      cancelled = true;
    };
  }, [agentMoveAttempt, busy, currentPlayer?.kind, matchId, room, roomId]);

  async function joinAsPlayer() {
    setBusy(true);
    setError("");
    try {
      setRoom(await joinRoom(roomId, player));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not join room");
    } finally {
      setBusy(false);
    }
  }

  async function playMove(move: unknown) {
    if (!room || !isMyTurn || room.status === "finished") return;
    setBusy(true);
    setError("");
    try {
      const next = await playRoomMove(room.roomId, player.id, move);
      setRoom(next);
      if (next.replay && next.score) {
        saveMatchRecord(makeMatchRecord(matchId, next.gameId, next.replay, next.score));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Move rejected");
    } finally {
      setBusy(false);
    }
  }

  async function settleFinishedWager() {
    if (!room?.result?.winnerIds[0] || !activeWallet) return;
    const winner = room.players.find((item) => item.id === room.result?.winnerIds[0])?.ownerWallet;
    if (!winner) {
      setError("winner wallet is missing");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const receipt = await settleWager(activeWallet, room.roomId, winner);
      setSettleTx(receipt.transactionHash);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not settle wager");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="grid gap-5 lg:grid-cols-[1fr_.7fr]">
      <LiveRoomBoard
        busy={busy}
        gameId={liveGameId}
        isMyTurn={isMyTurn}
        playerId={player.id}
        room={room}
        onMove={playMove}
      />
      <div className="space-y-4">
        <StatusPill tone={room?.status === "finished" ? "green" : isMyTurn ? "yellow" : "cyan"}>
          {room?.status ?? "Loading room"}
        </StatusPill>
        <h2 className="text-2xl font-black uppercase">Shared room match</h2>
        <p className="text-white/70">
          {room?.result?.reason ??
            (isMyTurn ? "Your turn. Pick a legal move." : "Waiting for the other player to move.")}
        </p>
        <div className="rounded-sm border border-white/10 bg-black/35 p-3 text-sm text-white/70">
          Room: {roomId}<br />
          Game: {liveGameId}<br />
          Turn: {roomTurn(room)}<br />
          Current player: {room?.currentPlayerIds[0] ?? "pending"}<br />
          Opponent: {currentPlayer?.kind === "agent" ? "0G agent" : room?.opponentMode ?? "human"}<br />
          Compute: {latestComputeProof?.mode ?? room?.computeMode ?? "pending"}<br />
          {latestComputeProof?.primaryComputeError ? (
            <>
              0G Router error: {latestComputeProof.primaryComputeError}<br />
            </>
          ) : null}
          {latestComputeProof?.fallbackReason && !latestComputeProof.primaryComputeError ? (
            <>
              Fallback: {latestComputeProof.fallbackReason}<br />
            </>
          ) : null}
          Replay hash: {room?.replayHash ?? "pending"}<br />
          {settleTx ? <>Settlement tx: {settleTx.slice(0, 10)}...{settleTx.slice(-6)}</> : null}
        </div>
        {error ? <p className="text-sm text-[#ff8a8a]">{error}</p> : null}
        <div className="flex flex-wrap gap-3">
          {!isPlayer ? <Button disabled={busy} onClick={joinAsPlayer}>Join as current wallet</Button> : null}
          {room?.status === "finished" && room.wagerWei !== "0" ? (
            <Button disabled={busy || !activeWallet} onClick={settleFinishedWager}>Settle wager</Button>
          ) : null}
          <Link to={`/result/${matchId}`}><Button variant="secondary">Reveal Result</Button></Link>
          <Link to={`/proof/${matchId}`}><Button variant="secondary">Open Proof</Button></Link>
        </div>
      </div>
    </Panel>
  );
}

function LiveRoomBoard({
  busy,
  gameId,
  isMyTurn,
  playerId,
  room,
  onMove,
}: {
  busy: boolean;
  gameId: string;
  isMyTurn: boolean;
  playerId: string;
  room: ArcadeRoomView | null;
  onMove: (move: unknown) => void;
}) {
  if (gameId === "grid-four") {
    const state = room?.state as GridFourState | null | undefined;
    return (
      <div className="grid grid-cols-7 gap-2">
        {(state?.board ?? Array.from({ length: 6 }, () => Array<string | null>(7).fill(null))).flatMap((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}`}
              className="aspect-square rounded-full border border-white/15 bg-black/45 p-1 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={busy || !isMyTurn || room?.status === "finished"}
              onClick={() => onMove({ column: colIndex })}
              aria-label={`Drop in column ${colIndex + 1}, row ${rowIndex + 1}`}
            >
              <span
                className={`block h-full rounded-full ${cell === playerId ? "bg-[#46ff9f]" : cell ? "bg-[#ffe66d]" : "bg-white/8"}`}
              />
            </button>
          )),
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {room?.state ? <GameStatePreview gameId={gameId} state={room.state as FleetState | TileRaceState | DraftState} /> : null}
      <div className="grid gap-2">
        {(room?.legalMoves ?? []).map((move, index) => (
          <Button
            key={`${index}-${moveLabel(move)}`}
            disabled={busy || !isMyTurn || room?.status === "finished"}
            variant={index === 0 ? "default" : "secondary"}
            onClick={() => onMove(move)}
          >
            {moveLabel(move)}
          </Button>
        ))}
        {!room?.legalMoves?.length ? <p className="text-sm text-white/58">Waiting for legal moves.</p> : null}
      </div>
    </div>
  );
}

function roomTurn(room: ArcadeRoomView | null) {
  const maybeTurn = (room?.state as { turn?: unknown } | null)?.turn;
  return typeof maybeTurn === "number" ? maybeTurn : 0;
}

function moveLabel(move: unknown) {
  if (!move || typeof move !== "object") return "Play move";
  if ("direction" in move) return String(move.direction);
  if ("x" in move && "y" in move) return `Fire ${String(move.x)},${String(move.y)}`;
  if ("pickId" in move) return `Draft ${String(move.pickId)}`;
  if ("column" in move) return `Column ${Number(move.column) + 1}`;
  return JSON.stringify(move);
}

function initialState(gameId: string) {
  const adapter = getGame(gameId) as any;
  return adapter.createInitialState({
    seed: `local-${gameId}`,
    players: demoPlayers,
    options: { maxTurns: 12, maxPicks: 2 },
  });
}

function persist(matchId: string, gameId: string, state: unknown) {
  const adapter = getGame(gameId) as any;
  saveMatchRecord(makeMatchRecord(matchId, gameId, adapter.serializeReplay(state), adapter.scoreState(state)));
}

function GridFourMatch({ matchId }: { matchId: string }) {
  const adapter = getGame("grid-four") as any;
  const [state, setState] = useState<GridFourState>(() => initialState("grid-four"));
  const current = adapter.getCurrentPlayerIds(state)[0];
  const result = adapter.getResult(state);

  function playColumn(column: number) {
    if (result || current !== "human-1") return;
    if (!adapter.validateMove(state, "human-1", { column }).ok) return;
    let next = adapter.applyMove(state, "human-1", { column });
    if (!adapter.isTerminal(next)) {
      const agentId = adapter.getCurrentPlayerIds(next)[0];
      const output = chooseFallbackMove(adapter, next, agentId);
      next = adapter.applyMove(next, agentId, output.move);
    }
    persist(matchId, "grid-four", next);
    setState(next);
  }

  return (
    <Panel className="grid gap-5 lg:grid-cols-[1fr_.7fr]">
      <div className="grid grid-cols-7 gap-2">
        {state.board.flatMap((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}`}
              className="aspect-square rounded-full border border-white/15 bg-black/45 p-1"
              onClick={() => playColumn(colIndex)}
              aria-label={`Drop in column ${colIndex + 1}`}
            >
              <span
                className={`block h-full rounded-full ${cell === "human-1" ? "bg-[#46ff9f]" : cell ? "bg-[#ffe66d]" : "bg-white/8"}`}
              />
            </button>
          )),
        )}
      </div>
      <MatchSidecar
        matchId={matchId}
        gameId="grid-four"
        turn={state.turn}
        result={result?.reason ?? "Your move is followed by the matched agent's next legal move."}
        onReset={() => setState(initialState("grid-four"))}
      />
    </Panel>
  );
}

function StepMatch({ matchId, gameId, label }: { matchId: string; gameId: string; label: string }) {
  const adapter = useMemo(() => getGame(gameId) as any, [gameId]);
  const [state, setState] = useState<any>(() => initialState(gameId));
  const result = adapter.getResult(state);

  function playStep() {
    if (result) return;
    const playerId = adapter.getCurrentPlayerIds(state)[0];
    const output = chooseFallbackMove(adapter, state, playerId);
    const next = adapter.applyMove(state, playerId, output.move);
    persist(matchId, gameId, next);
    setState(next);
  }

  return (
    <Panel className="grid gap-5 lg:grid-cols-[1fr_.7fr]">
      <GameStatePreview gameId={gameId} state={state} />
      <MatchSidecar
        matchId={matchId}
        gameId={gameId}
        turn={state.turn}
        result={result?.reason ?? "Each turn is applied by deterministic rules and saved into the replay receipt."}
        onStep={playStep}
        stepLabel={label}
        onReset={() => setState(initialState(gameId))}
      />
    </Panel>
  );
}

function TileRaceMatch({ matchId }: { matchId: string }) {
  const adapter = getGame("tile-race") as any;
  const [state, setState] = useState<TileRaceState>(() => initialState("tile-race"));
  const result = adapter.getResult(state);

  function playDirection(direction: "up" | "down" | "left" | "right") {
    if (result) return;
    const playerId = adapter.getCurrentPlayerIds(state)[0];
    if (!adapter.validateMove(state, playerId, { direction }).ok) return;
    let next = adapter.applyMove(state, playerId, { direction });
    if (!adapter.isTerminal(next)) {
      const agentId = adapter.getCurrentPlayerIds(next)[0];
      const output = chooseFallbackMove(adapter, next, agentId);
      next = adapter.applyMove(next, agentId, output.move);
    }
    persist(matchId, "tile-race", next);
    setState(next);
  }

  return (
    <Panel className="grid gap-5 lg:grid-cols-[1fr_.7fr]">
      <GameStatePreview gameId="tile-race" state={state} />
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(["up", "down", "left", "right"] as const).map((direction) => (
            <Button key={direction} variant="secondary" onClick={() => playDirection(direction)}>
              {direction}
            </Button>
          ))}
        </div>
          <MatchSidecar
          matchId={matchId}
          gameId="tile-race"
          turn={state.turn}
          result={result?.reason ?? "Your direction is followed by the matched agent's next legal move."}
          onReset={() => setState(initialState("tile-race"))}
        />
      </div>
    </Panel>
  );
}

function GameStatePreview({ gameId, state }: { gameId: string; state: FleetState | TileRaceState | DraftState }) {
  if (gameId === "fleet-duel") {
    const fleet = state as FleetState;
    return (
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 36 }, (_, index) => {
          const id = `${index % 6},${Math.floor(index / 6)}`;
          const fired = Object.values(fleet.shots).some((shots) => shots.includes(id));
          return <div key={id} className={`aspect-square rounded-sm border border-white/15 ${fired ? "bg-[#57e2ff88]" : "bg-black/40"}`} />;
        })}
      </div>
    );
  }
  if (gameId === "tile-race") {
    const tile = state as TileRaceState;
    const board = tile.boards[tile.players[0].id];
    return (
      <div className="grid grid-cols-4 gap-2">
        {board.flat().map((value, index) => (
          <div key={index} className="grid aspect-square place-items-center rounded-sm border border-white/15 bg-black/40 text-xl font-black">
            {value || ""}
          </div>
        ))}
      </div>
    );
  }
  const draft = state as DraftState;
  return (
    <div className="grid gap-2">
      {Object.values(draft.teams).map((team) => (
        <div key={team.playerId} className="rounded-sm border border-white/10 bg-black/35 p-3">
          <strong>{team.playerId}</strong>
          <p className="text-sm text-white/65">{team.picks.map((pick) => pick.name).join(", ") || "Drafting..."}</p>
        </div>
      ))}
    </div>
  );
}

function MatchSidecar({
  matchId,
  gameId,
  turn,
  result,
  onStep,
  stepLabel,
  onReset,
}: {
  matchId: string;
  gameId: string;
  turn: number;
  result: string;
  onStep?: () => void;
  stepLabel?: string;
  onReset: () => void;
}) {
  return (
    <div className="space-y-4">
      <StatusPill tone="yellow">0G Compute fallback disclosed</StatusPill>
      <h2 className="text-2xl font-black uppercase">Match in progress</h2>
      <p className="text-white/70">{result}</p>
      <div className="rounded-sm border border-white/10 bg-black/35 p-3 text-sm text-white/70">
        Game: {gameId}<br />
        Turn: {turn}<br />
        Replay receipt: local browser storage until 0G Storage is configured
      </div>
      <div className="flex flex-wrap gap-3">
        {onStep ? <Button onClick={onStep}>{stepLabel}</Button> : null}
        <Button variant="secondary" onClick={onReset}>Reset</Button>
        <Link to={`/result/${matchId}`}><Button variant="secondary">Reveal Result</Button></Link>
        <Link to={`/proof/${matchId}`}><Button variant="secondary">Open Proof</Button></Link>
      </div>
    </div>
  );
}
