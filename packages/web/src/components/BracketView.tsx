import { useLayoutEffect, useRef, useState } from "react";
import type { Match, Team } from "../api.js";

function teamName(teams: Team[], id: string | null): string {
  if (!id) return "?";
  return teams.find((t) => t.id === id)?.name ?? "?";
}

function isThirdPlace(m: Match): boolean {
  return m.slotA.type === "loser_of" && m.slotB.type === "loser_of";
}

function roundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Finale";
  if (fromEnd === 1) return "Halbfinale";
  if (fromEnd === 2) return "Viertelfinale";
  if (fromEnd === 3) return "Achtelfinale";
  return "Vorrunde";
}

interface ElbowPath {
  d: string;
  key: string;
}

/**
 * Grafische Baumansicht für K.-o.-Turniere (F-40). Die Spalten werden per
 * Flexbox (space-around) angeordnet — bei der Standard-Bracket-Indizierung
 * (Runde r, Match k wird von Runde r-1, Match 2k/2k+1 gespeist) reicht das
 * für korrekte Zentrierung, auch mit Freilosen. Die Verbindungslinien werden
 * nach dem Rendern per DOM-Messung als SVG-Overlay gezeichnet, damit sie zu
 * jeder Fensterbreite exakt an den Boxen andocken.
 */
export default function BracketView({ matches, teams }: { matches: Match[]; teams: Team[] }) {
  const bracket = matches.filter((m) => !isThirdPlace(m));
  const thirdPlace = matches.find(isThirdPlace);
  const totalRounds = bracket.length > 0 ? Math.max(...bracket.map((m) => m.round)) : 0;
  const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);
  const byId = new Map(bracket.map((m) => [m.id, m]));
  const finalMatch = bracket.find((m) => m.round === totalRounds);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const matchRefs = useRef(new Map<string, HTMLDivElement>());
  const championRef = useRef<HTMLDivElement | null>(null);
  const [paths, setPaths] = useState<ElbowPath[]>([]);

  useLayoutEffect(() => {
    function recompute() {
      const container = containerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const rel = (r: DOMRect) => ({
        left: r.left - cRect.left,
        right: r.right - cRect.left,
        top: r.top - cRect.top,
        bottom: r.bottom - cRect.top,
      });

      const next: ElbowPath[] = [];
      for (const m of bracket) {
        const target = bracket.find(
          (z) => (z.slotA.type === "winner_of" && z.slotA.matchId === m.id) || (z.slotB.type === "winner_of" && z.slotB.matchId === m.id)
        );
        const sourceEl = matchRefs.current.get(m.id);
        if (!sourceEl) continue;
        const sr = rel(sourceEl.getBoundingClientRect());
        const y1 = (sr.top + sr.bottom) / 2;
        const x1 = sr.right;

        if (target) {
          const targetEl = matchRefs.current.get(target.id);
          if (!targetEl) continue;
          const tr = rel(targetEl.getBoundingClientRect());
          const side = target.slotA.type === "winner_of" && target.slotA.matchId === m.id ? "A" : "B";
          const slotHeight = (tr.bottom - tr.top) / 2;
          const y2 = side === "A" ? tr.top + slotHeight / 2 : tr.bottom - slotHeight / 2;
          const x2 = tr.left;
          const midX = (x1 + x2) / 2;
          next.push({ key: m.id, d: `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}` });
        } else if (m.id === finalMatch?.id && championRef.current) {
          const tr = rel(championRef.current.getBoundingClientRect());
          const x2 = tr.left;
          const y2 = (tr.top + tr.bottom) / 2;
          const midX = (x1 + x2) / 2;
          next.push({ key: `${m.id}-champion`, d: `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}` });
        }
      }
      setPaths(next);
    }

    recompute();
    const ro = new ResizeObserver(recompute);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [matches]);

  if (bracket.length === 0) return null;

  return (
    <div>
      <div className="bracket" ref={containerRef} style={{ position: "relative" }}>
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}
        >
          {paths.map((p) => (
            <path key={p.key} d={p.d} fill="none" stroke="var(--border-strong)" strokeWidth={1.5} />
          ))}
        </svg>
        {rounds.map((round) => {
          const roundMatches = bracket.filter((m) => m.round === round).sort((a, b) => a.indexInRound - b.indexInRound);
          return (
            <div key={round} className="bracket-col" style={{ zIndex: 1 }}>
              <div className="bracket-col-label">{roundLabel(round, totalRounds)}</div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-around" }}>
                {roundMatches.map((m) => (
                  <div
                    key={m.id}
                    className="bracket-match"
                    ref={(el) => {
                      if (el) matchRefs.current.set(m.id, el);
                      else matchRefs.current.delete(m.id);
                    }}
                  >
                    <BracketSlot teams={teams} match={m} side="A" />
                    <BracketSlot teams={teams} match={m} side="B" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <div className="bracket-col" style={{ zIndex: 1, justifyContent: "center" }}>
          <div className="bracket-col-label">Sieger</div>
          <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div className="bracket-champion" ref={championRef}>
              <span className="lbl">Turniersieger</span>
              <span className="name">{finalMatch?.winnerId ? teamName(teams, finalMatch.winnerId) : "—"}</span>
            </div>
          </div>
        </div>
      </div>
      {thirdPlace && (
        <p className="subtle">
          Spiel um Platz 3: {teamName(teams, thirdPlace.teamAId)}
          {thirdPlace.scoreA !== null ? ` ${thirdPlace.scoreA}` : ""} : {teamName(teams, thirdPlace.teamBId)}
          {thirdPlace.scoreB !== null ? ` ${thirdPlace.scoreB}` : ""}
        </p>
      )}
    </div>
  );
}

function BracketSlot({ teams, match, side }: { teams: Team[]; match: Match; side: "A" | "B" }) {
  const slot = side === "A" ? match.slotA : match.slotB;
  const teamId = side === "A" ? match.teamAId : match.teamBId;
  const score = side === "A" ? match.scoreA : match.scoreB;
  const isBye = slot.type === "bye";
  const isWinner = match.winnerId !== null && teamId === match.winnerId;
  const isLoser = match.winnerId !== null && teamId !== null && teamId !== match.winnerId;
  const label = isBye ? "Freilos" : teamId ? teamName(teams, teamId) : "–";

  return (
    <div className={`bracket-slot ${isWinner ? "winner" : ""} ${isLoser ? "loser" : ""}`}>
      <span className={`name ${teamId || isBye ? "" : "blank"}`}>{label}</span>
      {score !== null && <span className="pts">{score}</span>}
    </div>
  );
}
