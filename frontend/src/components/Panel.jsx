import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "../icons.jsx";
import { ACTIONS, LEVEL, LEVELS, LEVEL_MEANING, PROVINCE, WHY, fmt, levelColor, mon, whyText } from "../lib.js";
import { districtHref } from "../router.js";
import { AnimatedNumber, Delta, Kpi, Status, rise, stagger } from "./bits.jsx";

const slide = {
  initial: { opacity: 0, x: 28 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, x: -16, transition: { duration: 0.18 } },
};

/** The glass card beside the map: the national overview, or a short summary of the clicked district. */
export default function Panel(props) {
  const { selected, mode, lag, monthKey } = props;
  return (
    <aside className="panel" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={`${mode}-${selected || "overview"}-${mode === "past" ? `${lag}-${monthKey}` : lag}`} {...slide}>
          {!selected ? <Overview {...props} />
            : mode === "past" ? <PastDistrict {...props} />
              : <QuickCard {...props} />}
        </motion.div>
      </AnimatePresence>
    </aside>
  );
}

function Header({ name, sub, onClose }) {
  return (
    <div className="panel-head">
      <div>
        <div className="eyebrow">{PROVINCE[name]} Province</div>
        <h2>{name}</h2>
        <div className="note tight">{sub}</div>
      </div>
      <motion.button className="close" aria-label="Close" onClick={onClose} whileHover={{ rotate: 90 }} whileTap={{ scale: 0.9 }}>
        <Icon.close />
      </motion.button>
    </div>
  );
}

function Overview({ tally, mode, lag, target, rainMonth, attention = [], onPick }) {
  const past = mode === "past";
  return (
    <motion.div className="overview" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={rise} className="eyebrow">{past ? "Past seasons" : "Outlook"}</motion.div>
      <motion.h2 variants={rise}>{target}</motion.h2>
      <motion.p variants={rise}>
        {past
          ? `What LeptoWatch would have said ${lag === "1" ? "one month" : "two months"} ahead, checked against what really happened.`
          : `Based on rainfall up to ${fmt(rainMonth)}. Click a district on the map to see its outlook.`}
      </motion.p>
      <motion.div variants={rise} className="ov-grid">
        {LEVELS.map((l) => (
          <motion.div key={l} className="ov" whileHover={{ y: -3 }}>
            <div className="n"><AnimatedNumber value={tally[l]} /></div>
            <div className="l"><i className="key" style={{ background: levelColor(l) }} />{LEVEL[l]}</div>
          </motion.div>
        ))}
      </motion.div>
      {!past && (
        <motion.div variants={rise} className="attention">
          <h3>Needs attention</h3>
          {attention.length === 0 ? (
            <p className="note">No district has a Warning or Watch this month.</p>
          ) : (
            <ul>
              {attention.map((a, i) => (
                <motion.li key={a.name} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.03 }}>
                  <button onClick={() => onPick(a.name)}>
                    <span className={`att-level ${a.level}`}>{a.level === "warning" ? "⚠ " : ""}{LEVEL[a.level]}</span>
                    <span className="att-name">{a.name}</span>
                    <span className="att-go" aria-hidden="true">›</span>
                  </button>
                </motion.li>
              ))}
            </ul>
          )}
          <p className="note">A coloured district means higher risk than usual, not a confirmed outbreak.</p>
        </motion.div>
      )}
      {past && (
        <motion.div variants={rise} className="pointer">
          <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity }}><Icon.pointer /></motion.span>
          Pick a month on the slider, then click a district.
        </motion.div>
      )}
    </motion.div>
  );
}

/** Three things only: the level, why, and what to do. Everything else is on the district page. */
function QuickCard({ selected: n, detail: d, lag, onClose }) {
  const c = d?.current?.[lag];
  if (!d) return <Header name={n} sub="Loading…" onClose={onClose} />;
  if (!c) return <><Header name={n} sub="" onClose={onClose} /><div className="section"><Status level="nodata" text={WHY.nodata} /></div></>;
  const lv = c.level, known = c.case_signal != null;
  return (
    <>
      <Header name={n} sub={`Outlook for ${fmt(c.target)}`} onClose={onClose} />
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.div variants={rise} className="section">
          <Status key={lv + lag} level={lv} text={whyText(c)} meaning={LEVEL_MEANING[lv]} />
          <p className={`basis ${known ? "" : "partial"}`}>
            {known ? <>Based on rainfall and cases for <b>{fmt(c.data_month)}</b>.</>
              : <>Based on <b>rainfall only</b>. The {fmt(c.data_month)} case count is not in yet.</>}
          </p>
          {c.risk?.p != null && (
            <p className="basis">Model estimate: <b>{Math.round(c.risk.p * 100)}%</b> chance of more cases than usual
              {c.risk.disagree ? <span className="disagree-inline"> · signals disagree</span> : null}</p>
          )}
        </motion.div>
        {ACTIONS[lv].length > 0 && (
          <motion.div variants={rise} className="section">
            <h3>What to do</h3>
            <ul className="quick-actions">
              {ACTIONS[lv].slice(0, 2).map((a) => <li key={a}>{a}</li>)}
            </ul>
          </motion.div>
        )}
        <motion.div variants={rise} className="section">
          <motion.a className="btn wide" href={districtHref(n)} whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
            Open full report <span aria-hidden="true">→</span>
          </motion.a>
          <p className="note">Charts, both months, past record, and the box to add this month's cases.</p>
        </motion.div>
      </motion.div>
    </>
  );
}

function PastDistrict({ selected: n, past, lag, monthKey, onClose }) {
  const x = past?.districts?.[n];
  if (!x) return <><Header name={n} sub={fmt(monthKey)} onClose={onClose} /><div className="section"><Status level="nodata" text={WHY.nodata} /></div></>;
  const right = x.outcome == null ? null : (x.level !== "normal") === x.outcome;
  const verdict = right == null ? "We don't know yet how this month turned out." : right ? "The forecast was right." : "The forecast was wrong.";
  return (
    <>
      <Header name={n} sub={`${fmt(monthKey)} · forecast made ${lag === "1" ? "one month" : "two months"} before`} onClose={onClose} />
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.div variants={rise} className="section"><Status level={x.level} text={`Forecast made from ${fmt(x.data_month)} data. ${verdict}`} /></motion.div>
        <motion.div variants={rise} className="section">
          <h3>What happened</h3>
          <div className="kpis">
            <Kpi icon="cases" label={`Cases · ${mon(monthKey)}`} value={x.actual ?? "—"}
              reference={`Usual: ${x.expected == null ? "—" : Math.round(x.expected)}`}
              delta={x.outcome == null ? null : x.outcome ? <Delta tone="up">▲ More than usual</Delta> : <Delta tone="flat">Usual or fewer</Delta>} />
            <Kpi icon="rain" label={`Rainy days · ${mon(x.data_month)}`} value={x.rainy_days}
              reference={`Usual: ${Math.round(x.rainy_days_normal)} days`}
              delta={right == null ? null : right ? <Delta tone="ok">✓ Forecast right</Delta> : <Delta tone="bad">✕ Forecast wrong</Delta>} />
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
