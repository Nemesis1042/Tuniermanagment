import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function TournamentCreatePage() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [fieldName, setFieldName] = useState("Feld 1");
  const [mode, setMode] = useState("league");
  const [maxTeams, setMaxTeams] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const t = await api.createTournament({
        name: name || discipline,
        discipline,
        fieldName,
        mode: mode as never,
        maxTeams,
      });
      nav(`/turniere/${t.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div>
      <h1>Turnier anlegen</h1>
      <form className="card" onSubmit={submit} style={{ maxWidth: 460 }}>
        <div className="field">
          <label htmlFor="discipline">Disziplin</label>
          <input id="discipline" value={discipline} onChange={(e) => setDiscipline(e.target.value)} required style={{ width: "100%" }} />
        </div>
        <div className="field">
          <label htmlFor="name">Name (optional, sonst = Disziplin)</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%" }} />
        </div>
        <div className="field">
          <label htmlFor="fieldName">Feld</label>
          <input id="fieldName" value={fieldName} onChange={(e) => setFieldName(e.target.value)} required style={{ width: "100%" }} />
        </div>
        <div className="field">
          <label htmlFor="mode">Modus</label>
          <select id="mode" value={mode} onChange={(e) => setMode(e.target.value)} style={{ width: "100%" }}>
            <option value="league">Liga / Jeder gegen Jeden</option>
            <option value="single_elimination">Single Elimination (K.-o.)</option>
          </select>
          <p className="subtle" style={{ marginTop: 6 }}>
            Weitere Modi (Double Elimination, Gruppen + K.-o., Schweizer System, Ladder) folgen in einer späteren Ausbaustufe.
          </p>
        </div>
        <div className="field">
          <label htmlFor="maxTeams">Max. Teams</label>
          <input
            id="maxTeams"
            type="number"
            min={2}
            max={10}
            value={maxTeams}
            onChange={(e) => setMaxTeams(Number(e.target.value))}
          />
        </div>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <button className="primary" disabled={busy || !discipline}>
          Anlegen
        </button>
      </form>
    </div>
  );
}
