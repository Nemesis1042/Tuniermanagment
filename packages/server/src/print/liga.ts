// Spielplan-Liste + Tabelle, A4 hoch (F-26 Hauptvorlage, funktioniert für alle Modi).
// Vorlage aus files/aushang-a4.html, jetzt datengetrieben statt mit Demo-Daten.

import type { Match, Team } from "@turnier/shared";
import type { StandingsRow } from "@turnier/shared";
import { BASE_CSS, escapeHtml, renderFoot, renderHead, type SheetMeta } from "./shared.js";

function teamName(teams: Team[], id: string | null): string {
  if (!id) return "?";
  return teams.find((t) => t.id === id)?.name ?? "?";
}

export function renderLigaSheet(meta: SheetMeta, teams: Team[], matches: Match[], standings: StandingsRow[]): string {
  const rows = standings
    .map(
      (r, i) => `<tr class="${i < 2 ? "top" : ""}">
        <td class="pos">${r.rank}</td>
        <td class="l team">${escapeHtml(teamName(teams, r.teamId))}</td>
        <td>${r.played}</td><td>${r.wins}</td><td>${r.draws}</td><td>${r.losses}</td>
        <td>${r.goalsFor}:${r.goalsAgainst}</td>
        <td>${r.goalsFor - r.goalsAgainst > 0 ? "+" : ""}${r.goalsFor - r.goalsAgainst}</td>
        <td class="pkt">${r.points}</td>
      </tr>`
    )
    .join("");

  const sortedMatches = [...matches].sort((a, b) => a.round - b.round || a.indexInRound - b.indexInRound);
  const games = sortedMatches
    .map((m, i) => {
      const done = m.scoreA !== null && m.scoreB !== null;
      return `<div class="g ${done ? "done" : ""}">
        <span class="no">${i + 1}</span>
        <span class="a">${escapeHtml(teamName(teams, m.teamAId))}</span>
        <span class="box">${done ? m.scoreA : ""}</span>
        <span class="colon">:</span>
        <span class="box">${done ? m.scoreB : ""}</span>
        <span class="b">${escapeHtml(teamName(teams, m.teamBId))}</span>
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><title>Aushang — ${escapeHtml(meta.discipline)}</title>
<style>
  @page { size: A4 portrait; margin: 10mm 10mm 8mm 10mm; }
  ${BASE_CSS}
  body { font-size: 8.5pt; line-height: 1.15; }
  .sheet { display: flex; flex-direction: column; min-height: 277mm; }
  .title { font-size: 30pt; }
  .band { margin: 4mm 0 2mm; display: flex; align-items: baseline; gap: 3mm; }
  .band h2 { margin: 0; font-size: 11pt; font-weight: 700; letter-spacing: 2pt; text-transform: uppercase; }
  .band .hint { font-size: 7.5pt; color: var(--mid); }
  .band::after { content: ""; flex: 1; border-bottom: 0.3mm solid var(--ink); transform: translateY(-1mm); }
  table.tab { width: 100%; border-collapse: collapse; }
  table.tab th { font-size: 6.5pt; letter-spacing: .8pt; text-transform: uppercase; color: var(--mid); font-weight: 400; text-align: right; padding: 0 1mm 1mm; border-bottom: 0.3mm solid var(--ink); }
  table.tab th.l, table.tab td.l { text-align: left; }
  table.tab td { padding: 1.1mm 1mm; text-align: right; border-bottom: 0.2mm solid var(--hair); font-variant-numeric: tabular-nums; }
  table.tab td.pos { width: 7mm; color: var(--mid); }
  table.tab td.team { font-size: 10pt; font-weight: 600; }
  table.tab td.pkt { font-size: 11pt; font-weight: 700; width: 12mm; }
  table.tab tr.top td.pos { color: var(--ink); font-weight: 700; }
  .games { margin-top: 1mm; column-count: 2; column-gap: 8mm; column-fill: auto; }
  .g { display: flex; align-items: center; gap: 1.5mm; height: 6.4mm; break-inside: avoid; border-bottom: 0.2mm solid #ddd; }
  .g .no { width: 6mm; font-size: 7pt; color: var(--pale); text-align: right; font-variant-numeric: tabular-nums; }
  .g .a, .g .b { flex: 1; font-size: 9pt; overflow: hidden; white-space: nowrap; }
  .g .a { text-align: right; }
  .box { width: 8mm; height: 5.4mm; border: 0.35mm solid var(--ink); text-align: center; font-size: 10pt; font-weight: 700; line-height: 5.4mm; font-variant-numeric: tabular-nums; }
  .colon { font-size: 9pt; color: var(--mid); }
  .g.done .a, .g.done .b { color: var(--pale); }
  .g.done .no { color: #ccc; }
  .g.done .box { border-color: var(--pale); color: var(--mid); }
</style></head>
<body>
<div class="sheet">
  ${renderHead(meta, 30)}
  ${
    standings.length > 0
      ? `<div class="band"><h2>Tabelle</h2><span class="hint">Sieg 3 · Unentschieden 1 · Niederlage 0</span></div>
  <table class="tab">
    <thead><tr><th class="l" colspan="2">Team</th><th>Sp</th><th>S</th><th>U</th><th>N</th><th>Tore</th><th>Diff</th><th>Pkt</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`
      : ""
  }
  <div class="band"><h2>Spiele</h2><span class="hint">Ergebnis mit Kuli in die Kästchen · nichts überschreiben</span></div>
  <div class="games">${games}</div>
  ${renderFoot()}
</div>
</body></html>`;
}
