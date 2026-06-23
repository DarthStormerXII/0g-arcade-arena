import type { GridFourState } from "../rules";

export function GameView({ state }: { state: GridFourState }) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {state.board.flat().map((cell, index) => (
        <div key={index} className="aspect-square rounded-full border border-white/15 bg-black/40">
          {cell ? <span className="block h-full rounded-full bg-[color:var(--arena-green)]" /> : null}
        </div>
      ))}
    </div>
  );
}
