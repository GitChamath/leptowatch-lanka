import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "../icons.jsx";
import { ACTIONS, LEVEL, LEVELS, LEVEL_MEANING, PROVINCE, WHY, fmt, fmtDay, levelColor, mon, whyText } from "../lib.js";
import { dname, province, t } from "../i18n.js";
import { districtHref } from "../router.js";
import { AnimatedNumber, Delta, Kpi, Rich, Status, rise, stagger } from "./bits.jsx";
import { WeeklyEntry } from "./weekly.jsx";

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
        <div className="eyebrow">{province(PROVINCE[name])}</div>
        <h2>{dname(name)}</h2>
        <div className="note tight">{sub}</div>
      </div>
      <motion.button className="close" aria-label="Close" onClick={onClose} whileHover={{ rotate: 90 }} whileTap={{ scale: 0.9 }}>
        <Icon.close />
      </motion.button>
    </div>
  );
}

function Overview({ tally, mode, lag, target, rainMonth, attention = [], onPick, weeklyTo }) {
  const past = mode === "past";
  return (
    <motion.div className="overview" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={rise} className="eyebrow">{past ? t("past_seasons") : t("outlook")}</motion.div>
      <motion.h2 variants={rise}>{target}</motion.h2>
      <motion.p variants={rise}>
        {past
          ? t("ov_past", { ahead: t(lag === "1" ? "one_month" : "two_months") })
          : weeklyTo ? t("wk_overview", { date: fmtDay(weeklyTo) }) : t("ov_outlook", { month: fmt(rainMonth) })}
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
          <h3>{t("needs_attention")}</h3>
          {attention.length === 0 ? (
            <p className="note">{t("none_attention")}</p>
          ) : (
            <ul>
              {attention.map((a, i) => (
                <motion.li key={a.name} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.03 }}>
                  <button onClick={() => onPick(a.name)}>
                    <span className={`att-level ${a.level} ${a.hp ? "hp" : ""} ${a.rain ? "rain" : ""}`}>{a.level === "warning" ? "⚠ " : ""}{a.hp ? t("hp_badge") : LEVEL[a.level]}</span>
                    <span className="att-name">{dname(a.name)}</span>
                    {a.rain && <span className="att-tag">{t("rain_only")}</span>}
                    <span className="att-go" aria-hidden="true">›</span>
                  </button>
                </motion.li>
              ))}
            </ul>
          )}
          <p className="note">{t("not_outbreak")}</p>
        </motion.div>
      )}
      {past && (
        <motion.div variants={rise} className="pointer">
          <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity }}><Icon.pointer /></motion.span>
          {t("pick_month")}
        </motion.div>
      )}
    </motion.div>
  );
}

/** Three things only: the level, why, and what to do. Everything else is on the district page. */
function QuickCard({ selected: n, detail: d, lag, onClose, weeklyRec, onSaveWeekly }) {
  const c = weeklyRec || d?.current?.[lag];
  if (!d && !weeklyRec) return <Header name={n} sub={t("loading")} onClose={onClose} />;
  if (!c) return <><Header name={n} sub="" onClose={onClose} /><div className="section"><Status level="nodata" text={WHY.nodata} /></div></>;
  const lv = c.level, known = c.case_signal != null;
  return (
    <>
      <Header name={n} sub={weeklyRec ? t("wk_range", { from: fmtDay(c.target_from), to: fmtDay(c.target_end) })
        : t("outlook_for", { month: fmt(c.target) })} onClose={onClose} />
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.div variants={rise} className="section">
          <Status key={lv + lag} level={lv} text={whyText(c)} meaning={LEVEL_MEANING[lv]} />
          <p className={`basis ${known ? "" : "partial"}`}>
            <Rich text={weeklyRec ? t(known ? "wk_basis" : "wk_basis_rain", { date: fmtDay(c.decided) })
              : t(known ? "basis_full_short" : "basis_rain_short", { month: fmt(c.data_month) })} />
          </p>
          {c.risk?.p != null && (
            <p className="basis"><Rich text={t("model_estimate", { p: `${Math.round(c.risk.p * 100)}%` })} />
              {c.risk.disagree ? <span className="disagree-inline"> · {t("signals_disagree")}</span> : null}</p>
          )}
          {c.risk?.high_priority && (
            <p className="hp compact"><span className="hp-badge">⚠ {t("hp_badge")}</span></p>
          )}
        </motion.div>
        {weeklyRec && onSaveWeekly && (
          <motion.div variants={rise} className="section">
            <WeeklyEntry key={`${n}-${c.decided}`} name={n} end={c.decided} c={c} onSave={onSaveWeekly} />
          </motion.div>
        )}
        {ACTIONS[lv].length > 0 && (
          <motion.div variants={rise} className="section">
            <h3>{t("what_to_do")}</h3>
            <ul className="quick-actions">
              {ACTIONS[lv].slice(0, 2).map((a) => <li key={a}>{a}</li>)}
            </ul>
          </motion.div>
        )}
        <motion.div variants={rise} className="section">
          <motion.a className="btn wide" href={districtHref(n)} whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
            {t("open_report")} <span aria-hidden="true">→</span>
          </motion.a>
          <p className="note">{t("open_report_note")}</p>
        </motion.div>
      </motion.div>
    </>
  );
}

function PastDistrict({ selected: n, past, lag, monthKey, onClose }) {
  const x = past?.districts?.[n];
  if (!x) return <><Header name={n} sub={fmt(monthKey)} onClose={onClose} /><div className="section"><Status level="nodata" text={WHY.nodata} /></div></>;
  const right = x.outcome == null ? null : (x.level !== "normal") === x.outcome;
  const verdict = t(right == null ? "past_unknown" : right ? "past_right" : "past_wrong");
  return (
    <>
      <Header name={n} sub={t("past_sub", { month: fmt(monthKey), ahead: t(lag === "1" ? "one_month" : "two_months") })} onClose={onClose} />
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.div variants={rise} className="section"><Status level={x.level} text={verdict} /></motion.div>
        <motion.div variants={rise} className="section">
          <h3>{t("what_happened")}</h3>
          <div className="kpis">
            <Kpi icon="cases" label={t("cases_in", { month: mon(monthKey) })} value={x.actual ?? "—"}
              reference={t("usual", { n: x.expected == null ? "—" : Math.round(x.expected) })}
              delta={x.outcome == null ? null : x.outcome ? <Delta tone="up">{t("more_cases")}</Delta> : <Delta tone="flat">{t("usual_or_fewer")}</Delta>} />
            <Kpi icon="rain" label={t("rainy_days_in", { month: mon(x.data_month) })} value={x.rainy_days}
              reference={t("usual_days", { n: Math.round(x.rainy_days_normal) })}
              delta={right == null ? null : right ? <Delta tone="ok">{t("fc_right")}</Delta> : <Delta tone="bad">{t("fc_wrong")}</Delta>} />
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
