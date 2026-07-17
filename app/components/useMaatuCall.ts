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
  micIssue: string | null;
  speaker: Speaker;
  caption: Line | null;
  transcript: Line[];
  characterHeard: boolean;
  roomName: string | null;
  needsAudioUnlock: boolean;
  slowerPace: boolean;
  connect: () => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMute: () => Promise<void>;
  unlockAudio: () => Promise<void>;
  requestSlowDown: () => Promise<boolean>;
  // Snapshot for records at hang-up time: the raw transcript keeps every final
  // line exactly as transcribed, so the lesson pass check can never be broken
  // by a romanization failure.
  recordTranscript: () => Line[];
}

export function useMaatuCall(persona: string): MaatuCall {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [micIssue, setMicIssue] = useState<string | null>(null);
  const [speaker, setSpeaker] = useState<Speaker>(null);
  const [caption, setCaption] = useState<Line | null>(null);
  const [transcript, setTranscript] = useState<Line[]>([]);
  const [characterHeard, setCharacterHeard] = useState(false);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const [slowerPace, setSlowerPace] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const rawRef = useRef<Line[]>([]);
  const displayRef = useRef<Line[]>([]);

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
    setSlowerPace(false);
    setCharacterHeard(false);
    setMicIssue(null);
    rawRef.current = [];
    displayRef.current = [];
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
          setCharacterHeard(true);
          track.attach(el);
          el.play().catch(() => setNeedsAudioUnlock(!room.canPlaybackAudio));
        }
      });
      room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        setNeedsAudioUnlock(!room.canPlaybackAudio);
      });
      room.on(RoomEvent.DataReceived, (payload, _participant, _kind, topic) => {
        if (topic !== "maatu.control") return;
        try {
          const message = JSON.parse(new TextDecoder().decode(payload));
          if (message.action === "slow-down-applied") setSlowerPace(true);
        } catch {
          // Ignore malformed or unrelated control packets.
        }
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
          if (who === "character") setCharacterHeard(true);
          const appendFinal = (text: string) => {
            setTranscript((prev) => {
              const last = prev[prev.length - 1];
              let next: Line[];
              if (last && last.who === who && (text === last.text || last.text.startsWith(text))) {
                next = prev;
              } else if (last && last.who === who && text.startsWith(last.text)) {
                // An extended re-emit of the same utterance replaces it.
                next = [...prev.slice(0, -1), { who, text }].slice(-40);
              } else {
                next = [...prev.slice(-40), { who, text }];
              }
              displayRef.current = next;
              return next;
            });
          };
          const appendRaw = (text: string) => {
            const last = rawRef.current[rawRef.current.length - 1];
            if (last && last.who === who && (text === last.text || last.text.startsWith(text))) return;
            if (last && last.who === who && text.startsWith(last.text)) {
              rawRef.current = [...rawRef.current.slice(0, -1), { who, text }];
            } else {
              rawRef.current = [...rawRef.current.slice(-80), { who, text }];
            }
          };
          for (const seg of segments) {
            if (!seg.text?.trim()) continue;
            const raw = seg.text.trim();
            const text = safeRomanizedText(raw);
            setCaption({ who, text });
            if (seg.final) {
              appendRaw(raw);
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
        setMicIssue("Your microphone is blocked. Allow the mic for this site in your browser settings, then tap the mic button.");
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
    try {
      await room.localParticipant.setMicrophoneEnabled(!next);
      setMuted(next);
      setMicIssue(null);
    } catch {
      setMuted(true);
      setMicIssue("Your microphone is blocked. Allow the mic for this site in your browser settings, then tap the mic button.");
    }
  }, [muted]);

  const recordTranscript = useCallback(() => [...rawRef.current], []);

  const requestSlowDown = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return false;
    try {
      const payload = new TextEncoder().encode(JSON.stringify({ action: "slow-down" }));
      await room.localParticipant.publishData(payload, { reliable: true, topic: "maatu.control" });
      return true;
    } catch {
      return false;
    }
  }, []);

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
    micIssue,
    speaker,
    caption,
    transcript,
    characterHeard,
    roomName,
    needsAudioUnlock,
    slowerPace,
    connect,
    hangUp,
    toggleMute,
    unlockAudio,
    requestSlowDown,
    recordTranscript,
  };
}
