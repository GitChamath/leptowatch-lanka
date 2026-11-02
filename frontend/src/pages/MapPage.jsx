import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import MapView from "../components/MapView.jsx";
import Panel from "../components/Panel.jsx";
import { AnimatedNumber, Segmented } from "../components/bits.jsx";
import { LEVEL, LEVELS, LEVEL_MEANING, fmt, levelColor } from "../lib.js";

/** Count of districts at each level, and the Warning/Watch districts in priority order. */
export function useTally(summary, levelOf) {
  return useMemo(() => {
    const tally = { warning: 0, watch: 0, normal: 0 };
    const rank = { warning: 0, watch: 1 };
    const names = summary ? Object.keys(summary.districts) : [];
    names.forEach((n) => { const l = levelOf(n); if (l in tally) tally[l]++; });
    const attention = names.filter((n) => levelOf(n) in rank)
      .sort((a, b) => rank[levelOf(a)] - rank[levelOf(b)] || a.localeCompare(b))
      .map((n) => ({ name: n, level: levelOf(n) }));
    return { tally, attention };
  }, [summary, levelOf]);
}

export function Counts({ tally }) {
  return (
    <div className="counts">
      {LEVELS.map((l) => (
        <motion.div key={l} className="count" layout>
          <i className="key" style={{ background: levelColor(l) }} />
          <b><AnimatedNumber value={tally[l]} duration={0.5} /></b>{LEVEL[l]}
        </motion.div>
      ))}
    </div>
  );
}

export function Legend() {
  return (
    <div className="legend glass">
      {[...LEVELS, "nodata"].map((l) => <span key={l}><i className="key" style={{ background: levelColor(l) }} /><b>{LEVEL[l]}</b><em>{LEVEL_MEANING[l]}</em></span>)}
    </div>
  );
}

export default function MapPage({ summary, geo, lag, onLag, getDistrict }) {
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    let live = true;
    setDetail(null);
    getDistrict(selected).then((d) => live && setDetail(d));
    return () => { live = false; };
  }, [selected, summary]); // eslint-disable-line react-hooks/exhaustive-deps

  const levelOf = useCallback((n) => summary.districts?.[n]?.current?.[lag]?.level || "nodata", [summary, lag]);
  const { tally, attention } = useTally(summary, levelOf);

  const select = (n) => {
    setSelected(n);
    if (matchMedia("(max-width: 760px)").matches)
      setTimeout(() => document.querySelector(".panel")?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  return (
    <>
      <div className="toolbar">
        <Segmented label="Forecast" value={lag} onChange={onLag}
          options={summary.horizon.map((m, i) => [String(i + 1), `${fmt(m)} · ${i === 0 ? "next month" : "month after"}`])} />
        <Counts tally={tally} />
      </div>
      <main className="layout">
        <motion.section className="mapcard" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <Legend />
          <div className="map-area">
            <MapView geo={geo} levelOf={levelOf} selected={selected} onSelect={select} />
          </div>
          <Panel selected={selected} detail={detail} mode="outlook" lag={lag} tally={tally}
            target={fmt(summary.horizon[+lag - 1])} rainMonth={summary.data.last_rain_month}
            onClose={() => setSelected(null)} attention={attention} onPick={select} />
        </motion.section>
      </main>
    </>
  );
}
