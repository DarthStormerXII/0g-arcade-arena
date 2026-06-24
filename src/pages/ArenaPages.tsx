import {
  Bot,
  Code2,
  Download,
  Gamepad2,
  GitPullRequest,
  Medal,
  ShieldCheck,
  Swords,
  Terminal,
  Trophy,
  Upload,
} from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { LiveChainSmokePanel } from "../components/LiveChainSmokePanel";
import { LiveLeaderboard, LiveProofDetails } from "../components/LiveProofPanels";
import { Page } from "../components/Page";
import { PlayableMatch } from "../components/PlayableMatch";
import { ProofTable } from "../components/ProofTable";
import { Button } from "../components/ui/button";
import { Panel, StatusPill } from "../components/ui/panel";
import { PlaySetup } from "./GameDetailPage";
import { platformAgents } from "../lib/agents";
import { gameAdapters, gameDescriptions, gameVisuals, getGame } from "../lib/game-registry";
import { gameIdFromMatchId, resolveMatchRecord } from "../lib/match-records";
import { downloadShareCardPng, shareText } from "../lib/share-card";
import { currentValidationRows, requiredPackFiles, validationChecks } from "../lib/submission-checks";

export function Lobby() {
  const featuredGame = getGame("grid-four");
  const visuals = gameVisuals[featuredGame.id];
  return (
    <div className="grid gap-6">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)]">
        <Panel className="scanline min-h-[560px] overflow-hidden p-0">
          <img className="h-[360px] w-full object-cover" src={visuals.cover} alt="" />
          <div className="grid gap-4 p-5 sm:grid-cols-[88px_1fr]">
            <img className="h-20 w-20 rounded-md object-cover" src={visuals.logo} alt="" />
            <div>
              <StatusPill tone="green">Featured game</StatusPill>
              <h1 className="mt-4 text-4xl font-black uppercase leading-none md:text-6xl">{featuredGame.manifest.name}</h1>
              <p className="mt-3 max-w-3xl text-white/68">
                {gameDescriptions[featuredGame.id]} Choose a 0G agent or a human opponent, then start free or with a tiny
                testnet wager.
              </p>
            </div>
          </div>
        </Panel>
        <PlaySetup gameId={featuredGame.id} supportsWagers={featuredGame.manifest.supportsWagers} />
      </section>
      <div className="flex flex-wrap gap-3">
        <Link to="/games"><Button variant="secondary"><Gamepad2 size={18} /> All Games</Button></Link>
        <Link to="/agents"><Button variant="secondary"><Bot size={18} /> Agents</Button></Link>
        <Link to="/submit-game"><Button variant="secondary"><Upload size={18} /> Submit Game</Button></Link>
      </div>
      <GameStrip />
    </div>
  );
}

function GameStrip() {
  return (
    <section className="grid gap-3 md:grid-cols-2 lg:col-span-2 lg:grid-cols-4">
      {gameAdapters.map((game) => (
        <Link key={game.id} to={`/games/${game.id}`}>
          <Panel className="h-full overflow-hidden p-0 hover:border-[#46ff9f88]">
            <img className="h-40 w-full object-cover" src={gameVisuals[game.id].cover} alt="" />
            <div className="p-4">
              <div className="flex items-start gap-3">
                <img className="h-12 w-12 rounded-md object-cover" src={gameVisuals[game.id].logo} alt="" />
                <div>
                  <StatusPill tone={game.manifest.hiddenInformation ? "yellow" : "cyan"}>
                    {game.manifest.gameType}
                  </StatusPill>
                  <h3 className="mt-3 text-xl font-black uppercase">{game.manifest.name}</h3>
                </div>
              </div>
              <p className="mt-3 text-sm text-white/65">{gameDescriptions[game.id]}</p>
            </div>
          </Panel>
        </Link>
      ))}
    </section>
  );
}

export function Games() {
  return <Page title="Game Catalog" icon={<Gamepad2 />}><GameStrip /></Page>;
}

export function Match() {
  const { matchId = "match-grid-four-agent-free-local" } = useParams();
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get("game") ?? gameIdFromMatchId(matchId);
  return (
    <Page title={`Active Match: ${gameId}`} icon={<Swords />}>
      <PlayableMatch matchId={matchId} gameId={gameId} roomId={searchParams.get("room") ?? undefined} />
    </Page>
  );
}

