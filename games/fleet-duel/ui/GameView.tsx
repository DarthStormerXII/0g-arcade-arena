import type { FleetState } from "../rules";

export function GameView({ state }: { state: FleetState }) {
  return (
    <div className="grid grid-cols-6 gap-1">
      {Array.from({ length: 36 }, (_, index) => {
        const id = `${index % 6},${Math.floor(index / 6)}`;
        const fired = Object.values(state.shots).some((shots) => shots.includes(id));
        return <div key={id} className={`aspect-square rounded-sm border ${fired ? "bg-[#a855f755]" : "bg-black/40"} border-white/15`} />;
      })}
    </div>
  );
}
