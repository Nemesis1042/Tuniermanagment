import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { api, type Match, type Team, type Tournament } from "../api.js";
import TeamsTab from "../components/TeamsTab.js";
import ScheduleTab from "../components/ScheduleTab.js";
import RecaptureTab from "../components/RecaptureTab.js";
import StandingsTab from "../components/StandingsTab.js";

type TabKey = "teams" | "schedule" | "recapture" | "standings";

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tab, setTab] = useState<TabKey>("teams");
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    try {
      const [t, tm, ms] = await Promise.all([api.getTournament(id), api.listTeams(id), api.listMatches(id)]);
      setTournament(t);
      setTeams(tm);
      setMatches(ms);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!id) return null;
  if (error) return <p style={{ color: "crimson" }}>{error}</p>;
  if (!tournament) return <p>Lädt…</p>;

  const hasSchedule = matches.length > 0;

  return (
    <div>
      <h1>{tournament.discipline}</h1>
      <p style={{ color: "#666" }}>
        {tournament.fieldName} · Modus: {tournament.mode} · Status: {tournament.status}
      </p>

      <div className="tabs">
        <button className={tab === "teams" ? "active" : ""} onClick={() => setTab("teams")}>
          Teams ({teams.filter((t) => !t.withdrawn).length})
        </button>
        <button className={tab === "schedule" ? "active" : ""} onClick={() => setTab("schedule")}>
          Spielplan
        </button>
        <button className={tab === "recapture" ? "active" : ""} onClick={() => setTab("recapture")} disabled={!hasSchedule}>
          Nacherfassung
        </button>
        <button className={tab === "standings" ? "active" : ""} onClick={() => setTab("standings")} disabled={!hasSchedule}>
          Tabelle
        </button>
      </div>

      {tab === "teams" && (
        <TeamsTab tournament={tournament} teams={teams} hasSchedule={hasSchedule} onChange={reload} />
      )}
      {tab === "schedule" && <ScheduleTab tournament={tournament} teams={teams} matches={matches} onChange={reload} />}
      {tab === "recapture" && <RecaptureTab tournament={tournament} teams={teams} onChange={reload} />}
      {tab === "standings" && <StandingsTab tournament={tournament} teams={teams} />}
    </div>
  );
}
