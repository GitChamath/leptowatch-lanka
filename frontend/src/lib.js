export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const fmt = (m) => (m ? `${MONTHS[+m.slice(5) - 1]} ${m.slice(0, 4)}` : "—");
export const mon = (m) => (m ? MONTHS[+m.slice(5) - 1] : "—");

export const LEVEL = { warning: "Warning", watch: "Watch", normal: "Normal", nodata: "No data" };
export const LEVEL_MEANING = {
  warning: "Priority follow-up needed",
  watch: "Monitor conditions closely",
  normal: "No signal above the threshold",
  nodata: "Not enough data to assess",
};
export const LEVELS = ["warning", "watch", "normal"];
export const COLOR_VAR = { warning: "--warning", watch: "--watch", normal: "--normal", nodata: "--nodata" };

export const WHY = {
  warning: "Rain and cases are both above normal for this district. Prioritise local review and preventive outreach.",
  watch: "One signal is up. This alone is a weak predictor, so treat it as a prompt to check the latest case count.",
  normal: "Neither rain nor cases are above normal for this time of year.",
  nodata: "Not enough data to assess this district.",
};

/** Plain explanation of why the current outlook has its level, given which signals are known. */
export function whyText(c) {
  if (!c) return WHY.nodata;
  const caseKnown = c.case_signal != null;
  if (c.level === "warning") return WHY.warning;
  if (c.level === "watch") {
    if (c.rain_signal && !caseKnown) return "Rain signal only: it has been wetter than usual. Rain alone is a weak predictor, so check this month's case count to confirm or clear it.";
    if (c.rain_signal) return "Wetter than usual, but cases are not above normal. Keep an eye on it.";
    return "Cases are above normal, but rain is not. Keep an eye on it.";
  }
  return caseKnown ? WHY.normal : "Rain is not above usual. This month's case count is not available yet.";
}

export const ACTIONS = {
  warning: [
    "Review the situation with the Regional Epidemiologist and the district leptospirosis steering committee",
    "Start preventive outreach in farming villages, following the paddy-season guideline",
    "Ask hospitals to be ready for a possible rise in cases",
    "Ask health authorities whether preventive measures for high-exposure farmers are needed",
  ],
  watch: [
    "Check this month's case count from hospital and PHI reports, and enter it here",
    "Brief Public Health Inspectors on the higher rainfall",
    "Remind farming communities of routine precautions",
  ],
  normal: ["Continue routine seasonal prevention"],
  nodata: [],
};

export const PROVINCE = {
  Colombo: "Western", Gampaha: "Western", Kalutara: "Western", Kandy: "Central", Matale: "Central",
  "Nuwara Eliya": "Central", Galle: "Southern", Matara: "Southern", Hambantota: "Southern", Jaffna: "Northern",
  Kilinochchi: "Northern", Mannar: "Northern", Vavuniya: "Northern", Mullaitivu: "Northern", Batticaloa: "Eastern",
  Ampara: "Eastern", Trincomalee: "Eastern", Kurunegala: "North Western", Puttalam: "North Western",
  Anuradhapura: "North Central", Polonnaruwa: "North Central", Badulla: "Uva", Monaragala: "Uva",
  Ratnapura: "Sabaragamuwa", Kegalle: "Sabaragamuwa",
};

export const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
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
export async function api(url, opts) {
  const r = await fetch(url, opts);
  const body = await r.json();
  if (!r.ok) throw new Error(body.error || r.statusText);
  return body;
}
