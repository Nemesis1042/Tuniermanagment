// K.-o.-Baum, A4 quer (F-26 dritte Vorlage). Generalisierte Fassung der
// handgezeichneten Geometrie aus files/aushang-ko-baum.html — funktioniert
// für 2 bis 16 Bracket-Plätze (max. 10 Teams, siehe F-14) statt nur für den
// dort fest verdrahteten 10-Team-Demofall.

import type { Match, Team } from "@turnier/shared";
import { BASE_CSS, escapeHtml, renderHead, type SheetMeta } from "./shared.js";

const W = 48; // mm, Boxbreite je Match
const GAP = 6; // mm, Spaltenabstand
const MARGIN = 6; // mm, linker Rand des Boards
const SH = 8; // mm, Slot-Höhe
const BOARD_HEIGHT = 165; // mm, verfügbare Höhe A4 quer minus Kopf/Fuß

function teamName(teams: Team[], id: string | null): string {
  if (!id) return "?";
  return teams.find((t) => t.id === id)?.name ?? "?";
}

function roundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Finale";
  if (fromEnd === 1) return "Halbfinale";
  if (fromEnd === 2) return "Viertelfinale";
  if (fromEnd === 3) return "Achtelfinale";
  return "Vorrunde";
}

export function renderBracketSheet(meta: SheetMeta, teams: Team[], allMatches: Match[]): string {
  const bracket = allMatches.filter((m) => !(m.round === Math.max(...allMatches.map((x) => x.round)) && m.indexInRound === 1 && isThirdPlace(m)));
  const totalRounds = Math.max(...bracket.map((m) => m.round));
  const round1 = bracket.filter((m) => m.round === 1).sort((a, b) => a.indexInRound - b.indexInRound);
  const thirdPlace = allMatches.find((m) => m.round === totalRounds && m.indexInRound === 1 && isThirdPlace(m));

  const byId = new Map(bracket.map((m) => [m.id, m]));
  const spacing = BOARD_HEIGHT / round1.length;
  const center = new Map<string, number>();
  round1.forEach((m, k) => center.set(m.id, k * spacing + spacing / 2));

  for (let r = 2; r <= totalRounds; r++) {
    const roundMatches = bracket.filter((m) => m.round === r).sort((a, b) => a.indexInRound - b.indexInRound);
    for (const m of roundMatches) {
      const feederA = m.slotA.type === "winner_of" ? byId.get(m.slotA.matchId) : undefined;
      const feederB = m.slotB.type === "winner_of" ? byId.get(m.slotB.matchId) : undefined;
      const ca = feederA ? center.get(feederA.id)! : 0;
      const cb = feederB ? center.get(feederB.id)! : 0;
      center.set(m.id, (ca + cb) / 2);
    }
  }

  const colX = (round: number) => MARGIN + (round - 1) * (W + GAP);

  const boardParts: string[] = [];
  for (const m of bracket) {
    const x = colX(m.round);
    const c = center.get(m.id)!;
    const done = m.scoreA !== null && m.scoreB !== null;

    (["A", "B"] as const).forEach((side) => {
      const slot = side === "A" ? m.slotA : m.slotB;
      const teamId = side === "A" ? m.teamAId : m.teamBId;
      const score = side === "A" ? m.scoreA : m.scoreB;
      const isBye = slot.type === "bye";
      const y = c + (side === "A" ? -4.5 : 4.5) - SH / 2;
      const winnerSide = done && ((side === "A" && m.winnerId === m.teamAId) || (side === "B" && m.winnerId === m.teamBId));
      const label = isBye ? "" : teamId ? escapeHtml(teamName(teams, teamId)) : "";
      boardParts.push(
        `<div class="slot${done ? " done" : ""}${winnerSide ? " win" : ""}" style="left:${x}mm; top:${y}mm; width:${W}mm;">
          ${isBye ? `<span class="fl">Freilos</span>` : ""}
          <span class="nm${label ? "" : " blank"}">${label || (isBye ? "" : "–")}</span>
          <span class="box">${done && score !== null ? score : ""}</span>
        </div>`
      );
    });
    boardParts.push(`<div class="mno" style="left:${x - 5}mm; top:${c - 1.6}mm;">${m.round}.${m.indexInRound + 1}</div>`);

    // Verbindungslinien zum Folgematch (Kap. 6.1: winner_of-Referenz), analog zur Handvorlage.
    const target = bracket.find((z) => (z.slotA.type === "winner_of" && z.slotA.matchId === m.id) || (z.slotB.type === "winner_of" && z.slotB.matchId === m.id));
    if (target) {
      const side = target.slotA.type === "winner_of" && target.slotA.matchId === m.id ? "A" : "B";
      const xm = x + W + GAP / 2;
      const zy = center.get(target.id)! + (side === "A" ? -4.5 : 4.5);
      boardParts.push(`<div class="h" style="left:${x + W}mm; top:${c - 4.5}mm; width:${GAP / 2}mm;"></div>`);
      boardParts.push(`<div class="h" style="left:${x + W}mm; top:${c + 4.5}mm; width:${GAP / 2}mm;"></div>`);
      boardParts.push(`<div class="v" style="left:${xm}mm; top:${c - 4.5}mm; height:9mm;"></div>`);
      boardParts.push(`<div class="v" style="left:${xm}mm; top:${Math.min(c, zy)}mm; height:${Math.abs(zy - c)}mm;"></div>`);
      boardParts.push(`<div class="h" style="left:${xm}mm; top:${zy}mm; width:${colX(target.round) - xm}mm;"></div>`);
    }
  }

  const finalMatch = bracket.find((m) => m.round === totalRounds);
  if (finalMatch) {
    const xf = colX(totalRounds) + W + GAP;
    const c = center.get(finalMatch.id)!;
    boardParts.push(`<div class="v" style="left:${xf}mm; top:${c - 4.5}mm; height:9mm;"></div>`);
    boardParts.push(`<div class="h" style="left:${colX(totalRounds) + W}mm; top:${c - 4.5}mm; width:${GAP}mm;"></div>`);
    boardParts.push(`<div class="h" style="left:${colX(totalRounds) + W}mm; top:${c + 4.5}mm; width:${GAP}mm;"></div>`);
    boardParts.push(`<div class="h" style="left:${xf}mm; top:${c}mm; width:6mm;"></div>`);
    const winnerName = finalMatch.winnerId ? escapeHtml(teamName(teams, finalMatch.winnerId)) : "";
    boardParts.push(
      `<div class="cup" style="left:${xf + 4}mm; top:${c - 14}mm;"><div class="lbl">Turniersieger</div><div class="line">${winnerName}</div></div>`
    );
  }

  const cols = Array.from({ length: totalRounds }, (_, i) => roundLabel(i + 1, totalRounds));
  const colsHtml = cols.map((label) => `<span style="width:${W + GAP}mm">${escapeHtml(label)}</span>`).join("") + `<span>Sieger</span>`;

  const thirdPlaceHtml = thirdPlace
    ? `<p style="font-size:8pt; color:#555; margin-top:4mm;">Spiel um Platz 3: ${escapeHtml(teamName(teams, thirdPlace.teamAId))} : ${escapeHtml(
        teamName(teams, thirdPlace.teamBId)
      )}${thirdPlace.scoreA !== null ? ` — ${thirdPlace.scoreA}:${thirdPlace.scoreB}` : ""}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><title>Aushang — ${escapeHtml(meta.discipline)}</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  ${BASE_CSS}
  body { font-size: 8.5pt; }
  .sheet { display: flex; flex-direction: column; min-height: 194mm; }
  .title { font-size: 26pt; }
  .cols { display: flex; margin: 2.5mm 0 1.5mm; padding-left: ${MARGIN}mm; }
  .cols span { font-size: 6.5pt; letter-spacing: 1.6pt; text-transform: uppercase; color: var(--mid); }
  .board { position: relative; flex: 1; }
  .slot { position: absolute; height: ${SH}mm; display: flex; align-items: center; border-bottom: .5mm solid var(--ink); }
  .slot .nm { flex: 1; font-size: 10pt; padding: 0 1.5mm 0 1mm; overflow: hidden; white-space: nowrap; }
  .slot .nm.blank { color: var(--pale); font-size: 8pt; font-style: italic; }
  .slot .box { width: 8mm; height: 6mm; border: .35mm solid var(--ink); text-align: center; font-size: 11pt; font-weight: 700; line-height: 6mm; }
  .slot.done .nm { color: var(--pale); }
  .slot.done .box { border-color: var(--pale); color: var(--mid); }
  .slot.win .nm { font-weight: 700; color: var(--ink); }
  .fl { font-size: 6.5pt; color: var(--pale); letter-spacing: .6pt; padding-left: 1mm; }
  .mno { position: absolute; font-size: 7pt; color: var(--pale); }
  .h { position: absolute; border-top: .3mm solid var(--ink); }
  .v { position: absolute; border-left: .3mm solid var(--ink); }
  .cup { position: absolute; width: 50mm; border: .8mm solid var(--ink); padding: 3mm; text-align: center; }
  .cup .lbl { font-size: 7pt; letter-spacing: 1.6pt; text-transform: uppercase; color: var(--mid); }
  .cup .line { margin-top: 2mm; width: 100%; border-bottom: .5mm solid var(--ink); height: 9mm; font-size: 11pt; font-weight: 700; padding-top: 4mm; }
</style></head>
<body>
<div class="sheet">
  ${renderHead(meta, 26)}
  <div class="cols">${colsHtml}</div>
  <div class="board">${boardParts.join("")}</div>
  ${thirdPlaceHtml}
  <div class="foot">
    <div><b>Freilose</b> wurden automatisch aufgelöst</div>
    <div><b>Nicht angetreten:</b> 1:0 für den Gegner</div>
    <div><b>Streitfall:</b> beim Turnierleiter melden</div>
  </div>
</div>
</body></html>`;
}

function isThirdPlace(m: Match): boolean {
  // Heuristik: das Spiel-um-Platz-3 ist das einzige Match seiner Runde mit
  // zwei loser_of-Slots (siehe buildSingleElimination in @turnier/shared).
  return m.slotA.type === "loser_of" && m.slotB.type === "loser_of";
}
