import { NextResponse } from "next/server";
import { romanizeText } from "@/lib/romanize";

const LANGUAGES = new Set(["kn-IN", "hi-IN", "ta-IN"]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.slice(0, 1000) : "";
  const languageCode = LANGUAGES.has(body.languageCode) ? body.languageCode : "kn-IN";
  if (!text.trim()) return NextResponse.json({ text: "" });
  return NextResponse.json({ text: await romanizeText(text, languageCode) });
}
