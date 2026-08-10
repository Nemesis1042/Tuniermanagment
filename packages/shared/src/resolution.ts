// Slot-Auflösung nach Kapitel 5, Auflösungsregel.
// Arbeitet auf einer im Speicher gehaltenen Match-Map (NF-07: <800 Matches je Turnier,
// passt komplett in den Arbeitsspeicher — keine inkrementelle Delta-Logik).

import type { Match, SlotRef } from "./types.js";

export type MatchIndex = Map<string, Match>;

export function slotTeamId(slot: SlotRef, index: MatchIndex): string | null {
  switch (slot.type) {
    case "team":
      return slot.teamId;
    case "bye":
      return null;
    case "winner_of":
      return index.get(slot.matchId)?.winnerId ?? null;
    case "loser_of":
      return index.get(slot.matchId)?.loserId ?? null;
    case "rank_of":
      // Wird von der Gruppenphase-Logik separat aufgelöst (Standings nötig).
      return null;
  }
}

export function computeWinnerLoser(
  match: Pick<Match, "teamAId" | "teamBId" | "scoreA" | "scoreB">
): { winnerId: string | null; loserId: string | null } {
  if (
    match.teamAId === null ||
    match.teamBId === null ||
    match.scoreA === null ||
    match.scoreB === null
  ) {
    return { winnerId: null, loserId: null };
  }
  if (match.scoreA > match.scoreB) return { winnerId: match.teamAId, loserId: match.teamBId };
  if (match.scoreB > match.scoreA) return { winnerId: match.teamBId, loserId: match.teamAId };
  return { winnerId: null, loserId: null }; // Unentschieden: kein Sieger/Verlierer weiterzuschreiben
}

function referencesMatch(slot: SlotRef, matchId: string): slot is
  | { type: "winner_of"; matchId: string }
  | { type: "loser_of"; matchId: string } {
  return (slot.type === "winner_of" || slot.type === "loser_of") && slot.matchId === matchId;
}

export function getDependents(index: MatchIndex, matchId: string): Match[] {
  return [...index.values()].filter(
    (m) => referencesMatch(m.slotA, matchId) || referencesMatch(m.slotB, matchId)
  );
}

/**
 * Trägt ein Ergebnis ein (F-30), berechnet Sieger/Verlierer und schreibt sie
 * in alle abhängigen Slots weiter (F-33). Mutiert die übergebene Map.
 */
export function applyResult(
  index: MatchIndex,
  matchId: string,
  scoreA: number,
  scoreB: number,
  opts: { enteredAt: string; enteredByDevice: string; allowDraw: boolean }
): void {
  const match = index.get(matchId);
  if (!match) throw new Error(`Match ${matchId} nicht gefunden`);
  if (match.teamAId === null || match.teamBId === null) {
    throw new Error(`Match ${matchId} ist noch nicht spielbar`);
  }
  if (!opts.allowDraw && scoreA === scoreB) {
    throw new Error("Unentschieden ist für dieses Turnier nicht zugelassen — K.-o. erzwingt einen Sieger");
  }
  match.scoreA = scoreA;
  match.scoreB = scoreB;
  const { winnerId, loserId } = computeWinnerLoser(match);
  match.winnerId = winnerId;
  match.loserId = loserId;
  match.status = "eingetragen";
  match.enteredAt = opts.enteredAt;
  match.enteredByDevice = opts.enteredByDevice;

  propagate(index, matchId);
  match.status = "gewertet";
}

/** Schreibt Sieger/Verlierer von matchId in alle Matches, die darauf verweisen (Kap. 5). */
export function propagate(index: MatchIndex, matchId: string): void {
  for (const dependent of getDependents(index, matchId)) {
    if (referencesMatch(dependent.slotA, matchId)) {
      dependent.teamAId = slotTeamId(dependent.slotA, index);
    }
    if (referencesMatch(dependent.slotB, matchId)) {
      dependent.teamBId = slotTeamId(dependent.slotB, index);
    }
    if (dependent.teamAId !== null && dependent.teamBId !== null && dependent.status === "geplant") {
      dependent.status = "spielbar";
    }
  }
}

/**
 * Ermittelt, welche Matches ungültig würden, wenn matchId zurückgesetzt wird
 * (F-35: wird vor der Korrektur angezeigt, bevor der Admin bestätigt).
 */
export function cascadeAffected(index: MatchIndex, matchId: string): string[] {
  const affected = new Set<string>();
  const queue = [matchId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const dep of getDependents(index, current)) {
      if (dep.status === "eingetragen" || dep.status === "gewertet" || dep.status === "gewertet_ohne_spiel") {
        if (!affected.has(dep.id)) {
          affected.add(dep.id);
          queue.push(dep.id);
        }
      }
    }
  }
  return [...affected];
}

/**
 * Setzt ein Ergebnis zurück (F-34/F-35/F-36). Abhängige, bereits eingetragene
 * Ergebnisse werden rekursiv mit zurückgesetzt statt still überschrieben.
 */
export function resetResult(index: MatchIndex, matchId: string): void {
  const match = index.get(matchId);
  if (!match) throw new Error(`Match ${matchId} nicht gefunden`);

  // Erst rekursiv alle abhängigen, bereits gewerteten Matches zurücksetzen.
  for (const dep of getDependents(index, matchId)) {
    if (dep.status === "eingetragen" || dep.status === "gewertet" || dep.status === "gewertet_ohne_spiel") {
      resetResult(index, dep.id);
    }
    // Slot leeren, der auf dieses Match zeigte.
    if (referencesMatch(dep.slotA, matchId)) dep.teamAId = null;
    if (referencesMatch(dep.slotB, matchId)) dep.teamBId = null;
    if (dep.status === "spielbar") dep.status = "geplant";
  }

  match.scoreA = null;
  match.scoreB = null;
  match.winnerId = null;
  match.loserId = null;
  match.enteredAt = null;
  match.enteredByDevice = null;
  match.status = match.teamAId !== null && match.teamBId !== null ? "spielbar" : "geplant";
}
