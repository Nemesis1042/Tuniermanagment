// Gemeinsame Bausteine für die A4-Druckvorlagen (F-26/F-27), abgeleitet aus
// den vorhandenen Entwürfen in files/aushang-*.html — Layout/Optik bewusst
// unverändert übernommen, nur datengetrieben statt mit Demo-Daten befüllt.

export const BASE_CSS = `
  :root {
    --ink: #000; --mid: #555; --pale: #999; --hair: #bbb;
    --sans: "Liberation Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: var(--sans); color: var(--ink); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.2mm solid var(--ink); padding-bottom: 2mm; }
  .title { font-weight: 700; letter-spacing: -0.5pt; line-height: .92; text-transform: uppercase; }
  .subtitle { margin-top: 1.5mm; color: var(--mid); letter-spacing: .3pt; }
  .stamp { border: 0.6mm solid var(--ink); padding: 2mm 3mm; min-width: 48mm; text-align: right; }
  .stamp .lbl { font-size: 6.5pt; letter-spacing: 1.4pt; text-transform: uppercase; color: var(--mid); }
  .stamp .when { font-size: 13pt; font-weight: 700; line-height: 1.1; margin-top: .5mm; }
  .stamp .nr { margin-top: 1.5mm; padding-top: 1.5mm; border-top: 0.3mm solid var(--hair); font-size: 8pt; }
  .foot { margin-top: auto; padding-top: 2.5mm; border-top: 0.6mm solid var(--ink); display: flex; justify-content: space-between; gap: 6mm; font-size: 7.5pt; color: var(--mid); }
  .foot b { color: var(--ink); }
`;

export interface SheetMeta {
  discipline: string;
  subtitle: string;
  standDate: string; // z. B. "Mi 12.08. · 19:00"
  printNumber: number;
}

/** F-27: Stand-Datum, Uhrzeit, laufende Ausdrucknummer und Hinweis, ältere Blätter abzunehmen. */
export function renderHead(meta: SheetMeta, titleSizePt: number): string {
  return `
  <div class="head">
    <div>
      <div class="title" style="font-size:${titleSizePt}pt">${escapeHtml(meta.discipline)}</div>
      <div class="subtitle">${escapeHtml(meta.subtitle)}</div>
    </div>
    <div class="stamp">
      <div class="lbl">Stand</div>
      <div class="when">${escapeHtml(meta.standDate)}</div>
      <div class="nr">Aushang Nr. <b>${meta.printNumber}</b> · ältere Blätter abnehmen</div>
    </div>
  </div>`;
}

export function renderFoot(): string {
  return `
  <div class="foot">
    <div><b>Nicht angetreten:</b> 1:0 für den Gegner</div>
    <div><b>Streitfall:</b> beim Turnierleiter melden</div>
    <div><b>Ergebnisse werden täglich zu fester Zeit übertragen.</b></div>
  </div>`;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** F-27: „Mi 12.08. · 19:00" im Format des Repos. */
export function formatStandDate(d: Date): string {
  const tage = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const tag = tage[d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${tag} ${dd}.${mm}. · ${hh}:${min}`;
}
