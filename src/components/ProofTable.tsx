import type { GameReplay, ProofReceipt, ScoreSummary } from "../lib/game-pack";

export function ProofTable({
  receipt,
  replay,
  score,
}: {
  receipt: ProofReceipt;
  replay: GameReplay;
  score: ScoreSummary;
}) {
  return (
    <div className="grid gap-3">
      {Object.entries(receipt).map(([key, value]) => (
        <div key={key} className="rounded-sm border border-white/10 bg-black/35 p-3">
          <div className="text-xs uppercase text-white/45">{key}</div>
          <div className="break-all font-mono text-sm text-white">{String(value)}</div>
        </div>
      ))}
      <div className="rounded-sm border border-white/10 bg-black/35 p-3">
        <div className="text-xs uppercase text-white/45">score summary</div>
        <div className="break-all font-mono text-sm text-white">{JSON.stringify(score)}</div>
      </div>
      <pre className="max-h-72 overflow-auto rounded-sm bg-black/50 p-3 text-xs text-[#98ffc9]">
        {JSON.stringify(replay.moves, null, 2)}
      </pre>
    </div>
  );
}
