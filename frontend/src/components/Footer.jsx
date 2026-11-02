import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Icon } from "../icons.jsx";
import { fmt, levelColor } from "../lib.js";
import { AnimatedNumber } from "./bits.jsx";

const reveal = {
  hidden: { opacity: 0, y: 18 },
  show: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] } }),
};
const inView = { initial: "hidden", whileInView: "show", viewport: { once: true, amount: 0.25 } };

function Glow({ className, x, y, duration }) {
  return (
    <motion.span className={`glow ${className}`} aria-hidden="true"
      animate={{ x: [0, x, 0], y: [0, y, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }} />
  );
}

/** Counts up the first time it scrolls into view. */
function Stat({ value, suffix, label, i }) {
  return (
    <motion.div className="stat-card" custom={i} variants={reveal} {...inView} whileHover={{ y: -3 }}>
      <motion.div className="n" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
        <InViewNumber value={value} />{suffix && <small>{suffix}</small>}
      </motion.div>
      <div className="l">{label}</div>
    </motion.div>
  );
}
function InViewNumber({ value }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, amount: 0.6 });
  return <span ref={ref}><AnimatedNumber value={seen ? value : 0} duration={1.4} /></span>;
}

export default function Footer({ summary }) {
  const d = summary.data;
  const firstYear = 2007;
  const caseYears = +(d.last_case_report || "2007").slice(0, 4) - firstYear + 1;
  const [ry, rm] = (d.last_rain_month || "2006-01").split("-").map(Number);
  const rainMonths = (ry - 2006) * 12 + rm;
  const warn = summary.pooled?.["1"]?.heldout?.warning?.precision;
  const levels = [
    ["warning", "Warning", "Rain and cases both above normal. Prioritise local review and preventive outreach."],
    ["watch", "Watch", "One signal up, usually rain. A prompt to check the latest case count, not a prediction on its own."],
    ["normal", "Normal", "Neither signal up. Continue routine prevention."],
  ];

  return (
    <footer className="footer">
      <Glow className="a" x={80} y={40} duration={18} />
      <Glow className="b" x={-90} y={-50} duration={22} />
      <Glow className="c" x={-60} y={30} duration={26} />
      <div className="frost" aria-hidden="true" />
      <div className="topline" aria-hidden="true" />

      <div className="stats">
        <Stat i={0} value={25} label="districts monitored" />
        <Stat i={1} value={caseYears} label={`years of case reports (2007–${(d.last_case_report || "").slice(0, 4)})`} />
        <Stat i={2} value={rainMonths} label="months of daily satellite rainfall" />
        {warn != null && <Stat i={3} value={Math.round(warn * 100)} suffix="%" label={`Warning hit rate, 1 month ahead, all districts, Jan 2018 to ${fmt(d.last_case_report?.slice(0, 7))}`} />}
      </div>

      <div className="footer-inner">
        <motion.div custom={0} variants={reveal} {...inView}>
          <div className="brandline">
            <motion.div className="logo" whileHover={{ rotate: -8, scale: 1.08 }}><Icon.logo /></motion.div>
            <div className="name">LeptoWatch <span>Lanka</span></div>
          </div>
          <p className="lead">
            LeptoWatch helps district health teams in Sri Lanka see, weeks ahead, whether leptospirosis is likely to run
            above normal in their district. It compares recent rainfall and case counts with what is usual for each
            district at that time of year.
          </p>
          <p>Use it to time awareness campaigns, brief Public Health Inspectors and prepare hospitals before cases rise.</p>
        </motion.div>

        <motion.div custom={1} variants={reveal} {...inView}>
          <h4>How to read the map</h4>
          <dl>
            {levels.map(([lv, name, text], i) => (
              <motion.div key={lv} className="level-row" initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.1 }} whileHover={{ x: 4 }}>
                <dt><i className="key" style={{ background: levelColor(lv) }} />{name}</dt>
                <dd>{text}</dd>
              </motion.div>
            ))}
          </dl>
        </motion.div>

        <motion.div custom={2} variants={reveal} {...inView}>
          <h4>Data</h4>
          <ul>
            <li><span className="live" /><span><b>Rainfall</b> · CHIRPS satellite rainfall, to {fmt(d.last_rain_month)}</span></li>
            <li><span className="live late" /><span><b>Cases</b> · Epidemiology Unit weekly reports, to {fmt(d.last_case_report?.slice(0, 7))}</span></li>
            <li><span className="live" /><span><b>Your counts</b> · case numbers entered by district officers</span></li>
            <li><span className="live" /><span><b>Boundaries</b> · geoBoundaries (CC BY 4.0)</span></li>
          </ul>
          <p className="note">Public case reports are published 8–11 weeks late, so recent months rely on rainfall and officer counts.</p>
        </motion.div>
      </div>

      <div className="footer-base">
        <a className="to-top" href="#/about">How it works and how well it has done ›</a>
      </div>
    </footer>
  );
}
