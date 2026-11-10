import { MONTH_NAMES, byLang, getLang, t } from "./i18n.js";

const monthName = (m) => (MONTH_NAMES[getLang()] || MONTH_NAMES.en)[+m.slice(5) - 1];
export const fmt = (m) => (m ? `${monthName(m)} ${m.slice(0, 4)}` : "—");
export const mon = (m) => (m ? monthName(m) : "—");
/** "9 Nov" from an ISO date. */
export const fmtDay = (d) => (d ? `${+d.slice(8, 10)} ${monthName(d.slice(0, 7))}` : "—");

/** Where a forecast month sits relative to today: "this month", "next month", "last month", ... */
export function whenLabel(m) {
  const now = new Date();
  const d = (+m.slice(0, 4) - now.getFullYear()) * 12 + (+m.slice(5) - 1 - now.getMonth());
  if (d === 0) return t("when_this");
  if (d === 1) return t("when_next");
  if (d === -1) return t("when_last");
  return d > 1 ? t("when_in", { n: d }) : t("when_ago", { n: -d });
}

export const LEVEL = byLang({
  en: { warning: "Warning", watch: "Watch", normal: "Normal", nodata: "No data", needcount: "Needs case count" },
  si: { warning: "අනතුරු ඇඟවීම", watch: "සුපරීක්ෂාව", normal: "සාමාන්‍ය", nodata: "දත්ත නැත", needcount: "රෝගී සංඛ්‍යාව අවශ්‍යයි" },
  ta: { warning: "எச்சரிக்கை", watch: "கண்காணிப்பு", normal: "இயல்பு", nodata: "தரவு இல்லை", needcount: "நோயாளர் எண்ணிக்கை தேவை" },
});
export const LEVEL_MEANING = byLang({
  en: { warning: "Priority follow-up needed", watch: "Monitor conditions closely", normal: "No signal above the threshold", nodata: "Not enough data to assess", needcount: "Wetter than usual; add the last 4 weeks' cases to decide" },
  si: { warning: "ප්‍රමුඛ පසු විපරම් අවශ්‍යයි", watch: "තත්ත්වය සමීපව නිරීක්ෂණය කරන්න", normal: "සීමාවට වඩා සංඥාවක් නැත", nodata: "තක්සේරු කිරීමට ප්‍රමාණවත් දත්ත නැත", needcount: "සුපුරුදු ප්‍රමාණයට වඩා තෙත්; තීරණය කිරීමට පසුගිය සති 4 රෝගී සංඛ්‍යාව ඇතුළත් කරන්න" },
  ta: { warning: "முன்னுரிமைப் பின்தொடர்தல் தேவை", watch: "நிலைமையை உன்னிப்பாகக் கண்காணியுங்கள்", normal: "வரம்புக்கு மேல் சமிக்ஞை இல்லை", nodata: "மதிப்பிடப் போதுமான தரவு இல்லை", needcount: "வழக்கத்தை விட ஈரமானது; தீர்மானிக்கக் கடந்த 4 வார நோயாளர் எண்ணிக்கையைச் சேர்க்கவும்" },
});
export const LEVELS = ["warning", "watch", "normal"];
const COLOR_VAR = { warning: "--warning", watch: "--watch", watch_rain: "--watch-rain", needcount: "--needcount", normal: "--normal", nodata: "--nodata" };
/** Weekly map categories, in order: a Watch with no case count yet is shown on its own (see shownLevel). */
/** One alert covers the next 8 weeks: both scored windows come from the same rule and data on the decision day
 * (research/PREREG_weekly_lead2.md), so the record shown is the first, stretched to the end of the second. */
export function eightWeeks(w) {
  if (!w?.districts) return w;
  const districts = Object.fromEntries(Object.entries(w.districts).map(([n, d]) => [n,
    d?.["1"] ? { ...d, "1": { ...d["1"], target_end: d["2"]?.target_end || d["1"].target_end } } : d]));
  return { ...w, districts };
}

export const SHOWN = ["warning", "watch", "needcount", "normal"];

/** What the weekly map shows. A Watch with no case count at all is "needs case count": in the back-test, rain alone
 * was right only about as often as chance, so it should not look like a Watch until cases are known. */
export const shownLevel = (c) => (!c ? "nodata" : c.level === "watch" && c.case_signal == null ? "needcount" : c.level);

/** A Watch on rain alone where the case count is known and not above usual. Shown paler on the map. */
export const rainOnly = (c) => !!c && c.level === "watch" && !!c.rain_signal && c.case_signal === false;

export const WHY = new Proxy({}, { get: (_, k) => t(`why_${String(k)}`) });

