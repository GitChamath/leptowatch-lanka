import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Chart, Delta, Kpi, Loading, Rich, Segmented, Status } from "../components/bits.jsx";
import { CountEntry, Check, Messages, TrackRecord } from "../components/district.jsx";
import { dname, province, t } from "../i18n.js";
import WeeklyCard from "../components/weekly.jsx";
import { ACTIONS, LEVEL, LEVEL_MEANING, PROVINCE, WHY, casesForWarning, fmt, mon, shownLevel, whenLabel, whyText } from "../lib.js";

/** Everything about one district, laid out as a report: the answer first, then the evidence. */
export default function DistrictPage({ name, summary, lag, onLag, getDistrict, onSaveCount, weekly, onSaveWeekly }) {
  const wlead = "1";          // one 8-week outlook
  const wk = weekly?.districts?.[name];
  const [d, setD] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setFailed(false);
    getDistrict(name).then((x) => live && setD(x)).catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [name, summary]); // eslint-disable-line react-hooks/exhaustive-deps

  const known = !!PROVINCE[name];
  if (!known || failed) {
    return (
      <div className="page">
        <a className="back" href="#/map">← Back to map</a>
        <h1>District not found</h1>
        <p className="note">Pick a district from the map instead.</p>
      </div>
    );
  }

  return (
    <div className="page district-page">
      <a className="back" href="#/map">{t("back")}</a>
      <header className="page-head">
        <div>
          <div className="eyebrow">{province(PROVINCE[name])}</div>
          <h1>{dname(name)}</h1>
        </div>
        {!wk && (
          <Segmented label={t("month")} value={lag} onChange={onLag}
            options={summary.horizon.map((m, i) => [String(i + 1), `${fmt(m)} · ${whenLabel(m)}`])} />
        )}
      </header>
      {wk ? (
        <div className="report weekly-wrap">
          <WeeklyCard name={name} w={wk}
            model={weekly.ml} evaluation={weekly.evaluation} onSave={onSaveWeekly} />
          {["warning", "watch"].includes(shownLevel(wk[wlead])) && (
            <section className="card span-2"><Messages district={name} c={wk[wlead]} /></section>
          )}
        </div>
      ) : !d ? <Loading text={t("loading")} /> : <Report n={name} d={d} lag={lag} onSaveCount={onSaveCount}
        caseMonth={summary.data.last_case_report?.slice(0, 7)} ml={summary.ml?.[lag]} />}
    </div>
  );
}

const pc = (x) => `${Math.round(x * 100)}%`;

/** The model's percentage, or why there is none: it failed its check, or the month has no case count yet. */
function RiskLine({ c, ml }) {
  const r = c.risk;
  if (!ml?.passed) return null;
  if (!r || r.p == null) {
    return (
      <p className="risk none"><Rich text={t("risk_need", { month: fmt(c.data_month) })} /></p>
    );
  }
  return (
    <>
      <p className="risk">
        <span className="risk-n">{pc(r.p)}</span>
        <span>{t("risk_line", { month: fmt(c.target) })} <span className="risk-range">{t("risk_range", { low: pc(r.low), high: pc(r.high) })}</span></span>
      </p>
      {r.high_priority && <HighPriority hp={ml.high_priority?.heldout} base={ml.report?.base_rate_test} />}
      {r.disagree && (
        <p className="disagree" role="note"><Rich text={t("disagree_long", { level: LEVEL[c.level] })} /></p>
      )}
    </>
  );
}

/** A Warning whose percentage is in the top 10% of 2011-2017 months, with how often such Warnings were right since 2018. */
function HighPriority({ hp, base }) {
  return (
    <p className="hp" role="note">
      <span className="hp-badge">⚠ {t("hp_badge")}</span>
      {hp?.alerts ? t("hp_note", { right: hp.right, alerts: hp.alerts, pct: Math.round(hp.precision * 100), base: Math.round((base ?? 0) * 100) }) : null}
    </p>
  );
}

