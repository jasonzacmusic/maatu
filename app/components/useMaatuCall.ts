"use client";

import {
  Room,
  RoomEvent,
  Track,
  createLocalAudioTrack,
  type LocalAudioTrack,
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
  return NATIVE_SCRIPT.test(text) ? "Romanizing speech..." : text.replace(/\u2014/gu, ",");
}

function languageCode(persona: string) {
  const language = persona.match(/^(?:teacher-|tutor-)?(kn|hi|ta|fr)(?:-|$)/)?.[1];
  if (language === "fr") return "fr-FR";
  if (language === "hi") return "hi-IN";
  if (language === "ta") return "ta-IN";
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
  connectionIssue: string | null;
  endedUnexpectedly: boolean;
  connect: () => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMute: () => Promise<void>;
  unlockAudio: () => Promise<void>;
  requestSlowDown: () => Promise<boolean>;
  requestHelp: (action: "repeat" | "explain" | "pause" | "resume") => Promise<boolean>;
  // The learner's own microphone: live level (0 to 1), whether any sound has
  // reached it lately, the mics on this device, and a way to switch.
  micLevel: number;
  micSilent: boolean;
  mics: { id: string; label: string }[];
  micId: string | null;
  switchMic: (id: string) => Promise<void>;
  // Snapshot for records at hang-up time: the raw transcript keeps every final
  // line exactly as transcribed, so the lesson pass check can never be broken
  // by a romanization failure.
  recordTranscript: () => Line[];
  recordDisplayTranscript: () => Line[];
}

type PendingLine = Omit<Line, "text"> & { key: string; text: string | null };

// A sentence built in the Build tab that the companion should drill out loud.
export type PracticeLine = { target: string; en: string; context?: string };