/** Plain explanation of why the current outlook has its level, given which signals are known. */
export function whyText(c) {
  if (!c) return WHY.nodata;
  const caseKnown = c.case_signal != null;
  if (c.level === "warning") return WHY.warning;
  if (c.level === "watch") {
    if (c.rain_signal && !caseKnown) return t("why_rain_only");
    if (c.rain_signal && c.case_signal) return t("why_rain_cases_low");   // weekly: cases up but below 1.4 x normal
    if (c.rain_signal) return t("why_rain_not_cases");
    return t("why_cases_not_rain");
  }
  return caseKnown ? WHY.normal : t("why_normal_nocase");
}

/** The "based on" line for a weekly record: an up-to-date count, the latest (late) public report, or rain only. */
export function weeklyBasis(c) {
  if (c.case_signal == null) return t("wk_basis_rain", { date: fmtDay(c.decided) });
  if (!c.officer && c.cases_to && c.cases_to !== c.decided) {
    return t("wk_basis_public", { date: fmtDay(c.decided), cases: fmtDay(c.cases_to) });
  }
  return t("wk_basis", { date: fmtDay(c.decided) });
}

/** For a rain-only Watch: the smallest case count that would turn it into a Warning (cases must exceed the usual). */
export function casesForWarning(c) {
  if (!c || c.level !== "watch" || !c.rain_signal || c.case_signal === true || c.cases_normal == null) return null;
  return Math.floor(c.cases_normal) + 1;
}

export const ACTIONS = byLang({
  en: {
    warning: [
      "Review the situation with the Regional Epidemiologist and the district leptospirosis steering committee",
      "Start preventive outreach in farming villages, following the paddy-season guideline",
      "Ask hospitals to be ready for a possible rise in cases",
      "Ask health authorities whether preventive measures for high-exposure farmers are needed",
    ],
    watch: [
      "Check the latest case count from hospital and PHI reports, and enter it here",
      "Brief Public Health Inspectors on the higher rainfall",
      "Remind farming communities of routine precautions",
    ],
    normal: ["Continue routine seasonal prevention"],
    nodata: [],
  },
  si: {
    warning: [
      "ප්‍රාදේශීය වසංගත රෝග විද්‍යාඥයා සහ දිස්ත්‍රික් මී උණ මෙහෙයුම් කමිටුව සමඟ තත්ත්වය සමාලෝචනය කරන්න",
      "කුඹුරු කන්න මාර්ගෝපදේශය අනුව ගොවි ගම්මානවල වැළැක්වීමේ දැනුවත් කිරීම් අරඹන්න",
      "රෝගීන් වැඩිවිය හැකි බැවින් සූදානම්ව සිටින ලෙස රෝහල්වලට දන්වන්න",
      "වැඩි අවදානමක් ඇති ගොවීන් සඳහා වැළැක්වීමේ පියවර අවශ්‍යදැයි සෞඛ්‍ය බලධාරීන්ගෙන් විමසන්න",
    ],
    watch: [
      "රෝහල් සහ මහජන සෞඛ්‍ය පරීක්ෂක වාර්තාවලින් නවතම රෝගී සංඛ්‍යාව පරීක්ෂා කර මෙහි ඇතුළත් කරන්න",
      "වැඩි වර්ෂාපතනය ගැන මහජන සෞඛ්‍ය පරීක්ෂකවරුන් දැනුවත් කරන්න",
      "සුපුරුදු ආරක්ෂිත පියවර ගැන ගොවි ප්‍රජාවට මතක් කරන්න",
    ],
    normal: ["සුපුරුදු කන්න වැළැක්වීමේ කටයුතු දිගටම කරන්න"],
    nodata: [],
  },
  ta: {
    warning: [
      "பிராந்திய தொற்றுநோயியல் நிபுணர் மற்றும் மாவட்ட எலிக்காய்ச்சல் வழிநடத்தல் குழுவுடன் நிலைமையை மீளாய்வு செய்யுங்கள்",
      "நெல் பருவ வழிகாட்டலின்படி விவசாயக் கிராமங்களில் தடுப்பு விழிப்புணர்வைத் தொடங்குங்கள்",
      "நோயாளர்கள் அதிகரிக்கக்கூடும் என்பதால் தயாராக இருக்குமாறு மருத்துவமனைகளிடம் கேளுங்கள்",
      "அதிக ஆபத்துள்ள விவசாயிகளுக்குத் தடுப்பு நடவடிக்கைகள் தேவையா என்று சுகாதார அதிகாரிகளிடம் கேளுங்கள்",
    ],
    watch: [
      "மருத்துவமனை மற்றும் PHI அறிக்கைகளிலிருந்து சமீபத்திய நோயாளர் எண்ணிக்கையைச் சரிபார்த்து இங்கே உள்ளிடுங்கள்",
      "அதிக மழைவீழ்ச்சி பற்றி பொதுச் சுகாதாரப் பரிசோதகர்களுக்குத் தெரிவியுங்கள்",
      "வழக்கமான முன்னெச்சரிக்கைகளை விவசாயச் சமூகங்களுக்கு நினைவூட்டுங்கள்",
    ],
    normal: ["வழக்கமான பருவகாலத் தடுப்பைத் தொடருங்கள்"],
    nodata: [],
  },
});