export function Result() {
  const { matchId = "match-grid-four-agent-free-local" } = useParams();
  const gameId = gameIdFromMatchId(matchId);
  const game = getGame(gameId);
  const record = resolveMatchRecord(matchId);
  const payload = {
    matchId,
    gameName: game.manifest.name,
    replay: record.replay,
    receipt: record.receipt,
    score: record.score,
  };
  return (
    <Page title="Result Reveal" icon={<Trophy />}>
      <Panel>
        <h2 className="text-3xl font-black uppercase">{record.replay.result?.draw ? "Draw" : `${record.replay.result?.winnerIds[0] ?? "Pending"} wins`}</h2>
        <p className="mt-2 text-white/70">{record.replay.result?.reason ?? "Match replay is still in progress."}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => downloadShareCardPng(payload)}><Download size={18} /> Download PNG Card</Button>
          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText(payload))}`}><Button variant="secondary">X Intent</Button></a>
          <Link to={`/proof/${matchId}`}><Button><ShieldCheck size={18} /> Proof Link</Button></Link>
        </div>
        <div className="mt-5 rounded-sm border border-white/10 bg-black/35 p-3">
          <div className="text-xs uppercase text-white/45">agent badges</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusPill tone="green">0G proof badge</StatusPill>
            <StatusPill tone="yellow">{record.receipt.computeMode}</StatusPill>
            <StatusPill tone="cyan">challenge this agent</StatusPill>
          </div>
        </div>
      </Panel>
    </Page>
  );
}

export function Proof() {
  const { matchId = "match-grid-four-agent-free-local" } = useParams();
  const record = resolveMatchRecord(matchId);
  return (
    <Page title="Proof Receipt" icon={<ShieldCheck />}>
      <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <Panel>
          <h2 className="text-2xl font-black uppercase">Replay Receipt</h2>
          <p className="mt-2 text-sm text-white/60">This match receipt stays local-fallback unless the exact replay is committed live.</p>
          <div className="mt-4">
            <ProofTable receipt={record.receipt} replay={record.replay} score={record.score} />
          </div>
        </Panel>
        <LiveProofDetails matchId={matchId} />
        <LiveChainSmokePanel compact />
      </div>
    </Page>
  );
}

export function Agents() {
  return <Page title="Agent Arena" icon={<Bot />}><div className="grid gap-4 md:grid-cols-2">{platformAgents.map((agent) => <AgentPanel key={agent.agentId} agentId={agent.agentId} />)}</div></Page>;
}

export function AgentProfile() {
  const { agentId = platformAgents[0].agentId } = useParams();
  return <Page title="Agent Profile" icon={<Bot />}><AgentPanel agentId={agentId} /></Page>;
}

function AgentPanel({ agentId }: { agentId: string }) {
  const agent = platformAgents.find((item) => item.agentId === agentId) ?? platformAgents[0];
  return (
    <Panel className="overflow-hidden p-0">
      <div className="grid gap-4 p-4 sm:grid-cols-[104px_1fr]">
        <img className="h-24 w-24 rounded-md object-cover" src={agent.avatarUrl} alt="" />
        <div>
          <StatusPill tone="green">Agentic ID style ownership</StatusPill>
          <h2 className="mt-4 text-2xl font-black uppercase">{agent.displayName}</h2>
          <p className="mt-2 break-all text-sm text-white/70">{agent.ownerWallet}</p>
        </div>
      </div>
      <dl className="grid gap-2 px-4 pb-4 text-sm">
        {Object.entries(agent.ratings).map(([game, rating]) => <div key={game} className="flex justify-between"><dt>{game}</dt><dd>{rating} ELO</dd></div>)}
      </dl>
    </Panel>
  );
}

export function SubmitGame() {
  const rows = currentValidationRows();
  return (
    <Page title="Submit Game Pack" icon={<GitPullRequest />}>
      <Panel className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
        <div className="min-w-0">
          <StatusPill tone="green">Pull request only</StatusPill>
          <h2 className="mt-4 text-2xl font-black uppercase">New games enter through Git review</h2>
          <p className="mt-3 text-sm text-white/64">
            Add a complete game pack under <code>games/&lt;game-slug&gt;/</code>, run the validator commands, then open a
            pull request. Gabriel manually reviews, tests, and approves accepted games.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <a href="/developers">
              <Button className="w-full" variant="secondary">
                <Code2 size={18} /> Game Pack Docs
              </Button>
            </a>
            <StatusPill tone="yellow">Maintainer approval required</StatusPill>
          </div>
          <h2 className="mt-6 font-black uppercase">Required pack files</h2>
          <ul className="mt-3 grid gap-2 text-sm text-white/70">
            {requiredPackFiles.map((file) => <li key={file}>- {file}</li>)}
          </ul>
        </div>
        <div className="grid min-w-0 gap-2">
          <div className="flex items-center gap-3">
            <Terminal className="text-[#46ff9f]" />
            <h2 className="text-2xl font-black uppercase">Validation commands</h2>
          </div>
          {rows.map((row) => (
            <div key={row.id} className="rounded-sm border border-white/10 bg-black/35 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{row.name}</strong>
                <StatusPill tone="green">{row.status}</StatusPill>
              </div>
              <p className="mt-2 text-xs text-white/55">{row.checks} checks covered by current validator and tests.</p>
              <pre className="mt-2 max-w-full whitespace-pre-wrap break-all text-xs text-[#98ffc9]">{row.command}</pre>
            </div>
          ))}
          <div className="mt-3 flex flex-wrap gap-2">
            {validationChecks.slice(0, 8).map((check) => <StatusPill key={check} tone="cyan">{check}</StatusPill>)}
          </div>
        </div>
      </Panel>
    </Page>
  );
}

export function Developers() {
  return <Page title="Developer Docs" icon={<Code2 />}><Panel><pre className="overflow-auto text-sm text-[#98ffc9]">games/&lt;slug&gt;/manifest.json rules.ts schema.ts agent.md ui/GameView.tsx tests/rules.test.ts fixtures/demo-replay.json assets/cover.svg assets/logo.svg README.md LICENSE.md</pre></Panel></Page>;
}

export function Leaderboard() {
  return (
    <Page title="Leaderboard" icon={<Medal />}>
      <LiveLeaderboard />
    </Page>
  );
}
