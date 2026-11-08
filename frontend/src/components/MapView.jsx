import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LEVEL, centroidOf, levelColor, pathOf } from "../lib.js";
import { t } from "../i18n.js";

/**
 * Choropleth of the 25 districts. Districts drop in on first load, colours cross-fade when
 * the alert level changes, Warning districts pulse, and the selected one lifts forward.
 */
export default function MapView({ geo, levelOf, selected, onSelect, softOf = () => false }) {
  const fillOf = (n) => (softOf(n) ? "watch_rain" : levelOf(n));
  const shapes = useMemo(() => geo.features.map((f) => ({
    name: f.properties.name, d: pathOf(f.geometry), c: centroidOf(f.geometry),
  })), [geo]);
  const [hover, setHover] = useState(null);
  const box = useRef(null);

  const move = (e, name) => {
    const r = box.current.getBoundingClientRect();
    setHover({ name, x: e.clientX - r.left, y: e.clientY - r.top });
  };
  const sel = shapes.find((s) => s.name === selected);
  const labelled = shapes.filter((s) => s.name === selected || levelOf(s.name) === "warning");

  return (
    <div className="mapwrap" ref={box}>
      <svg id="map" viewBox="0 0 250 410" role="img" aria-label="Sri Lanka districts coloured by alert level">
        <defs>
          <filter id="lift" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1.2" stdDeviation="1.6" floodColor="#0f172a" floodOpacity="0.18" />
          </filter>
          <filter id="pop" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#0f172a" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* sea names and a soft shallow-water ring around the coast */}
        <g className="sea-names" aria-hidden="true">
          <text x="206" y="70">Bay of Bengal</text>
          <text x="150" y="404">Indian Ocean</text>
          <text x="22" y="356">Laccadive</text>
          <text x="22" y="364">Sea</text>
        </g>
        <motion.g className="shore" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 0.4 }}>
          {shapes.map((s) => <path key={s.name} d={s.d} />)}
        </motion.g>

        <g filter="url(#lift)">
          {shapes.map((s, i) => {
            const lv = levelOf(s.name);
            return (
              <motion.path
                key={s.name}
                d={s.d}
                className="district"
                tabIndex={0}
                role="button"
                aria-label={`${s.name}: ${LEVEL[lv]}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: selected && selected !== s.name ? 0.55 : 1, y: 0, fill: levelColor(fillOf(s.name)) }}
                transition={{
                  opacity: { duration: 0.35, delay: i * 0.025 }, y: { duration: 0.5, delay: i * 0.025, ease: [0.22, 1, 0.36, 1] },
                  fill: { duration: 0.6 },
                }}
                whileHover={{ opacity: 1 }}
                onClick={() => onSelect(s.name)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(s.name); } }}
                onMouseMove={(e) => move(e, s.name)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </g>

        {/* pulsing ring on every Warning district */}
        {shapes.filter((s) => levelOf(s.name) === "warning").map((s) => (
          <motion.path key={`pulse-${s.name}`} d={s.d} className="pulse"
            initial={{ strokeOpacity: 0 }}
            animate={{ strokeOpacity: [0.9, 0.1, 0.9], strokeWidth: [1.2, 3.2, 1.2] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} />
        ))}

        {/* selected district drawn again on top, lifted with a shadow */}
        <AnimatePresence>
          {sel && (
            <motion.path key={`sel-${sel.name}`} d={sel.d} className="selected" filter="url(#pop)"
              style={{ transformOrigin: `${sel.c[0]}px ${sel.c[1]}px`, transformBox: "view-box" }}
              initial={{ scale: 1, opacity: 0 }}
              animate={{ scale: 1.06, opacity: 1, fill: levelColor(fillOf(sel.name)) }}
              exit={{ scale: 1, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              onClick={() => onSelect(sel.name)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {labelled.map((s) => (
            <motion.text key={`lbl-${s.name}`} x={s.c[0]} y={s.c[1] + 2.5} className="label"
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}>
              {levelOf(s.name) === "warning" ? `⚠ ${s.name}` : s.name}
            </motion.text>
          ))}
        </AnimatePresence>
      </svg>

      <AnimatePresence>
        {hover && (
          <motion.div className="tip" style={{ left: hover.x, top: hover.y }}
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}>
            <i className="key" style={{ background: levelColor(fillOf(hover.name)) }} />
            {hover.name} — {LEVEL[levelOf(hover.name)]}{softOf(hover.name) ? ` · ${t("rain_only")}` : ""}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