export const PROVINCE = {
  Colombo: "Western", Gampaha: "Western", Kalutara: "Western", Kandy: "Central", Matale: "Central",
  "Nuwara Eliya": "Central", Galle: "Southern", Matara: "Southern", Hambantota: "Southern", Jaffna: "Northern",
  Kilinochchi: "Northern", Mannar: "Northern", Vavuniya: "Northern", Mullaitivu: "Northern", Batticaloa: "Eastern",
  Ampara: "Eastern", Trincomalee: "Eastern", Kurunegala: "North Western", Puttalam: "North Western",
  Anuradhapura: "North Central", Polonnaruwa: "North Central", Badulla: "Uva", Monaragala: "Uva",
  Ratnapura: "Sabaragamuwa", Kegalle: "Sabaragamuwa",
};

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
export const levelColor = (lv) => cssVar(COLOR_VAR[lv] || "--nodata");

/* ---------- map geometry ---------- */
const project = ([lon, lat]) => [(lon - 79.5) * 95 + 4, (9.95 - lat) * 95 + 4];

export function pathOf(geom) {
  return geom.coordinates
    .map((poly) => poly.map((ring) => "M" + ring.map((p) => project(p).map((v) => v.toFixed(1)).join(",")).join("L") + "Z").join(""))
    .join("");
}

export function centroidOf(geom) {
  let best = [0, 0], bestA = 0;
  for (const poly of geom.coordinates) {
    const ring = poly[0].map(project);
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x0, y0] = ring[i], [x1, y1] = ring[i + 1], f = x0 * y1 - x1 * y0;
      a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
    }
    if (Math.abs(a) > bestA) { bestA = Math.abs(a); best = [cx / (3 * a), cy / (3 * a)]; }
  }
  return best;
}

/* ---------- API ---------- */
/* The static copy of the dashboard (scripts/export_static.py, for any static web host) sets window.LW_STATIC and
 * serves each API answer as a JSON file. There, an officer's weekly count is applied in the browser with the same
 * rule as lw/weekly.py (level_of), using the normal the server pre-computed for a count entered today
 * (officer_normal); nothing is saved. */
const STATIC = typeof window !== "undefined" && !!window.LW_STATIC;
let staticWeekly = null;

function staticPath(url) {
  const [p, q] = url.split("?");
  if (p.startsWith("/api/district/")) return `api/district/${p.slice("/api/district/".length)}.json`;
  if (p === "/api/replay") {
    const s = new URLSearchParams(q);
    return `api/replay/${s.get("month")}-${s.get("lag")}.json`;
  }
  if (p.startsWith("/api/")) return `${p.slice(1)}.json`;
  return p.slice(1);
}

const plusDays = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

function officerCount(body) {
  const [name, end, value] = body.split(",").map((x) => x.trim());
  const d = staticWeekly?.districts?.[name];
  const c = Number(value);
  if (!d || !/^\d+$/.test(value)) throw new Error("Could not read that count.");
  for (const lead of ["1", "2"]) {
    const r = d[lead];
    if (!r || r.decided !== end) continue;
    const n = r.officer_normal;
    const up = n != null && c > n;
    const level = r.rain_signal && up && c > 1.4 * n ? "warning" : r.rain_signal || up ? "watch" : "normal";
    d[lead] = { ...r, cases_data_month: c, case_signal: n == null ? null : up, level,
      cases_normal: n == null ? null : Math.round(n * 10) / 10, expected: r.officer_expected,
      cases_for_warning: r.officer_cases_for_warning ?? null, low_confidence: r.officer_low,
      cases_to: end, officer: true, window_from: plusDays(end, -27),
      risk: null };              // the risk model runs on the server; a stale percentage is not shown beside a new count
  }
  return { saved: 1 };
}

export async function api(url, opts) {
  if (STATIC) {
    if (opts?.method === "POST") {
      if (url === "/api/weekly_cases") return officerCount(opts.body);
      throw new Error("Monthly counts need the local server (python scripts/serve.py).");
    }
    if (url === "/api/weekly" && staticWeekly) return structuredClone(staticWeekly);
    const r = await fetch(staticPath(url));
    if (!r.ok) throw new Error(r.statusText);
    const body = await r.json();
    if (url === "/api/weekly") { staticWeekly = body; return structuredClone(body); }
    return body;
  }
  const r = await fetch(url, opts);
  const body = await r.json();
  if (!r.ok) throw new Error(body.error || r.statusText);
  return body;
}
