import { useEffect, useRef, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { Icon } from "../icons.jsx";
import { t } from "../i18n.js";
import { LEVEL } from "../lib.js";

/** Counts up (or down) to `value` whenever it changes. */
export function AnimatedNumber({ value, duration = 0.8 }) {
  const [shown, setShown] = useState(typeof value === "number" ? value : 0);
  const from = useRef(shown);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (typeof value !== "number") return;
    if (reduce) { setShown(value); from.current = value; return; }
    const controls = animate(from.current, value, {
      duration, ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(v),
      onComplete: () => { from.current = value; },
    });
    return () => { from.current = value; controls.stop(); };
  }, [value, duration, reduce]);
  if (typeof value !== "number") return <>{value ?? "—"}</>;
  return <>{Math.round(shown)}</>;
}

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
export const rise = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

export function Status({ level, text, meaning }) {
  const I = Icon[level];
  return (
    <div className={`status ${level}`}>
      <motion.div
        className="ico"
        initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.1 }}
      >
        {level === "warning" && <span className="halo" />}
        <I />
      </motion.div>
      <div>
        <div className="lvl">{LEVEL[level]}{meaning && <span className="lvl-meaning"> · {meaning}</span>}</div>
        <div className="why">{text}</div>
      </div>
    </div>
  );
}

/** Translated text with <b>…</b> marks turned into bold, without injecting HTML. */
export function Rich({ text }) {
  return <>{text.split(/<b>(.*?)<\/b>/).map((p, i) => (i % 2 ? <b key={i}>{p}</b> : p))}</>;
}

