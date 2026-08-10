import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Tournament } from "../api.js";

export default function TournamentListPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listTournaments().then(setTournaments).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>Turniere</h1>
        <Link to="/turniere/neu">
          <button className="primary">+ Turnier anlegen</button>
        </Link>
      </div>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Disziplin</th>
              <th>Feld</th>
              <th>Modus</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tournaments.map((t) => (
              <tr key={t.id}>
                <td>{t.discipline}</td>
                <td>{t.fieldName}</td>
                <td>{modeLabel(t.mode)}</td>
                <td><span className="status-tag">{t.status}</span></td>
                <td>
                  <Link to={`/turniere/${t.id}`}>öffnen</Link>
                </td>
              </tr>
            ))}
            {tournaments.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "#999" }}>
                  Noch keine Turniere. Bis zu 8 gleichzeitig möglich (F-07).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function modeLabel(mode: string): string {
  switch (mode) {
    case "single_elimination": return "K.-o.";
    case "double_elimination": return "Doppel-K.-o.";
    case "league": return "Liga";
    case "group_ko": return "Gruppen + K.-o.";
    case "swiss": return "Schweizer System";
    case "ladder": return "Ladder";
    default: return mode;
  }
}
