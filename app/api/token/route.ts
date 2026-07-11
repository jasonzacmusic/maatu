import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";

// Mints a LiveKit access token for one Maatu call session.
// Room name encodes the persona as "<persona-id>__<random>" so the agent worker
// knows which character to become. No em dashes anywhere, per brand rule.

const LIVEKIT_URL = process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL;
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;

function randomSuffix() {
  return Math.random().toString(36).slice(2, 10);
}

async function mint(personaId: string, learner: string) {
  if (!LIVEKIT_URL || !API_KEY || !API_SECRET) {
    return NextResponse.json(
      { error: "LiveKit is not configured on the server." },
      { status: 500 },
    );
  }

  const safePersona = personaId.replace(/[^a-z0-9-]/gi, "") || "kn-auto-driver-l3";
  const room = `${safePersona}__${randomSuffix()}`;
  const identity = `learner-${learner || randomSuffix()}`;

  const at = new AccessToken(API_KEY, API_SECRET, {
    identity,
    ttl: "30m",
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
  return mint(body.persona ?? "kn-auto-driver-l3", body.learner ?? "");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return mint(
    searchParams.get("persona") ?? "kn-auto-driver-l3",
    searchParams.get("learner") ?? "",
  );
}
