/** Hand-drawn SVG illustrations for the home page: how rat fever (leptospirosis) reaches people. */

const SKIN = "#a16207";
const RAT = "#6b7280";
const RAT_DARK = "#4b5563";
const GERM = "#0f766e";

/** A rat facing right, centred on its body. */
function Rat({ x, y, s = 1, flip = false }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path d="M-30 4 C-48 10 -56 -8 -74 -2" stroke="#9ca3af" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="0" cy="0" rx="32" ry="17" fill={RAT} />
      <ellipse cx="2" cy="7" rx="22" ry="7" fill="#9ca3af" opacity="0.45" />
      <path d="M18 -12 C34 -15 46 -4 53 4 C45 11 30 12 18 10 Z" fill={RAT} />
      <circle cx="25" cy="-14" r="7.5" fill={RAT} />
      <circle cx="25" cy="-14" r="4.2" fill="#f9a8d4" />
      <circle cx="38" cy="-3" r="2.3" fill="#111827" />
      <circle cx="53" cy="4" r="2.6" fill="#f472b6" />
      <path d="M50 6 L62 3 M50 7 L62 9 M49 8 L59 13" stroke="#374151" strokeWidth="0.9" strokeLinecap="round" />
      <ellipse cx="-17" cy="16" rx="6" ry="3" fill={RAT_DARK} />
      <ellipse cx="15" cy="16" rx="6" ry="3" fill={RAT_DARK} />
    </g>
  );
}

