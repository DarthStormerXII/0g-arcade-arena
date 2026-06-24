CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  manifest_hash TEXT NOT NULL,
  rules_hash TEXT NOT NULL,
  storage_uri TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  owner_wallet TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  supported_games TEXT NOT NULL,
  bankroll_policy TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  free_enabled INTEGER NOT NULL DEFAULT 1,
  wager_enabled INTEGER NOT NULL DEFAULT 0,
  max_wager_wei TEXT NOT NULL DEFAULT '0',
  endpoint_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id),
  mode TEXT NOT NULL,
  room_id TEXT,
  opponent_mode TEXT NOT NULL DEFAULT 'human',
  wager_wei TEXT NOT NULL DEFAULT '0',
  status TEXT NOT NULL DEFAULT 'created',
  seed TEXT,
  player_a TEXT,
  player_b TEXT,
  winner_id TEXT,
  replay_hash TEXT,
  result_hash TEXT,
  storage_uri TEXT,
  chain_tx TEXT,
  compute_mode TEXT NOT NULL,
  storage_mode TEXT NOT NULL,
  chain_mode TEXT NOT NULL,
  da_mode TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS moves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id TEXT NOT NULL REFERENCES matches(id),
  turn INTEGER NOT NULL,
  player_id TEXT NOT NULL,
  move_json TEXT NOT NULL,
  state_hash TEXT NOT NULL,
  compute_provider TEXT,
  compute_chat_id TEXT,
  compute_verified INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS match_proofs (
  match_id TEXT PRIMARY KEY REFERENCES matches(id),
  replay_hash TEXT NOT NULL,
  result_hash TEXT NOT NULL,
  storage_root TEXT,
  storage_uri TEXT,
  chain_tx TEXT,
  settlement_tx TEXT,
  compute_proof_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL,
  game_id TEXT,
  mode TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  participant_kind TEXT NOT NULL,
  display_name TEXT NOT NULL,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  wager_wins INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 1000,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(scope, game_id, mode, participant_id)
);

CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bracket_hash TEXT,
  da_commitment TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contributors (
  wallet TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  credit_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS matches_game_id_idx ON matches(game_id);
CREATE INDEX IF NOT EXISTS matches_created_at_idx ON matches(created_at);
CREATE INDEX IF NOT EXISTS matches_room_id_idx ON matches(room_id);
CREATE INDEX IF NOT EXISTS moves_match_id_turn_idx ON moves(match_id, turn);
CREATE INDEX IF NOT EXISTS leaderboard_scope_idx ON leaderboard_entries(scope, game_id, mode);
