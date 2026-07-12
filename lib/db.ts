import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { PERSONAS } from "./personas.generated";

// Neon access for session reports. The table is created lazily on first use so
// there is no separate migration step to run. No em dashes anywhere.

let sql: NeonQueryFunction<false, false> | null | undefined;

function getSql() {
  if (sql !== undefined) return sql;
  const url = process.env.DATABASE_URL;
  sql = url ? neon(url) : null;
  return sql;
}

let ensured = false;

export async function ensureSchema() {
  const sql = getSql();
  if (!sql || ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS session_reports (
      room text PRIMARY KEY,
      persona_id text NOT NULL,
      language text NOT NULL,
      scenario text NOT NULL,
      duration_sec integer NOT NULL DEFAULT 0,
      report jsonb NOT NULL,
      transcript jsonb NOT NULL,
      coach_audio_b64 text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`ALTER TABLE session_reports ADD COLUMN IF NOT EXISTS user_id text NOT NULL DEFAULT 'legacy'`;
  await sql`CREATE INDEX IF NOT EXISTS session_reports_user_created_idx ON session_reports (user_id, created_at DESC)`;
  ensured = true;
}

export type StoredReport = {
  report: unknown;
  transcript: unknown;
};

export async function getReport(room: string): Promise<StoredReport | null> {
  const sql = getSql();
  if (!sql) return null;
  await ensureSchema();
  const rows = await sql`SELECT report, transcript FROM session_reports WHERE room = ${room}`;
  if (rows.length === 0) return null;
  return { report: rows[0].report, transcript: rows[0].transcript };
}

export async function saveReport(args: {
  room: string;
  userId: string;
  personaId: string;
  language: string;
  scenario: string;
  durationSec: number;
  report: unknown;
  transcript: unknown;
  coachAudioB64: string | null;
}) {
  const sql = getSql();
  if (!sql) return;
  await ensureSchema();
  await sql`
    INSERT INTO session_reports (room, user_id, persona_id, language, scenario, duration_sec, report, transcript, coach_audio_b64)
    VALUES (
      ${args.room}, ${args.userId}, ${args.personaId}, ${args.language}, ${args.scenario}, ${args.durationSec},
      ${JSON.stringify(args.report)}, ${JSON.stringify(args.transcript)}, ${args.coachAudioB64}
    )
    ON CONFLICT (room) DO NOTHING
  `;
}

export type StreetStats = {
  totalSeconds: number;
  thisWeekSeconds: number;
  sessionCount: number;
  nights: number;
  scenarios: { scenario: string; sessions: number; seconds: number }[];
};

export async function getStreetStats(userId: string): Promise<StreetStats> {
  const sql = getSql();
  if (!sql) return { totalSeconds: 0, thisWeekSeconds: 0, sessionCount: 0, nights: 0, scenarios: [] };
  await ensureSchema();
  const totals = await sql`
    SELECT
      COALESCE(SUM(duration_sec), 0)::int AS total_seconds,
      COALESCE(SUM(duration_sec) FILTER (WHERE created_at >= now() - interval '7 days'), 0)::int AS this_week_seconds,
      COUNT(*)::int AS session_count,
      COUNT(DISTINCT created_at::date)::int AS nights
    FROM session_reports
    WHERE user_id = ${userId}
  `;
  const scenarioRows = await sql`
    SELECT scenario, COUNT(*)::int AS sessions, COALESCE(SUM(duration_sec), 0)::int AS seconds
    FROM session_reports
    WHERE user_id = ${userId}
    GROUP BY scenario
    ORDER BY sessions DESC, scenario ASC
  `;
  return {
    totalSeconds: Number(totals[0].total_seconds),
    thisWeekSeconds: Number(totals[0].this_week_seconds),
    sessionCount: Number(totals[0].session_count),
    nights: Number(totals[0].nights),
    scenarios: scenarioRows.map((row) => ({
      scenario: String(row.scenario),
      sessions: Number(row.sessions),
      seconds: Number(row.seconds),
    })),
  };
}

export const dbEnabled = !!process.env.DATABASE_URL;

type NightlyReportRow = {
  room: string;
  language: string;
  report: {
    takeaways?: { native?: string; why?: string }[];
    words?: [string, string][];
  };
};

export type NightlyResult = {
  runAt: string;
  sourceSessions: number;
  personasRewritten: number;
  samplePersonaId: string | null;
  sampleBefore: string[];
  sampleAfter: string[];
};

async function ensureNightlySchema() {
  const sql = getSql();
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS persona_agendas (
      persona_id text PRIMARY KEY,
      language text NOT NULL,
      previous_agenda jsonb NOT NULL,
      secret_agenda jsonb NOT NULL,
      source_sessions integer NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS nightly_runs (
      id bigserial PRIMARY KEY,
      run_at timestamptz NOT NULL DEFAULT now(),
      source_sessions integer NOT NULL,
      personas_rewritten integer NOT NULL,
      sample_persona_id text,
      sample_before jsonb NOT NULL,
      sample_after jsonb NOT NULL
    )
  `;
}

function deriveAgenda(rows: NightlyReportRow[], fallback: string[]) {
  const candidates: string[] = [];
  for (const row of rows) {
    for (const takeaway of row.report?.takeaways ?? []) {
      if (takeaway.native?.trim()) candidates.push(`elicit ${takeaway.native.trim()}`);
      if (takeaway.why?.trim()) candidates.push(`practice ${takeaway.why.trim().replace(/\.$/, "").toLowerCase()}`);
    }
    for (const word of row.report?.words ?? []) {
      if (word?.[0]?.trim()) candidates.push(`reuse ${word[0].trim()}`);
    }
  }
  const unique = [...new Set(candidates)];
  return unique.length >= 3 ? unique.slice(0, 3) : [...unique, ...fallback.filter((item) => !unique.includes(item))].slice(0, 3);
}

export async function runNightlyPersonaRewrite(): Promise<NightlyResult> {
  const sql = getSql();
  if (!sql) throw new Error("Database is not configured");
  await ensureSchema();
  await ensureNightlySchema();

  const recentRows = (await sql`
    SELECT room, language, report - 'coach_audio_b64' AS report
    FROM session_reports
    WHERE created_at >= now() - interval '7 days'
    ORDER BY created_at DESC
  `) as NightlyReportRow[];
  const existingRows = await sql`SELECT persona_id, secret_agenda FROM persona_agendas`;
  const existing = new Map(existingRows.map((row) => [String(row.persona_id), row.secret_agenda as string[]]));

  let rewritten = 0;
  let samplePersonaId: string | null = null;
  let sampleBefore: string[] = [];
  let sampleAfter: string[] = [];

  for (const persona of Object.values(PERSONAS)) {
    const languageRows = recentRows.filter((row) => row.language === persona.language);
    if (languageRows.length === 0) continue;
    const defaultAgenda = persona.defaultSecretAgenda ?? [];
    const before = existing.get(persona.id) ?? defaultAgenda;
    const after = deriveAgenda(languageRows, defaultAgenda);
    if (JSON.stringify(before) === JSON.stringify(after)) continue;

    await sql`
      INSERT INTO persona_agendas (persona_id, language, previous_agenda, secret_agenda, source_sessions, updated_at)
      VALUES (
        ${persona.id}, ${persona.language}, ${JSON.stringify(before)}, ${JSON.stringify(after)}, ${languageRows.length}, now()
      )
      ON CONFLICT (persona_id) DO UPDATE SET
        language = EXCLUDED.language,
        previous_agenda = persona_agendas.secret_agenda,
        secret_agenda = EXCLUDED.secret_agenda,
        source_sessions = EXCLUDED.source_sessions,
        updated_at = now()
    `;
    rewritten += 1;
    if (!samplePersonaId) {
      samplePersonaId = persona.id;
      sampleBefore = before;
      sampleAfter = after;
    }
  }

  const runRows = await sql`
    INSERT INTO nightly_runs (source_sessions, personas_rewritten, sample_persona_id, sample_before, sample_after)
    VALUES (${recentRows.length}, ${rewritten}, ${samplePersonaId}, ${JSON.stringify(sampleBefore)}, ${JSON.stringify(sampleAfter)})
    RETURNING run_at
  `;

  return {
    runAt: new Date(runRows[0].run_at as string).toISOString(),
    sourceSessions: recentRows.length,
    personasRewritten: rewritten,
    samplePersonaId,
    sampleBefore,
    sampleAfter,
  };
}

export async function getPersonaAgenda(personaId: string) {
  const sql = getSql();
  if (!sql) return null;
  await ensureNightlySchema();
  const rows = await sql`
    SELECT persona_id, previous_agenda, secret_agenda, source_sessions, updated_at
    FROM persona_agendas
    WHERE persona_id = ${personaId}
  `;
  if (rows.length === 0) return null;
  return {
    personaId: String(rows[0].persona_id),
    previousAgenda: rows[0].previous_agenda as string[],
    secretAgenda: rows[0].secret_agenda as string[],
    sourceSessions: Number(rows[0].source_sessions),
    updatedAt: new Date(rows[0].updated_at as string).toISOString(),
  };
}
