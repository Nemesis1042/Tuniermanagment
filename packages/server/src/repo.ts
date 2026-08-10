import { randomUUID } from "node:crypto";
import { db } from "./db.js";
import type { Match, MatchLog, MatchStatus, Phase, SlotRef, Team, Tournament, TournamentMode, TournamentStatus } from "@turnier/shared";

function nowIso(): string {
  return new Date().toISOString();
}

// ---------- Tournament ----------

interface TournamentRow {
  id: string;
  name: string;
  discipline: string;
  field_name: string;
  mode: string;
  config: string;
  match_duration_min: number | null;
  changeover_min: number | null;
  max_teams: number;
  status: string;
  created_at: string;
  print_number: number;
  last_print_at: string | null;
}

function mapTournament(r: TournamentRow): Tournament {
  return {
    id: r.id,
    name: r.name,
    discipline: r.discipline,
    fieldName: r.field_name,
    mode: r.mode as TournamentMode,
    config: JSON.parse(r.config),
    matchDurationMin: r.match_duration_min,
    changeoverMin: r.changeover_min,
    maxTeams: r.max_teams,
    status: r.status as TournamentStatus,
    createdAt: r.created_at,
  };
}

// F-14: harte Obergrenze 10 Teams. F-07: bis zu 8 Turniere gleichzeitig (nicht archiviert).
const MAX_TEAMS_DEFAULT = 10;
const MAX_ACTIVE_TOURNAMENTS = 8;

export function createTournament(input: {
  name: string;
  discipline: string;
  fieldName: string;
  mode: TournamentMode;
  matchDurationMin?: number | null;
  changeoverMin?: number | null;
  maxTeams?: number;
}): Tournament {
  const activeCount = (
    db.prepare(`SELECT COUNT(*) as c FROM tournaments WHERE status != 'archived'`).get() as { c: number }
  ).c;
  if (activeCount >= MAX_ACTIVE_TOURNAMENTS) {
    throw new Error(`Maximal ${MAX_ACTIVE_TOURNAMENTS} Turniere gleichzeitig (F-07)`);
  }
  const id = randomUUID();
  db.prepare(
    `INSERT INTO tournaments (id, name, discipline, field_name, mode, config, match_duration_min, changeover_min, max_teams, status, created_at)
     VALUES (?, ?, ?, ?, ?, '{}', ?, ?, ?, 'setup', ?)`
  ).run(
    id,
    input.name,
    input.discipline,
    input.fieldName,
    input.mode,
    input.matchDurationMin ?? null,
    input.changeoverMin ?? null,
    // F-14: harte Obergrenze 10 Teams — auch API-seitig erzwungen, nicht nur im UI.
    Math.min(Math.max(input.maxTeams ?? MAX_TEAMS_DEFAULT, 2), MAX_TEAMS_DEFAULT),
    nowIso()
  );
  return getTournament(id)!;
}

export function listTournaments(): Tournament[] {
  const rows = db.prepare(`SELECT * FROM tournaments ORDER BY created_at`).all() as TournamentRow[];
  return rows.map(mapTournament);
}

export function getTournament(id: string): Tournament | null {
  const row = db.prepare(`SELECT * FROM tournaments WHERE id = ?`).get(id) as TournamentRow | undefined;
  return row ? mapTournament(row) : null;
}

export function setTournamentStatus(id: string, status: TournamentStatus): void {
  db.prepare(`UPDATE tournaments SET status = ? WHERE id = ?`).run(status, id);
}

/**
 * F-02: Nach dem ersten eingetragenen Ergebnis ist der Modus gesperrt.
 * Automatische Freilos-Matches (Kap. 6.1) zählen nicht mit — sie werden bei
 * der Spielplan-Erzeugung sofort als "gewertet" markiert, ohne dass jemand
 * ein Ergebnis eingetragen hat (entered_at bleibt NULL).
 */
export function isModeLocked(tournamentId: string): boolean {
  const row = db
    .prepare(
      `SELECT COUNT(*) as c FROM matches m
       JOIN phases p ON p.id = m.phase_id
       WHERE p.tournament_id = ? AND m.status IN ('eingetragen','gewertet','gewertet_ohne_spiel') AND m.entered_at IS NOT NULL`
    )
    .get(tournamentId) as { c: number };
  return row.c > 0;
}

export function duplicateTournament(id: string, newName: string): Tournament {
  const original = getTournament(id);
  if (!original) throw new Error("Turnier nicht gefunden");
  const created = createTournament({
    name: newName,
    discipline: original.discipline,
    fieldName: original.fieldName,
    mode: original.mode,
    matchDurationMin: original.matchDurationMin,
    changeoverMin: original.changeoverMin,
    maxTeams: original.maxTeams,
  });
  return created;
}

export function bumpPrintNumber(tournamentId: string): number {
  db.prepare(
    `UPDATE tournaments SET print_number = print_number + 1, last_print_at = ? WHERE id = ?`
  ).run(nowIso(), tournamentId);
  return (
    db.prepare(`SELECT print_number FROM tournaments WHERE id = ?`).get(tournamentId) as { print_number: number }
  ).print_number;
}

