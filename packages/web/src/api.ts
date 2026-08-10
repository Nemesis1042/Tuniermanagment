const BASE = "/api";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `Fehler bei ${path}`);
  return body as T;
}

export interface Tournament {
  id: string;
  name: string;
  discipline: string;
  fieldName: string;
  mode: string;
  config: Record<string, unknown>;
  matchDurationMin: number | null;
  changeoverMin: number | null;
  maxTeams: number;
  status: string;
  createdAt: string;
}

export interface Team {
  id: string;
  tournamentId: string;
  name: string;
  seed: number | null;
  color: string | null;
  members: string[];
  withdrawn: boolean;
}

export type SlotRef =
  | { type: "team"; teamId: string }
  | { type: "winner_of"; matchId: string }
  | { type: "loser_of"; matchId: string }
  | { type: "rank_of"; phaseId: string; rank: number }
  | { type: "bye" };

export interface Match {
  id: string;
  phaseId: string;
  round: number;
  indexInRound: number;
  slotA: SlotRef;
  slotB: SlotRef;
  teamAId: string | null;
  teamBId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  status: string;
  winnerId: string | null;
  loserId: string | null;
  enteredAt: string | null;
}

export interface StandingsRow {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  rank: number;
  tiedNeedsLot: boolean;
}

export const api = {
  listTournaments: () => req<Tournament[]>("/tournaments"),
  createTournament: (input: Partial<Tournament>) =>
    req<Tournament>("/tournaments", { method: "POST", body: JSON.stringify(input) }),
  getTournament: (id: string) => req<Tournament>(`/tournaments/${id}`),
  setStatus: (id: string, status: string) =>
    req<Tournament>(`/tournaments/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }),
  preview: (id: string) =>
    req<{ totalGames: number; gamesPerTeamMin: number; gamesPerTeamMax: number; neededMinutes: number | null } | null>(
      `/tournaments/${id}/preview`
    ),
  generate: (id: string) => req<{ matches: Match[] }>(`/tournaments/${id}/generate`, { method: "POST" }),

  listTeams: (tournamentId: string) => req<Team[]>(`/tournaments/${tournamentId}/teams`),
  addTeam: (tournamentId: string, input: { name: string; members?: string[]; seed?: number | null }) =>
    req<Team>(`/tournaments/${tournamentId}/teams`, { method: "POST", body: JSON.stringify(input) }),
  withdrawTeam: (tournamentId: string, teamId: string) =>
    req<{ changedMatches: Match[] }>(`/teams/${teamId}/withdraw`, {
      method: "POST",
      body: JSON.stringify({ tournamentId, actor: "MA" }),
    }),

  listMatches: (tournamentId: string) => req<Match[]>(`/tournaments/${tournamentId}/matches`),
  listOpenMatches: (tournamentId: string) => req<Match[]>(`/tournaments/${tournamentId}/matches/open`),
  enterResult: (matchId: string, scoreA: number, scoreB: number) =>
    req<{ changedMatches: Match[] }>(`/matches/${matchId}/result`, {
      method: "POST",
      body: JSON.stringify({ scoreA, scoreB }),
    }),
  batchResults: (tournamentId: string, entries: Array<{ matchId: string; scoreA: number; scoreB: number }>) =>
    req<{ results: Array<{ matchId: string; ok: boolean; error?: string }> }>(
      `/tournaments/${tournamentId}/results/batch`,
      { method: "POST", body: JSON.stringify({ entries }) }
    ),
  cascadePreview: (matchId: string) => req<Match[]>(`/matches/${matchId}/cascade-preview`),
  resetResult: (matchId: string) =>
    req<{ changedMatches: Match[] }>(`/matches/${matchId}/reset`, { method: "POST", body: JSON.stringify({}) }),

  standings: (tournamentId: string) => req<{ rows: StandingsRow[] }>(`/tournaments/${tournamentId}/standings`),
};
