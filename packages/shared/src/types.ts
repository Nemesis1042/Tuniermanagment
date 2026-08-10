// Datenmodell nach Pflichtenheft Kapitel 5.

export type TournamentMode =
  | "single_elimination"
  | "double_elimination"
  | "league"
  | "group_ko"
  | "swiss"
  | "ladder";

export type TournamentStatus = "setup" | "running" | "finished" | "archived";

export interface Tournament {
  id: string;
  name: string;
  discipline: string;
  fieldName: string;
  mode: TournamentMode;
  config: Record<string, unknown>;
  matchDurationMin: number | null;
  changeoverMin: number | null;
  maxTeams: number; // Standard 10, siehe F-14
  status: TournamentStatus;
  createdAt: string;
}

export interface Team {
  id: string;
  tournamentId: string;
  name: string;
  seed: number | null;
  color: string | null;
  members: string[];
  withdrawn: boolean;
}

export type PhaseType = "group" | "bracket_w" | "bracket_l" | "league" | "ladder";

export interface Phase {
  id: string;
  tournamentId: string;
  type: PhaseType;
  order: number;
  config: Record<string, unknown>;
}

// SlotRef: Ein Match kennt seine Teams nicht direkt, sondern über eine Quelle (Kap. 5).
export type SlotRef =
  | { type: "team"; teamId: string }
  | { type: "winner_of"; matchId: string }
  | { type: "loser_of"; matchId: string }
  | { type: "rank_of"; phaseId: string; rank: number }
  | { type: "bye" };

export type MatchStatus =
  | "geplant"
  | "spielbar"
  | "eingetragen"
  | "gewertet"
  | "abgesagt"
  | "gewertet_ohne_spiel"
  | "strittig";

export interface Match {
  id: string;
  phaseId: string;
  round: number;
  indexInRound: number;
  slotA: SlotRef;
  slotB: SlotRef;
  teamAId: string | null; // aufgelöst, sobald bekannt
  teamBId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  status: MatchStatus;
  winnerId: string | null;
  loserId: string | null;
  enteredAt: string | null;
  enteredByDevice: string | null;
  scheduledAt: string | null;
  bestOf: number | null;
}

export type DeviceRole = "terminal" | "display" | "admin";

export interface Device {
  id: string;
  name: string;
  role: DeviceRole;
  lastSeen: string;
}

// Sync-Queue, siehe Kapitel 8. Wird ab Stufe 2 benötigt.
export interface SyncEvent {
  uuid: string;
  deviceId: string;
  matchId: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
  appliedAt: string | null;
}

export interface MatchLog {
  id: string;
  matchId: string;
  actor: string;
  timestamp: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
}
