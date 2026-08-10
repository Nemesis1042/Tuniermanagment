import { useState } from "react";
import { api, type Team, type Tournament } from "../api.js";

export default function TeamsTab({
  tournament,
  teams,
  hasSchedule,
  onChange,
}: {
  tournament: Tournament;
  teams: Team[];
  hasSchedule: boolean;
  onChange: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ totalGames: number; gamesPerTeamMin: number; gamesPerTeamMax: number; neededMinutes: number | null } | null>(null);
  const [busy, setBusy] = useState(false);

  const activeTeams = teams.filter((t) => !t.withdrawn);

  async function addTeam(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.addTeam(tournament.id, { name });
      setName("");
      onChange();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function withdraw(teamId: string) {
    if (!confirm("Team wirklich zurückziehen? Offene Spiele werden 1:0 für den Gegner gewertet.")) return;
    await api.withdrawTeam(tournament.id, teamId);
    onChange();
  }

  async function loadPreview() {
    setPreview(await api.preview(tournament.id));
  }

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      await api.generate(tournament.id);
      onChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h3>Teams erfassen</h3>
        <form className="row" onSubmit={addTeam}>
          <input placeholder="Teamname" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="primary" disabled={!name || activeTeams.length >= tournament.maxTeams}>
            Hinzufügen
          </button>
          <span style={{ color: "#666" }}>
            {activeTeams.length} / {tournament.maxTeams}
          </span>
        </form>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        {teams.length === 0 ? (
          <p className="empty-state">Noch keine Teams erfasst.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Team</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.id} style={t.withdrawn ? { color: "var(--ink-pale)", textDecoration: "line-through" } : undefined}>
                  <td style={{ fontWeight: 600 }}>{t.name}</td>
                  <td>
                    {!t.withdrawn && (
                      <button className="link" onClick={() => withdraw(t.id)}>
                        Rückzug
                      </button>
                    )}
                    {t.withdrawn && <span className="status-tag">zurückgezogen</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Spielplan erzeugen</h3>
        <div className="row">
          <button onClick={loadPreview} disabled={activeTeams.length < 2}>
            Spielzahl-Vorschau
          </button>
          <button className="primary" onClick={generate} disabled={busy || activeTeams.length < 2}>
            {hasSchedule ? "Spielplan neu erzeugen" : "Spielplan erzeugen"}
          </button>
        </div>
        {preview && (
          <p className="subtle" style={{ marginTop: 10 }}>
            <b style={{ color: "var(--ink)" }}>{preview.totalGames} Spiele</b> insgesamt, {preview.gamesPerTeamMin}
            {preview.gamesPerTeamMax !== preview.gamesPerTeamMin ? `–${preview.gamesPerTeamMax}` : ""} je Team.
            {preview.neededMinutes != null && ` Benötigte Feldzeit: ${Math.round(preview.neededMinutes / 60)} h.`}
          </p>
        )}
        {hasSchedule && (
          <p style={{ color: "var(--warn-ink)", fontSize: "0.85rem", marginTop: 10 }}>
            Neu erzeugen verwirft den bestehenden Plan und alle Ergebnisse (F-17: nur vor dem ersten Ergebnis möglich).
          </p>
        )}
      </div>
    </div>
  );
}
