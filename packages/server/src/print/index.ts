import { PDFDocument } from "pdf-lib";
import * as repo from "../repo.js";
import * as service from "../service.js";
import { renderLigaSheet } from "./liga.js";
import { renderBracketSheet } from "./bracket.js";
import { formatStandDate, type SheetMeta } from "./shared.js";
import { htmlToPdf, type Orientation } from "./pdf.js";

function subtitleFor(mode: string, teamCount: number, gameCount: number): string {
  const modeLabel = mode === "league" ? "Jeder gegen jeden" : "K.-o.-System";
  return `${modeLabel} · ${teamCount} Teams · ${gameCount} Spiele`;
}

/** F-26/F-27: passende Vorlage je Modus, mit aktuellem Stand-Datum und Ausdrucknummer. */
export function buildHtmlForTournament(tournamentId: string): { html: string; orientation: Orientation } {
  const tournament = repo.getTournament(tournamentId);
  if (!tournament) throw new Error("Turnier nicht gefunden");
  const teams = repo.listTeams(tournamentId).filter((t) => !t.withdrawn);
  const matches = repo.listMatchesForTournament(tournamentId);
  const printNumber = repo.bumpPrintNumber(tournamentId);

  const meta: SheetMeta = {
    discipline: tournament.discipline,
    subtitle: subtitleFor(tournament.mode, teams.length, matches.length),
    standDate: formatStandDate(new Date()),
    printNumber,
  };

  if (tournament.mode === "single_elimination") {
    return { html: renderBracketSheet(meta, teams, matches), orientation: "landscape" };
  }
  const standings = service.standingsFor(tournamentId).rows;
  return { html: renderLigaSheet(meta, teams, matches, standings), orientation: "portrait" };
}

export async function printTournament(tournamentId: string): Promise<Buffer> {
  const { html, orientation } = buildHtmlForTournament(tournamentId);
  return htmlToPdf(html, orientation);
}

/** F-39: Sammeldruck — ein Befehl, ein PDF für alle laufenden Turniere. */
export async function printAllRunning(): Promise<Buffer> {
  const tournaments = repo.listTournaments().filter((t) => t.status !== "archived");
  if (tournaments.length === 0) throw new Error("Keine laufenden Turniere");

  const merged = await PDFDocument.create();
  for (const t of tournaments) {
    const pdfBytes = await printTournament(t.id);
    const doc = await PDFDocument.load(pdfBytes);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  return Buffer.from(await merged.save());
}
