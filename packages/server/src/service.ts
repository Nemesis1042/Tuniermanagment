import {
  applyResult,
  buildLeague,
  buildSingleElimination,
  cascadeAffected,
  computeStandings,
  DEFAULT_POINTS,
  DEFAULT_TIEBREAKERS,
  estimateGameCounts,
  resetResult,
  withdrawTeam,
  type Match,
  type PointsConfig,
  type Tiebreaker,
} from "@turnier/shared";
import * as repo from "./repo.js";

function toIndex(matches: Match[]): Map<string, Match> {
  return new Map(matches.map((m) => [m.id, m]));
}

/** F-03: Spielzahl-Vorschau vor dem Erzeugen des Spielplans, ohne Sperre oder Warnung (F-04 entfällt). */
export function previewGameCounts(tournamentId: string) {
  const tournament = repo.getTournament(tournamentId);
  if (!tournament) throw new Error("Turnier nicht gefunden");
  const teamCount = repo.listTeams(tournamentId).filter((t) => !t.withdrawn).length;
  if (tournament.mode !== "single_elimination" && tournament.mode !== "double_elimination" && tournament.mode !== "league") {
    return null; // Andere Modi folgen in einer späteren Ausbaustufe.
  }
  const doubleRound = Boolean((tournament.config as { doubleRound?: boolean }).doubleRound);
  const counts = estimateGameCounts(tournament.mode, teamCount, doubleRound);
  let neededMinutes: number | null = null;
  if (tournament.matchDurationMin != null && tournament.changeoverMin != null) {
    neededMinutes = counts.totalGames * (tournament.matchDurationMin + tournament.changeoverMin);
  }
  return { ...counts, neededMinutes };
}

/** F-16/F-20: Spielplan aus Modus + Teams erzeugen. F-17: bei Nachmeldung neu erzeugen (verwirft alten Plan). */
export function generateSchedule(tournamentId: string): void {
  const tournament = repo.getTournament(tournamentId);
  if (!tournament) throw new Error("Turnier nicht gefunden");
  if (repo.isModeLocked(tournamentId)) {
    throw new Error("Modus ist gesperrt — es wurde bereits ein Ergebnis eingetragen (F-02)");
  }
  const teams = repo.listTeams(tournamentId).filter((t) => !t.withdrawn);
  if (teams.length < 2) throw new Error("Mindestens 2 Teams nötig");

  repo.clearPhases(tournamentId);

  if (tournament.mode === "single_elimination") {
    const phase = repo.createPhase(tournamentId, "bracket_w", 1);
    const thirdPlace = Boolean((tournament.config as { thirdPlace?: boolean }).thirdPlace);
    const matches = buildSingleElimination(teams, phase, { thirdPlace });
    repo.insertMatches(matches);
  } else if (tournament.mode === "league") {
    const phase = repo.createPhase(tournamentId, "league", 1);
    const doubleRound = Boolean((tournament.config as { doubleRound?: boolean }).doubleRound);
    const matches = buildLeague(teams, phase, doubleRound);
    repo.insertMatches(matches);
  } else {
    throw new Error(`Modus ${tournament.mode} ist in dieser Ausbaustufe noch nicht implementiert`);
  }
}

function pointsConfigOf(tournamentId: string): PointsConfig {
  const t = repo.getTournament(tournamentId)!;
  const c = t.config as Partial<PointsConfig>;
  return { ...DEFAULT_POINTS, ...c };
}

function tiebreakersOf(tournamentId: string): Tiebreaker[] {
  const t = repo.getTournament(tournamentId)!;
  const c = t.config as { tiebreakers?: Tiebreaker[] };
  return c.tiebreakers ?? DEFAULT_TIEBREAKERS;
}

