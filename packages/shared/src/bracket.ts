// Kernalgorithmen nach Kapitel 6: Bracket-Erzeugung mit Freilosen (6.1),
// Liga-Paarungen (3.3) und die Spielzahl-Formeln (6.4).

import type { Match, MatchStatus, Phase, SlotRef, Team } from "./types.js";
import { propagate, type MatchIndex } from "./resolution.js";

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/** Klassische Turnierseedreihenfolge (1 gegen p, 2 gegen p−1, ...), Kap. 6.1 Schritt 2. */
export function standardSeedOrder(p: number): number[] {
  let order = [1];
  let size = 1;
  while (size < p) {
    size *= 2;
    const next: number[] = [];
    for (const s of order) {
      next.push(s, size + 1 - s);
    }
    order = next;
  }
  return order;
}

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

function baseMatch(partial: Omit<Match, "id" | "status" | "winnerId" | "loserId" | "enteredAt" | "enteredByDevice" | "scoreA" | "scoreB" | "scheduledAt" | "bestOf"> & { status?: MatchStatus }): Match {
  return {
    id: nextId("match"),
    scoreA: null,
    scoreB: null,
    winnerId: null,
    loserId: null,
    enteredAt: null,
    enteredByDevice: null,
    scheduledAt: null,
    bestOf: null,
    status: "geplant",
    ...partial,
  };
}

/**
 * Erzeugt einen Single-Elimination-Bracket inklusive Freilosen (Kap. 6.1, F-20/F-21).
 * `teams` muss nach Setzung sortiert sein (Index 0 = Setzplatz 1).
 */
export function buildSingleElimination(
  teams: Team[],
  phase: Phase,
  options: { thirdPlace?: boolean } = {}
): Match[] {
  const n = teams.length;
  const p = nextPowerOfTwo(n);
  const order = standardSeedOrder(p);
  const rounds = Math.log2(p);

  const matches: Match[] = [];
  const index: MatchIndex = new Map();

  const teamBySeed = (seed: number): Team | null => (seed <= n ? teams[seed - 1] : null);

  // Runde 1: direkte Team- oder Bye-Slots.
  let previousRound: Match[] = [];
  for (let k = 0; k < p / 2; k++) {
    const seedA = order[2 * k];
    const seedB = order[2 * k + 1];
    const teamA = teamBySeed(seedA);
    const teamB = teamBySeed(seedB);
    const slotA: SlotRef = teamA ? { type: "team", teamId: teamA.id } : { type: "bye" };
    const slotB: SlotRef = teamB ? { type: "team", teamId: teamB.id } : { type: "bye" };

    const match = baseMatch({
      phaseId: phase.id,
      round: 1,
      indexInRound: k,
      slotA,
      slotB,
      teamAId: teamA?.id ?? null,
      teamBId: teamB?.id ?? null,
    });

    // Kap. 6.1 Schritt 4: Matches mit einem Bye sind direkt gewertet, Sieger ist das reale Team.
    if (teamA && !teamB) {
      match.winnerId = teamA.id;
      match.status = "gewertet";
    } else if (teamB && !teamA) {
      match.winnerId = teamB.id;
      match.status = "gewertet";
    } else if (teamA && teamB) {
      match.status = "spielbar";
    }

    matches.push(match);
    index.set(match.id, match);
    previousRound.push(match);
  }

  // Runden 2..log2(p): Slots verweisen auf Sieger der Vorrunde.
  for (let r = 2; r <= rounds; r++) {
    const roundMatches: Match[] = [];
    for (let k = 0; k < previousRound.length / 2; k++) {
      const feederA = previousRound[2 * k];
      const feederB = previousRound[2 * k + 1];
      const match = baseMatch({
        phaseId: phase.id,
        round: r,
        indexInRound: k,
        slotA: { type: "winner_of", matchId: feederA.id },
        slotB: { type: "winner_of", matchId: feederB.id },
        teamAId: null,
        teamBId: null,
      });
      matches.push(match);
      index.set(match.id, match);
      roundMatches.push(match);
    }
    previousRound = roundMatches;
  }

  // Bereits durch Freilose entschiedene Matches propagieren, damit Folgerunden
  // ihre Team-Slots sofort auflösen (z. B. Freilos-Sieger trifft im Halbfinale
  // auf einen weiteren Freilos-Sieger).
  for (const m of matches) {
    if (m.status === "gewertet") propagate(index, m.id);
  }

  if (options.thirdPlace && rounds >= 2) {
    const semifinals = matches.filter((m) => m.round === rounds - 1);
    if (semifinals.length === 2) {
      const [sf1, sf2] = semifinals;
      const thirdPlaceMatch = baseMatch({
        phaseId: phase.id,
        round: rounds,
        indexInRound: 1, // neben dem Finale (index 0)
        slotA: { type: "loser_of", matchId: sf1.id },
        slotB: { type: "loser_of", matchId: sf2.id },
        teamAId: null,
        teamBId: null,
      });
      matches.push(thirdPlaceMatch);
    }
  }

  return matches;
}