// ---------- Team ----------

interface TeamRow {
  id: string;
  tournament_id: string;
  name: string;
  seed: number | null;
  color: string | null;
  members: string;
  withdrawn: number;
}

function mapTeam(r: TeamRow): Team {
  return {
    id: r.id,
    tournamentId: r.tournament_id,
    name: r.name,
    seed: r.seed,
    color: r.color,
    members: JSON.parse(r.members),
    withdrawn: !!r.withdrawn,
  };
}

export function listTeams(tournamentId: string): Team[] {
  const rows = db
    .prepare(`SELECT * FROM teams WHERE tournament_id = ? ORDER BY seed IS NULL, seed, name`)
    .all(tournamentId) as TeamRow[];
  return rows.map(mapTeam);
}

/** F-13: doppelte Namen innerhalb eines Turniers werden abgelehnt, mit Nummerierungsvorschlag. */
export function suggestUniqueName(tournamentId: string, name: string): string {
  const existing = new Set(listTeams(tournamentId).map((t) => t.name));
  if (!existing.has(name)) return name;
  let i = 2;
  while (existing.has(`${name} (${i})`)) i++;
  return `${name} (${i})`;
}

export function addTeam(tournamentId: string, input: { name: string; members?: string[]; seed?: number | null }): Team {
  const tournament = getTournament(tournamentId);
  if (!tournament) throw new Error("Turnier nicht gefunden");
  const count = listTeams(tournamentId).filter((t) => !t.withdrawn).length;
  if (count >= tournament.maxTeams) {
    throw new Error(`Harte Obergrenze ${tournament.maxTeams} Teams pro Turnier (F-14)`);
  }
  const existing = listTeams(tournamentId).some((t) => t.name === input.name);
  if (existing) {
    throw new Error(`Name "${input.name}" bereits vergeben. Vorschlag: "${suggestUniqueName(tournamentId, input.name)}"`);
  }
  const id = randomUUID();
  db.prepare(
    `INSERT INTO teams (id, tournament_id, name, seed, color, members, withdrawn) VALUES (?, ?, ?, ?, NULL, ?, 0)`
  ).run(id, tournamentId, input.name, input.seed ?? null, JSON.stringify(input.members ?? []));
  return mapTeam(db.prepare(`SELECT * FROM teams WHERE id = ?`).get(id) as TeamRow);
}

export function markTeamWithdrawn(teamId: string): void {
  db.prepare(`UPDATE teams SET withdrawn = 1 WHERE id = ?`).run(teamId);
}

export function copyTeamsFrom(sourceTournamentId: string, targetTournamentId: string): Team[] {
  const source = listTeams(sourceTournamentId).filter((t) => !t.withdrawn);
  return source.map((t) => addTeam(targetTournamentId, { name: t.name, members: t.members, seed: t.seed }));
}

// ---------- Phase ----------

interface PhaseRow {
  id: string;
  tournament_id: string;
  type: string;
  order_num: number;
  config: string;
}

function mapPhase(r: PhaseRow): Phase {
  return { id: r.id, tournamentId: r.tournament_id, type: r.type as Phase["type"], order: r.order_num, config: JSON.parse(r.config) };
}

export function createPhase(tournamentId: string, type: Phase["type"], order: number, config: Record<string, unknown> = {}): Phase {
  const id = randomUUID();
  db.prepare(`INSERT INTO phases (id, tournament_id, type, order_num, config) VALUES (?, ?, ?, ?, ?)`).run(
    id,
    tournamentId,
    type,
    order,
    JSON.stringify(config)
  );
  return mapPhase(db.prepare(`SELECT * FROM phases WHERE id = ?`).get(id) as PhaseRow);
}

export function listPhases(tournamentId: string): Phase[] {
  const rows = db.prepare(`SELECT * FROM phases WHERE tournament_id = ? ORDER BY order_num`).all(tournamentId) as PhaseRow[];
  return rows.map(mapPhase);
}

export function clearPhases(tournamentId: string): void {
  db.prepare(`DELETE FROM phases WHERE tournament_id = ?`).run(tournamentId); // Matches folgen per ON DELETE CASCADE
}

// ---------- Match ----------

interface MatchRow {
  id: string;
  phase_id: string;
  round: number;
  index_in_round: number;
  slot_a: string;
  slot_b: string;
  team_a_id: string | null;
  team_b_id: string | null;
  score_a: number | null;
  score_b: number | null;
  status: string;
  winner_id: string | null;
  loser_id: string | null;
  entered_at: string | null;
  entered_by_device: string | null;
  scheduled_at: string | null;
  best_of: number | null;
}

