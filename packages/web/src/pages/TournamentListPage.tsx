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
      <div className="page-head">
        <div>
          <h1>Turniere</h1>
          <p className="subtle">Bis zu 8 gleichzeitig (F-07)</p>
        </div>
        <Link to="/turniere/neu">
          <button className="primary">+ Turnier anlegen</button>
        </Link>
      </div>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <div className="card">
        {tournaments.length === 0 ? (
          <p className="empty-state">Noch keine Turniere angelegt.</p>
        ) : (
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
                  <td style={{ fontWeight: 600 }}>{t.discipline}</td>
                  <td>{t.fieldName}</td>
                  <td>{modeLabel(t.mode)}</td>
                  <td>
                    <span className="status-tag">{t.status}</span>
                  </td>
                  <td>
                    <Link to={`/turniere/${t.id}`}>
                      <button className="link">öffnen →</button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
