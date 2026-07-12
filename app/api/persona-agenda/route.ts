import { NextResponse } from "next/server";
import { PERSONAS } from "@/lib/personas.generated";
import { getPersonaAgenda } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const personaId = new URL(request.url).searchParams.get("persona") ?? "";
  const persona = PERSONAS[personaId];
  if (!persona) return NextResponse.json({ error: "Unknown persona" }, { status: 404 });
  const active = await getPersonaAgenda(personaId);
  return NextResponse.json(
    active ?? {
      personaId,
      previousAgenda: persona.defaultSecretAgenda ?? [],
      secretAgenda: persona.defaultSecretAgenda ?? [],
      sourceSessions: 0,
      updatedAt: null,
    },
  );
}
