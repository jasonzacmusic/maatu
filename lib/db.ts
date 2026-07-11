import { neon } from "@neondatabase/serverless";

// Neon access for session reports. The table is created lazily on first use so
// there is no separate migration step to run. No em dashes anywhere.

const url = process.env.DATABASE_URL;
const sql = url ? neon(url) : null;

let ensured = false;

export async function ensureSchema() {
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
  ensured = true;
}

export type StoredReport = {
  report: unknown;
  transcript: unknown;
};

export async function getReport(room: string): Promise<StoredReport | null> {
  if (!sql) return null;
  await ensureSchema();
  const rows = await sql`SELECT report, transcript FROM session_reports WHERE room = ${room}`;
  if (rows.length === 0) return null;
  return { report: rows[0].report, transcript: rows[0].transcript };
}

export async function saveReport(args: {
  room: string;
  personaId: string;
  language: string;
  scenario: string;
  durationSec: number;
  report: unknown;
  transcript: unknown;
  coachAudioB64: string | null;
}) {
  if (!sql) return;
  await ensureSchema();
  await sql`
    INSERT INTO session_reports (room, persona_id, language, scenario, duration_sec, report, transcript, coach_audio_b64)
    VALUES (
      ${args.room}, ${args.personaId}, ${args.language}, ${args.scenario}, ${args.durationSec},
      ${JSON.stringify(args.report)}, ${JSON.stringify(args.transcript)}, ${args.coachAudioB64}
    )
    ON CONFLICT (room) DO NOTHING
  `;
}

export const dbEnabled = !!sql;
