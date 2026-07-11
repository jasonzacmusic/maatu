"use client";

import { Room, RoomEvent, Track, type RemoteTrack } from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";

// Drives one live Maatu call: mints a token, joins the LiveKit room, publishes
// the mic, plays the character's audio, and reports who is speaking so the Call
// screen can paint Sodium (character) or Tube (learner). No em dashes anywhere.

export type CallPhase = "idle" | "connecting" | "live" | "ended" | "error";
export type Speaker = "character" | "learner" | null;

export interface MaatuCall {
  phase: CallPhase;
  error: string | null;
  muted: boolean;
  speaker: Speaker;
  connect: () => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMute: () => Promise<void>;
}

export function useMaatuCall(persona: string): MaatuCall {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState<Speaker>(null);

  const roomRef = useRef<Room | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // Lazily create one hidden audio sink for the agent's voice.
  const ensureAudioEl = useCallback(() => {
    if (typeof document === "undefined") return null;
    if (!audioElRef.current) {
      const el = document.createElement("audio");
      el.autoplay = true;
      el.style.display = "none";
      document.body.appendChild(el);
      audioElRef.current = el;
    }
    return audioElRef.current;
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
    try {
      const res = await fetch(`/api/token?persona=${encodeURIComponent(persona)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not reach the auto stand.");
      }
      const { token, url } = await res.json();

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        const el = ensureAudioEl();
        if (track.kind === Track.Kind.Audio && el) track.attach(el);
      });
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        if (speakers.length === 0) {
          setSpeaker(null);
        } else if (speakers.some((sp) => !sp.isLocal)) {
          setSpeaker("character");
        } else {
          setSpeaker("learner");
        }
      });
      room.on(RoomEvent.Disconnected, () => {
        if (roomRef.current) {
          roomRef.current = null;
          setSpeaker(null);
          setPhase("ended");
        }
      });

      await room.connect(url, token);
      await room.localParticipant.setMicrophoneEnabled(true);
      setMuted(false);
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

  return { phase, error, muted, speaker, connect, hangUp, toggleMute };
}