export function Delta({ tone, children }) {
  return (
    <motion.span
      className={`delta ${tone}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.45, type: "spring", stiffness: 380, damping: 22 }}
    >
      {children}
    </motion.span>
  );
}

export function Kpi({ icon, label, value, reference, delta }) {
  const I = Icon[icon];
  return (
    <div className="kpi">
      <div className="k"><I />{label}</div>
      <div className="v"><AnimatedNumber value={value} /></div>
      <div className="ref">{reference}</div>
      {delta}
    </div>
  );
}

export function RecordRing({ correct, total, text }) {
  const f = correct / total, r = 18, c = 2 * Math.PI * r;
  return (
    <div className="record">
      <svg className="ring" viewBox="0 0 46 46" aria-hidden="true">
        <circle cx="23" cy="23" r={r} className="ring-bg" />
        <motion.circle
          cx="23" cy="23" r={r} className="ring-fg" transform="rotate(-90 23 23)"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - f) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
        <text x="23" y="27" textAnchor="middle" className="ring-text"><AnimatedNumber value={Math.round(f * 100)} />%</text>
      </svg>
      <p>{text || <>Right <b>{correct} of {total}</b> times.</>}</p>
    </div>
  );
}

/** Rainy days for the last 12 months as bars, with each month's usual level as a tick. */
export function RainBars({ rows }) {
  if (!rows.length) return <p className="note">No recent rainfall data.</p>;
  const W = 352, H = 120, L = 6, R = 6, T = 8, B = 20;
  const max = Math.max(31, ...rows.map((r) => r.value));
  const bw = (W - L - R) / rows.length;
  const y = (v) => T + (1 - v / max) * (H - T - B);
  return (
    <>
      <svg className="rainbars" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Rainy days per month for the last 12 months">
        {rows.map((r, i) => {
          const wet = r.value > r.usual;
          const x = L + i * bw + 3, w = bw - 6;
          return (
            <g key={r.month}>
              <motion.rect x={x} width={w} rx="3" className={wet ? "bar wet" : "bar"}
                initial={{ y: y(0), height: 0 }} animate={{ y: y(r.value), height: y(0) - y(r.value) }}
                transition={{ delay: 0.15 + i * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
                <title>{`${r.month}: ${r.value} rainy days (usual ${Math.round(r.usual)})`}</title>
              </motion.rect>
              <motion.line x1={x - 1} x2={x + w + 1} y1={y(r.usual)} y2={y(r.usual)} className="usual"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 + i * 0.03 }} />
              <text x={x + w / 2} y={H - 6} textAnchor="middle">{"JFMAMJJASOND"[+r.month.slice(5) - 1]}</text>
            </g>
          );
        })}
      </svg>
      <div className="chart-key">
        <span><i className="sw-wet" />{t("lg_wetter")}</span><span><i className="sw-dry" />{t("lg_not_wetter")}</span><span><i className="sw-usual" />{t("lg_usual")}</span>
      </div>
    </>
  );
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (m) => `${MONTH_NAMES[+m.slice(5) - 1]} ${m.slice(0, 4)}`;

/** Path through the points that have a value; a missing month starts a new segment instead of joining across it. */
function segmented(rows, key, x, y) {
  let d = "", open = false;
  rows.forEach((r, i) => {
    if (r[key] == null) { open = false; return; }
    d += `${open ? "L" : "M"}${x(i).toFixed(1)},${y(r[key]).toFixed(1)}`;
    open = true;
  });
  return d;
}

/**
 * Reported cases against the seasonal baseline, one point per month. Months without a public
 * report are shaded and left as gaps. Hovering shows the month, the reported count and the baseline.
 */
export function Chart({ rows }) {
  const [hover, setHover] = useState(null);
  if (rows.filter((r) => r.actual != null).length < 6) return <p className="note">Not enough recent case data.</p>;
  const W = 352, H = 150, L = 30, R = 8, T = 10, B = 22;
  const vals = rows.flatMap((r) => [r.actual, r.expected]).filter((v) => v != null);
  const max = Math.max(...vals) * 1.1 || 1;
  const step = (W - L - R) / (rows.length - 1);
  const x = (i) => L + i * step;
  const y = (v) => T + (1 - v / max) * (H - T - B);
  const ticks = [0, 0.5, 1].map((f) => Math.round((max * f) / 1.1));
  const gaps = rows.map((r, i) => (r.actual == null ? i : null)).filter((i) => i != null);
  const h = hover != null ? rows[hover] : null;
  return (
    <div className="chart-tip">
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Monthly reported cases compared with the usual level"
        onMouseLeave={() => setHover(null)}>
        {gaps.map((i) => <rect key={`g${i}`} className="gap" x={x(i) - step / 2} width={step} y={T} height={H - T - B} />)}
        {ticks.map((v) => (
          <g key={v}>
            <line className="grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
            <text x={L - 6} y={y(v) + 3.5} textAnchor="end">{v}</text>
          </g>
        ))}
        <motion.path className="exp" d={segmented(rows, "expected", x, y)} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, delay: 0.15, ease: "easeInOut" }} />
        <motion.path className="act" d={segmented(rows, "actual", x, y)} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, delay: 0.3, ease: "easeInOut" }} />
        {rows.map((r, i) => r.target.endsWith("-01") && (
          <text key={r.target} x={x(i)} y={H - 6} textAnchor="middle">{r.target.slice(0, 4)}</text>
        ))}
        {h && <line className="hover-line" x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} />}
        {h?.actual != null && <circle className="dot" cx={x(hover)} cy={y(h.actual)} r="3.2" />}
        {rows.map((r, i) => (
          <rect key={`h${i}`} className="hit" x={x(i) - step / 2} width={step} y={0} height={H} onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      {h && (
        <div className="tip-box" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <b>{monthLabel(h.target)}</b> · {h.actual != null ? `${h.actual} reported` : "no public report"}
          {h.expected != null ? ` · usual ${Math.round(h.expected)}` : ""}
        </div>
      )}
      <div className="chart-key">
        <span><i />{t("lg_reported")}</span><span><i className="d" />{t("lg_usual_month")}</span>
        {gaps.length > 0 && <span><i className="sw-gap" />{t("lg_no_report")}</span>}
      </div>
    </div>
  );
}

/** A row of toggle buttons with a sliding highlight. */
export function Segmented({ label, value, onChange, options }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} aria-pressed={v === value} onClick={() => onChange(v)}>
          {v === value && <motion.span layoutId={`seg-${label}`} className="seg-pill" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
          <span className="seg-text">{text}</span>
        </button>
      ))}
    </div>
  );
}

export function Loading({ text = "Loading district outlook…" }) {
  return (
    <div className="loading">
      <motion.div className="logo big" animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 1.1, repeat: Infinity }}><Icon.logo /></motion.div>
      <p>{text}</p>
    </div>
  );
}
