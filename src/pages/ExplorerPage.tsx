import { Bot, Boxes, ExternalLink, Gamepad2, Search, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { LiveChainSmokePanel } from "../components/LiveChainSmokePanel";
import { LiveProofList } from "../components/LiveProofPanels";
import { Page } from "../components/Page";
import { Panel, StatusPill } from "../components/ui/panel";
import { platformAgents } from "../lib/agents";
import { gameAdapters, gameDescriptions, gameVisuals } from "../lib/game-registry";
import { integrationStatus } from "../lib/integration-status";
import { liveChainProof, shortHash } from "../lib/live-chain-proof";
import { liveDaBatchCandidate, liveGamePackProofs, liveProofArtifactStorage } from "../lib/live-proof-api";
import { runDemo } from "../lib/match-records";

export function Explorer() {
  return (
    <Page title="Explorer" icon={<Search />}>
      <div className="grid gap-6">
        <Panel className="grid gap-4 lg:grid-cols-[1fr_.8fr]">
          <div>
            <StatusPill tone="green">0G proof surface</StatusPill>
            <h2 className="mt-4 text-3xl font-black uppercase">Games, agents, results, contracts, and chain writes.</h2>
            <p className="mt-3 max-w-3xl text-white/68">
              This is the technical view for the submission: live Galileo chain evidence, fallback boundaries, game pack
              identities, replay receipts, and agent ownership records in one place.
            </p>
          </div>
          <div className="grid gap-2 rounded-sm border border-white/10 bg-[#140820]/70 p-3 text-sm">
            {integrationStatus.map((item) => (
              <div key={item.name} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2 last:border-0 last:pb-0">
                <span className="font-bold uppercase">{item.name}</span>
                <StatusPill tone={item.mode.includes("fallback") || item.mode.includes("mock") ? "yellow" : "cyan"}>
                  {item.mode}
                </StatusPill>
              </div>
            ))}
          </div>
        </Panel>

        <LiveChainSmokePanel />
        <LiveProofList />

        <Panel>
          <div className="flex items-center gap-3">
            <Boxes className="text-[#b56cff]" />
            <h2 className="text-2xl font-black uppercase">Game Pack Storage</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {liveGamePackProofs.map((proof) => (
              <div key={proof.gameId} className="rounded-sm border border-white/10 bg-[#140820]/70 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="uppercase">{proof.gameId}</strong>
                  <StatusPill tone={proof.reachable ? "green" : "yellow"}>
                    {proof.reachable ? "0G Storage reachable" : "storage pending"}
                  </StatusPill>
                </div>
                <div className="mt-2 grid gap-1 font-mono text-xs text-white/58">
                  <span>root {shortHash(proof.rootHash)}</span>
                  <span>tx {shortHash(proof.txHash)}</span>
                  <span>payload {shortHash(proof.payloadSha256)}</span>
                  <span>{proof.fileCount} files uploaded</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-[#67e8ff]" />
            <h2 className="text-2xl font-black uppercase">Proof Artifact Storage</h2>
          </div>
          <div className="mt-4 rounded-sm border border-white/10 bg-[#140820]/70 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>{liveProofArtifactStorage.schema}</strong>
              <StatusPill tone={liveProofArtifactStorage.reachable ? "green" : "yellow"}>
                {liveProofArtifactStorage.reachable ? "0G Storage reachable" : "storage pending"}
              </StatusPill>
            </div>
            <div className="mt-2 grid gap-1 font-mono text-xs text-white/58">
              <span>root {shortHash(liveProofArtifactStorage.rootHash)}</span>
              <span>tx {shortHash(liveProofArtifactStorage.txHash)}</span>
              <span>payload {shortHash(liveProofArtifactStorage.payloadSha256)}</span>
              <span>{liveProofArtifactStorage.artifactTypes.join(", ")}</span>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center gap-3">
            <Boxes className="text-[#ffd17a]" />
            <h2 className="text-2xl font-black uppercase">DA Batch Candidate</h2>
          </div>
          <div className="mt-4 rounded-sm border border-white/10 bg-[#140820]/70 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>{liveDaBatchCandidate.schema}</strong>
              <StatusPill tone="yellow">{liveDaBatchCandidate.daMode}</StatusPill>
            </div>
            <div className="mt-2 grid gap-1 font-mono text-xs text-white/58">
              <span>batch {shortHash(liveDaBatchCandidate.batchHash)}</span>
              <span>payload {shortHash(liveDaBatchCandidate.payloadSha256)}</span>
              <span>{liveDaBatchCandidate.matchCount} matches, {liveDaBatchCandidate.gamePackCount} game packs</span>
              <span>{liveDaBatchCandidate.sourceEvidenceCount} source evidence files</span>
            </div>
          </div>
        </Panel>

        <section className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <div className="flex items-center gap-3">
              <Gamepad2 className="text-[#b56cff]" />
              <h2 className="text-2xl font-black uppercase">Game Explorer</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {gameAdapters.map((game) => {
                const visuals = gameVisuals[game.id];
                return (
                  <Link
                    key={game.id}
                    to={`/games/${game.id}`}
                    className="grid min-w-0 gap-3 rounded-sm border border-white/10 bg-[#140820]/70 p-3 hover:border-[#b56cff66] sm:grid-cols-[72px_1fr]"
                  >
                    <img className="h-16 w-16 rounded-md object-cover" src={visuals.logo} alt="" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="uppercase">{game.manifest.name}</strong>
                        <StatusPill tone={game.manifest.hiddenInformation ? "yellow" : "cyan"}>
                          {game.manifest.gameType}
                        </StatusPill>
                      </div>
                      <p className="mt-1 text-sm text-white/62">{gameDescriptions[game.id]}</p>
                      <p className="mt-2 break-all font-mono text-xs text-white/45">rules {game.manifest.rulesHash}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-[#67e8ff]" />
              <h2 className="text-2xl font-black uppercase">Result Explorer</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {gameAdapters.map((game) => {
                const matchId = `match-${game.id}-receipt`;
                const receipt = runDemo(game.id, matchId);
                return (
                  <Link
                    key={game.id}
                    to={`/proof/${matchId}`}
                    className="min-w-0 rounded-sm border border-white/10 bg-[#140820]/70 p-3 hover:border-[#67e8ff66]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong>{game.manifest.name} replay receipt</strong>
                      <StatusPill tone="yellow">{receipt.receipt.chainMode}</StatusPill>
                    </div>
                    <div className="mt-2 grid gap-1 font-mono text-xs text-white/58">
                      <span>match {matchId}</span>
                      <span>replay {shortHash(receipt.receipt.replayHash)}</span>
                      <span>result {shortHash(receipt.receipt.resultHash)}</span>
                      <span>storage {receipt.receipt.storageMode}</span>
                      <span>compute {receipt.receipt.computeMode}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Panel>
        </section>

        <section className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
          <Panel>
            <div className="flex items-center gap-3">
              <Bot className="text-[#ffd17a]" />
              <h2 className="text-2xl font-black uppercase">Agent Explorer</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {platformAgents.map((agent) => (
                <Link
                  key={agent.agentId}
                  to={`/agents/${agent.agentId}`}
                  className="grid gap-3 rounded-sm border border-white/10 bg-[#140820]/70 p-3 hover:border-[#ffd17a66] sm:grid-cols-[72px_1fr]"
                >
                  <img className="h-16 w-16 rounded-md object-cover" src={agent.avatarUrl} alt="" />
                  <div className="min-w-0">
                    <strong className="uppercase">{agent.displayName}</strong>
                    <p className="mt-1 break-all font-mono text-xs text-white/58">{agent.ownerWallet}</p>
                    <p className="mt-2 text-xs text-white/45">{agent.supportedGames.join(", ")}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center gap-3">
              <Boxes className="text-[#b56cff]" />
              <h2 className="text-2xl font-black uppercase">Contract Index</h2>
            </div>
            <div className="mt-4 grid gap-2">
              {liveChainProof.deployments.map((deployment) => (
                <a
                  key={deployment.address}
                  className="grid min-w-0 gap-2 rounded-sm border border-white/10 bg-[#140820]/70 p-3 hover:border-[#b56cff66] md:grid-cols-[180px_1fr_auto]"
                  href={`${liveChainProof.explorer}/address/${deployment.address}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  <strong>{deployment.name}</strong>
                  <span className="break-all font-mono text-xs text-white/60">{deployment.address}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-white/50">
                    block {deployment.blockNumber} <ExternalLink size={12} />
                  </span>
                </a>
              ))}
            </div>
          </Panel>
        </section>
      </div>
    </Page>
  );
}
