import { useWallets } from "@privy-io/react-auth";
import { Bot, Copy, Gamepad2, Swords, UserRound, Users } from "lucide-react";
import { useEffect, useState, type ButtonHTMLAttributes } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Page } from "../components/Page";
import { Button } from "../components/ui/button";
import { Panel, StatusPill } from "../components/ui/panel";
import { agentToPlayer, fetchQualifiedAgents, type RegisteredAgent } from "../lib/agent-api";
import { gameDescriptions, gameVisuals, getGame } from "../lib/game-registry";
import {
  autoMatchHuman,
  createRoom as createApiRoom,
  cancelRoom as cancelApiRoom,
  getRoom,
  joinRoom as joinApiRoom,
  parse0gToWei,
  startRoom as startApiRoom,
  type ArcadeRoomView,
} from "../lib/room-api";
import { useArcadePlayer } from "../lib/use-arcade-player";
import { cn } from "../lib/utils";
import { createWager, type EthereumWallet } from "../lib/wager";

type OpponentMode = "agent" | "human";
type WagerMode = "free" | "wager";
type HumanMatchMode = "queue" | "private";

function roomCode(gameId: string) {
  return `${gameId.slice(0, 2).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function GameDetail() {
  const { gameId } = useParams();
  const game = getGame(gameId);
  const visuals = gameVisuals[game.id];
  return (
    <Page title={game.manifest.name} icon={<Gamepad2 />}>
      <div className="grid gap-6">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
          <Panel className="chrome-sheen overflow-hidden p-0">
            <div className="relative h-[360px] overflow-hidden">
              <img className="absolute inset-0 h-full w-full object-cover" src={visuals.cover} alt="" />
              <img className="absolute inset-0 h-full w-full object-cover opacity-45 mix-blend-screen" src="/brand/thumbnail.jpg" alt="" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,2,13,.08),rgba(8,2,13,.72))]" />
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-[88px_1fr]">
              <img className="h-20 w-20 rounded-full border border-white/15 object-cover shadow-[0_0_34px_rgba(181,108,255,.32)]" src={visuals.logo} alt="" />
              <div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone={game.manifest.supportsWagers ? "green" : "muted"}>
                    {game.manifest.supportsWagers ? "Wagers available" : "Free play only"}
                  </StatusPill>
                  <StatusPill tone={game.manifest.hiddenInformation ? "yellow" : "cyan"}>
                    {game.manifest.gameType}
                  </StatusPill>
                </div>
                <h2 className="mt-4 text-3xl font-black uppercase">{game.manifest.name}</h2>
                <p className="mt-2 max-w-3xl text-white/68">{gameDescriptions[game.id]}</p>
              </div>
            </div>
          </Panel>
          <PlaySetup gameId={game.id} supportsWagers={game.manifest.supportsWagers} />
        </section>

        <Panel>
          <h2 className="text-2xl font-black uppercase">Game Details</h2>
          <dl className="mt-4 grid gap-3 text-sm text-white/74 md:grid-cols-2">
            {Object.entries(game.manifest).slice(0, 18).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4 border-b border-white/10 pb-2">
                <dt>{key}</dt>
                <dd className="text-right text-white">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    </Page>
  );
}

export function PlaySetup({ gameId, supportsWagers }: { gameId: string; supportsWagers: boolean }) {
  const navigate = useNavigate();
  const player = useArcadePlayer();
  const [opponent, setOpponent] = useState<OpponentMode>("agent");
  const [wager, setWager] = useState<WagerMode>("free");
  const [amount, setAmount] = useState("0.0001");
  const [humanMode, setHumanMode] = useState<HumanMatchMode>("queue");
  const [code, setCode] = useState(() => roomCode(gameId));
  const [joinCode, setJoinCode] = useState("");
  const [agents, setAgents] = useState<RegisteredAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canWager = supportsWagers && wager === "wager";
  const wagerQuery = canWager ? `&wager=${encodeURIComponent(amount)}` : "";
  const wagerWei = canWager ? parse0gToWei(amount) : "0";
  const selectedAgent = agents.find((agent) => agent.agentId === selectedAgentId) ?? agents[0];

  useEffect(() => {
    let cancelled = false;
    fetchQualifiedAgents(gameId, wagerWei).then((next) => {
      if (cancelled) return;
      setAgents(next);
      setSelectedAgentId((current) => (next.some((agent) => agent.agentId === current) ? current : next[0]?.agentId ?? ""));
    });
    return () => {
      cancelled = true;
    };
  }, [gameId, wagerWei]);

  async function startAgentRoom() {
    if (!selectedAgent) {
      setError("No qualified agent is registered for this game and wager.");
      return;
    }
    const agentRoomCode = roomCode(gameId).toLowerCase();
    setBusy(true);
    setError("");
    try {
      const room = await createApiRoom({
        roomId: agentRoomCode,
        gameId,
        host: player,
        wagerWei,
        opponentMode: "agent",
      });
      const joined = await joinApiRoom(room.roomId, agentToPlayer(selectedAgent));
      if (wagerWei !== "0") {
        navigate(`/room/${joined.roomId}?game=${gameId}&opponent=agent&wager=${amount}`);
        return;
      }
      const started = await startApiRoom(joined.roomId);
      navigate(`/match/${started.matchId}?room=${started.roomId}&game=${gameId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start agent room");
    } finally {
      setBusy(false);
    }
  }

  async function startPrivateRoom() {
    setBusy(true);
    setError("");
    try {
      const room = await createApiRoom({
        roomId: code,
        gameId,
        host: player,
        wagerWei,
      });
      navigate(`/room/${room.roomId}?game=${gameId}&opponent=human&wager=${canWager ? amount : "free"}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create room");
    } finally {
      setBusy(false);
    }
  }

  async function startHumanAutoMatch() {
    setBusy(true);
    setError("");
    try {
      const room = await autoMatchHuman({
        gameId,
        player,
        wagerWei,
      });
      if (room.status === "active") {
        navigate(`/match/${room.matchId}?room=${room.roomId}&game=${gameId}`);
        return;
      }
      navigate(`/room/${room.roomId}?game=${gameId}&opponent=human&wager=${canWager ? amount : "free"}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not auto-match");
    } finally {
      setBusy(false);
    }
  }

  async function joinRoom() {
    const cleaned = joinCode.trim();
    if (!cleaned) return;
    setBusy(true);
    setError("");
    try {
      const room = await joinApiRoom(cleaned, player);
      navigate(`/room/${room.roomId}?game=${room.gameId}${wagerQuery}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not join room");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <StatusPill tone="green">Start Match</StatusPill>
      <h2 className="mt-3 text-2xl font-black uppercase">Choose how you want to play</h2>
      <p className="mt-2 text-sm text-white/62">
        This is a multiplayer-first arcade. Pick an agent or human opponent, decide whether this is free or wagered,
        then start or share a room.
      </p>

      <div className="mt-5 grid gap-3">
        <SegmentButton active={opponent === "agent"} onClick={() => setOpponent("agent")}>
          <Bot size={18} /> Play with 0G agent
        </SegmentButton>
        <SegmentButton active={opponent === "human"} onClick={() => setOpponent("human")}>
          <Users size={18} /> Play with humans
        </SegmentButton>
      </div>

      <div className="mt-5 grid gap-3 rounded-sm border border-white/10 bg-[#140820]/70 p-3">
        <div className="text-sm font-black uppercase">Wager</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <SegmentButton active={wager === "free"} onClick={() => setWager("free")}>
            Free match
          </SegmentButton>
          <SegmentButton active={wager === "wager"} disabled={!supportsWagers} onClick={() => setWager("wager")}>
            Testnet wager
          </SegmentButton>
        </div>
        {supportsWagers ? (
          <label className="grid gap-2 text-sm">
            <span className="text-white/58">Wager amount in testnet 0G</span>
            <input
              className="min-h-11 rounded-md border border-[#d9b8ff33] bg-[#140820]/70 px-3 text-white outline-none focus:border-[#b56cff]"
              disabled={wager !== "wager"}
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))}
            />
          </label>
        ) : (
          <p className="text-sm text-white/55">This game is currently free play only.</p>
        )}
      </div>

      {opponent === "agent" ? (
        <div className="mt-5 grid gap-3">
          <div className="grid gap-2 rounded-sm border border-white/10 bg-[#140820]/70 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-black uppercase">Qualified agents</div>
              <StatusPill tone={agents.length ? "green" : "yellow"}>{agents.length || "none"}</StatusPill>
            </div>
            {agents.length ? (
              agents.map((agent) => (
                <SegmentButton
                  key={agent.agentId}
                  active={selectedAgent?.agentId === agent.agentId}
                  onClick={() => setSelectedAgentId(agent.agentId)}
                >
                  <img className="h-7 w-7 rounded-md object-cover" src={agent.avatarUrl} alt="" /> {agent.displayName}
                </SegmentButton>
              ))
            ) : (
              <p className="text-sm text-white/58">Register and qualify an agent before starting this lane.</p>
            )}
          </div>
          <Button className="w-full" size="lg" disabled={busy || !selectedAgent} onClick={startAgentRoom}>
            <Swords size={18} /> Play selected 0G agent
          </Button>
          {error ? <p className="text-sm text-[#f5d0fe]">{error}</p> : null}
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <SegmentButton active={humanMode === "queue"} onClick={() => setHumanMode("queue")}>
              Auto-match
            </SegmentButton>
            <SegmentButton active={humanMode === "private"} onClick={() => setHumanMode("private")}>
              Room code
            </SegmentButton>
          </div>
          {humanMode === "queue" ? (
            <Button className="w-full" size="lg" disabled={busy} onClick={startHumanAutoMatch}>
              <UserRound size={18} /> Find human match
            </Button>
          ) : (
            <div className="grid gap-3 rounded-sm border border-[#d9b8ff22] bg-[#140820]/70 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase text-white/45">Your room code</div>
                  <div className="font-mono text-xl font-black text-[#e7c7ff]">{code}</div>
                </div>
                <Button variant="secondary" type="button" disabled={busy} onClick={() => setCode(roomCode(gameId))}>
                  <Copy size={16} /> New code
                </Button>
              </div>
              <Button className="w-full" disabled={busy} onClick={startPrivateRoom}>
                Create room
              </Button>
              <label className="grid gap-2 text-sm">
                <span className="text-white/58">Join with room code</span>
                <input
                  className="min-h-11 rounded-md border border-[#d9b8ff33] bg-[#140820]/70 px-3 uppercase text-white outline-none focus:border-[#b56cff]"
                  placeholder="GF-9A2K"
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value)}
                />
              </label>
              <Button className="w-full" variant="secondary" disabled={busy} onClick={joinRoom}>
                Join room
              </Button>
            </div>
          )}
          {error ? <p className="text-sm text-[#f5d0fe]">{error}</p> : null}
        </div>
      )}
    </Panel>
  );
}

function SegmentButton({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-md border px-3 text-sm font-bold uppercase transition disabled:cursor-not-allowed disabled:opacity-45",
        active
          ? "border-[#d9b8ff] bg-[linear-gradient(135deg,#f5e8ff,#b56cff_46%,#5d22a6)] text-[#10051c]"
          : "border-[#d9b8ff2e] bg-white/6 text-white hover:border-[#c084fc]",
        className,
      )}
      type="button"
      {...props}
    />
  );
}

export function CreateRoom() {
  const { gameId } = useParams();
  const game = getGame(gameId);
  return (
    <Page title={`${game.manifest.name} Room`} icon={<Swords />}>
      <PlaySetup gameId={game.id} supportsWagers={game.manifest.supportsWagers} />
    </Page>
  );
}

export function Room() {
  const { roomId = "ROOM" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const player = useArcadePlayer();
  const { wallets } = useWallets();
  const activeWallet = wallets[0] as unknown as EthereumWallet | undefined;
  const gameId = searchParams.get("game") ?? "grid-four";
  const wager = searchParams.get("wager") ?? "free";
  const [room, setRoom] = useState<ArcadeRoomView | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [wagerTxs, setWagerTxs] = useState<string[]>([]);
  const isInRoom = room?.players.some((item) => item.id === player.id);

  useEffect(() => {
    let cancelled = false;
    async function loadRoom() {
      try {
        const next = await getRoom(roomId);
        if (!cancelled) setRoom(next);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Room not found");
      }
    }
    void loadRoom();
    const timer = window.setInterval(() => void loadRoom(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [roomId]);

  useEffect(() => {
    if (room?.status === "active") {
      navigate(`/match/${room.matchId}?room=${room.roomId}&game=${room.gameId}`);
    }
  }, [navigate, room?.gameId, room?.matchId, room?.roomId, room?.status]);

  async function createThisRoom() {
    setBusy(true);
    setError("");
    try {
      const next = await createApiRoom({
        roomId,
        gameId,
        host: player,
        wagerWei: wager === "free" ? "0" : parse0gToWei(wager),
      });
      setRoom(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create room");
    } finally {
      setBusy(false);
    }
  }

  async function joinThisRoom() {
    setBusy(true);
    setError("");
    try {
      setRoom(await joinApiRoom(roomId, player));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not join room");
    } finally {
      setBusy(false);
    }
  }

  async function startThisRoom() {
    if (!room) return;
    setBusy(true);
    setError("");
    try {
      const next = await startApiRoom(room.roomId);
      setRoom(next);
      navigate(`/match/${next.matchId}?room=${next.roomId}&game=${next.gameId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start room");
    } finally {
      setBusy(false);
    }
  }

  async function cancelThisRoom() {
    if (!room) return;
    setBusy(true);
    setError("");
    try {
      setRoom(await cancelApiRoom(room.roomId, player.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not cancel room");
    } finally {
      setBusy(false);
    }
  }

  async function fundWager() {
    if (!room || !activeWallet) return;
    setBusy(true);
    setError("");
    try {
      const receipt = await createWager(activeWallet, room.roomId, room.wagerWei);
      setWagerTxs((items) => [...items, receipt.transactionHash]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not fund wager");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title={`Room ${roomId}`} icon={<Swords />}>
      <Panel className="grid gap-5 lg:grid-cols-[.75fr_1fr]">
        <div>
          <StatusPill tone={room ? "cyan" : "yellow"}>{room?.status ?? "Room not loaded"}</StatusPill>
          <h2 className="mt-4 text-3xl font-black uppercase">{roomId}</h2>
          <p className="mt-2 text-white/66">
            Share this code with a friend. When both players join, the match starts from the same deterministic game rules
            and the result can be inspected from the proof route.
          </p>
          <div className="mt-4 rounded-sm border border-white/10 bg-[#140820]/70 p-3 text-sm text-white/70">
            Game: {gameId}<br />
            Wager: {room?.wagerWei && room.wagerWei !== "0" ? `${wager} testnet 0G` : "Free match"}<br />
            Players: {room?.players.map((item) => item.displayName).join(", ") || "Waiting for room state"}
          </div>
          {room?.wagerWei && room.wagerWei !== "0" ? (
          <div className="mt-3 rounded-sm border border-[#b56cff33] bg-[#b56cff0d] p-3 text-sm text-white/70">
              <div className="font-black uppercase text-[#e7c7ff]">Wager escrow</div>
              <div className="mt-1">Each player funds {wager} testnet 0G before start.</div>
              {wagerTxs.length ? (
                <ul className="mt-2 grid gap-1 font-mono text-xs text-[#e7c7ff]">
                  {wagerTxs.map((tx) => <li key={tx}>{tx.slice(0, 10)}...{tx.slice(-6)}</li>)}
                </ul>
              ) : null}
            </div>
          ) : null}
          {error ? <p className="mt-3 text-sm text-[#f5d0fe]">{error}</p> : null}
        </div>
        <div className="grid content-start gap-3">
          {!room ? (
            <Button disabled={busy} onClick={createThisRoom}>Create this room</Button>
          ) : isInRoom ? null : (
            <Button disabled={busy} onClick={joinThisRoom}>Join as current wallet</Button>
          )}
          {room?.wagerWei && room.wagerWei !== "0" ? (
            <Button disabled={busy || !activeWallet || !isInRoom} variant="secondary" onClick={fundWager}>
              Fund wager from wallet
            </Button>
          ) : null}
          <Button disabled={busy || !room || room.players.length < 2 || room.status === "cancelled"} onClick={startThisRoom}>
            Start match
          </Button>
          <Button
            disabled={busy || !room || !isInRoom || room.players[0]?.id !== player.id || room.status === "active" || room.status === "finished" || room.status === "cancelled"}
            variant="secondary"
            onClick={cancelThisRoom}
          >
            Cancel room
          </Button>
          <Button variant="secondary" onClick={() => void navigator.clipboard?.writeText(roomId)}>
            <Copy size={16} /> Copy room code
          </Button>
        </div>
      </Panel>
    </Page>
  );
}
