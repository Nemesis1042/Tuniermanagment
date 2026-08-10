import { useMemo, useState } from "react";
import { api, type Match, type Team, type Tournament } from "../api.js";

function teamName(teams: Team[], id: string | null): string {
  if (!id) return "—";
  return teams.find((t) => t.id === id)?.name ?? "?";
}

function statusClass(status: string): string {
  if (status.startsWith("gewertet")) return "status-gewertet";
  if (status === "spielbar") return "status-spielbar";
  return "status-geplant";
}

export default function ScheduleTab({
  tournament,
  teams,
  matches,
  onChange,
}: {
  tournament: Tournament;
  teams: Team[];
  matches: Match[];
  onChange: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [error, setError] = useState<string | null>(null);

  const byRound = useMemo(() => {
    const map = new Map<number, Match[]>();
    for (const m of matches) {
      const arr = map.get(m.round) ?? [];
      arr.push(m);
      map.set(m.round, arr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [matches]);

  async function submit(matchId: string) {
    setError(null);
    try {
      await api.enterResult(matchId, Number(scoreA), Number(scoreB));
      setEditing(null);
      setScoreA("");
      setScoreB("");
      onChange();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function correct(matchId: string) {
    const affected = await api.cascadePreview(matchId);
    if (affected.length > 0) {
      const names = affected
        .map((m) => `${teamName(teams, m.teamAId)} : ${teamName(teams, m.teamBId)}`)
        .join(", ");
      if (!confirm(`Diese Folgespiele werden ungültig und zurückgesetzt: ${names}. Fortfahren?`)) return;
    } else if (!confirm("Ergebnis zurücksetzen?")) {
      return;
    }
    await api.resetResult(matchId);
    onChange();
  }

  if (matches.length === 0) {
    return <div className="card">Noch kein Spielplan. Im Reiter „Teams" erzeugen.</div>;
  }

  return (
    <div className="card">
      {tournament.mode === "single_elimination" ? (
        <p style={{ color: "#666" }}>Baumansicht (vereinfacht als Runden-Liste, grafischer Baum folgt in Stufe 2).</p>
      ) : null}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {byRound.map(([round, roundMatches]) => (
        <div key={round}>
          <h4>Runde {round}</h4>
          <table>
            <tbody>
              {roundMatches.map((m) => (
                <tr key={m.id}>
                  <td>{teamName(teams, m.teamAId)}</td>
                  <td>
                    {editing === m.id ? (
                      <span className="row">
                        <input className="score-input" value={scoreA} onChange={(e) => setScoreA(e.target.value)} autoFocus />
                        :
                        <input className="score-input" value={scoreB} onChange={(e) => setScoreB(e.target.value)} />
                        <button className="primary" onClick={() => submit(m.id)}>OK</button>
                        <button onClick={() => setEditing(null)}>Abbrechen</button>
                      </span>
                    ) : m.scoreA !== null ? (
                      `${m.scoreA} : ${m.scoreB}`
                    ) : (
                      "– : –"
                    )}
                  </td>
                  <td>{teamName(teams, m.teamBId)}</td>
                  <td>
                    <span className={`status-tag ${statusClass(m.status)}`}>{m.status}</span>
                  </td>
                  <td>
                    {m.status === "spielbar" && editing !== m.id && (
                      <button onClick={() => setEditing(m.id)}>Eintragen</button>
                    )}
                    {(m.status === "eingetragen" || m.status === "gewertet" || m.status === "gewertet_ohne_spiel") &&
                      m.enteredAt !== null && (
                        // Automatische Freilos-Matches haben kein enteredAt (niemand hat ein Ergebnis
                        // eingetragen) und sind nicht spielbar — für die gibt es nichts zu korrigieren.
                        <button onClick={() => correct(m.id)}>Korrigieren</button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
