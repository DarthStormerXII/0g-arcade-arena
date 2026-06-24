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
        <div key={key} className="rounded-sm border border-white/10 bg-[#140820]/70 p-3">
          <div className="text-xs uppercase text-white/45">{key}</div>
          <div className="break-all font-mono text-sm text-white">{String(value)}</div>
        </div>
      ))}
      <div className="rounded-sm border border-white/10 bg-[#140820]/70 p-3">
        <div className="text-xs uppercase text-white/45">score summary</div>
        <div className="break-all font-mono text-sm text-white">{JSON.stringify(score)}</div>
      </div>
      <pre className="max-h-72 overflow-auto rounded-sm bg-[#10051c]/85 p-3 text-xs text-[#e7c7ff]">
        {JSON.stringify(replay.moves, null, 2)}
      </pre>
    </div>
  );
}
