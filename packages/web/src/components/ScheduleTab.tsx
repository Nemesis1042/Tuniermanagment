import { useMemo, useState } from "react";
import { api, type Match, type Team, type Tournament } from "../api.js";
import BracketView from "./BracketView.js";

function teamName(teams: Team[], id: string | null): string {
  if (!id) return "—";
  return teams.find((t) => t.id === id)?.name ?? "?";
}

function statusLabel(status: string): string {
  switch (status) {
    case "geplant": return "geplant";
    case "spielbar": return "spielbar";
    case "eingetragen": return "eingetragen";
    case "gewertet": return "gewertet";
    case "gewertet_ohne_spiel": return "kampflos";
    case "strittig": return "strittig";
    case "abgesagt": return "abgesagt";
    default: return status;
  }
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
      const names = affected.map((m) => `${teamName(teams, m.teamAId)} : ${teamName(teams, m.teamBId)}`).join(", ");
      if (!confirm(`Diese Folgespiele werden ungültig und zurückgesetzt: ${names}. Fortfahren?`)) return;
    } else if (!confirm("Ergebnis zurücksetzen?")) {
      return;
    }
    await api.resetResult(matchId);
    onChange();
  }

  if (matches.length === 0) {
    return (
      <div className="card">
        <p className="empty-state">Noch kein Spielplan. Im Reiter „Teams" erzeugen.</p>
      </div>
    );
  }

  if (tournament.mode === "single_elimination") {
    return (
      <div className="card">
        <BracketView matches={matches} teams={teams} />
      </div>
    );
  }

  return (
    <div className="card">
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {byRound.map(([round, roundMatches]) => (
        <div key={round} className="round-block">
          <h4>Runde {round}</h4>
          <div className="match-grid">
            {roundMatches.map((m) => {
              const done = m.scoreA !== null && m.scoreB !== null;
              const canEnter = m.status === "spielbar";
              const canCorrect =
                (m.status === "eingetragen" || m.status === "gewertet" || m.status === "gewertet_ohne_spiel") && m.enteredAt !== null;
              const aWins = m.winnerId !== null && m.winnerId === m.teamAId;
              const bWins = m.winnerId !== null && m.winnerId === m.teamBId;

              if (editing === m.id) {
                return (
                  <div key={m.id} className="match-card">
                    <div className="teams">
                      <span className="team a">{teamName(teams, m.teamAId)}</span>
                      <span className="team b">{teamName(teams, m.teamBId)}</span>
                    </div>
                    <div className="edit-row">
                      <input className="score-input" value={scoreA} onChange={(e) => setScoreA(e.target.value)} autoFocus />
                      :
                      <input className="score-input" value={scoreB} onChange={(e) => setScoreB(e.target.value)} />
                      <button className="primary" onClick={() => submit(m.id)}>OK</button>
                      <button onClick={() => setEditing(null)}>×</button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={m.id} className={`match-card ${done ? "is-done" : ""}`}>
                  <div className="teams">
                    <span className={`team a ${aWins ? "winner" : bWins ? "loser" : ""}`}>{teamName(teams, m.teamAId)}</span>
                    <span className="score">
                      <span className="score-box">{done ? m.scoreA : ""}</span>:<span className="score-box">{done ? m.scoreB : ""}</span>
                    </span>
                    <span className={`team b ${bWins ? "winner" : aWins ? "loser" : ""}`}>{teamName(teams, m.teamBId)}</span>
                  </div>
                  <div className="meta">
                    <span className={`status-tag ${statusClass(m.status)}`}>{statusLabel(m.status)}</span>
                    <span className="actions">
                      {canEnter && <button className="link" onClick={() => setEditing(m.id)}>Eintragen</button>}
                      {canCorrect && <button className="link" onClick={() => correct(m.id)}>Korrigieren</button>}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
