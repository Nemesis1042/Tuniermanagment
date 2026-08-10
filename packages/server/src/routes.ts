import { Router } from "express";
import * as repo from "./repo.js";
import * as service from "./service.js";
import * as print from "./print/index.js";

export const router = Router();

// ---------- Turniere (4.1) ----------

router.get("/tournaments", (_req, res) => {
  res.json(repo.listTournaments());
});

router.post("/tournaments", (req, res) => {
  try {
    const t = repo.createTournament(req.body);
    res.status(201).json(t);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.get("/tournaments/:id", (req, res) => {
  const t = repo.getTournament(req.params.id);
  if (!t) return res.status(404).json({ error: "nicht gefunden" });
  res.json(t);
});

router.post("/tournaments/:id/duplicate", (req, res) => {
  try {
    res.status(201).json(repo.duplicateTournament(req.params.id, req.body.name));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.post("/tournaments/:id/status", (req, res) => {
  repo.setTournamentStatus(req.params.id, req.body.status);
  res.json(repo.getTournament(req.params.id));
});

router.get("/tournaments/:id/preview", (req, res) => {
  try {
    res.json(service.previewGameCounts(req.params.id));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.post("/tournaments/:id/generate", (req, res) => {
  try {
    service.generateSchedule(req.params.id);
    res.json({ matches: repo.listMatchesForTournament(req.params.id) });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// ---------- Teams (4.2) ----------

router.get("/tournaments/:id/teams", (req, res) => {
  res.json(repo.listTeams(req.params.id));
});

router.post("/tournaments/:id/teams", (req, res) => {
  try {
    res.status(201).json(repo.addTeam(req.params.id, req.body));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.post("/tournaments/:id/teams/import", (req, res) => {
  // F-11: CSV-Import, Spalten Name, Mitglieder, Setzplatz. Der Client parst die CSV
  // und schickt strukturierte Zeilen, damit Encoding-Fragen nicht im Server landen.
  const rows: Array<{ name: string; members?: string[]; seed?: number | null }> = req.body.rows ?? [];
  try {
    const created = rows.map((r) => repo.addTeam(req.params.id, r));
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.post("/tournaments/:id/teams/copy-from/:sourceId", (req, res) => {
  try {
    res.status(201).json(repo.copyTeamsFrom(req.params.sourceId, req.params.id));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.post("/teams/:teamId/withdraw", (req, res) => {
  try {
    const teamRow = repo.listTeams(req.body.tournamentId).find((t) => t.id === req.params.teamId);
    if (!teamRow) throw new Error("Team nicht gefunden");
    const changed = service.withdraw(req.body.tournamentId, req.params.teamId, req.body.actor ?? "MA", req.body.device ?? "laptop");
    res.json({ changedMatches: changed });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// ---------- Spielplan / Ergebnisse (4.3, 4.4) ----------

router.get("/tournaments/:id/matches", (req, res) => {
  res.json(repo.listMatchesForTournament(req.params.id));
});

/** F-38: Nacherfassung — offene Spiele in Spielplan-Reihenfolge. */
router.get("/tournaments/:id/matches/open", (req, res) => {
  const matches = repo
    .listMatchesForTournament(req.params.id)
    .filter((m) => m.status === "spielbar")
    .sort((a, b) => a.round - b.round || a.indexInRound - b.indexInRound);
  res.json(matches);
});

router.post("/matches/:id/result", (req, res) => {
  try {
    const { scoreA, scoreB, actor = "MA", device = "laptop" } = req.body;
    const changed = service.enterResult(req.params.id, scoreA, scoreB, actor, device);
    res.json({ changedMatches: changed });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

/** Sammeleingabe für die Nacherfassung: mehrere Ergebnisse in einem Aufruf (F-38/F-39a). */
router.post("/tournaments/:id/results/batch", (req, res) => {
  const entries: Array<{ matchId: string; scoreA: number; scoreB: number }> = req.body.entries ?? [];
  const actor = req.body.actor ?? "MA";
  const device = req.body.device ?? "laptop";
  const results: Array<{ matchId: string; ok: boolean; error?: string }> = [];
  for (const entry of entries) {
    try {
      service.enterResult(entry.matchId, entry.scoreA, entry.scoreB, actor, device);
      results.push({ matchId: entry.matchId, ok: true });
    } catch (e) {
      results.push({ matchId: entry.matchId, ok: false, error: (e as Error).message });
    }
  }
  res.json({ results });
});

router.get("/matches/:id/cascade-preview", (req, res) => {
  try {
    res.json(service.previewCascade(req.params.id));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.post("/matches/:id/reset", (req, res) => {
  try {
    const changed = service.correctResult(req.params.id, req.body.actor ?? "Admin");
    res.json({ changedMatches: changed });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.get("/matches/:id/log", (req, res) => {
  res.json(repo.listLogsForMatch(req.params.id));
});

router.get("/tournaments/:id/log", (req, res) => {
  res.json(repo.listLogsForTournament(req.params.id));
});

// ---------- Tabelle ----------

router.get("/tournaments/:id/standings", (req, res) => {
  res.json(service.standingsFor(req.params.id));
});

// ---------- Aushang / Nachdruck (F-26 bis F-29, F-39, F-39b) ----------

router.get("/tournaments/:id/print", async (req, res) => {
  try {
    const pdf = await print.printTournament(req.params.id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="aushang.pdf"`);
    res.send(pdf);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

/** F-39: Sammeldruck — ein Befehl erzeugt den kompletten Satz für alle laufenden Turniere als ein PDF. */
router.get("/print/all", async (_req, res) => {
  try {
    const pdf = await print.printAllRunning();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="aushang-sammeldruck.pdf"`);
    res.send(pdf);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});