// F-30/F-33: Ergebnis eintragen, Sieger berechnen, abhängige Slots automatisch füllen.
export function enterResult(matchId: string, scoreA: number, scoreB: number, actor: string, device: string): Match[] {
  const tournamentId = repo.tournamentIdOfMatch(matchId);
  if (!tournamentId) throw new Error("Match nicht gefunden");
  const all = repo.listMatchesForTournament(tournamentId);
  const index = toIndex(all);
  const before = new Map(all.map((m) => [m.id, { ...m }]));

  const tournament = repo.getTournament(tournamentId)!;
  // 3.7: Bei K.-o.-Spielen erzwingt das System einen Sieger — Unentschieden ist dort nie zulässig,
  // unabhängig von der Punkte-Konfiguration.
  const isKnockout = tournament.mode === "single_elimination" || tournament.mode === "double_elimination";
  const allowDraw = !isKnockout && (tournament.config as { allowDraw?: boolean }).allowDraw !== false;
  applyResult(index, matchId, scoreA, scoreB, {
    enteredAt: repo.nowIso(),
    enteredByDevice: device,
    allowDraw,
  });

  const changed = [...index.values()];
  repo.saveMatches(changed);

  for (const m of changed) {
    const prev = before.get(m.id)!;
    if (prev.status !== m.status) repo.logChange(m.id, actor, "status", prev.status, m.status);
    if (prev.scoreA !== m.scoreA || prev.scoreB !== m.scoreB) {
      repo.logChange(m.id, actor, "score", `${prev.scoreA ?? ""}:${prev.scoreB ?? ""}`, `${m.scoreA ?? ""}:${m.scoreB ?? ""}`);
    }
  }
  return changed.filter((m) => before.get(m.id)!.status !== m.status || before.get(m.id)!.scoreA !== m.scoreA);
}

/** F-35: zeigt vor der Korrektur, welche Folgespiele ungültig werden. */
export function previewCascade(matchId: string): Match[] {
  const tournamentId = repo.tournamentIdOfMatch(matchId);
  if (!tournamentId) throw new Error("Match nicht gefunden");
  const index = toIndex(repo.listMatchesForTournament(tournamentId));
  return cascadeAffected(index, matchId).map((id) => index.get(id)!);
}

/** F-34/F-36: Ergebnis zurücksetzen/korrigieren, abhängige Ergebnisse werden zurückgesetzt statt überschrieben. */
export function correctResult(matchId: string, actor: string): Match[] {
  const tournamentId = repo.tournamentIdOfMatch(matchId);
  if (!tournamentId) throw new Error("Match nicht gefunden");
  const all = repo.listMatchesForTournament(tournamentId);
  const index = toIndex(all);
  const before = new Map(all.map((m) => [m.id, { ...m }]));

  resetResult(index, matchId);

  const changed = [...index.values()].filter((m) => {
    const prev = before.get(m.id)!;
    return prev.status !== m.status || prev.scoreA !== m.scoreA || prev.teamAId !== m.teamAId || prev.teamBId !== m.teamBId;
  });
  repo.saveMatches(changed);
  for (const m of changed) {
    repo.logChange(m.id, actor, "reset", before.get(m.id)!.status, m.status);
  }
  return changed;
}

/** F-18: Rückzug, offene Spiele werden 1:0 für den Gegner gewertet. */
export function withdraw(tournamentId: string, teamId: string, actor: string, device: string): Match[] {
  const all = repo.listMatchesForTournament(tournamentId);
  const index = toIndex(all);
  const before = new Map(all.map((m) => [m.id, { ...m }]));

  withdrawTeam(index, teamId, { enteredAt: repo.nowIso(), enteredByDevice: device });
  repo.markTeamWithdrawn(teamId);

  const changed = [...index.values()].filter((m) => before.get(m.id)!.status !== m.status);
  repo.saveMatches(changed);
  for (const m of changed) {
    repo.logChange(m.id, actor, "withdrawal", before.get(m.id)!.status, m.status);
  }
  return changed;
}

export function standingsFor(tournamentId: string) {
  const teams = repo.listTeams(tournamentId).filter((t) => !t.withdrawn);
  const matches = repo.listMatchesForTournament(tournamentId);
  return computeStandings(
    teams.map((t) => t.id),
    matches,
    pointsConfigOf(tournamentId),
    tiebreakersOf(tournamentId)
  );
}
