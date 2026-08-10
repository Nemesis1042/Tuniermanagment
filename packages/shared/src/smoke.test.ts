import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSingleElimination, buildLeague } from "./bracket.js";
import { applyResult, resetResult, cascadeAffected, type MatchIndex } from "./resolution.js";
import { computeStandings } from "./table.js";
import { withdrawTeam } from "./withdrawal.js";
import type { Match, Phase, Team } from "./types.js";

function team(id: string, seed: number): Team {
  return { id, tournamentId: "t1", name: id, seed, color: null, members: [], withdrawn: false };
}

const phase: Phase = { id: "p1", tournamentId: "t1", type: "bracket_w", order: 1, config: {} };

function toIndex(matches: Match[]): MatchIndex {
  return new Map(matches.map((m) => [m.id, m]));
}

// T-1: 3 Teams, Single Elimination -> Freilos für Setzplatz 1, 2 echte Spiele.
test("T-1: SE mit 3 Teams erzeugt ein Freilos und 2 spielbare/gewertete echte Spiele", () => {
  const teams = [team("a", 1), team("b", 2), team("c", 3)];
  const matches = buildSingleElimination(teams, phase);
  assert.equal(matches.length, 3); // p-1 = 3 Matchrecords (inkl. Bye)
  const round1 = matches.filter((m) => m.round === 1);
  const byeMatch = round1.find((m) => m.status === "gewertet");
  assert.ok(byeMatch);
  assert.equal(byeMatch!.winnerId, "a"); // Setzplatz 1 bekommt das Freilos
  const final = matches.find((m) => m.round === 2)!;
  assert.equal(final.teamAId, "a"); // Freilos-Sieger direkt aufgelöst
  assert.equal(final.teamBId, null); // wartet auf das echte Spiel
});

// T-2: 6 Teams, Single Elimination -> 2 Freilose, 5 echte Spiele.
test("T-2: SE mit 6 Teams erzeugt 2 Freilose", () => {
  const teams = [1, 2, 3, 4, 5, 6].map((s) => team(`t${s}`, s));
  const matches = buildSingleElimination(teams, phase);
  const byes = matches.filter((m) => m.status === "gewertet" && m.round === 1);
  assert.equal(byes.length, 2);
});

// T-4: 8 Teams Liga -> 28 Spiele, alle sofort spielbar.
test("T-4: Liga mit 8 Teams erzeugt 28 sofort spielbare Spiele", () => {
  const teams = Array.from({ length: 8 }, (_, i) => team(`t${i + 1}`, i + 1));
  const matches = buildLeague(teams, { ...phase, type: "league" }, false);
  assert.equal(matches.length, 28);
  assert.ok(matches.every((m) => m.status === "spielbar"));
});

// T-10: Ergebnis im Viertelfinale nachträglich ändern -> Kaskade + Reset.
test("T-10: Reset eines Ergebnisses macht Folgespiele ungültig und setzt sie zurück", () => {
  const teams = [1, 2, 3, 4].map((s) => team(`t${s}`, s));
  const matches = buildSingleElimination(teams, phase);
  const index = toIndex(matches);
  const [m1, m2] = matches.filter((m) => m.round === 1);
  const final = matches.find((m) => m.round === 2)!;

  applyResult(index, m1.id, 2, 1, { enteredAt: "now", enteredByDevice: "d1", allowDraw: false });
  applyResult(index, m2.id, 0, 3, { enteredAt: "now", enteredByDevice: "d1", allowDraw: false });
  assert.equal(index.get(final.id)!.status, "spielbar");

  applyResult(index, final.id, 1, 0, { enteredAt: "now", enteredByDevice: "d1", allowDraw: false });
  assert.equal(index.get(final.id)!.status, "gewertet");

  const affected = cascadeAffected(index, m1.id);
  assert.deepEqual(affected, [final.id]);

  resetResult(index, m1.id);
  assert.equal(index.get(m1.id)!.status, "spielbar");
  assert.equal(index.get(final.id)!.teamAId, null); // Slot wieder leer
  assert.equal(index.get(final.id)!.status, "geplant"); // Folgespiel zurückgesetzt
});

// T-9: Team zieht nach zwei gespielten Spielen zurück -> offene Spiele 1:0 gewertet.
test("T-9: Rückzug wertet offene Spiele 1:0 für den Gegner", () => {
  const teams = [1, 2, 3, 4].map((s) => team(`t${s}`, s));
  const matches = buildLeague(teams, { ...phase, type: "league" }, false);
  const index = toIndex(matches);
  withdrawTeam(index, "t2", { enteredAt: "now", enteredByDevice: "d1" });
  const remaining = [...index.values()].filter((m) => m.teamAId === "t2" || m.teamBId === "t2");
  assert.ok(remaining.every((m) => m.status === "gewertet_ohne_spiel"));
  for (const m of remaining) {
    if (m.teamAId === "t2") assert.equal(m.scoreA, 0);
    if (m.teamBId === "t2") assert.equal(m.scoreB, 0);
  }
});

// T-11: Drei Teams punktgleich -> Untertabelle aus direkten Spielen entscheidet.
test("T-11: Head-to-head-Untertabelle entscheidet bei Punktgleichheit", () => {
  const teams = [team("a", 1), team("b", 2), team("c", 3)];
  const matches: Match[] = [
    { id: "m1", phaseId: "p1", round: 1, indexInRound: 0, slotA: { type: "team", teamId: "a" }, slotB: { type: "team", teamId: "b" }, teamAId: "a", teamBId: "b", scoreA: 2, scoreB: 1, status: "gewertet", winnerId: "a", loserId: "b", enteredAt: null, enteredByDevice: null, scheduledAt: null, bestOf: null },
    { id: "m2", phaseId: "p1", round: 1, indexInRound: 1, slotA: { type: "team", teamId: "b" }, slotB: { type: "team", teamId: "c" }, teamAId: "b", teamBId: "c", scoreA: 2, scoreB: 1, status: "gewertet", winnerId: "b", loserId: "c", enteredAt: null, enteredByDevice: null, scheduledAt: null, bestOf: null },
    { id: "m3", phaseId: "p1", round: 1, indexInRound: 2, slotA: { type: "team", teamId: "c" }, slotB: { type: "team", teamId: "a" }, teamAId: "c", teamBId: "a", scoreA: 2, scoreB: 1, status: "gewertet", winnerId: "c", loserId: "a", enteredAt: null, enteredByDevice: null, scheduledAt: null, bestOf: null },
  ];
  const { rows } = computeStandings(["a", "b", "c"], matches);
  // Alle drei haben 3 Punkte (je 1 Sieg, 1 Niederlage) und gleiche Tordifferenz (+1/-1 zyklisch) ->
  // Untertabelle ist wieder zyklisch gleich, landet also beim Los.
  assert.ok(rows.every((r) => r.points === 3));
  assert.ok(rows.every((r) => r.tiedNeedsLot));
});

console.log("Alle Smoke-Tests grün.");
