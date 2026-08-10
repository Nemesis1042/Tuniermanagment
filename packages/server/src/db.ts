import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDir = process.env.TURNIER_DATA_DIR ?? path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, "turnier.db");

export const db = new Database(dbPath);
// H-03: SQLite im WAL-Modus, reicht bei dieser Datenmenge vollständig.
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  discipline TEXT NOT NULL,
  field_name TEXT NOT NULL,
  mode TEXT NOT NULL,
  config TEXT NOT NULL DEFAULT '{}',
  match_duration_min INTEGER,
  changeover_min INTEGER,
  max_teams INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'setup',
  created_at TEXT NOT NULL,
  print_number INTEGER NOT NULL DEFAULT 0,
  last_print_at TEXT
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  seed INTEGER,
  color TEXT,
  members TEXT NOT NULL DEFAULT '[]',
  withdrawn INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS phases (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  order_num INTEGER NOT NULL,
  config TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  phase_id TEXT NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  index_in_round INTEGER NOT NULL,
  slot_a TEXT NOT NULL,
  slot_b TEXT NOT NULL,
  team_a_id TEXT,
  team_b_id TEXT,
  score_a INTEGER,
  score_b INTEGER,
  status TEXT NOT NULL,
  winner_id TEXT,
  loser_id TEXT,
  entered_at TEXT,
  entered_by_device TEXT,
  scheduled_at TEXT,
  best_of INTEGER
);

CREATE TABLE IF NOT EXISTS match_logs (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  actor TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  last_seen TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_teams_tournament ON teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_phases_tournament ON phases(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_phase ON matches(phase_id);
CREATE INDEX IF NOT EXISTS idx_logs_match ON match_logs(match_id);
`);

export { dbPath };