/**
 * Liga-Paarungen nach dem Kreisverfahren (3.3). Alle Spiele sind sofort
 * bekannt und unabhängig voneinander spielbar (F-22).
 */
export function buildLeague(teams: Team[], phase: Phase, doubleRound: boolean): Match[] {
  const ids = teams.map((t) => t.id);
  const hasGhost = ids.length % 2 !== 0;
  const field = hasGhost ? [...ids, null] : [...ids];
  const n = field.length;
  const roundsSingle = n - 1;

  const pairsPerRound: Array<Array<[string, string]>> = [];
  let rotating = field.slice();
  for (let r = 0; r < roundsSingle; r++) {
    const roundPairs: Array<[string, string]> = [];
    for (let i = 0; i < n / 2; i++) {
      const a = rotating[i];
      const b = rotating[n - 1 - i];
      if (a !== null && b !== null) {
        roundPairs.push(r % 2 === 0 ? [a, b] : [b, a]);
      }
    }
    pairsPerRound.push(roundPairs);
    rotating = [rotating[0], rotating[n - 1], ...rotating.slice(1, n - 1)];
  }

  const matches: Match[] = [];
  const legs = doubleRound ? [pairsPerRound, pairsPerRound.map((r) => r.map(([a, b]) => [b, a] as [string, string]))] : [pairsPerRound];

  let round = 1;
  for (const leg of legs) {
    for (const roundPairs of leg) {
      roundPairs.forEach(([a, b], k) => {
        matches.push(
          baseMatch({
            phaseId: phase.id,
            round,
            indexInRound: k,
            slotA: { type: "team", teamId: a },
            slotB: { type: "team", teamId: b },
            teamAId: a,
            teamBId: b,
            status: "spielbar",
          })
        );
      });
      round += 1;
    }
  }
  return matches;
}

/** Spielzahl-Vorschau nach Kap. 6.4 / F-03, ohne den Plan zu erzeugen. */
export function estimateGameCounts(
  mode: "single_elimination" | "double_elimination" | "league",
  teamCount: number,
  doubleRound = false
): { totalGames: number; gamesPerTeamMin: number; gamesPerTeamMax: number } {
  const n = teamCount;
  if (mode === "single_elimination") {
    return { totalGames: n - 1, gamesPerTeamMin: 1, gamesPerTeamMax: Math.ceil(Math.log2(nextPowerOfTwo(n))) };
  }
  if (mode === "double_elimination") {
    return { totalGames: 2 * n - 2, gamesPerTeamMin: 2, gamesPerTeamMax: 2 * Math.ceil(Math.log2(nextPowerOfTwo(n))) };
  }
  // league
  const single = (n * (n - 1)) / 2;
  const total = doubleRound ? single * 2 : single;
  const perTeam = doubleRound ? 2 * (n - 1) : n - 1;
  return { totalGames: total, gamesPerTeamMin: perTeam, gamesPerTeamMax: perTeam };
}
