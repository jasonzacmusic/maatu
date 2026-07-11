// A distinct environmental backdrop for each scenario's Call screen, so every
// call feels like a different place. Bottom-anchored, sits behind the voice UI.
// Reuses the Night Bazaar motifs. No em dashes anywhere.

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <div className="absolute -top-24 -left-16 w-80 h-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,179,92,0.16), transparent 65%)" }} />
      <svg viewBox="0 0 390 844" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax slice">
        <rect x="0" y="700" width="390" height="144" fill="#0E1017" />
        {children}
      </svg>
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(12,16,29,0.2), rgba(12,16,29,0.75) 55%, rgba(12,16,29,0.92))" }} />
    </div>
  );
}

export default function CallBackdrop({ scenario }: { scenario: string }) {
  switch (scenario) {
    case "auto":
      return (
        <Frame>
          <g opacity="0.85" transform="translate(18,600)">
            <rect x="0" y="20" width="150" height="96" rx="26" fill="#0A0D18" stroke="#1D2438" strokeWidth="2" />
            <rect x="4" y="20" width="142" height="16" rx="8" fill="#211E12" />
            <rect x="20" y="44" width="46" height="40" rx="3" fill="#FFD9A0" opacity="0.14" />
            <circle cx="34" cy="118" r="18" fill="#060810" stroke="#1D2438" strokeWidth="3" />
            <circle cx="116" cy="118" r="18" fill="#060810" stroke="#1D2438" strokeWidth="3" />
            <circle cx="4" cy="78" r="6" fill="#FFD9A0" opacity="0.6" />
          </g>
          <rect x="286" y="96" width="86" height="4" rx="2" fill="#E9FFF4" opacity="0.35" />
        </Frame>
      );
    case "delivery":
      return (
        <Frame>
          {/* apartment gate with a bulb and waiting parcels */}
          <line x1="120" y1="574" x2="120" y2="582" stroke="#232B44" strokeWidth="2" />
          <circle cx="120" cy="586" r="6" fill="#FFD9A0" opacity="0.85" />
          <polygon points="120,586 70,720 170,720" fill="#FFB35C" opacity="0.06" />
          <rect x="60" y="600" width="120" height="120" fill="#10141F" stroke="#313B5C" strokeWidth="2" />
          <g stroke="#313B5C" strokeWidth="2">
            <line x1="80" y1="600" x2="80" y2="720" />
            <line x1="100" y1="600" x2="100" y2="720" />
            <line x1="120" y1="600" x2="120" y2="720" />
            <line x1="140" y1="600" x2="140" y2="720" />
            <line x1="160" y1="600" x2="160" y2="720" />
            <line x1="60" y1="650" x2="180" y2="650" />
          </g>
          <g transform="translate(250,650)">
            <rect x="0" y="30" width="52" height="36" rx="2" fill="#8A6A3B" />
            <rect x="10" y="0" width="36" height="30" rx="2" fill="#7A5C33" />
            <line x1="26" y1="30" x2="26" y2="66" stroke="#B99A5F" strokeWidth="3" />
            <line x1="28" y1="0" x2="28" y2="30" stroke="#B99A5F" strokeWidth="3" />
          </g>
        </Frame>
      );
    case "care":
      return (
        <Frame>
          {/* STD ISD PCO phone booth */}
          <rect x="120" y="560" width="150" height="160" rx="4" fill="#131828" stroke="#2B3552" strokeWidth="2" />
          <rect x="132" y="574" width="126" height="40" rx="2" fill="#E8E3D5" opacity="0.9" />
          <text x="195" y="600" textAnchor="middle" fill="#E8503A" style={{ fontFamily: "'Anek Latin',sans-serif", fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>
            STD ISD PCO
          </text>
          <rect x="150" y="628" width="90" height="80" rx="3" fill="#FFD9A0" opacity="0.12" />
          <line x1="195" y1="628" x2="195" y2="708" stroke="#2B3552" strokeWidth="2" />
        </Frame>
      );
    case "airport":
      return (
        <Frame>
          {/* plane silhouette + runway lights */}
          <g transform="translate(120,610)" fill="#0A0D18" stroke="#1D2438" strokeWidth="2">
            <ellipse cx="80" cy="60" rx="90" ry="20" />
            <polygon points="60,55 20,20 34,20 90,50" />
            <polygon points="60,65 20,100 34,100 90,70" />
            <polygon points="150,55 176,30 182,42 168,60" />
          </g>
          <g fill="#FFB35C" opacity="0.6">
            <circle cx="60" cy="740" r="3" />
            <circle cx="130" cy="742" r="3" />
            <circle cx="200" cy="742" r="3" />
            <circle cx="270" cy="742" r="3" />
            <circle cx="330" cy="740" r="3" />
          </g>
        </Frame>
      );
    case "chai":
      return (
        <Frame>
          {/* chai stall: awning, counter, steam, glasses */}
          <rect x="70" y="588" width="250" height="18" fill="#A33B2C" />
          <g fill="#DDD3BC">
            <rect x="86" y="588" width="16" height="18" />
            <rect x="118" y="588" width="16" height="18" />
            <rect x="150" y="588" width="16" height="18" />
            <rect x="182" y="588" width="16" height="18" />
            <rect x="214" y="588" width="16" height="18" />
            <rect x="246" y="588" width="16" height="18" />
            <rect x="278" y="588" width="16" height="18" />
          </g>
          <rect x="80" y="620" width="230" height="70" fill="#232B40" />
          <g fill="#FFD9A0" opacity="0.85">
            <rect x="110" y="626" width="8" height="14" rx="1" />
            <rect x="124" y="626" width="8" height="14" rx="1" />
            <rect x="138" y="626" width="8" height="14" rx="1" />
          </g>
          <g fill="#DDE8F0" opacity="0.28">
            <circle cx="210" cy="612" r="7" className="mt-steam" />
            <circle cx="204" cy="608" r="5" className="mt-steam mt-d2" />
            <circle cx="216" cy="604" r="5" className="mt-steam mt-d3" />
          </g>
        </Frame>
      );
    case "teach":
      return (
        <Frame>
          {/* warm music-room window with a shruti box and notes */}
          <rect x="110" y="590" width="170" height="120" rx="3" fill="#241B0F" stroke="#3A2E17" strokeWidth="2" />
          <rect x="126" y="606" width="138" height="88" rx="2" fill="#FFD9A0" opacity="0.16" />
          <g transform="translate(150,636)">
            <rect x="0" y="0" width="90" height="40" rx="3" fill="#40270F" />
            <line x1="18" y1="0" x2="18" y2="40" stroke="#2A1A08" strokeWidth="3" />
            <line x1="36" y1="0" x2="36" y2="40" stroke="#2A1A08" strokeWidth="3" />
            <line x1="54" y1="0" x2="54" y2="40" stroke="#2A1A08" strokeWidth="3" />
            <line x1="72" y1="0" x2="72" y2="40" stroke="#2A1A08" strokeWidth="3" />
          </g>
          <g fill="#FFB35C" opacity="0.55">
            <circle cx="300" cy="600" r="5" />
            <rect x="303" y="576" width="2.5" height="26" />
            <circle cx="326" cy="620" r="5" />
            <rect x="329" y="596" width="2.5" height="26" />
          </g>
        </Frame>
      );
    default:
      return (
        <Frame>
          <rect x="0" y="0" width="390" height="844" fill="none" />
        </Frame>
      );
  }
}