function Report({ n, d, lag, onSaveCount, caseMonth, ml }) {
  const c = d.current?.[lag];
  if (!c) return <section className="card"><Status level="nodata" text={WHY.nodata} /></section>;
  const lv = c.level, known = c.case_signal != null;
  const lag1 = d.history.filter((h) => h.lag === 1);
  const lastReported = lag1.map((h) => h.actual != null).lastIndexOf(true);
  const hist = lag1.slice(Math.max(0, lastReported - 35), lastReported + 1);

  return (
    <motion.div key={lag} className="report stagger">
      <motion.section className={`card span-2 hero ${lv} rise`}>
        <Status level={lv} text={whyText(c)} meaning={LEVEL_MEANING[lv]} />
        <RiskLine c={c} ml={ml} />
        {c.low_confidence && (
          <p className="low-conf"><span className="badge">{t("low_conf")}</span>
            {c.normal_based_on && c.normal_based_on !== c.data_month
              ? t("low_conf_upto", { month: fmt(c.normal_based_on) }) : t("low_conf_few")}</p>
        )}
        <p className={`basis ${known ? "" : "partial"}`}>
          <Rich text={t(known ? "basis_full" : "basis_rain", { target: fmt(c.target), month: fmt(c.data_month), caseMonth: fmt(caseMonth) })} />
        </p>
      </motion.section>

      <motion.section className="card rise">
        <h3>{t("what_to_do")}</h3>
        {ACTIONS[lv].length > 0 ? (
          <ul className="checklist">
            {ACTIONS[lv].map((a, i) => <Check key={a} text={a} delay={0.2 + i * 0.07} />)}
          </ul>
        ) : <p className="note">{t("nothing_extra")}</p>}
      </motion.section>

      <motion.section className="card rise">
        <CountEntry month={c.data_month} known={known} current={c.cases_data_month} toWarning={casesForWarning(c)}
          onSave={(v) => onSaveCount(n, c.data_month, v)} />
      </motion.section>

      {(lv === "warning" || lv === "watch") && (
        <motion.section className="card span-2 rise">
          <Messages district={n} c={c} />
        </motion.section>
      )}

      <motion.section className="card rise">
        <h3>{t("why_says", { level: LEVEL[lv] })}</h3>
        <div className="kpis">
          <Kpi icon="rain" label={t("rainy_days_in", { month: mon(c.data_month) })} value={c.rainy_days}
            reference={t("usual_days", { n: Math.round(c.rainy_days_normal) })}
            delta={c.rain_signal ? <Delta tone="up">{t("wetter")}</Delta> : <Delta tone="flat">{t("not_wetter")}</Delta>} />
          {known
            ? <Kpi icon="cases" label={t("cases_in", { month: mon(c.data_month) })} value={c.cases_data_month}
                reference={t("usual", { n: Math.round(c.cases_normal) })}
                delta={c.case_signal ? <Delta tone="up">{t("more_cases")}</Delta> : <Delta tone="flat">{t("not_more")}</Delta>} />
            : <Kpi icon="cases" label={t("cases_in", { month: mon(c.data_month) })} value="—" reference={t("not_reported")}
                delta={<Delta tone="flat">{t("waiting")}</Delta>} />}
        </div>
        {c.expected != null && (
          <div className="expect">
            <span>{t("usual_month", { month: mon(c.target), district: dname(n) })}
              {c.normal_based_on && c.normal_based_on !== c.data_month && (
                <span className="basis-note">{t("worked_from", { month: fmt(c.normal_based_on) })}</span>
              )}
            </span>
            <b className="expect-n">{t("about_cases", { n: Math.round(c.expected) })}</b>
          </div>
        )}
      </motion.section>

      <motion.section className="card rise">
        <h3>{t("cases_chart", { month: fmt(hist.at(-1)?.target) })}</h3>
        <Chart rows={hist} />
      </motion.section>

      <motion.section className="card rise">
        <h3>{t("past_record_short", { level: LEVEL[lv] })}</h3>
        <TrackRecord rec={d.records?.[lag]} level={lv} base={d.track?.[lag]?.base_rate} />
      </motion.section>
    </motion.div>
  );
}