export function useMaatuCall(persona: string, difficultyStage: 1 | 2 | 3 = 2, practice: PracticeLine | null = null): MaatuCall {
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
  const [connectionIssue, setConnectionIssue] = useState<string | null>(null);
  const [endedUnexpectedly, setEndedUnexpectedly] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const preparingMicRef = useRef<LocalAudioTrack | null>(null);
  const generation = useRef(0);
  const controls = useRef(new Map<string, { resolve: (ok: boolean) => void; timer: ReturnType<typeof setTimeout> }>());
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const rawRef = useRef<Line[]>([]);
  const displayRef = useRef<Line[]>([]);
  const pendingRef = useRef<PendingLine[]>([]);
  const seenFinalRef = useRef<Set<string>>(new Set());
  const romanizationTasksRef = useRef<Set<Promise<void>>>(new Set());

  const flushDisplay = useCallback(() => {
    let changed = false;
    while (pendingRef.current.length > 0 && pendingRef.current[0].text !== null) {
      const ready = pendingRef.current.shift();
      if (!ready?.text) continue;
      displayRef.current.push({ who: ready.who, text: ready.text });
      changed = true;
    }
    if (changed) setTranscript([...displayRef.current]);
  }, []);

  const settlePendingFallbacks = useCallback(() => {
    for (const line of pendingRef.current) {
      if (line.text === null) line.text = "Romanization unavailable";
    }
    flushDisplay();
  }, [flushDisplay]);

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
    generation.current += 1;
    preparingMicRef.current?.stop();
    preparingMicRef.current = null;
    for (const request of controls.current.values()) { clearTimeout(request.timer); request.resolve(false); }
    controls.current.clear();
    await Promise.race([
      Promise.allSettled([...romanizationTasksRef.current]),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
    settlePendingFallbacks();
    const room = roomRef.current;
    roomRef.current = null;
    if (room) await room.disconnect();
    setSpeaker(null);
    setPhase("ended");
  }, [settlePendingFallbacks]);

  // ................................................ microphone meter
  const [micLevel, setMicLevel] = useState(0);
  const [micSilent, setMicSilent] = useState(false);
  const [mics, setMics] = useState<{ id: string; label: string }[]>([]);
  const [micId, setMicId] = useState<string | null>(null);
  const meterRef = useRef<{ ctx: AudioContext; timer: ReturnType<typeof setInterval> } | null>(null);
  const lastSoundRef = useRef(0);

  const stopMeter = useCallback(() => {
    if (meterRef.current) {
      clearInterval(meterRef.current.timer);
      void meterRef.current.ctx.close().catch(() => undefined);
      meterRef.current = null;
    }
    setMicLevel(0);
  }, []);

  const startMeter = useCallback(
    (room: Room) => {
      stopMeter();
      const pub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      const media = pub?.track?.mediaStreamTrack;
      if (!media || typeof AudioContext === "undefined") return;
      try {
        const ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(new MediaStream([media]));
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        const buf = new Float32Array(analyser.fftSize);
        lastSoundRef.current = Date.now();
        const started = Date.now();
        const timer = setInterval(() => {
          analyser.getFloatTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i += 1) sum += buf[i] * buf[i];
          const level = Math.min(1, Math.sqrt(sum / buf.length) * 8);
          setMicLevel(level);
          if (level > 0.04) lastSoundRef.current = Date.now();
          // Twelve seconds of dead silence from the mic means the wrong input
          // (an interface channel, a virtual device) or a muted mic.
          setMicSilent(Date.now() - started > 12000 && Date.now() - lastSoundRef.current > 12000);
        }, 120);
        meterRef.current = { ctx, timer };
      } catch {
        // meter is a convenience; the call still works without it
      }
    },
    [stopMeter],
  );

  const refreshMics = useCallback(async (room: Room) => {
    try {
      const list = (await Room.getLocalDevices("audioinput")).filter((d) => d.deviceId);
      const mapped = list.map((d, i) => ({ id: d.deviceId, label: d.label || `Microphone ${i + 1}` }));
      setMics(mapped);
      let active = room.getActiveDevice("audioinput") ?? null;
      if (active === "default") active = list.find((d) => d.deviceId !== "default" && d.groupId === list.find((x) => x.deviceId === "default")?.groupId)?.deviceId ?? active;
      setMicId(active);
      // Studio Macs often default to a routing or virtual device that carries
      // no voice (Sangam, BlackHole, Loopback, Zoom, Teams, capture cards).
      // With no remembered choice, move to the first real microphone.
      let stored: string | null = null;
      try {
        stored = window.localStorage.getItem("maatu-mic");
      } catch {
        stored = null;
      }
      const label = (list.find((d) => d.deviceId === active)?.label ?? list.find((d) => d.deviceId === "default")?.label ?? "").toLowerCase();
      const virtual = /sangam|blackhole|loopback|soundflower|aggregate|zoom|teams|telestream|obs|camo|virtual|nph default|cam link|display|monitor|benq/;
      if (!stored && virtual.test(label)) {
        const real = mapped.find((m) => m.id !== "default" && m.id !== "communications" && !virtual.test(m.label.toLowerCase()));
        if (real) {
          await room.switchActiveDevice("audioinput", real.id);
          setMicId(real.id);
          startMeter(room);
        }
      }
    } catch {
      setMics([]);
    }
  }, [startMeter]);

  const switchMic = useCallback(
    async (id: string) => {
      const room = roomRef.current;
      if (!room) return;
      try {
        await room.switchActiveDevice("audioinput", id);
        setMicId(id);
        try {
          window.localStorage.setItem("maatu-mic", id);
        } catch {
          // remembering the choice is a convenience
        }
        setMicSilent(false);
        startMeter(room);
      } catch {
        setMicIssue("That microphone could not be opened. Try another one.");
      }
    },
    [startMeter],
  );

  const connect = useCallback(async () => {
    const attempt = ++generation.current;
    preparingMicRef.current?.stop();
    preparingMicRef.current = null;
    let capturedMic: LocalAudioTrack | undefined;
    let cancelCapture = false;
    setPhase("connecting");
    setError(null);
    setTranscript([]);
    setCaption(null);
    setSlowerPace(false);
    setCharacterHeard(false);
    setMicIssue(null);
    setConnectionIssue(null);
    setEndedUnexpectedly(false);
    rawRef.current = [];
    displayRef.current = [];
    pendingRef.current = [];
    seenFinalRef.current = new Set();
    romanizationTasksRef.current = new Set();
    try {
      const callPersona =
        persona.startsWith("teacher-") || persona.startsWith("tutor-")
          ? persona
          : `${persona}-d${difficultyStage}`;
      let storedMic: string | null = null;
      try { storedMic = window.localStorage.getItem("maatu-mic"); } catch { /* Optional remembered device. */ }
      // Ask for the microphone while the token and connection are being prepared.
      // A rejected or stale attempt must never leave a captured track running.
      const microphone: Promise<{ track?: LocalAudioTrack; error?: unknown }> = createLocalAudioTrack(storedMic ? { deviceId: storedMic } : undefined)
        .then((track) => {
          if (cancelCapture || attempt !== generation.current) { track.stop(); return { error: new Error("Call cancelled") }; }
          capturedMic = track;
          preparingMicRef.current = track;
          return { track };
        }).catch((error: unknown) => ({ error }));
      const res = await fetch("/api/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ persona: callPersona, practice: practice?.target, practiceEn: practice?.en, context: practice?.context }) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not reach the character.");
      }
      const { token, url, room: roomId } = await res.json();
      if (attempt !== generation.current) { cancelCapture = true; capturedMic?.stop(); return; }
      setRoomName(roomId);

      const room = new Room({ adaptiveStream: true, dynacast: true, audioCaptureDefaults: storedMic ? { deviceId: storedMic } : undefined });
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
          if (message.action === "control-applied" || message.action === "slow-down-applied") {
            const key = message.control || "slow-down";
            const request = controls.current.get(key);
            if (request) { clearTimeout(request.timer); request.resolve(true); controls.current.delete(key); }
          }
        } catch {
          // Ignore malformed or unrelated control packets.
        }
      });
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        if (speakers.length === 0) setSpeaker(null);
        else if (speakers.some((sp) => !sp.isLocal)) setSpeaker("character");
        else setSpeaker("learner");
      });
      room.on(RoomEvent.Reconnecting, () => {
        setConnectionIssue("Connection lost. Reconnecting now...");
      });
      room.on(RoomEvent.Reconnected, () => {
        setConnectionIssue(null);
      });
      room.on(
        RoomEvent.TranscriptionReceived,
        (segments: TranscriptionSegment[], participant?: Participant) => {
          const who: "character" | "learner" = participant?.isLocal ? "learner" : "character";
          if (who === "character") setCharacterHeard(true);
          for (const seg of segments) {
            if (!seg.text?.trim()) continue;
            const raw = seg.text.trim();
            const text = safeRomanizedText(raw);
            setCaption({ who, text });
            if (seg.final) {
              const key = seg.id || `${who}-${seg.startTime}-${seg.endTime}`;
              if (seenFinalRef.current.has(key)) continue;
              seenFinalRef.current.add(key);
              rawRef.current.push({ who, text: raw });
              const pending: PendingLine = { key, who, text: null };
              pendingRef.current.push(pending);
              if (NATIVE_SCRIPT.test(raw)) {
                const task = fetch("/api/romanize", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ text: raw, languageCode: languageCode(persona) }),
                })
                  .then((response) => (response.ok ? response.json() : { text: "Romanization unavailable" }))
                  .then((data) => {
                    if (attempt !== generation.current) return;
                    const romanized = safeRomanizedText(typeof data.text === "string" ? data.text : "Romanization unavailable");
                    setCaption({ who, text: romanized });
                    pending.text = romanized;
                    flushDisplay();
                  })
                  .catch(() => {
                    pending.text = "Romanization unavailable";
                    flushDisplay();
                  });
                romanizationTasksRef.current.add(task);
                void task.finally(() => romanizationTasksRef.current.delete(task));
              } else {
                pending.text = text;
                flushDisplay();
              }
            }
          }
        },
      );
      room.on(RoomEvent.Disconnected, () => {
        if (roomRef.current === room) {
          roomRef.current = null;
          setSpeaker(null);
          setConnectionIssue("The call dropped. Your transcript is safe.");
          setEndedUnexpectedly(true);
          settlePendingFallbacks();
          setPhase("ended");
        }
      });

      await room.connect(url, token);
      if (attempt !== generation.current) { cancelCapture = true; capturedMic?.stop(); await room.disconnect(); return; }
      ensureAudioEl();
      // Unlock remote audio playback within the tap that started the call.
      try {
        await room.startAudio();
      } catch {
        // fall back to the tap-to-hear prompt
      }
      setNeedsAudioUnlock(!room.canPlaybackAudio);
      if (attempt !== generation.current) { await room.disconnect(); return; }
      try {
        const prepared = await microphone;
        if (attempt !== generation.current) { prepared.track?.stop(); await room.disconnect(); return; }
        if (!prepared.track) throw prepared.error;
        await room.localParticipant.publishTrack(prepared.track, { source: Track.Source.Microphone });
        if (preparingMicRef.current === prepared.track) preparingMicRef.current = null;
        if (attempt !== generation.current) { await room.disconnect(); return; }
        setMuted(false);
        startMeter(room);
        void refreshMics(room);
      } catch {
        // Mic denied or unavailable: they can still listen. Not fatal.
        capturedMic?.stop();
        if (preparingMicRef.current === capturedMic) preparingMicRef.current = null;
        if (attempt !== generation.current) return;
        setMuted(true);
        setMicIssue("Your microphone is blocked. Allow the mic for this site in your browser settings, then tap the mic button.");
      }
      setPhase("live");
    } catch (e) {
      cancelCapture = true;
      capturedMic?.stop();
      if (preparingMicRef.current === capturedMic) preparingMicRef.current = null;
      if (attempt !== generation.current) return;
      await roomRef.current?.disconnect();
      roomRef.current = null;
      setError(e instanceof Error ? e.message : "Could not connect.");
      setConnectionIssue(null);
      setPhase("error");
    }
  }, [persona, difficultyStage, ensureAudioEl, flushDisplay, settlePendingFallbacks, practice, startMeter, refreshMics]);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !muted;
    try {
      await room.localParticipant.setMicrophoneEnabled(!next);
      setMuted(next);
      setMicIssue(null);
      if (!next) startMeter(room);
      else stopMeter();
    } catch {
      setMuted(true);
      setMicIssue("Your microphone is blocked. Allow the mic for this site in your browser settings, then tap the mic button.");
    }
  }, [muted, startMeter, stopMeter]);

  const recordTranscript = useCallback(() => [...rawRef.current], []);
  const recordDisplayTranscript = useCallback(() => [...displayRef.current], []);

  const requestControl = useCallback(async (action: string) => {
    const room = roomRef.current;
    if (!room) return false;
    const previous = controls.current.get(action);
    if (previous) { clearTimeout(previous.timer); previous.resolve(false); }
    const acknowledged = new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => { controls.current.delete(action); resolve(false); }, 10000);
      controls.current.set(action, { resolve, timer });
    });
    try {
      await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ action })), { reliable: true, topic: "maatu.control" });
      return await acknowledged;
    } catch {
      const pending = controls.current.get(action);
      if (pending) { clearTimeout(pending.timer); pending.resolve(false); controls.current.delete(action); }
      return false;
    }
  }, []);
  const requestSlowDown = useCallback(() => requestControl("slow-down"), [requestControl]);
  const requestHelp = useCallback((action: "repeat" | "explain" | "pause" | "resume") => requestControl(action), [requestControl]);

  useEffect(() => {
    if (phase === "ended" || phase === "error") stopMeter();
  }, [phase, stopMeter]);

  useEffect(() => {
    return () => {
      generation.current += 1;
      preparingMicRef.current?.stop();
      preparingMicRef.current = null;
      for (const request of controls.current.values()) { clearTimeout(request.timer); request.resolve(false); }
      controls.current.clear();
      stopMeter();
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
    connectionIssue,
    endedUnexpectedly,
    connect,
    hangUp,
    toggleMute,
    unlockAudio,
    requestSlowDown,
    requestHelp,
    micLevel,
    micSilent,
    mics,
    micId,
    switchMic,
    recordTranscript,
    recordDisplayTranscript,
  };
}
