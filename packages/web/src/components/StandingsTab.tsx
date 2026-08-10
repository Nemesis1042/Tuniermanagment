import { useEffect, useState } from "react";
import { api, type StandingsRow, type Team, type Tournament } from "../api.js";

function teamName(teams: Team[], id: string): string {
  return teams.find((t) => t.id === id)?.name ?? "?";
}

export default function StandingsTab({ tournament, teams }: { tournament: Tournament; teams: Team[] }) {
  const [rows, setRows] = useState<StandingsRow[]>([]);

  useEffect(() => {
    api.standings(tournament.id).then((r) => setRows(r.rows));
  }, [tournament.id]);

  return (
    <div className="card">
      <h3>Tabelle</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>Sp</th>
            <th>S</th>
            <th>U</th>
            <th>N</th>
            <th>Tore</th>
            <th>Diff</th>
            <th>Pkt</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.teamId}>
              <td style={{ color: i < 2 ? "var(--ink)" : "var(--ink-pale)", fontWeight: 700 }}>{r.rank}</td>
              <td style={{ fontWeight: 600 }}>
                {teamName(teams, r.teamId)}
                {r.tiedNeedsLot && (
                  <span className="status-tag status-spielbar" style={{ marginLeft: 6 }} title="Los muss vom Admin bestätigt werden (3.7)">
                    Los?
                  </span>
                )}
              </td>
              <td>{r.played}</td>
              <td>{r.wins}</td>
              <td>{r.draws}</td>
              <td>{r.losses}</td>
              <td style={{ fontVariantNumeric: "tabular-nums" }}>
                {r.goalsFor}:{r.goalsAgainst}
              </td>
              <td>{r.goalsFor - r.goalsAgainst > 0 ? "+" : ""}{r.goalsFor - r.goalsAgainst}</td>
              <td style={{ fontWeight: 700, fontSize: "1.05em" }}>{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
