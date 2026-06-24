import { useEffect, useState } from "react";
import { Panel, StatusPill } from "./ui/panel";
import { fetchLeaderboard, fetchLiveProof, fetchLiveProofs, type LeaderboardEntry, type LiveProof } from "../lib/live-proof-api";
import { shortHash } from "../lib/live-chain-proof";

export function LiveProofList() {
  const [proofs, setProofs] = useState<LiveProof[]>([]);

  useEffect(() => {
    void fetchLiveProofs().then(setProofs);
  }, []);

  if (!proofs.length) {
    return (
      <Panel>
        <h2 className="text-2xl font-black uppercase">Live Match Proofs</h2>
        <p className="mt-2 text-sm text-white/60">No D1-indexed match proofs yet.</p>
      </Panel>
    );
  }

  return (
    <Panel>
      <h2 className="text-2xl font-black uppercase">Live Match Proofs</h2>
      <div className="mt-4 grid gap-3">
        {proofs.map((proof) => (
          <a
            key={proof.matchId}
            className="min-w-0 rounded-sm border border-white/10 bg-[#140820]/70 p-3 hover:border-[#67e8ff66]"
            href={`/proof/${proof.matchId}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>{proof.matchId}</strong>
              <StatusPill tone={proof.storageMode === "0g-storage" ? "green" : "yellow"}>{proof.storageMode}</StatusPill>
            </div>
            <div className="mt-2 grid gap-1 font-mono text-xs text-white/58">
              <span>game {proof.gameId}</span>
              <span>result {shortHash(proof.resultHash ?? "pending")}</span>
              <span>storage {shortHash(proof.storageRoot ?? proof.storageUri ?? "pending")}</span>
              <span>storage tx {shortHash(proof.storageTx ?? "pending")}</span>
              <span>chain {shortHash(proof.chainTx ?? proof.chainMode)}</span>
            </div>
          </a>
        ))}
      </div>
    </Panel>
  );
}

export function LiveProofDetails({ matchId }: { matchId: string }) {
  const [proof, setProof] = useState<LiveProof | null>(null);

  useEffect(() => {
    void fetchLiveProof(matchId).then(setProof);
  }, [matchId]);

  if (!proof) return null;

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-black uppercase">Indexed Live Proof</h2>
        <StatusPill tone={proof.storageMode === "0g-storage" ? "green" : "yellow"}>{proof.storageMode}</StatusPill>
      </div>
      <dl className="mt-4 grid gap-2 text-sm">
        {[
          ["match", proof.matchId],
          ["room", proof.roomId ?? "none"],
          ["mode", `${proof.opponentMode}/${proof.mode}`],
          ["winner", proof.winnerId ?? "pending"],
          ["replay", proof.replayHash ?? "pending"],
          ["result", proof.resultHash ?? "pending"],
          ["storage root", proof.storageRoot ?? "pending"],
          ["storage uri", proof.storageUri ?? "pending"],
          ["storage tx", proof.storageTx ?? "pending"],
          ["result commit tx", proof.chainTx ?? "pending"],
          ["settlement tx", proof.settlementTx ?? "pending"],
          ["compute", proof.computeMode],
          ["compute fallback", computeFallbackSummary(proof.computeProof)],
          ["da", proof.daMode],
        ].map(([label, value]) => (
          <div key={label} className="rounded-sm border border-white/10 bg-[#140820]/70 p-3">
            <dt className="text-xs uppercase text-white/45">{label}</dt>
            <dd className="break-all font-mono text-sm text-white">{value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

function computeFallbackSummary(computeProof: unknown) {
  const proofList = (computeProof as { proofs?: unknown[] } | null)?.proofs;
  const proofs = Array.isArray(proofList)
    ? (proofList as Array<{ primaryComputeError?: unknown; fallbackReason?: unknown }>)
    : [];
  const latest = proofs.at(-1);
  if (typeof latest?.primaryComputeError === "string" && latest.primaryComputeError) {
    return `0G Router error: ${latest.primaryComputeError}`;
  }
  if (typeof latest?.fallbackReason === "string" && latest.fallbackReason) {
    return latest.fallbackReason;
  }
  return "none";
}

export function LiveLeaderboard() {
  const [globalEntries, setGlobalEntries] = useState<LeaderboardEntry[]>([]);
  const [freeEntries, setFreeEntries] = useState<LeaderboardEntry[]>([]);
  const [wagerEntries, setWagerEntries] = useState<LeaderboardEntry[]>([]);
  const [gridEntries, setGridEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    void fetchLeaderboard({ scope: "global", mode: "all" }).then(setGlobalEntries);
    void fetchLeaderboard({ scope: "mode", mode: "free" }).then(setFreeEntries);
    void fetchLeaderboard({ scope: "mode", mode: "wager" }).then(setWagerEntries);
    void fetchLeaderboard({ scope: "game", mode: "all", gameId: "grid-four" }).then(setGridEntries);
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <LeaderboardTable title="Global" entries={globalEntries} />
      <LeaderboardTable title="Grid Four" entries={gridEntries} />
      <LeaderboardTable title="Free" entries={freeEntries} />
      <LeaderboardTable title="Wager" entries={wagerEntries} />
    </div>
  );
}

function LeaderboardTable({ title, entries }: { title: string; entries: LeaderboardEntry[] }) {
  return (
    <Panel>
      <h2 className="text-2xl font-black uppercase">{title}</h2>
      <div className="mt-4 grid gap-2">
        {entries.length ? (
          entries.map((entry) => (
            <div key={`${entry.scope}-${entry.mode}-${entry.participantId}`} className="rounded-sm border border-white/10 bg-[#140820]/70 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{entry.displayName}</strong>
                <StatusPill tone={entry.participantKind === "agent" ? "cyan" : "green"}>{entry.score}</StatusPill>
              </div>
              <p className="mt-2 text-xs text-white/55">
                {entry.wins}W / {entry.losses}L / {entry.draws}D, wager wins {entry.wagerWins}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-white/60">No completed matches indexed for this table yet.</p>
        )}
      </div>
    </Panel>
  );
}
