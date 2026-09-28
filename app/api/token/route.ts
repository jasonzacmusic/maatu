import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";
import { PERSONAS } from "@/lib/personas.generated";
import { ALL_LESSONS } from "@/lib/curriculum";

// Mints a LiveKit access token for one Maatu call session.
// Room name encodes the persona as "<persona-id>__<random>" so the agent worker
// knows which character to become. No em dashes anywhere, per brand rule.

const LIVEKIT_URL = process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL;
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;

function randomSuffix() {
  return Math.random().toString(36).slice(2, 10);
}

function isValidPersona(personaId: string) {
  const base = personaId.replace(/-d[123]$/, "");
  if (PERSONAS[base]) return personaId === base || /^.+-d[123]$/.test(personaId);
  if (/^tutor-(kn|hi|ta)$/.test(personaId)) return true;
  const teacher = /^teacher-(kn|hi|ta)-(.+)$/.exec(personaId);
  return Boolean(teacher && ALL_LESSONS.some((lesson) => lesson.id === teacher[2]));
}

// A line from the Build tab for the companion to drill: romanized Latin only,
// short, and carried to the agent as the learner's participant metadata.
function cleanLine(value: string | null | undefined, max = 160) {
  return (value ?? "").replace(/[^\p{Script=Latin}\p{N}\s'?.,!-]/gu, "").replace(/\s+/g, " ").trim().slice(0, max);
}

async function mint(personaId: string, learner: string, practice?: { target: string; en: string }) {
  if (!LIVEKIT_URL || !API_KEY || !API_SECRET) {
    return NextResponse.json(
      { error: "LiveKit is not configured on the server." },
      { status: 500 },
    );
  }

  const safePersona = personaId.replace(/[^a-z0-9-]/gi, "");
  if (!safePersona || safePersona !== personaId || !isValidPersona(safePersona)) {
    return NextResponse.json(
      { error: "That call is not available." },
      { status: 400 },
    );
  }
  const room = `${safePersona}__${randomSuffix()}`;
  const identity = `learner-${learner || randomSuffix()}`;

  const line = practice && safePersona.startsWith("tutor-") ? { practice: cleanLine(practice.target), practiceEn: cleanLine(practice.en) } : null;
  const at = new AccessToken(API_KEY, API_SECRET, {
    identity,
    ttl: "30m",
    metadata: line && line.practice ? JSON.stringify(line) : undefined,
  });
  at.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();
  return NextResponse.json({ token, url: LIVEKIT_URL, room, persona: safePersona });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return mint(body.persona ?? "", body.learner ?? "", { target: body.practice ?? "", en: body.practiceEn ?? "" });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return mint(
    searchParams.get("persona") ?? "",
    searchParams.get("learner") ?? "",
    { target: searchParams.get("practice") ?? "", en: searchParams.get("practiceEn") ?? "" },
  );
}
