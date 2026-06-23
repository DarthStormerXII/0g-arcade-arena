import type { TileRaceState } from "../rules";

export function GameView({ state }: { state: TileRaceState }) {
  const playerId = state.players[0]?.id;
  const board = state.boards[playerId] ?? [];
  return (
    <div className="grid grid-cols-4 gap-2">
      {board.flat().map((value, index) => (
        <div key={index} className="flex aspect-square items-center justify-center rounded-sm border border-white/15 bg-black/40 text-lg font-black">
          {value || ""}
        </div>
      ))}
    </div>
  );
}
