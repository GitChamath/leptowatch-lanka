import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LEVEL, fmt } from "../lib.js";
import { LANGS, farmerMessage, getLang, smsParts, staffSms, t } from "../i18n.js";
import { RecordRing } from "./bits.jsx";

const MIN_TIMES = 10; // fewer past alerts than this is too few to judge a district's record

/** Plain-language record for one alert level: "right 27 of 56 times", or a too-few note. */
function recordLine(rec, level, short) {
  if (!rec || level === "nodata") return null;
  const noun = t(`noun_${level}`);
  if (rec.times < MIN_TIMES) return t("rec_few", { noun });
  const pct = Math.round((rec.right / rec.times) * 100);
  return short ? t("rec_short", { right: rec.right, times: rec.times })
    : t("rec_long", { noun, right: rec.right, times: rec.times, pct });
}

/** What the district's past alerts at this level actually did, with counts and periods. */
export function TrackRecord({ rec, level, base }) {
  if (!rec || level === "nodata") return <p className="note">{t("no_record")}</p>;
  const all = rec.all?.[level];
  const enough = all && all.times >= MIN_TIMES;
  return (
    <div>
      {enough ? (
        <RecordRing correct={all.right} total={all.times} text={recordLine(all, level)} />
      ) : (
        <p className="note">{recordLine(all, level) || t("no_record")}</p>
      )}
      {base != null && level !== "normal" && <p className="note">{t("rec_chance", { pct: Math.round(base * 100) })}</p>}
    </div>
  );
}

export function Check({ text, delay }) {
  const [done, setDone] = useState(false);
  return (
    <li className="slide-in-sm" style={{ animationDelay: `${delay || 0}s` }}>
      <button className={`tick ${done ? "on" : ""}`} aria-pressed={done} aria-label={`Mark done: ${text}`} onClick={() => setDone(!done)}>
        <AnimatePresence>
          {done && (
            <motion.svg viewBox="0 0 24 24" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <motion.path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.25 }} />
            </motion.svg>
          )}
        </AnimatePresence>
      </button>
      <span className={done ? "struck" : ""}>{text}</span>
    </li>
  );
}

export function CountEntry({ month, known, current, toWarning, onSave }) {
  const [value, setValue] = useState(known ? String(current) : "");
  const [state, setState] = useState({ busy: false, msg: "" });
  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d+$/.test(value.trim())) { setState({ busy: false, msg: t("count_whole"), error: true }); return; }
    setState({ busy: true, msg: t("saving") });
    try { await onSave(value.trim()); setState({ busy: false, msg: t("count_saved") }); }
    catch (err) { setState({ busy: false, msg: err.message, error: true }); }
  };
  return (
    <form onSubmit={submit}>
      <h3>{t(known ? "update_count" : "add_count", { month: fmt(month) })}</h3>
      <div className="entry">
        <input type="number" min="0" inputMode="numeric" placeholder={t("count_placeholder")} value={value}
          onChange={(e) => setValue(e.target.value)} aria-label={`Cases in ${fmt(month)}`} />
        <motion.button className="btn" type="submit" disabled={state.busy} whileHover={{ y: -1 }} whileTap={{ scale: 0.96 }}>
          {state.busy ? <span className="spinner" /> : t(known ? "update_btn" : "add_btn")}
        </motion.button>
      </div>
      <p key={state.msg || "hint"} className={`note fade-in ${state.error ? "err" : ""}`}>
        {state.msg || t(known ? "count_used" : "count_hint")}
      </p>
      {toWarning != null && !state.msg && (
        <p className="to-warning">{t("to_warning", { n: toWarning, month: fmt(month) })}</p>
      )}
    </form>
  );
}

/** Ready-to-check drafts: an awareness message for farmers and a short SMS for health staff, in any of the three languages. */
export function Messages({ district, c }) {
  const [lang, setLang] = useState(() => (getLang() === "en" ? "si" : getLang()));
  const [copied, setCopied] = useState("");
  const farmer = farmerMessage(lang, district, c.level);
  const sms = staffSms(lang, district, c);
  const copy = async (key, text) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 1600); } catch { /* clipboard blocked */ }
  };
  return (
    <div className="messages">
      <div className="msg-head">
        <h3>{t("msg_title")}</h3>
        <div className="lang-pick" role="group" aria-label={t("language")}>
          {LANGS.map(([code, label]) => (
            <button key={code} lang={code} aria-pressed={lang === code} onClick={() => setLang(code)}>{label}</button>
          ))}
        </div>
      </div>
      <div className="msg-grid">
        {[["farmer", t("msg_farmer"), farmer], ["sms", t("msg_sms"), sms]].map(([key, title, text]) => (
          <div key={key} className={`msg ${key}`}>
            <div className="msg-title">{title}</div>
            <p lang={lang}>{text}</p>
            <div className="msg-foot">
              {key === "sms" ? <span className="note">{t("sms_len", { n: [...text].length, parts: smsParts(text) })}</span> : <span />}
              <button className="btn ghost" onClick={() => copy(key, text)}>{copied === key ? t("copied") : t("copy")}</button>
            </div>
          </div>
        ))}
      </div>
      <p className="note">{t("msg_note")}</p>
    </div>
  );
}
