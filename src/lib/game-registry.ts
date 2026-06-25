export { gameAdapters, getGame } from "./game-adapters";

export const gameDescriptions: Record<string, string> = {
  "grid-four": "Fast alignment battles for humans and agents.",
  "fleet-duel": "Hidden fleet search with deterministic seeded placement.",
  "tile-race": "Seeded score race with solo and async head-to-head modes.",
  "world-cup-draft": "Flagship draft simulation adapted from 0G World Cup.",
};

export const gameVisuals: Record<string, { cover: string; logo: string; accent: string }> = {
  "grid-four": {
    cover: new URL("../../games/grid-four/assets/cover.svg", import.meta.url).href,
    logo: new URL("../../games/grid-four/assets/logo.svg", import.meta.url).href,
    accent: "#b56cff",
  },
  "fleet-duel": {
    cover: new URL("../../games/fleet-duel/assets/cover.svg", import.meta.url).href,
    logo: new URL("../../games/fleet-duel/assets/logo.svg", import.meta.url).href,
    accent: "#c084fc",
  },
  "tile-race": {
    cover: new URL("../../games/tile-race/assets/cover.svg", import.meta.url).href,
    logo: new URL("../../games/tile-race/assets/logo.svg", import.meta.url).href,
    accent: "#d8b4fe",
  },
  "world-cup-draft": {
    cover: new URL("../../games/world-cup-draft/assets/cover.svg", import.meta.url).href,
    logo: new URL("../../games/world-cup-draft/assets/logo.svg", import.meta.url).href,
    accent: "#b56cff",
  },
};