/** Leptospira: a thin spiral with hooked ends. */
function Germ({ x, y, r = 0, s = 1, color = GERM }) {
  return (
    <g className="ill-germ" transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path d="M-2 -3 Q-4 0 0 0 q2.5 -4 5 0 t5 0 t5 0 t5 0 t5 0 t5 0 q4 0 2 3"
        stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Tuft({ x, y, s = 1 }) {
  return (
    <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 0 L-6 -15 M0 0 L-1 -20 M0 0 L5 -16 M0 0 L9 -10"
      stroke="#65a30d" strokeWidth="2.4" strokeLinecap="round" fill="none" />
  );
}

function Rain({ drops, len = 12 }) {
  return (
    <g className="ill-rain" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" opacity="0.8">
      {drops.map(([x, y], i) => <line key={i} x1={x} y1={y} x2={x - 3} y2={y + len} style={{ animationDelay: `${(i % 5) * 0.2}s` }} />)}
    </g>
  );
}

function Cloud({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#94a3b8">
      <circle cx="0" cy="8" r="16" /><circle cx="22" cy="0" r="22" /><circle cx="48" cy="8" r="17" />
      <rect x="-14" y="8" width="78" height="16" rx="8" />
    </g>
  );
}

/** The big scene: monsoon rain on a flooded paddy field, a rat on the bank, a farmer planting, bacteria in the water. */
export function FieldScene() {
  const drops = [];
  for (let i = 0; i < 26; i++) drops.push([30 + ((i * 53) % 430), 70 + ((i * 37) % 80)]);
  return (
    <svg className="ill ill-scene" viewBox="0 0 480 300" role="img"
      aria-label="Rain on a flooded paddy field. A rat sits on the muddy bank and a farmer plants rice in the water, where the spiral-shaped bacteria live.">
      <defs>
        <linearGradient id="ill-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cbd5e1" /><stop offset="1" stopColor="#e0f2fe" /></linearGradient>
        <linearGradient id="ill-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7dd3fc" /><stop offset="1" stopColor="#0ea5e9" /></linearGradient>
      </defs>
      <rect width="480" height="300" fill="url(#ill-sky)" />
      <path d="M0 150 Q70 112 150 138 T300 128 T480 140 V190 H0 Z" fill="#a7c4a0" />
      <path d="M0 170 Q120 150 240 166 T480 160 V200 H0 Z" fill="#86b06b" />
      {[30, 70, 110, 150, 190, 230, 270, 310, 350, 390, 430, 470].map((x) => <Tuft key={x} x={x} y={196} s={0.7} />)}
      <Cloud x={70} y={28} s={1.1} /><Cloud x={300} y={20} s={1.25} />
      <Rain drops={drops} />
      <rect x="0" y="198" width="480" height="102" fill="url(#ill-water)" />
      {/* farmer: legs under the water line */}
      <rect x="318" y="196" width="9" height="40" rx="4" fill="#1e3a8a" />
      <rect x="334" y="196" width="9" height="40" rx="4" fill="#1e3a8a" />
      <rect x="0" y="198" width="480" height="102" fill="url(#ill-water)" opacity="0.72" />
      <path d="M312 152 Q330 145 348 152 L352 202 L308 202 Z" fill="#2563eb" />
      <path d="M346 158 L364 186" stroke={SKIN} strokeWidth="7" strokeLinecap="round" />
      <path d="M314 158 L298 184" stroke={SKIN} strokeWidth="7" strokeLinecap="round" />
      <path d="M366 188 l-4 -14 M366 188 l2 -15 M366 188 l7 -11" stroke="#65a30d" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="330" cy="138" r="11" fill={SKIN} />
      <path d="M298 132 L330 110 L362 132 Q330 138 298 132 Z" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />
      {/* ripples and rice in the water */}
      {[[60, 222], [200, 240], [270, 214], [420, 232], [380, 268], [130, 276]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="16" ry="3" fill="none" stroke="#e0f2fe" strokeWidth="1.5" opacity="0.8" />
      ))}
      {[[180, 214], [230, 226], [400, 216], [450, 246], [260, 262]].map(([x, y], i) => <Tuft key={i} x={x} y={y} s={0.8} />)}
      {/* muddy bank with the rat */}
      <path d="M0 238 Q60 220 150 240 Q170 252 160 300 H0 Z" fill="#92400e" />
      <path d="M0 246 Q60 230 140 246" stroke="#b45309" strokeWidth="3" fill="none" opacity="0.6" />
      <Rat x={72} y={222} s={0.95} />
      <path d="M40 236 q6 10 18 16" stroke="#fde047" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.85" />
      {/* bacteria */}
      <Germ x={170} y={262} r={-10} s={1.2} /><Germ x={214} y={282} r={8} s={1.1} /><Germ x={250} y={248} r={-4} s={1.3} />
      <Germ x={290} y={276} r={12} s={1.1} /><Germ x={350} y={250} r={-14} s={1.2} /><Germ x={410} y={286} r={4} s={1} />
      <g transform="translate(356 262)">
        <rect x="0" y="0" width="112" height="26" rx="13" fill="#fff" opacity="0.92" />
        <Germ x={10} y={13} s={0.9} />
        <text x="48" y="17" fontSize="10.5" fontFamily="Inter, system-ui, sans-serif" fill="#0f172a">Leptospira</text>
      </g>
    </svg>
  );
}

const CARD_BG = { rat: "#f1f5f9", water: "#e0f2fe", skin: "#fef3c7", protect: "#dcfce7" };

/** Small illustration for each of the four "how it spreads" cards. */
export function SpreadArt({ kind }) {
  return (
    <svg className="ill ill-card" viewBox="0 0 200 110" aria-hidden="true">
      <rect width="200" height="110" fill={CARD_BG[kind]} />
      {kind === "rat" && (
        <>
          <rect x="0" y="92" width="200" height="18" fill="#d6d3d1" />
          <Rat x={112} y={76} s={1.05} />
          <path d="M80 82 q-4 8 -12 12" stroke="#facc15" strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="58" cy="97" rx="18" ry="4" fill="#fde68a" />
          <Germ x={30} y={40} r={-15} s={1.3} /><Germ x={150} y={26} r={10} s={1.1} /><Germ x={44} y={66} r={20} s={1} />
        </>
      )}
      {kind === "water" && (
        <>
          <Cloud x={22} y={8} s={0.7} /><Cloud x={130} y={4} s={0.75} />
          <Rain drops={[[30, 34], [52, 40], [74, 30], [150, 36], [170, 30], [190, 42], [110, 44]]} len={10} />
          <rect x="70" y="46" width="62" height="44" fill="#fde68a" />
          <path d="M62 50 L101 24 L140 50 Z" fill="#b45309" />
          <rect x="94" y="62" width="14" height="26" fill="#92400e" />
          <rect x="0" y="72" width="200" height="38" fill="#38bdf8" opacity="0.88" />
          <path d="M0 74 q12 -5 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0" stroke="#e0f2fe" strokeWidth="2" fill="none" />
          <Germ x={30} y={94} r={-8} s={1.1} color="#134e4a" /><Germ x={140} y={98} r={10} s={1.1} color="#134e4a" />
        </>
      )}
      {kind === "skin" && (
        <>
          <path d="M84 0 H112 L114 70 Q144 74 152 88 L152 110 H82 Z" fill={SKIN} />
          <path d="M80 0 H116 L115 22 H81 Z" fill="#1d4ed8" />
          <rect x="79" y="18" width="38" height="7" rx="3" fill="#1e40af" />
          <path d="M98 34 q6 4 4 12" stroke="#854d0e" strokeWidth="1.4" fill="none" opacity="0.6" />
          <rect x="0" y="60" width="200" height="50" fill="#78350f" opacity="0.62" />
          <path d="M96 76 l10 -6 M98 80 l10 -6" stroke="#dc2626" strokeWidth="2.6" strokeLinecap="round" />
          <Germ x={44} y={78} r={-6} s={1.2} color="#ccfbf1" /><Germ x={60} y={98} r={14} s={1.1} color="#ccfbf1" />
          <Germ x={150} y={70} r={168} s={1.1} color="#ccfbf1" />
          <path d="M72 84 l14 -6" stroke="#fef3c7" strokeWidth="1.6" strokeDasharray="3 3" />
          <path d="M138 66 l-20 6" stroke="#fef3c7" strokeWidth="1.6" strokeDasharray="3 3" />
        </>
      )}
      {kind === "protect" && (
        <>
          <rect x="0" y="94" width="200" height="16" fill="#bbf7d0" />
          <path d="M34 16 H66 V74 Q66 80 72 82 L92 88 Q100 91 100 100 V102 H34 Z" fill="#166534" />
          <rect x="30" y="12" width="40" height="9" rx="3" fill="#14532d" />
          <g fill="#facc15" stroke="#ca8a04" strokeWidth="1.2">
            <rect x="110" y="46" width="34" height="40" rx="9" />
            <rect x="110" y="22" width="8" height="30" rx="4" /><rect x="119" y="17" width="8" height="34" rx="4" />
            <rect x="128" y="19" width="8" height="32" rx="4" /><rect x="137" y="25" width="7" height="27" rx="3.5" />
            <rect x="96" y="52" width="20" height="9" rx="4.5" transform="rotate(-35 106 56)" />
            <rect x="108" y="84" width="38" height="12" rx="3" />
          </g>
          <circle cx="172" cy="34" r="17" fill="#fff" stroke="#dc2626" strokeWidth="2" />
          <path d="M172 24 V44 M162 34 H182" stroke="#dc2626" strokeWidth="5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
