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
      <form className="card" onSubmit={submit} style={{ maxWidth: 480 }}>
        <p>
          <label>
            Disziplin<br />
            <input value={discipline} onChange={(e) => setDiscipline(e.target.value)} required />
          </label>
        </p>
        <p>
          <label>
            Name (optional, sonst = Disziplin)<br />
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        </p>
        <p>
          <label>
            Feld<br />
            <input value={fieldName} onChange={(e) => setFieldName(e.target.value)} required />
          </label>
        </p>
        <p>
          <label>
            Modus<br />
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="league">Liga / Jeder gegen Jeden</option>
              <option value="single_elimination">Single Elimination (K.-o.)</option>
            </select>
          </label>
        </p>
        <p style={{ color: "#666", fontSize: "0.85em" }}>
          Weitere Modi (Double Elimination, Gruppen + K.-o., Schweizer System, Ladder) folgen in einer späteren Ausbaustufe.
        </p>
        <p>
          <label>
            Max. Teams<br />
            <input type="number" min={2} max={10} value={maxTeams} onChange={(e) => setMaxTeams(Number(e.target.value))} />
          </label>
        </p>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <button className="primary" disabled={busy || !discipline}>Anlegen</button>
      </form>
    </div>
  );
}
