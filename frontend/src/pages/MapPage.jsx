import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import MapView from "../components/MapView.jsx";
import Panel from "../components/Panel.jsx";
import { AnimatedNumber, Segmented } from "../components/bits.jsx";
import { LEVEL, LEVELS, LEVEL_MEANING, SHOWN, fmt, fmtDay, levelColor, rainOnly, shownLevel, whenLabel } from "../lib.js";
import { t } from "../i18n.js";

/** Count of districts at each level, and the Warning/Watch districts in priority order. */
export function useTally(summary, levelOf, keep = ALL) {
  return useMemo(() => {
    const tally = { warning: 0, watch: 0, needcount: 0, normal: 0 };
    const rank = { warning: 0, watch: 1, needcount: 2 };
    const names = summary ? Object.keys(summary.districts).filter(keep) : [];
    names.forEach((n) => { const l = levelOf(n); if (l in tally) tally[l]++; });
    const attention = names.filter((n) => levelOf(n) in rank)
      .sort((a, b) => rank[levelOf(a)] - rank[levelOf(b)] || a.localeCompare(b))
      .map((n) => ({ name: n, level: levelOf(n) }));
    return { tally, attention };
  }, [summary, levelOf, keep]);
}
const ALL = () => true;

export function Counts({ tally, rainCount }) {
  return (
    <div className="counts">
      {SHOWN.filter((l) => l !== "needcount" || tally.needcount > 0).map((l) => (
        <motion.div key={l} className="count" layout>
          <i className="key" style={{ background: levelColor(l) }} />
          <b><AnimatedNumber value={tally[l]} duration={0.5} /></b>{LEVEL[l]}
          {l === "watch" && rainCount > 0 && <small>({rainCount} {t("rain_only")})</small>}
        </motion.div>
      ))}
    </div>
  );
}

export function Legend({ soft = false }) {
  const items = soft ? ["warning", "watch", "watch_rain", "needcount", "normal", "nodata"] : [...LEVELS, "nodata"];
  return (
    <div className={`legend glass ${soft ? "low" : ""}`}>
      {items.map((l) => (
        <span key={l} title={l === "watch_rain" ? t("watch_rain_meaning") : LEVEL_MEANING[l]}><i className="key" style={{ background: levelColor(l) }} />
          <b>{l === "watch_rain" ? `${LEVEL.watch} · ${t("rain_only")}` : LEVEL[l]}</b>
          <em>{l === "watch_rain" ? t("watch_rain_meaning") : LEVEL_MEANING[l]}</em></span>
      ))}
    </div>
  );
}

/** The record behind a map view: weekly ("w1", the 8-week outlook) or monthly ("1", "2"). */
const recordOf = (summary, weekly, view, n) => (view.startsWith("w")
  ? weekly?.districts?.[n]?.[view.slice(1)] : summary.districts?.[n]?.current?.[view]);

/** Switcher options: weekly first when available, then the two monthly outlooks. */
const viewOptions = (summary, weekly) => (weekly
  ? [["w1", t("wk_8")]]
  : summary.horizon.map((m, i) => [String(i + 1), `${fmt(m)} · ${whenLabel(m)}`]));

export default function MapPage({ summary, geo, view, onView, weekly, getDistrict, onSaveWeekly }) {
  const lag = view;
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    let live = true;
    setDetail(null);
    getDistrict(selected).then((d) => live && setDetail(d));
    return () => { live = false; };
  }, [selected, summary]); // eslint-disable-line react-hooks/exhaustive-deps

  const soft = view.startsWith("w");                    // the weekly outlook: "needs case count" and rain-only Watches
  const levelOf = useCallback((n) => {
    const c = recordOf(summary, weekly, view, n);
    return soft ? shownLevel(c) : c?.level || "nodata";
  }, [summary, weekly, view, soft]);
  const { tally, attention: byLevel } = useTally(summary, levelOf);
  const softOf = useCallback((n) => soft && rainOnly(recordOf(summary, weekly, view, n)), [soft, summary, weekly, view]);
  const rainCount = useMemo(() => Object.keys(summary.districts).filter(softOf).length, [summary, softOf]);
  const attention = useMemo(() => byLevel
    .map((a) => ({ ...a, hp: !!recordOf(summary, weekly, view, a.name)?.risk?.high_priority, rain: softOf(a.name) }))
    .sort((a, b) => b.hp - a.hp || a.rain - b.rain), [byLevel, summary, weekly, view, softOf]);
  const wrec = view.startsWith("w") ? weekly?.districts?.[Object.keys(weekly?.districts || {})[0]]?.[view.slice(1)] : null;
  const target = wrec ? t("wk_range", { from: fmtDay(wrec.target_from), to: fmtDay(wrec.target_end) }) : fmt(summary.horizon[+view - 1]);

  const select = (n) => {
    setSelected(n);
    if (matchMedia("(max-width: 760px)").matches)
      setTimeout(() => document.querySelector(".panel")?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  return (
    <>
      <div className="toolbar">
        <Segmented label="Forecast" value={view} onChange={onView} options={viewOptions(summary, weekly)} />
        <Counts tally={tally} rainCount={rainCount} />
      </div>
      <main className="layout">
        <motion.section className="mapcard pop-in" style={{ animationDelay: "0.1s" }}>
          <Legend soft={soft} />
          <div className="map-area">
            <MapView geo={geo} levelOf={levelOf} softOf={softOf} selected={selected} onSelect={select} />
          </div>
          <Panel selected={selected} detail={detail} mode="outlook" lag={lag} tally={tally}
            weeklyRec={selected && view.startsWith("w") ? recordOf(summary, weekly, view, selected) : null}
            target={target} rainMonth={wrec ? null : summary.data.last_rain_month} weeklyTo={wrec?.decided}
            onClose={() => setSelected(null)} attention={attention} onPick={select} onSaveWeekly={onSaveWeekly} />
        </motion.section>
      </main>
    </>
  );
}