function mapMatch(r: MatchRow): Match {
  return {
    id: r.id,
    phaseId: r.phase_id,
    round: r.round,
    indexInRound: r.index_in_round,
    slotA: JSON.parse(r.slot_a) as SlotRef,
    slotB: JSON.parse(r.slot_b) as SlotRef,
    teamAId: r.team_a_id,
    teamBId: r.team_b_id,
    scoreA: r.score_a,
    scoreB: r.score_b,
    status: r.status as MatchStatus,
    winnerId: r.winner_id,
    loserId: r.loser_id,
    enteredAt: r.entered_at,
    enteredByDevice: r.entered_by_device,
    scheduledAt: r.scheduled_at,
    bestOf: r.best_of,
  };
}

const insertMatch = db.prepare(
  `INSERT INTO matches (id, phase_id, round, index_in_round, slot_a, slot_b, team_a_id, team_b_id, score_a, score_b, status, winner_id, loser_id, entered_at, entered_by_device, scheduled_at, best_of)
   VALUES (@id, @phaseId, @round, @indexInRound, @slotA, @slotB, @teamAId, @teamBId, @scoreA, @scoreB, @status, @winnerId, @loserId, @enteredAt, @enteredByDevice, @scheduledAt, @bestOf)`
);

export function insertMatches(matches: Match[]): void {
  const tx = db.transaction((all: Match[]) => {
    for (const m of all) {
      insertMatch.run({
        id: m.id,
        phaseId: m.phaseId,
        round: m.round,
        indexInRound: m.indexInRound,
        slotA: JSON.stringify(m.slotA),
        slotB: JSON.stringify(m.slotB),
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        status: m.status,
        winnerId: m.winnerId,
        loserId: m.loserId,
        enteredAt: m.enteredAt,
        enteredByDevice: m.enteredByDevice,
        scheduledAt: m.scheduledAt,
        bestOf: m.bestOf,
      });
    }
  });
  tx(matches);
}

const updateMatchStmt = db.prepare(
  `UPDATE matches SET team_a_id=@teamAId, team_b_id=@teamBId, score_a=@scoreA, score_b=@scoreB, status=@status,
   winner_id=@winnerId, loser_id=@loserId, entered_at=@enteredAt, entered_by_device=@enteredByDevice WHERE id=@id`
);

export function saveMatches(matches: Match[]): void {
  const tx = db.transaction((all: Match[]) => {
    for (const m of all) {
      updateMatchStmt.run({
        id: m.id,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        status: m.status,
        winnerId: m.winnerId,
        loserId: m.loserId,
        enteredAt: m.enteredAt,
        enteredByDevice: m.enteredByDevice,
      });
    }
  });
  tx(matches);
}

export function listMatchesForTournament(tournamentId: string): Match[] {
  const rows = db
    .prepare(
      `SELECT m.* FROM matches m JOIN phases p ON p.id = m.phase_id WHERE p.tournament_id = ? ORDER BY m.round, m.index_in_round`
    )
    .all(tournamentId) as MatchRow[];
  return rows.map(mapMatch);
}

export function getMatch(id: string): Match | null {
  const row = db.prepare(`SELECT * FROM matches WHERE id = ?`).get(id) as MatchRow | undefined;
  return row ? mapMatch(row) : null;
}

export function tournamentIdOfMatch(matchId: string): string | null {
  const row = db
    .prepare(`SELECT p.tournament_id as tid FROM matches m JOIN phases p ON p.id = m.phase_id WHERE m.id = ?`)
    .get(matchId) as { tid: string } | undefined;
  return row?.tid ?? null;
}

// ---------- MatchLog ----------

const insertLog = db.prepare(
  `INSERT INTO match_logs (id, match_id, actor, timestamp, field, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?, ?)`
);

export function logChange(matchId: string, actor: string, field: string, oldValue: unknown, newValue: unknown): void {
  insertLog.run(randomUUID(), matchId, actor, nowIso(), field, oldValue === null || oldValue === undefined ? null : String(oldValue), newValue === null || newValue === undefined ? null : String(newValue));
}

export function listLogsForMatch(matchId: string): MatchLog[] {
  const rows = db.prepare(`SELECT * FROM match_logs WHERE match_id = ? ORDER BY timestamp`).all(matchId) as Array<{
    id: string;
    match_id: string;
    actor: string;
    timestamp: string;
    field: string;
    old_value: string | null;
    new_value: string | null;
  }>;
  return rows.map((r) => ({ id: r.id, matchId: r.match_id, actor: r.actor, timestamp: r.timestamp, field: r.field, oldValue: r.old_value, newValue: r.new_value }));
}

export function listLogsForTournament(tournamentId: string): MatchLog[] {
  const rows = db
    .prepare(
      `SELECT l.* FROM match_logs l
       JOIN matches m ON m.id = l.match_id
       JOIN phases p ON p.id = m.phase_id
       WHERE p.tournament_id = ? ORDER BY l.timestamp`
    )
    .all(tournamentId) as Array<{ id: string; match_id: string; actor: string; timestamp: string; field: string; old_value: string | null; new_value: string | null }>;
  return rows.map((r) => ({ id: r.id, matchId: r.match_id, actor: r.actor, timestamp: r.timestamp, field: r.field, oldValue: r.old_value, newValue: r.new_value }));
}

export { nowIso };
