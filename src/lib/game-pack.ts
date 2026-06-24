export type GamePlayer = {
  id: string;
  kind: "human" | "agent" | "platform";
  displayName: string;
  ownerWallet?: string;
  agentId?: string;
};

export type ValidationResult = {
  ok: boolean;
  reason?: string;
};

export type GameResult = {
  winnerIds: string[];
  loserIds: string[];
  draw: boolean;
  reason: string;
};

export type ScoreSummary = {
  leaders: string[];
  scores: Record<string, number>;
  turn: number;
};

export type GameReplay = {
  gameId: string;
  version: string;
  seed: string;
  players: GamePlayer[];
  moves: Array<{
    turn: number;
    playerId: string;
    move: unknown;
    stateHash: string;
  }>;
  result: GameResult | null;
  finalStateHash: string;
};

export type GameManifest = {
  id: string;
  name: string;
  version: string;
  author: string;
  license: string;
  minPlayers: number;
  maxPlayers: number;
  supportsSolo: boolean;
  supportsHumanVsHuman: boolean;
  supportsHumanVsAgent: boolean;
  supportsAgentVsAgent: boolean;
  supportsWagers: boolean;
  supportsTournaments: boolean;
  gameType: string;
  turnType: string;
  hiddenInformation: boolean;
  randomness: string;
  seedRequired: boolean;
  averageDuration: string;
  moveSchemaHash: string;
  rulesHash: string;
  uiHash: string;
  agentPromptHash: string;
  replaySchemaHash: string;
};

export interface GameAdapter<State, Move, PlayerView> {
  id: string;
  manifest: GameManifest;

  createInitialState(input: {
    seed: string;
    players: GamePlayer[];
    options: Record<string, unknown>;
  }): State;

  getPlayerView(state: State, playerId: string): PlayerView;
  getLegalMoves(state: State, playerId: string): Move[];
  validateMove(state: State, playerId: string, move: Move): ValidationResult;
  applyMove(state: State, playerId: string, move: Move): State;
  getCurrentPlayerIds(state: State): string[];
  isTerminal(state: State): boolean;
  getResult(state: State): GameResult | null;
  scoreState(state: State): ScoreSummary;
  serializeReplay(state: State): GameReplay;
  hashReplay(replay: GameReplay): string;
}

export type AgentProfile = {
  ownerWallet: string;
  agentId: string;
  displayName: string;
  avatarUrl: string;
  supportedGames: string[];
  ratings: Record<string, number>;
  bankrollPolicy: string;
  maxWagerPerMatch: string;
  maxGamesPerDay: number;
  maxGamesPerOpponent: number;
  stopLoss: string;
};

export type ProofReceipt = {
  matchId: string;
  gameId: string;
  replayHash: string;
  resultHash: string;
  manifestHash: string;
  rulesHash: string;
  storageUri: string;
  chainTx: string;
  daCommitment: string;
  computeMode: "0g-compute" | "sarvam-fallback" | "deterministic-fallback";
  storageMode: "0g-storage" | "local-fallback";
  chainMode: "0g-galileo" | "local-mock";
  daMode: "0g-da" | "not-configured";
};
