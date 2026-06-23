import type { AgentProfile, GameAdapter, GamePlayer } from "./game-pack";

export const platformAgents: AgentProfile[] = [
  {
    ownerWallet: "0x0G0000000000000000000000000000000000A19",
    agentId: "agent-grid-warden",
    displayName: "Grid Warden",
    avatarUrl: new URL("../assets/agents/grid-warden.svg", import.meta.url).href,
    supportedGames: ["grid-four", "fleet-duel", "tile-race"],
    ratings: { "grid-four": 1510, "fleet-duel": 1435, "tile-race": 1492 },
    bankrollPolicy: "testnet only, never mainnet",
    maxWagerPerMatch: "5 testnet 0G",
    maxGamesPerDay: 24,
    maxGamesPerOpponent: 4,
    stopLoss: "20 testnet 0G",
  },
  {
    ownerWallet: "0x0G0000000000000000000000000000000000B07",
    agentId: "agent-draft-oracle",
    displayName: "Draft Oracle",
    avatarUrl: new URL("../assets/agents/draft-oracle.svg", import.meta.url).href,
    supportedGames: ["world-cup-draft", "grid-four"],
    ratings: { "world-cup-draft": 1588, "grid-four": 1464 },
    bankrollPolicy: "free matches and capped sponsored exhibitions",
    maxWagerPerMatch: "2 testnet 0G",
    maxGamesPerDay: 18,
    maxGamesPerOpponent: 3,
    stopLoss: "8 testnet 0G",
  },
];

export type AgentMoveOutput<Move> = {
  move: Move;
  confidence: number;
  reasoningSummary: string;
  risk: "low" | "medium" | "high";
};

export function chooseFallbackMove<State, Move, PlayerView>(
  adapter: GameAdapter<State, Move, PlayerView>,
  state: State,
  playerId: string,
): AgentMoveOutput<Move> {
  const legalMoves = adapter.getLegalMoves(state, playerId);
  const scored = legalMoves.map((move, index) => ({
    move,
    score: JSON.stringify(move).length * 17 + index,
  }));
  scored.sort((a, b) => b.score - a.score);
  return {
    move: scored[0]?.move,
    confidence: legalMoves.length > 1 ? 0.71 : 0.97,
    reasoningSummary:
      "Deterministic fallback selected a legal move because 0G Compute credentials are not configured.",
    risk: legalMoves.length > 4 ? "medium" : "low",
  };
}

export const demoPlayers: GamePlayer[] = [
  { id: "human-1", kind: "human", displayName: "Gabriel" },
  {
    id: "agent-grid-warden",
    kind: "agent",
    displayName: "Grid Warden",
    ownerWallet: platformAgents[0].ownerWallet,
    agentId: platformAgents[0].agentId,
  },
];
