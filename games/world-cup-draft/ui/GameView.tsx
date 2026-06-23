import type { DraftState } from "../rules";

export function GameView({ state }: { state: DraftState }) {
  return (
    <div className="space-y-2">
      {Object.values(state.teams).map((team) => (
        <div key={team.playerId} className="rounded-sm border border-white/15 bg-black/40 p-3">
          <strong>{team.playerId}</strong>
          <p className="text-sm text-white/70">{team.picks.map((pick) => pick.name).join(", ") || "Drafting..."}</p>
        </div>
      ))}
    </div>
  );
}
