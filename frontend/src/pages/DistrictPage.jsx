import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Chart, Delta, Kpi, Loading, RainBars, Segmented, Status, rise, stagger } from "../components/bits.jsx";
import { CountEntry, Check, Horizons, TrackRecord } from "../components/district.jsx";
import { ACTIONS, LEVEL, LEVEL_MEANING, PROVINCE, WHY, fmt, mon, whyText } from "../lib.js";

/** Everything about one district, laid out as a report: the answer first, then the evidence. */
export default function DistrictPage({ name, summary, lag, onLag, getDistrict, onSaveCount }) {
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
        <a className="back" href="#/">← Back to map</a>
        <h1>District not found</h1>
        <p className="note">Pick a district from the map instead.</p>
      </div>
    );
  }

  return (
    <div className="page district-page">
      <a className="back" href="#/">← Back to map</a>
      <header className="page-head">
        <div>
          <div className="eyebrow">{PROVINCE[name]} Province</div>
          <h1>{name}</h1>
        </div>
        <Segmented label="Month" value={lag} onChange={onLag}
          options={summary.horizon.map((m, i) => [String(i + 1), `${fmt(m)} · ${i === 0 ? "next month" : "month after"}`])} />
      </header>
      {!d ? <Loading text="Loading district report…" /> : <Report n={name} d={d} lag={lag} onLag={onLag} onSaveCount={onSaveCount}
        caseMonth={summary.data.last_case_report?.slice(0, 7)} ml={summary.ml?.[lag]} />}
    </div>
  );
}

const pc = (x) => `${Math.round(x * 100)}%`;

/** The model's percentage, or why there is none: it failed its check, or the month has no case count yet. */
function RiskLine({ c, ml, lag }) {
  const r = c.risk;
  if (!ml?.passed) {
    return (
      <p className="risk none">
        <b>No risk percentage {lag === "1" ? "for next month" : "two months ahead"}.</b> The model did not pass its calibration
        check at this distance, so only the alert level is shown.
      </p>
    );
  }
  if (!r || r.p == null) {
    return (
      <p className="risk none">
        <b>Risk percentage: add the {fmt(c.data_month)} case count to see it.</b> Without a case count the model was not
        reliable enough in testing.
      </p>
    );
  }
  return (
    <>
      <p className="risk">
        <span className="risk-n">{pc(r.p)}</span>
        <span>chance of more cases than usual in {fmt(c.target)} <span className="risk-range">(likely range {pc(r.low)} to {pc(r.high)})</span></span>
      </p>
      {r.disagree && (
        <p className="disagree" role="note">
          <b>Signals disagree.</b> The rule says {LEVEL[c.level]}, but the model's estimate points the other way.
          Check local hospital and PHI data before acting.
        </p>
      )}
    </>
  );
}

