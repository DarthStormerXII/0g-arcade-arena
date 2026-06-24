import type { GamePlayer } from "./game-pack";

export type RegisteredAgent = {
  agentId: string;
  ownerWallet: string;
  displayName: string;
  avatarUrl: string;
  supportedGames: string[];
  bankrollPolicy: string;
  status: "pending" | "qualified" | "disabled";
  freeEnabled: boolean;
  wagerEnabled: boolean;
  maxWagerWei: string;
  endpointUrl: string | null;
};

export async function fetchQualifiedAgents(gameId: string, wagerWei: string) {
  const params = new URLSearchParams({ gameId, wagerWei });
  const response = await fetch(`/api/agents?${params}`);
  if (!response.ok) return [];
  const payload = (await response.json()) as { ok?: boolean; agents?: RegisteredAgent[] };
  return payload.ok && payload.agents ? payload.agents : [];
}

export function agentToPlayer(agent: RegisteredAgent): GamePlayer {
  return {
    id: agent.agentId,
    kind: "agent",
    displayName: agent.displayName,
    ownerWallet: agent.ownerWallet,
    agentId: agent.agentId,
  };
}
