import { useEffect, useRef, useState } from "react";
import { api, type Match, type Team, type Tournament } from "../api.js";

function teamName(teams: Team[], id: string | null): string {
  if (!id) return "—";
  return teams.find((t) => t.id === id)?.name ?? "?";
}

/**
 * F-38: Nacherfassung am Laptop. Rein über Tastatur — Zahl, Tab, Zahl, Enter,
 * nächste Zeile. Kein Mausklick nötig. Ziel: 20 Ergebnisse in unter 2 Minuten.
 */
export default function RecaptureTab({
  tournament,
  teams,
  onChange,
}: {
  tournament: Tournament;
  teams: Team[];
  onChange: () => void;
}) {
  const [open, setOpen] = useState<Match[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(0);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    setOpen(await api.listOpenMatches(tournament.id));
  }

  useEffect(() => {
    load();
  }, [tournament.id]);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, [open]);

  async function submitRow(matchId: string, a: string, b: string) {
    if (a === "" || b === "") return;
    setError(null);
    try {
      await api.enterResult(matchId, Number(a), Number(b));
      setDone((d) => d + 1);
      setOpen((prev) => prev.filter((m) => m.id !== matchId));
      onChange();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="card">
      <h3>Nacherfassung</h3>
      <p style={{ color: "#666" }}>
        Zahl eingeben, Tab, Zahl eingeben, Enter — nächste Zeile wird automatisch fokussiert.
        {done > 0 && ` (${done} in dieser Sitzung erfasst)`}
      </p>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {open.length === 0 ? (
        <p>Keine offenen Spiele mehr zu erfassen.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Team A</th>
              <th colSpan={3}>Ergebnis</th>
              <th>Team B</th>
            </tr>
          </thead>
          <tbody>
            {open.map((m, i) => (
              <RecaptureRow
                key={m.id}
                index={i}
                match={m}
                labelA={teamName(teams, m.teamAId)}
                labelB={teamName(teams, m.teamBId)}
                inputRef={i === 0 ? firstInputRef : undefined}
                onSubmit={submitRow}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function RecaptureRow({
  index,
  match,
  labelA,
  labelB,
  inputRef,
  onSubmit,
}: {
  index: number;
  match: Match;
  labelA: string;
  labelB: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  onSubmit: (matchId: string, a: string, b: string) => void;
}) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const bRef = useRef<HTMLInputElement | null>(null);
  const rowRef = useRef<HTMLTableRowElement | null>(null);

  function onEnterB(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    onSubmit(match.id, a, b);
    // Fokus auf die erste Eingabe der nächsten Zeile.
    const next = rowRef.current?.parentElement?.querySelector<HTMLInputElement>(
      `tr:nth-child(${index + 2}) input.field-a`
    );
    next?.focus();
  }

  return (
    <tr ref={rowRef}>
      <td>{index + 1}</td>
      <td>{labelA}</td>
      <td>
        <input
          className="score-input field-a"
          ref={inputRef}
          value={a}
          onChange={(e) => setA(e.target.value)}
          inputMode="numeric"
        />
      </td>
      <td>:</td>
      <td>
        <input
          className="score-input field-b"
          ref={bRef}
          value={b}
          onChange={(e) => setB(e.target.value)}
          onKeyDown={onEnterB}
          inputMode="numeric"
        />
      </td>
      <td>{labelB}</td>
    </tr>
  );
}
