import { useState } from "react";
import { motion } from "framer-motion";
import { Delta, Kpi, Rich, Status } from "./bits.jsx";
import { ACTIONS, LEVEL_MEANING, fmtDay, whyText } from "../lib.js";
import { t } from "../i18n.js";

const pc = (x) => `${Math.round(x * 100)}%`;
/** The case count that would turn this Watch into a Warning: rain must be up, and cases above 1.4 x normal. */
const smallest = (c) => (c && c.level === "watch" && c.rain_signal && c.cases_for_warning != null ? c.cases_for_warning : null);

/** Weekly rolling outlook for one district: the next 4 weeks (or weeks 5-8), why, and the 4-week case count box. */
export default function WeeklyCard({ name, w, lead, onLead, model, evaluation, onSave }) {
  const c = w?.[lead];
  if (!c) return null;
  const lv = c.level, known = c.case_signal != null;
  const r = c.risk, hp = model?.[lead]?.high_priority?.heldout, held = evaluation?.[lead]?.heldout;
  const end = c.decided;
  return (
    <section className="card span-2 weekly">
      <div className="weekly-head">
        <div>
          <div className="eyebrow">{t("wk_eyebrow")}</div>
          <h3 className="weekly-title">{t("wk_range", { from: fmtDay(c.target_from), to: fmtDay(c.target_end) })}</h3>
        </div>
        <div className="seg" role="group" aria-label={t("forecast")}>
          {[["1", t("wk_next")], ["2", t("wk_after")]].map(([v, label]) => (
            <button key={v} aria-pressed={v === lead} onClick={() => onLead(v)}>
              {v === lead && <motion.span layoutId="seg-weekly" className="seg-pill" />}
              <span className="seg-text">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <Status level={lv} text={whyText(c)} meaning={LEVEL_MEANING[lv]} />
      {r?.p != null && (
        <p className="risk"><span className="risk-n">{pc(r.p)}</span>
          <span>{t("wk_risk")} <span className="risk-range">{t("risk_range", { low: pc(r.low), high: pc(r.high) })}</span></span></p>
      )}
      {r?.high_priority && hp && (
        <p className="hp"><span className="hp-badge">⚠ {t("hp_badge")}</span>
          {t("wk_hp", { right: hp.right, alerts: hp.alerts, pct: Math.round(hp.precision * 100) })}</p>
      )}
      <p className={`basis ${known ? "" : "partial"}`}>
        <Rich text={t(known ? "wk_basis" : "wk_basis_rain", { date: fmtDay(end) })} />
      </p>

      <div className="weekly-grid">
        <div className="kpis">
          <Kpi icon="rain" label={t("wk_rain", { date: fmtDay(end) })} value={c.rainy_days}
            reference={t("usual_days", { n: Math.round(c.rainy_days_normal) })}
            delta={c.rain_signal ? <Delta tone="up">{t("wetter")}</Delta> : <Delta tone="flat">{t("not_wetter")}</Delta>} />
          <Kpi icon="cases" label={t("wk_cases", { date: fmtDay(end) })} value={known ? c.cases_data_month : "—"}
            reference={c.cases_normal != null ? t("usual", { n: Math.round(c.cases_normal) }) : t("not_reported")}
            delta={known ? (c.case_signal ? <Delta tone="up">{t("more_cases")}</Delta> : <Delta tone="flat">{t("not_more")}</Delta>)
              : <Delta tone="flat">{t("waiting")}</Delta>} />
        </div>
        <WeeklyEntry name={name} end={end} c={c} onSave={onSave} />
      </div>

      {w.forecast && (
        <p className={`forecast ${w.forecast.wetter ? "wet" : ""}`}>
          🌧 {t(w.forecast.wetter ? "wk_fc_wet" : "wk_fc_dry", { from: fmtDay(w.forecast.from), to: fmtDay(w.forecast.to),
            n: w.forecast.rainy_days, u: Math.round(w.forecast.usual) })} <span className="note">{t("wk_fc_note")}</span>
        </p>
      )}
      {ACTIONS[lv].length > 0 && (
        <ul className="quick-actions">{ACTIONS[lv].slice(0, 3).map((a) => <li key={a}>{a}</li>)}</ul>
      )}
      {held?.warning?.precision != null && (
        <p className="note">{t("wk_record", { p: Math.round(held.warning.precision * 100), b: Math.round(held.base_rate * 100),
          lead: lead === "1" ? t("wk_next") : t("wk_after") })}</p>
      )}
    </section>
  );
}

export function WeeklyEntry({ name, end, c, onSave }) {
  const [value, setValue] = useState(c.officer ? String(c.cases_data_month) : "");
  const [msg, setMsg] = useState({ text: "", error: false, busy: false });
  const need = smallest(c);
  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d+$/.test(value.trim())) { setMsg({ text: t("count_whole"), error: true }); return; }
    setMsg({ text: t("saving"), busy: true });
    try { await onSave(name, end, value.trim()); setMsg({ text: t("count_saved") }); }
    catch (err) { setMsg({ text: err.message, error: true }); }
  };
  return (
    <form onSubmit={submit} className="weekly-entry">
      <h3>{t("wk_add", { date: fmtDay(end) })}</h3>
      <div className="entry">
        <input type="number" min="0" inputMode="numeric" placeholder={t("count_placeholder")} value={value}
          onChange={(e) => setValue(e.target.value)} aria-label={t("wk_add", { date: fmtDay(end) })} />
        <button className="btn" type="submit" disabled={msg.busy}>{msg.busy ? <span className="spinner" /> : t(c.officer ? "update_btn" : "add_btn")}</button>
      </div>
      <p className={`note ${msg.error ? "err" : ""}`}>{msg.text || t("wk_hint")}</p>
      {need != null && !msg.text && <p className="to-warning">{t("wk_to_warning", { n: need })}</p>}
    </form>
  );
}
