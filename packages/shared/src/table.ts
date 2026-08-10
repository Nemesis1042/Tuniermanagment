// Tabelle und Tiebreaker nach Kap. 3.7 und 6.3.
// Volle Neuberechnung bei jedem Ergebnis, keine inkrementelle Fortschreibung (6.3).

import type { Match } from "./types.js";

export type Tiebreaker = "head_to_head" | "goal_diff" | "goals_for" | "lot";

export interface PointsConfig {
  win: number;
  draw: number;
  loss: number;
  allowDraw: boolean;
}

export const DEFAULT_POINTS: PointsConfig = { win: 3, draw: 1, loss: 0, allowDraw: true };
export const DEFAULT_TIEBREAKERS: Tiebreaker[] = ["head_to_head", "goal_diff", "goals_for", "lot"];

export interface TeamStats {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

function emptyStats(teamId: string): TeamStats {
  return { teamId, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
}

const SCORED: Match["status"][] = ["gewertet", "gewertet_ohne_spiel"];

function accumulate(stats: TeamStats, own: number, opp: number, points: PointsConfig): void {
  stats.played += 1;
  stats.goalsFor += own;
  stats.goalsAgainst += opp;
  if (own > opp) {
    stats.wins += 1;
    stats.points += points.win;
  } else if (own < opp) {
    stats.losses += 1;
    stats.points += points.loss;
  } else {
    stats.draws += 1;
    stats.points += points.draw;
  }
}

export function computeStats(teamIds: string[], matches: Match[], points: PointsConfig): Map<string, TeamStats> {
  const byId = new Map<string, TeamStats>(teamIds.map((id) => [id, emptyStats(id)]));
  for (const m of matches) {
    if (!SCORED.includes(m.status)) continue;
    if (m.scoreA === null || m.scoreB === null || m.teamAId === null || m.teamBId === null) continue;
    const a = byId.get(m.teamAId);
    const b = byId.get(m.teamBId);
    if (a) accumulate(a, m.scoreA, m.scoreB, points);
    if (b) accumulate(b, m.scoreB, m.scoreA, points);
  }
  return byId;
}

export interface StandingsRow extends TeamStats {
  rank: number;
  tiedNeedsLot: boolean;
}

export interface StandingsResult {
  rows: StandingsRow[];
}

/**
 * Berechnet die Tabelle inklusive Tiebreaker-Kette (3.7). Jeder Schritt ist
 * einzeln über `tiebreakers` an-/abschaltbar; leere Liste = nur Punkte zählen.
 */
export function computeStandings(
  teamIds: string[],
  matches: Match[],
  points: PointsConfig = DEFAULT_POINTS,
  tiebreakers: Tiebreaker[] = DEFAULT_TIEBREAKERS
): StandingsResult {
  const overall = computeStats(teamIds, matches, points);

  const byPoints = new Map<number, string[]>();
  for (const id of teamIds) {
    const p = overall.get(id)!.points;
    const arr = byPoints.get(p) ?? [];
    arr.push(id);
    byPoints.set(p, arr);
  }
  const pointGroups = [...byPoints.entries()].sort((a, b) => b[0] - a[0]).map(([, ids]) => ids);

  const orderedIds: string[] = [];
  const lotFlags = new Set<string>();
  for (const group of pointGroups) {
    orderedIds.push(...resolveGroup(group, matches, points, tiebreakers, 0, overall, lotFlags));
  }

  const rows: StandingsRow[] = orderedIds.map((id, i) => ({
    ...overall.get(id)!,
    rank: i + 1,
    tiedNeedsLot: lotFlags.has(id),
  }));

  return { rows };
}

function resolveGroup(
  group: string[],
  matches: Match[],
  points: PointsConfig,
  tiebreakers: Tiebreaker[],
  step: number,
  overall: Map<string, TeamStats>,
  lotFlags: Set<string>
): string[] {
  if (group.length <= 1 || step >= tiebreakers.length) {
    return group;
  }
  const rule = tiebreakers[step];

  if (rule === "lot") {
    group.forEach((id) => lotFlags.add(id));
    return group; // Los muss vom Admin bestätigt werden — das System würfelt nicht still (3.7 Punkt 4)
  }

  if (rule === "head_to_head") {
    // Untertabelle nur aus den Spielen der beteiligten Teams untereinander.
    const subMatches = matches.filter(
      (m) => m.teamAId && m.teamBId && group.includes(m.teamAId) && group.includes(m.teamBId)
    );
    const sub = computeStats(group, subMatches, points);
    return splitAndRecurse(group, (id) => sub.get(id)!.points, matches, points, tiebreakers, step, overall, lotFlags);
  }

  if (rule === "goal_diff") {
    return splitAndRecurse(
      group,
      (id) => overall.get(id)!.goalsFor - overall.get(id)!.goalsAgainst,
      matches,
      points,
      tiebreakers,
      step,
      overall,
      lotFlags
    );
  }

  // goals_for
  return splitAndRecurse(
    group,
    (id) => overall.get(id)!.goalsFor,
    matches,
    points,
    tiebreakers,
    step,
    overall,
    lotFlags
  );
}

function splitAndRecurse(
  group: string[],
  metric: (id: string) => number,
  matches: Match[],
  points: PointsConfig,
  tiebreakers: Tiebreaker[],
  step: number,
  overall: Map<string, TeamStats>,
  lotFlags: Set<string>
): string[] {
  const byMetric = new Map<number, string[]>();
  for (const id of group) {
    const v = metric(id);
    const arr = byMetric.get(v) ?? [];
    arr.push(id);
    byMetric.set(v, arr);
  }
  const subGroups = [...byMetric.entries()].sort((a, b) => b[0] - a[0]).map(([, ids]) => ids);
  const result: string[] = [];
  for (const sub of subGroups) {
    result.push(...resolveGroup(sub, matches, points, tiebreakers, step + 1, overall, lotFlags));
  }
  return result;
}
