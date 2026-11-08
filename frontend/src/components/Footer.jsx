import { motion } from "framer-motion";
import { Icon } from "../icons.jsx";
import { useLang } from "../i18n.js";

const ABOUT = {
  en: "An early warning for leptospirosis (rat fever) for district health officers in Sri Lanka. For planning prevention, not for diagnosing patients.",
  si: "ශ්‍රී ලංකාවේ දිස්ත්‍රික් සෞඛ්‍ය නිලධාරීන් සඳහා මී උණ පූර්ව අනතුරු ඇඟවීමක්. වැළැක්වීම සැලසුම් කිරීම සඳහා මිස රෝගීන් හඳුනා ගැනීම සඳහා නොවේ.",
  ta: "இலங்கையின் மாவட்டச் சுகாதார அதிகாரிகளுக்கான எலிக்காய்ச்சல் முன்னெச்சரிக்கை. தடுப்பைத் திட்டமிடுவதற்கானது, நோயாளர்களைக் கண்டறிவதற்கானது அல்ல.",
};

function Glow({ className, x, y, duration }) {
  return (
    <motion.span className={`glow ${className}`} aria-hidden="true"
      animate={{ x: [0, x, 0], y: [0, y, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }} />
  );
}

/** Short footer: what this is. */
export default function Footer() {
  const lang = useLang();
  return (
    <footer className="footer simple">
      <Glow className="a" x={80} y={40} duration={18} />
      <Glow className="b" x={-90} y={-50} duration={22} />
      <div className="frost" aria-hidden="true" />
      <div className="topline" aria-hidden="true" />

      <div className="footer-inner">
        <div>
          <div className="brandline">
            <div className="logo"><Icon.logo /></div>
            <div className="name">LeptoWatch <span>Lanka</span></div>
          </div>
          <p>{ABOUT[lang] || ABOUT.en}</p>
        </div>
      </div>
    </footer>
  );
}
