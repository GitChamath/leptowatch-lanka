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

export function Status({ level, text, meaning }) {
  const I = Icon[level] || Icon.cases;
  return (
    <div className={`status ${level}`}>
      <div className="ico pop">
        {level === "warning" && <span className="halo" />}
        <I />
      </div>
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
    <span className={`delta delta-in ${tone}`}>{children}</span>
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
