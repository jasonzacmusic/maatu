"use client";

import type { ReactNode } from "react";
import { STREET_LANG, LABELS, type Lang, type ShopId } from "@/lib/maatu-design";

// The Street: one layered SVG night scene, re-dressable per language. Ported
// from Claude Design's street-scene.jsx. No em dashes anywhere.

const N = {
  night: "#0C101D",
  tar: "#161B2B",
  milk: "#F2EDE2",
  sodium: "#FFB35C",
  kumkum: "#E8503A",
  tube: "#BFEFDB",
  frame: "#232B44",
  wire: "#2A3148",
  mutedTx: "#7E89A8",
  unlit: "#5A6480",
  facadeA: "#1A2033",
  facadeB: "#1B1F31",
  facadeC: "#191E30",
  facadeD: "#1D2233",
  facadeE: "#1A1F33",
  facadeLocked: "#151928",
  glass: "#FFD9A0",
  warmTx: "#FFC97E",
};

// Which shops are lit in the illustration. The world always looks full; whether
// a tap starts a real call is decided by LIVE in maatu-design.ts.
const SCENE_LIVE: Record<ShopId, boolean> = {
  auto: true,
  chai: true,
  gate: true,
  phone: true,
  music: true,
  airport: true,
  salon: false,
  market: false,
};

function Label({ x, y, text, anchor }: { x: number; y: number; text: string; anchor?: "middle" | "start" | "end" }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor || "middle"}
      fill={N.mutedTx}
      style={{ fontFamily: "'Anek Latin',sans-serif", fontSize: 8, fontWeight: 600, letterSpacing: 2 }}
    >
      {text}
    </text>
  );
}

function Win({ x, y, w = 22, h = 18, lit }: { x: number; y: number; w?: number; h?: number; lit: boolean }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={2}
        fill={lit ? N.glass : "#10141F"}
        opacity={lit ? 0.9 : 1}
        stroke={N.frame}
        strokeWidth="1"
        filter={lit ? "url(#glo2)" : undefined}
      />
      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={lit ? "#B57F35" : N.frame} strokeWidth="1" />
    </g>
  );
}

function Shutter({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const slats = [];
  for (let i = 1; i < 6; i++) {
    slats.push(
      <line key={i} x1={x} y1={y + (h * i) / 6} x2={x + w} y2={y + (h * i) / 6} stroke="#232A40" strokeWidth="1.5" />,
    );
  }
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#12172A" stroke={N.frame} strokeWidth="1" />
      {slats}
      <rect x={x} y={y + h - 5} width={w} height={5} fill="#0E1220" />
    </g>
  );
}

function SoonBoard({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`rotate(-5 ${x + 17} ${y + 7})`}>
      <rect x={x} y={y} width={34} height={14} rx={2} fill="#D9CDA8" opacity="0.92" />
      <text
        x={x + 17}
        y={y + 10}
        textAnchor="middle"
        fill="#6B5232"
        style={{ fontFamily: "'Anek Latin',sans-serif", fontSize: 7.5, fontWeight: 700, letterSpacing: 1 }}
      >
        SOON
      </text>
    </g>
  );
}

function Shop({
  id,
  live,
  label,
  onEnter,
  onLocked,
  children,
  ring,
  wiggling,
}: {
  id: ShopId;
  live: boolean;
  label: string;
  onEnter?: (id: ShopId) => void;
  onLocked?: (id: ShopId) => void;
  children: ReactNode;
  ring: [number, number, number, number];
  wiggling?: boolean;
}) {
  const handle = () => (live ? onEnter && onEnter(id) : onLocked && onLocked(id));
  return (
    <g
      className={"mtshop" + (wiggling ? " mt-wiggle" : "")}
      role="button"
      tabIndex={0}
      aria-label={live ? `Enter ${label}` : `${label}, opening soon`}
      aria-disabled={live ? undefined : true}
      style={{ cursor: "pointer", outline: "none" }}
      onClick={handle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handle();
        }
      }}
    >
      {children}
      <rect
        className="mtring"
        x={ring[0]}
        y={ring[1]}
        width={ring[2]}
        height={ring[3]}
        rx={10}
        fill="none"
        stroke={N.tube}
        strokeWidth="2"
        strokeDasharray="6 5"
        opacity="0"
        pointerEvents="none"
      />
    </g>
  );
}

