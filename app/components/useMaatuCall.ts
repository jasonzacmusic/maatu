"use client";

import {
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
  type TranscriptionSegment,
  type Participant,
} from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";

// Drives one live Maatu call: mints a token, joins the LiveKit room, publishes
// the mic, plays the character's audio, reports who is speaking, and surfaces
// live romanized captions plus the running transcript. No em dashes anywhere.

export type CallPhase = "idle" | "connecting" | "live" | "ended" | "error";
export type Speaker = "character" | "learner" | null;
export type Line = { who: "character" | "learner"; text: string };

const NATIVE_SCRIPT = /[\u0900-\u097f\u0b80-\u0bff\u0c80-\u0cff]/u;

function safeRomanizedText(text: string) {
  return NATIVE_SCRIPT.test(text) ? "Romanizing speech..." : text;
}

function languageCode(persona: string) {
  if (persona.startsWith("hi-")) return "hi-IN";
  if (persona.startsWith("ta-")) return "ta-IN";
  return "kn-IN";
}

export interface MaatuCall {
  phase: CallPhase;
  error: string | null;
  muted: boolean;
  speaker: Speaker;
  caption: Line | null;
  transcript: Line[];
  roomName: string | null;
  needsAudioUnlock: boolean;
  connect: () => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMute: () => Promise<void>;
  unlockAudio: () => Promise<void>;
}

export function useMaatuCall(persona: string): MaatuCall {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState<Speaker>(null);
  const [caption, setCaption] = useState<Line | null>(null);
  const [transcript, setTranscript] = useState<Line[]>([]);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const ensureAudioEl = useCallback(() => {
    if (typeof document === "undefined") return null;
    if (!audioElRef.current) {
      const el = document.createElement("audio");
      el.autoplay = true;
      el.setAttribute("playsinline", "true");
      (el as HTMLAudioElement & { playsInline: boolean }).playsInline = true;
      el.style.display = "none";
      document.body.appendChild(el);
      audioElRef.current = el;
    }
    return audioElRef.current;
  }, []);

  const unlockAudio = useCallback(async () => {
    const room = roomRef.current;
    try {
      if (room) await room.startAudio();
      await audioElRef.current?.play().catch(() => {});
      setNeedsAudioUnlock(room ? !room.canPlaybackAudio : false);
    } catch {
      // leave the unlock prompt up
    }
  }, []);

  const hangUp = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) await room.disconnect();
    setSpeaker(null);
    setPhase("ended");
  }, []);

  const connect = useCallback(async () => {
    setPhase("connecting");
    setError(null);
    setTranscript([]);
    setCaption(null);
    try {
      const res = await fetch(`/api/token?persona=${encodeURIComponent(persona)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not reach the character.");
      }
      const { token, url, room: roomId } = await res.json();
      setRoomName(roomId);

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        const el = ensureAudioEl();
        if (track.kind === Track.Kind.Audio && el) {
          track.attach(el);
          el.play().catch(() => setNeedsAudioUnlock(!room.canPlaybackAudio));
        }
      });
      room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        setNeedsAudioUnlock(!room.canPlaybackAudio);
      });
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        if (speakers.length === 0) setSpeaker(null);
        else if (speakers.some((sp) => !sp.isLocal)) setSpeaker("character");
        else setSpeaker("learner");
      });
      room.on(
        RoomEvent.TranscriptionReceived,
        (segments: TranscriptionSegment[], participant?: Participant) => {
          const who: "character" | "learner" = participant?.isLocal ? "learner" : "character";
          const appendFinal = (text: string) => {
            setTranscript((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.who === who && !text.startsWith(last.text) && last.text.startsWith(text)) {
                return prev;
              }
              return [...prev.slice(-40), { who, text }];
            });
          };
          for (const seg of segments) {
            if (!seg.text?.trim()) continue;
            const raw = seg.text.trim();
            const text = safeRomanizedText(raw);
            setCaption({ who, text });
            if (seg.final) {
              if (NATIVE_SCRIPT.test(raw)) {
                void fetch("/api/romanize", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ text: raw, languageCode: languageCode(persona) }),
                })
                  .then((response) => (response.ok ? response.json() : { text: "Romanization unavailable" }))
                  .then((data) => {
                    const romanized = safeRomanizedText(typeof data.text === "string" ? data.text : "Romanization unavailable");
                    setCaption({ who, text: romanized });
                    appendFinal(romanized);
                  })
                  .catch(() => appendFinal("Romanization unavailable"));
              } else {
                appendFinal(text);
              }
            }
          }
        },
      );
      room.on(RoomEvent.Disconnected, () => {
        if (roomRef.current) {
          roomRef.current = null;
          setSpeaker(null);
          setPhase("ended");
        }
      });

      await room.connect(url, token);
      ensureAudioEl();
      // Unlock remote audio playback within the tap that started the call.
      try {
        await room.startAudio();
      } catch {
        // fall back to the tap-to-hear prompt
      }
      setNeedsAudioUnlock(!room.canPlaybackAudio);
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        setMuted(false);
      } catch {
        // Mic denied or unavailable: they can still listen. Not fatal.
        setMuted(true);
      }
      setPhase("live");
    } catch (e) {
      roomRef.current = null;
      setError(e instanceof Error ? e.message : "Could not connect.");
      setPhase("error");
    }
  }, [persona, ensureAudioEl]);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !muted;
    await room.localParticipant.setMicrophoneEnabled(!next);
    setMuted(next);
  }, [muted]);

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
      roomRef.current = null;
      audioElRef.current?.remove();
      audioElRef.current = null;
    };
  }, []);

  return {
    phase,
    error,
    muted,
    speaker,
    caption,
    transcript,
    roomName,
    needsAudioUnlock,
    connect,
    hangUp,
    toggleMute,
    unlockAudio,
  };
}
