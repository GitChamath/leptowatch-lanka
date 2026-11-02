import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LEVEL, fmt } from "../lib.js";
import { RecordRing } from "./bits.jsx";

export const MIN_TIMES = 10; // fewer past alerts than this is too few to judge a district's record
const NOUN = { warning: "Warnings", watch: "Watch alerts", normal: "Normal outlooks" };

/** Plain-language record for one alert level: "right 27 of 56 times", or a too-few note. */
export function recordLine(rec, level, short) {
  if (!rec || level === "nodata") return null;
  if (rec.times < MIN_TIMES) return `Too few past ${NOUN[level]} here to judge`;
  const pct = Math.round((rec.right / rec.times) * 100);
  return short ? `Right ${rec.right} of ${rec.times} times before`
    : `Past ${NOUN[level]} here were right ${rec.right} of ${rec.times} times (${pct}%)`;
}

/** Both outlooks side by side; they share the same input month, only the distance ahead differs. */
export function Horizons({ d, lag, onLag }) {
  return (
    <div className="horizons">
      {["1", "2"].map((L) => {
        const c = d.current?.[L];
        const lv = c?.level || "nodata";
        const line = recordLine(d.records?.[L]?.all?.[lv], lv, true);
        return (
          <motion.button key={L} className={`horizon ${L === lag ? "on" : ""}`} onClick={() => onLag(L)}
            whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} aria-pressed={L === lag}>
            <span className="h-when">{fmt(c?.target)}</span>
            <span className="h-ahead">{L === "1" ? "Next month" : "Month after"}</span>
            <motion.span key={lv} className={`h-level ${lv}`} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              {LEVEL[lv]}
            </motion.span>
            {line && <span className="h-track">{line}</span>}
          </motion.button>
        );
      })}
    </div>
  );
}

/** What the district's past alerts at this level actually did, with counts and periods. */
export function TrackRecord({ rec, level, base }) {
  if (!rec || level === "nodata") return <p className="note">No past record yet.</p>;
  const all = rec.all?.[level], held = rec.heldout?.[level];
  const enough = all && all.times >= MIN_TIMES;
  return (
    <div>
      {enough ? (
        <RecordRing correct={all.right} total={all.times} text={`${recordLine(all, level)}, ${fmt(all.from)} to ${fmt(all.to)}.`} />
      ) : (
        <p className="note">{recordLine(all, level) || "No past record yet."}</p>
      )}
      {held && held.times > 0 && (
        <p className="note">
          Since {fmt(held.from)}, years the method was not built on: right {held.right} of {held.times} times
          ({Math.round((held.right / held.times) * 100)}%){held.times < MIN_TIMES ? ", too few to judge on their own" : ""}.
        </p>
      )}
      {base != null && (
        <p className="note">
          For comparison, a month here had more cases than usual {Math.round(base * 100)}% of the time anyway
          {level === "normal" ? `, so a Normal outlook is right ${100 - Math.round(base * 100)}% of the time by chance` : ""}.
          {level === "watch" ? " A Watch is an early hint; a Warning needs both rain and cases to be up." : ""}
        </p>
      )}
      <p className="note">
        "Right" means that month really did {level === "normal" ? "not have" : "have"} more cases than usual for this district.
        These are past results, not the chance for next month.
      </p>
    </div>
  );
}

export function Check({ text, delay }) {
  const [done, setDone] = useState(false);
  return (
    <motion.li initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}>
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
    </motion.li>
  );
}

export function CountEntry({ month, known, current, onSave }) {
  const [value, setValue] = useState(known ? String(current) : "");
  const [state, setState] = useState({ busy: false, msg: "" });
  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d+$/.test(value.trim())) { setState({ busy: false, msg: "Enter a whole number of cases.", error: true }); return; }
    setState({ busy: true, msg: "Saving…" });
    try { await onSave(value.trim()); setState({ busy: false, msg: "Saved. The outlook has been updated." }); }
    catch (err) { setState({ busy: false, msg: err.message, error: true }); }
  };
  return (
    <form onSubmit={submit}>
      <h3>{known ? "Update" : "Add"} {fmt(month)} case count</h3>
      <div className="entry">
        <input type="number" min="0" inputMode="numeric" placeholder="Number of cases" value={value}
          onChange={(e) => setValue(e.target.value)} aria-label={`Cases in ${fmt(month)}`} />
        <motion.button className="btn" type="submit" disabled={state.busy} whileHover={{ y: -1 }} whileTap={{ scale: 0.96 }}>
          {state.busy ? <span className="spinner" /> : known ? "Update" : "Add count"}
        </motion.button>
      </div>
      <AnimatePresence mode="wait">
        <motion.p key={state.msg || "hint"} className={`note ${state.error ? "err" : ""}`}
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {state.msg || (known ? "Saved counts are used straight away."
            : "Public reports arrive weeks late. Adding this month's count from hospital and PHI records makes the outlook more reliable.")}
        </motion.p>
      </AnimatePresence>
    </form>
  );
}