export default function StreetScene({
  lang = "kn",
  streak = 3,
  onEnter,
  onLocked,
  reduceMotion = false,
  wiggleId = null,
}: {
  lang?: Lang;
  streak?: number;
  onEnter?: (id: ShopId) => void;
  onLocked?: (id: ShopId) => void;
  reduceMotion?: boolean;
  wiggleId?: ShopId | null;
}) {
  const L = STREET_LANG[lang] || STREET_LANG.kn;
  const s = L.s;
  const shopFont = L.shopFont;
  const busFont = L.busFont;
  const lit = (n: number) => streak >= n;

  return (
    <svg
      viewBox="0 0 390 780"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMax slice"
      className={reduceMotion ? "mt-still" : undefined}
      aria-label={`Night street, ${L.city}`}
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={L.sky1} />
          <stop offset="1" stopColor={L.sky2} />
        </linearGradient>
        <linearGradient id="doorGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={N.warmTx} stopOpacity="0.7" />
          <stop offset="1" stopColor="#7A4A1E" stopOpacity="0.22" />
        </linearGradient>
        <filter id="glo2" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glo5" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="blur6">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="blur3">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <pattern id="awn" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="8" height="16" fill="#A33B2C" />
          <rect x="8" width="8" height="16" fill="#DDD3BC" />
        </pattern>
      </defs>

      {/* Sky, stars, horizon light pollution */}
      <rect x="0" y="0" width="390" height="780" fill="url(#sky)" />
      <g fill="#9FB0D8">
        <circle cx="38" cy="44" r="1" opacity="0.55" />
        <circle cx="92" cy="76" r="0.8" opacity="0.4" />
        <circle cx="150" cy="38" r="1.1" opacity="0.5" />
        <circle cx="236" cy="62" r="0.8" opacity="0.45" />
        <circle cx="300" cy="34" r="1" opacity="0.55" />
        <circle cx="348" cy="88" r="0.9" opacity="0.4" />
        <circle cx="196" cy="90" r="0.7" opacity="0.35" />
        <circle cx="264" cy="104" r="0.8" className="mt-blinkslow" opacity="0.5" />
      </g>
      <ellipse cx="195" cy="205" rx="90" ry="26" fill={L.glow} opacity="0.13" filter="url(#blur6)" />

      {/* Road receding to the airport at the far end */}
      <polygon points="165,206 225,206 390,780 0,780" fill="#12141E" />
      <polygon points="165,206 168,206 30,780 0,780" fill="#0E1017" />
      <polygon points="222,206 225,206 390,780 360,780" fill="#0E1017" />
      <g fill="#2A3148">
        <rect x="193" y="248" width="3" height="10" rx="1.5" />
        <rect x="192" y="322" width="5" height="16" rx="2" />
        <rect x="191" y="428" width="7" height="24" rx="3" />
        <rect x="189" y="556" width="9" height="34" rx="4" />
        <rect x="187" y="700" width="11" height="44" rx="5" />
      </g>

      {/* Passing auto, headlights up the road. Ambient loop. */}
      <g className="mt-drive" opacity="0">
        <rect x="-14" y="-10" width="28" height="16" rx="5" fill="#0A0D18" />
        <circle cx="-9" cy="7" r="3.4" fill="#FFEBC4" filter="url(#glo2)" />
        <circle cx="9" cy="7" r="3.4" fill="#FFEBC4" filter="url(#glo2)" />
      </g>

      {/* Airport gantry at the vanishing point */}
      <Shop id="airport" live={SCENE_LIVE.airport} label={LABELS.airport} onEnter={onEnter} onLocked={onLocked} ring={[138, 108, 114, 84]} wiggling={wiggleId === "airport"}>
        <line x1="195" y1="142" x2="195" y2="116" stroke={N.frame} strokeWidth="2" />
        <circle cx="195" cy="114" r="2.6" fill={N.kumkum} className="mt-blink" filter="url(#glo2)" />
        <rect x="148" y="150" width="4" height="56" fill="#20263C" />
        <rect x="238" y="150" width="4" height="56" fill="#20263C" />
        <rect x="144" y="142" width="102" height="27" rx="2" fill="#0D1426" stroke="#263258" strokeWidth="1" />
        <text x="195" y="158" textAnchor="middle" fill="#F7D774" filter="url(#glo2)" style={{ fontFamily: busFont, fontSize: lang === "kn" ? 10 : 11, fontWeight: 600 }}>
          {s.airport}
        </text>
        <Label x={195} y={166.5} text={LABELS.airport} />
      </Shop>

      {/* Far left: two locked shopfronts */}
      <g transform="translate(14,206)">
        <Shop id="salon" live={false} label={LABELS.salon} onLocked={onLocked} ring={[-3, 2, 68, 90]} wiggling={wiggleId === "salon"}>
          <rect x="0" y="6" width="62" height="86" fill={N.facadeLocked} />
          <rect x="0" y="6" width="62" height="7" fill="#1B2136" />
          <rect x="4" y="18" width="54" height="20" rx="2" fill="#1C2130" stroke="#232A40" strokeWidth="1" />
          <text x="31" y="32.5" textAnchor="middle" fill={N.unlit} style={{ fontFamily: shopFont, fontSize: 12, fontWeight: 600 }}>
            {s.salon}
          </text>
          <Shutter x={8} y={46} w={46} h={44} />
          <SoonBoard x={14} y={58} />
        </Shop>
        <Shop id="market" live={false} label={LABELS.market} onLocked={onLocked} ring={[65, 2, 68, 90]} wiggling={wiggleId === "market"}>
          <rect x="68" y="6" width="62" height="86" fill={N.facadeLocked} />
          <rect x="68" y="6" width="62" height="7" fill="#1B2136" />
          <rect x="72" y="18" width="54" height="20" rx="2" fill="#1C2130" stroke="#232A40" strokeWidth="1" />
          <text x="99" y="32.5" textAnchor="middle" fill={N.unlit} style={{ fontFamily: shopFont, fontSize: lang === "ta" ? 9 : 11, fontWeight: 600 }}>
            {s.market}
          </text>
          <Shutter x={76} y={46} w={46} h={44} />
          <SoonBoard x={82} y={58} />
        </Shop>
      </g>

      {/* Far right: music school with a shruti box in a warm window */}
      <g transform="translate(252,206)">
        <Shop id="music" live={SCENE_LIVE.music} label={LABELS.music} onEnter={onEnter} onLocked={onLocked} ring={[-4, 0, 138, 96]} wiggling={wiggleId === "music"}>
          <rect x="0" y="2" width="130" height="90" fill={N.facadeE} />
          <rect x="0" y="2" width="130" height="8" fill="#232B44" />
          <rect x="10" y="14" width="110" height="24" rx="2" fill="#241B0F" stroke="#3A2E17" strokeWidth="1" />
          <text x="65" y="31.5" textAnchor="middle" fill={N.warmTx} filter="url(#glo2)" style={{ fontFamily: shopFont, fontSize: 15, fontWeight: 700 }}>
            {s.music}
          </text>
          <rect x="16" y="46" width="54" height="40" rx="2" fill={N.glass} opacity="0.75" filter="url(#glo2)" />
          <rect x="16" y="46" width="54" height="40" rx="2" fill="none" stroke="#B57F35" strokeWidth="1.5" />
          <g>
            <rect x="26" y="62" width="34" height="17" rx="2" fill="#40270F" />
            <line x1="34" y1="62" x2="34" y2="79" stroke="#2A1A08" strokeWidth="2" />
            <line x1="42" y1="62" x2="42" y2="79" stroke="#2A1A08" strokeWidth="2" />
            <line x1="50" y1="62" x2="50" y2="79" stroke="#2A1A08" strokeWidth="2" />
          </g>
          <Win x={86} y={52} w={22} h={18} lit={lit(3)} />
          <Label x={65} y={90} text={LABELS.music} />
        </Shop>
      </g>

      {/* Overhead wire with a bulb string */}
      <path d="M0,296 Q195,314 390,292" fill="none" stroke={N.wire} strokeWidth="1.2" />
      <g filter="url(#glo2)">
        <circle cx="44" cy="302" r="2.4" fill={L.bulb} />
        <circle cx="104" cy="307" r="2.4" fill={L.bulb} />
        <circle cx="164" cy="310" r="2.4" fill={L.bulb} />
        <circle cx="226" cy="309" r="2.4" fill={L.bulb} className="mt-blink" />
        <circle cx="288" cy="305" r="2.4" fill={L.bulb} />
        <circle cx="348" cy="299" r="2.4" fill={L.bulb} />
      </g>

      {/* Mid left: STD booth, customer care */}
      <g transform="translate(6,306)">
        <Shop id="phone" live={SCENE_LIVE.phone} label={LABELS.phone} onEnter={onEnter} onLocked={onLocked} ring={[-2, 2, 154, 148]} wiggling={wiggleId === "phone"}>
          <rect x="0" y="6" width="148" height="140" fill={N.facadeC} />
          <rect x="0" y="6" width="148" height="9" fill="#232B44" />
          <Win x={14} y={22} lit={lit(1)} />
          <Win x={48} y={22} lit={lit(2)} />
          <Win x={82} y={22} lit={false} />
          <rect x="10" y="52" width="104" height="27" rx="2" fill="#E8E3D5" filter="url(#glo2)" />
          <text x="62" y="65" textAnchor="middle" fill={N.kumkum} style={{ fontFamily: "'Anek Latin',sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: 1.5 }}>
            STD ISD PCO
          </text>
          <text x="62" y="75.5" textAnchor="middle" fill="#3A4358" style={{ fontFamily: shopFont, fontSize: 8.5, fontWeight: 600 }}>
            {s.phone}
          </text>
          <rect x="96" y="76" width="44" height="70" rx="3" fill="#131828" stroke="#2B3552" strokeWidth="1.5" />
          <rect x="102" y="82" width="32" height="46" rx="2" fill={N.glass} opacity="0.3" />
          <line x1="118" y1="82" x2="118" y2="128" stroke="#2B3552" strokeWidth="1.5" />
          <rect x="14" y="92" width="62" height="54" fill="url(#doorGrad)" opacity="0.55" />
          <Label x={62} y={90} text={LABELS.phone} />
        </Shop>
      </g>

      {/* Mid right: delivery gate */}
      <g transform="translate(238,306)">
        <Shop id="gate" live={SCENE_LIVE.gate} label={LABELS.gate} onEnter={onEnter} onLocked={onLocked} ring={[-2, 0, 152, 150]} wiggling={wiggleId === "gate"}>
          <rect x="20" y="4" width="110" height="54" fill="#171C2C" />
          <Win x={26} y={12} w={18} h={15} lit={lit(2)} />
          <Win x={106} y={12} w={18} h={15} lit={false} />
          <rect x="48" y="10" width="54" height="21" rx="2" fill="#241B0F" stroke="#3A2E17" strokeWidth="1" />
          <text x="75" y="25.5" textAnchor="middle" fill={N.warmTx} filter="url(#glo2)" style={{ fontFamily: shopFont, fontSize: 13, fontWeight: 700 }}>
            {s.gate}
          </text>
          <rect x="0" y="54" width="148" height="6" fill="#2A3148" />
          <rect x="0" y="60" width="148" height="86" fill={N.facadeD} />
          <rect x="44" y="68" width="60" height="78" fill="#10141F" stroke="#313B5C" strokeWidth="2" />
          <g stroke="#313B5C" strokeWidth="2">
            <line x1="52" y1="68" x2="52" y2="146" />
            <line x1="62" y1="68" x2="62" y2="146" />
            <line x1="72" y1="68" x2="72" y2="146" />
            <line x1="82" y1="68" x2="82" y2="146" />
            <line x1="92" y1="68" x2="92" y2="146" />
            <line x1="44" y1="100" x2="104" y2="100" />
          </g>
          <line x1="74" y1="60" x2="74" y2="64" stroke={N.frame} strokeWidth="1.5" />
          <circle cx="74" cy="66" r="4" fill={N.glass} filter="url(#glo5)" />
          <polygon points="74,66 56,118 92,118" fill={N.sodium} opacity="0.08" />
          <g>
            <rect x="112" y="128" width="20" height="14" rx="1" fill="#8A6A3B" />
            <rect x="116" y="114" width="15" height="13" rx="1" fill="#7A5C33" />
            <line x1="122" y1="128" x2="122" y2="142" stroke="#B99A5F" strokeWidth="1.5" />
          </g>
          <Label x={75} y={41} text={LABELS.gate} />
        </Shop>
      </g>

      {/* Street lamp between the rows */}
      <g>
        <rect x="166" y="392" width="3" height="86" fill="#232B44" />
        <line x1="167" y1="392" x2="176" y2="392" stroke="#232B44" strokeWidth="3" />
        <circle cx="177" cy="394" r="4.2" fill={N.sodium} filter="url(#glo5)" />
        <polygon points="177,394 152,474 202,474" fill={N.sodium} opacity="0.07" />
      </g>

      {/* Second bulb string over the near row */}
      <path d="M0,468 Q195,488 390,464" fill="none" stroke={N.wire} strokeWidth="1.2" />
      <g filter="url(#glo2)">
        <circle cx="52" cy="475" r="2.4" fill={L.bulb} />
        <circle cx="126" cy="481" r="2.4" fill={L.bulb} />
        <circle cx="196" cy="483" r="2.4" fill={L.bulb} />
        <circle cx="268" cy="479" r="2.4" fill={L.bulb} className="mt-blinkslow" />
        <circle cx="338" cy="471" r="2.4" fill={L.bulb} />
      </g>

      {/* Near left: the auto stand, the hero shopfront */}
      <g transform="translate(0,478)">
        <Shop id="auto" live={SCENE_LIVE.auto} label={LABELS.auto} onEnter={onEnter} onLocked={onLocked} ring={[2, 8, 168, 172]} wiggling={wiggleId === "auto"}>
          <rect x="0" y="12" width="170" height="170" fill={N.facadeA} />
          <rect x="0" y="12" width="170" height="10" fill="#232B44" />
          <rect x="12" y="30" width="132" height="36" rx="3" fill="#241B0F" stroke="#3A2E17" strokeWidth="1.5" />
          <text x="78" y="57" textAnchor="middle" fill={N.glass} filter="url(#glo5)" className="mt-breathe" style={{ fontFamily: shopFont, fontSize: 24, fontWeight: 700 }}>
            {s.auto}
          </text>
          <Label x={78} y={78} text={LABELS.auto} />
          <rect x="14" y="88" width="128" height="94" fill="url(#doorGrad)" opacity="0.8" />
          <rect x="10" y="84" width="7" height="98" fill="#10141F" />
          <rect x="140" y="84" width="7" height="98" fill="#10141F" />
          <g transform="translate(36,104)">
            <rect x="0" y="12" width="70" height="46" rx="13" fill="#0E1220" stroke="#2A3352" strokeWidth="1.5" />
            <rect x="2" y="12" width="66" height="8" rx="4" fill="#2E2A18" />
            <rect x="10" y="24" width="22" height="20" rx="2" fill={N.glass} opacity="0.28" />
            <circle cx="16" cy="60" r="9" fill="#060810" stroke="#222A44" strokeWidth="2" />
            <circle cx="54" cy="60" r="9" fill="#060810" stroke="#222A44" strokeWidth="2" />
            <circle cx="2" cy="40" r="3.2" fill={N.glass} filter="url(#glo5)" />
          </g>
        </Shop>
      </g>

      {/* Near right: chai stall */}
      <g transform="translate(222,478)">
        <Shop id="chai" live={SCENE_LIVE.chai} label={LABELS.chai} onEnter={onEnter} onLocked={onLocked} ring={[0, 8, 168, 172]} wiggling={wiggleId === "chai"}>
          <rect x="0" y="12" width="168" height="170" fill={N.facadeB} />
          <rect x="0" y="12" width="168" height="10" fill="#232B44" />
          <Win x={18} y={30} w={26} h={20} lit={lit(1)} />
          <Win x={58} y={30} w={26} h={20} lit={lit(2)} />
          <Win x={98} y={30} w={26} h={20} lit={lit(3)} />
          <rect x="14" y="62" width="122" height="5" rx="2.5" fill="#E9FFF4" filter="url(#glo5)" className="mt-flicker" />
          <rect x="12" y="74" width="118" height="30" rx="2" fill="#1F2A24" stroke="#2E4034" strokeWidth="1" />
          <text x="71" y="96" textAnchor="middle" fill="#D6FFE9" filter="url(#glo2)" style={{ fontFamily: shopFont, fontSize: 19, fontWeight: 700 }}>
            {s.chai}
          </text>
          <Label x={71} y={114} text={LABELS.chai} />
          <rect x="6" y="120" width="156" height="15" fill="url(#awn)" />
          <rect x="6" y="133" width="156" height="3" fill="#0E1220" />
          <rect x="10" y="136" width="148" height="46" fill="#232B40" />
          <circle cx="118" cy="146" r="7" fill="#0D111C" />
          <rect x="108" y="152" width="20" height="30" rx="6" fill="#0D111C" />
          <g fill={N.glass} opacity="0.9">
            <rect x="22" y="142" width="5" height="9" rx="1" />
            <rect x="30" y="142" width="5" height="9" rx="1" />
            <rect x="38" y="142" width="5" height="9" rx="1" />
            <rect x="46" y="142" width="5" height="9" rx="1" />
          </g>
          <rect x="60" y="140" width="14" height="10" rx="2" fill="#3A4358" />
          <g fill="#DDE8F0" filter="url(#blur3)">
            <circle cx="67" cy="132" r="5" className="mt-steam" opacity="0.3" />
            <circle cx="63" cy="130" r="4" className="mt-steam mt-d2" opacity="0.3" />
            <circle cx="71" cy="128" r="3.5" className="mt-steam mt-d3" opacity="0.3" />
          </g>
        </Shop>
      </g>

      {/* Foreground road edge */}
      <rect x="0" y="672" width="390" height="108" fill="#0E1017" opacity="0.4" />
    </svg>
  );
}