function Report({ n, d, lag, onLag, onSaveCount, caseMonth, ml }) {
  const c = d.current?.[lag];
  if (!c) return <section className="card"><Status level="nodata" text={WHY.nodata} /></section>;
  const lv = c.level, known = c.case_signal != null;
  const lag1 = d.history.filter((h) => h.lag === 1);
  const lastReported = lag1.map((h) => h.actual != null).lastIndexOf(true);
  const hist = lag1.slice(Math.max(0, lastReported - 35), lastReported + 1);
  const rain = [...lag1.slice(-11), d.current?.["1"]]
    .filter(Boolean).map((h) => ({ month: h.data_month, value: h.rainy_days, usual: h.rainy_days_normal }));

  return (
    <motion.div key={lag} className="report" variants={stagger} initial="hidden" animate="show">
      <motion.section variants={rise} className={`card span-2 hero ${lv}`}>
        <Status level={lv} text={whyText(c)} meaning={LEVEL_MEANING[lv]} />
        <RiskLine c={c} ml={ml} lag={lag} />
        {c.low_confidence && (
          <p className="low-conf"><span className="badge">Low confidence</span>
            The usual case level here is based on {c.normal_based_on && c.normal_based_on !== c.data_month
              ? <>case reports up to {fmt(c.normal_based_on)}</> : <>fewer than 9 of the last 12 months</>}.</p>
        )}
        <p className={`basis ${known ? "" : "partial"}`}>
          {known
            ? <>Outlook for <b>{fmt(c.target)}</b>, based on rainfall and case counts for <b>{fmt(c.data_month)}</b>.</>
            : <>Outlook for <b>{fmt(c.target)}</b>, based on <b>rainfall only</b> ({fmt(c.data_month)}). The latest public case report is from <b>{fmt(caseMonth)}</b>; add this month's count below to make it more reliable.</>}
        </p>
      </motion.section>

      <motion.section variants={rise} className="card">
        <h3>What to do</h3>
        {ACTIONS[lv].length > 0 ? (
          <ul className="checklist">
            {ACTIONS[lv].map((a, i) => <Check key={a} text={a} delay={0.2 + i * 0.07} />)}
          </ul>
        ) : <p className="note">Nothing extra this month.</p>}
        <p className="note">These are suggestions for health officers. A coloured outlook is not a confirmed outbreak.</p>
      </motion.section>

      <motion.section variants={rise} className="card">
        <CountEntry month={c.data_month} known={known} current={c.cases_data_month} onSave={(v) => onSaveCount(n, c.data_month, v)} />
      </motion.section>

      <motion.section variants={rise} className="card">
        <h3>Why it says {LEVEL[lv]}</h3>
        <div className="kpis">
          <Kpi icon="rain" label={`Rainy days · ${mon(c.data_month)}`} value={c.rainy_days}
            reference={`Usual: ${Math.round(c.rainy_days_normal)} days`}
            delta={c.rain_signal ? <Delta tone="up">▲ Wetter than usual</Delta> : <Delta tone="flat">Not wetter</Delta>} />
          {known
            ? <Kpi icon="cases" label={`Cases · ${mon(c.data_month)}`} value={c.cases_data_month}
                reference={`Usual: ${Math.round(c.cases_normal)}`}
                delta={c.case_signal ? <Delta tone="up">▲ More than usual</Delta> : <Delta tone="flat">Not more</Delta>} />
            : <Kpi icon="cases" label={`Cases · ${mon(c.data_month)}`} value="—" reference="Not reported yet"
                delta={<Delta tone="flat">Waiting for count</Delta>} />}
        </div>
        <p className="note">Both up gives a Warning, one up gives a Watch, neither gives Normal.</p>
        {c.expected != null && (
          <div className="expect">
            <span>A usual {mon(c.target)} in {n}
              {c.normal_based_on && c.normal_based_on !== c.data_month && (
                <span className="basis-note"> · worked out from cases up to {fmt(c.normal_based_on)}</span>
              )}
            </span>
            <b className="expect-n">about {Math.round(c.expected)} cases</b>
          </div>
        )}
      </motion.section>

      <motion.section variants={rise} className="card">
        <h3>Both months</h3>
        <Horizons d={d} lag={lag} onLag={onLag} />
        <p className="note shared">Both use the same {fmt(c.data_month)} data. The month after is less certain.</p>
      </motion.section>

      <motion.section variants={rise} className="card">
        <h3>Cases each month · 3 years to {fmt(hist.at(-1)?.target)}</h3>
        <Chart rows={hist} />
      </motion.section>

      <motion.section variants={rise} className="card">
        <h3>Rainy days · last 12 months</h3>
        <RainBars rows={rain} />
      </motion.section>

      <motion.section variants={rise} className="card span-2">
        <h3>Past record here · {LEVEL[lv]}, {lag === "1" ? "one month" : "two months"} ahead</h3>
        <TrackRecord rec={d.records?.[lag]} level={lv} base={d.track?.[lag]?.base_rate} />
      </motion.section>
    </motion.div>
  );
}
