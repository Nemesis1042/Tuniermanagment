// Rückzug und kampflose Wertung (F-18).

import type { Match } from "./types.js";
import { applyResult, type MatchIndex } from "./resolution.js";

/**
 * Zieht ein Team zurück. Alle offenen Spiele des Teams werden 1:0 für den
 * Gegner gewertet (Sieg zählt, Tordifferenz wird nicht verzerrt). Bei K.-o.
 * rückt der Gegner automatisch auf, da applyResult ganz normal weiterschreibt.
 */
export function withdrawTeam(
  index: MatchIndex,
  teamId: string,
  opts: { enteredAt: string; enteredByDevice: string }
): string[] {
  const scoredIds: string[] = [];
  for (const match of index.values()) {
    const involvesTeam = match.teamAId === teamId || match.teamBId === teamId;
    const isOpen = match.status === "geplant" || match.status === "spielbar";
    if (!involvesTeam || !isOpen) continue;

    // Beide Slots müssen aufgelöst sein, damit ein Gegner feststeht.
    if (match.teamAId === null || match.teamBId === null) continue;

    const scoreA = match.teamAId === teamId ? 0 : 1;
    const scoreB = match.teamBId === teamId ? 0 : 1;
    applyResult(index, match.id, scoreA, scoreB, { ...opts, allowDraw: false });
    match.status = "gewertet_ohne_spiel";
    scoredIds.push(match.id);
  }
  return scoredIds;
}

export function matchesForTeam(matches: Match[], teamId: string): Match[] {
  return matches.filter((m) => m.teamAId === teamId || m.teamBId === teamId);
}
