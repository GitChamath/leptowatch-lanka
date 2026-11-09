import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import MapView from "../components/MapView.jsx";
import Panel from "../components/Panel.jsx";
import { Segmented } from "../components/bits.jsx";
import { Icon } from "../icons.jsx";
import { api, fmt } from "../lib.js";
import { Counts, Legend, useTally } from "./MapPage.jsx";

/** Replays what LeptoWatch would have said for any past month, checked against what happened. */
export default function HistoryPage({ summary, geo }) {
  const months = useMemo(() => {
    const list = [], last = summary.data.last_case_month;
    for (let y = 2011; y <= +last.slice(0, 4); y++)
      for (let m = 1; m <= 12; m++) {
        const k = `${y}-${String(m).padStart(2, "0")}`;
        if (k <= last) list.push(k);
      }
    return list;
  }, [summary]);
  const [monthIdx, setMonthIdx] = useState(() => Math.max(0, months.indexOf("2018-12")));
  const [lag, setLag] = useState("1");
  const [past, setPast] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState(null);
  const monthKey = months[monthIdx];

  useEffect(() => {
    if (!monthKey) return;
    let live = true;
    api(`/api/replay?month=${monthKey}&lag=${lag}`).then((p) => live && setPast(p));
    return () => { live = false; };
  }, [monthKey, lag]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setMonthIdx((i) => {
      if (i >= months.length - 1) { setPlaying(false); return i; }
      return i + 1;
    }), 900);
    return () => clearInterval(t);
  }, [playing, months.length]);

  const levelOf = useCallback((n) => past?.districts?.[n]?.level || "nodata", [past]);
  const { tally } = useTally(summary, levelOf);

  return (
    <>
      <div className="toolbar">
        <div className="page-intro">
          <h1>Past seasons</h1>
          <p>Go back to any month since 2011 and see whether the warnings were right.</p>
        </div>
        <Segmented label="Forecast made" value={lag} onChange={setLag}
          options={[["1", "1 month before"], ["2", "2 months before"]]} />
        <Counts tally={tally} />
      </div>
      <main className="layout">
        <motion.section className="mapcard pop-in">
          <Legend />
          <div className="map-area">
            <MapView geo={geo} levelOf={levelOf} selected={selected} onSelect={setSelected} />
            <div className="timeline glass">
              <motion.button className="play" onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause" : "Play"} whileTap={{ scale: 0.9 }}>
                {playing ? <Icon.pause /> : <Icon.play />}
              </motion.button>
              <div className="track">
                <input type="range" min={0} max={months.length - 1} value={monthIdx} aria-label="Month"
                  onChange={(e) => { setPlaying(false); setMonthIdx(+e.target.value); }} />
                <div className="years">
                  {[...new Set(months.map((m) => m.slice(0, 4)))].filter((_, i) => i % 2 === 0).map((y) => <span key={y}>{y}</span>)}
                </div>
              </div>
              <div key={monthKey} className="month-label rise">{fmt(monthKey)}</div>
            </div>
          </div>
          <Panel selected={selected} mode="past" lag={lag} past={past} monthKey={monthKey} tally={tally}
            target={fmt(monthKey)} onClose={() => setSelected(null)} />
        </motion.section>
      </main>
    </>
  );
}
