import { useSyncExternalStore } from "react";

/**
 * English, Sinhala and Tamil text for the screens an officer works in (top bar, map, district card,
 * district report, farmer message). How it works and Past seasons stay in English.
 * Sinhala and Tamil are drafts and should be checked by a native speaker before real use.
 */
export const LANGS = [["en", "English"], ["si", "සිංහල"], ["ta", "தமிழ்"]];

let lang = (() => {
  try { const v = localStorage.getItem("lw-lang"); return ["en", "si", "ta"].includes(v) ? v : "en"; } catch { return "en"; }
})();
const listeners = new Set();
if (typeof document !== "undefined") document.documentElement.lang = lang;

export const getLang = () => lang;
export function setLang(l) {
  lang = l;
  try { localStorage.setItem("lw-lang", l); } catch { /* private mode: keep for this visit only */ }
  document.documentElement.lang = l;
  listeners.forEach((f) => f());
}
export function useLang() {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => lang);
}

/** Look a key up in the current language (falling back to English) and fill {placeholders}. */
export function t(key, vars = {}, l = lang) {
  const s = TEXT[l]?.[key] ?? TEXT.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
}

/** A per-language table read with the current language, e.g. byLang({en: {...}, si: {...}})[key]. */
export const byLang = (table) => new Proxy({}, { get: (_, k) => (table[lang] || table.en)[k] ?? table.en[k] });

export const MONTH_NAMES = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  si: ["ජනවාරි", "පෙබරවාරි", "මාර්තු", "අප්‍රේල්", "මැයි", "ජූනි", "ජූලි", "අගෝස්තු", "සැප්තැම්බර්", "ඔක්තෝබර්", "නොවැම්බර්", "දෙසැම්බර්"],
  ta: ["ஜனவரி", "பெப்ரவரி", "மார்ச்", "ஏப்ரல்", "மே", "ஜூன்", "ஜூலை", "ஓகஸ்ட்", "செப்டெம்பர்", "ஒக்டோபர்", "நவம்பர்", "டிசம்பர்"],
};

const DISTRICT_NAMES = {
  si: {
    Ampara: "අම්පාර", Anuradhapura: "අනුරාධපුර", Badulla: "බදුල්ල", Batticaloa: "මඩකලපුව", Colombo: "කොළඹ", Galle: "ගාල්ල",
    Gampaha: "ගම්පහ", Hambantota: "හම්බන්තොට", Jaffna: "යාපනය", Kalutara: "කළුතර", Kandy: "මහනුවර", Kegalle: "කෑගල්ල",
    Kilinochchi: "කිලිනොච්චිය", Kurunegala: "කුරුණෑගල", Mannar: "මන්නාරම", Matale: "මාතලේ", Matara: "මාතර", Monaragala: "මොණරාගල",
    Mullaitivu: "මුලතිව්", "Nuwara Eliya": "නුවරඑළිය", Polonnaruwa: "පොළොන්නරුව", Puttalam: "පුත්තලම", Ratnapura: "රත්නපුර",
    Trincomalee: "ත්‍රිකුණාමලය", Vavuniya: "වවුනියාව",
  },
  ta: {
    Ampara: "அம்பாறை", Anuradhapura: "அநுராதபுரம்", Badulla: "பதுளை", Batticaloa: "மட்டக்களப்பு", Colombo: "கொழும்பு", Galle: "காலி",
    Gampaha: "கம்பஹா", Hambantota: "அம்பாந்தோட்டை", Jaffna: "யாழ்ப்பாணம்", Kalutara: "களுத்துறை", Kandy: "கண்டி", Kegalle: "கேகாலை",
    Kilinochchi: "கிளிநொச்சி", Kurunegala: "குருநாகல்", Mannar: "மன்னார்", Matale: "மாத்தளை", Matara: "மாத்தறை", Monaragala: "மொனராகலை",
    Mullaitivu: "முல்லைத்தீவு", "Nuwara Eliya": "நுவரெலியா", Polonnaruwa: "பொலன்னறுவை", Puttalam: "புத்தளம்", Ratnapura: "இரத்தினபுரி",
    Trincomalee: "திருகோணமலை", Vavuniya: "வவுனியா",
  },
};
/** District name in a language (English when there is no translation). */
export const dname = (n, l = lang) => DISTRICT_NAMES[l]?.[n] || n;

const PROVINCE_NAMES = {
  si: { Western: "බස්නාහිර", Central: "මධ්‍යම", Southern: "දකුණු", Northern: "උතුරු", Eastern: "නැගෙනහිර", "North Western": "වයඹ",
    "North Central": "උතුරු මැද", Uva: "ඌව", Sabaragamuwa: "සබරගමුව" },
  ta: { Western: "மேல்", Central: "மத்திய", Southern: "தென்", Northern: "வட", Eastern: "கிழக்கு", "North Western": "வடமேல்",
    "North Central": "வடமத்திய", Uva: "ஊவா", Sabaragamuwa: "சப்ரகமுவ" },
};
export const province = (p) => t("province", { p: PROVINCE_NAMES[lang]?.[p] || p });

const TEXT = {
  en: {
    tagline: "District leptospirosis early warning",
    nav_home: "Home", nav_map: "Map", nav_history: "Past seasons", nav_about: "How it works",
    src_rain: "Rainfall", src_cases: "Case reports", language: "Language",
    toast_saved: "{district}: {month} count saved, outlook updated",
    province: "{p} Province",
    when_this: "this month", when_next: "next month", when_last: "last month", when_in: "in {n} months", when_ago: "{n} months ago",
    forecast: "Forecast", outlook: "Outlook", past_seasons: "Past seasons",
    ov_outlook: "Based on rainfall up to {month}. Click a district on the map to see its outlook.",
    ov_past: "What LeptoWatch would have said {ahead} ahead, checked against what really happened.",
    one_month: "one month", two_months: "two months",
    needs_attention: "Needs attention", none_attention: "No district has a Warning or Watch right now.",
    not_outbreak: "A coloured district means higher risk than usual, not a confirmed outbreak.",
    pick_month: "Pick a month on the slider, then click a district.",
    loading: "Loading…", outlook_for: "Outlook for {month}",
    basis_full_short: "Based on rainfall and cases for <b>{month}</b>.",
    basis_rain_short: "Based on <b>rainfall only</b>. The {month} case count is not in yet.",
    model_estimate: "Risk: <b>{p}</b> chance of more cases than usual",
    signals_disagree: "signals disagree", what_to_do: "What to do",
    open_report: "Open full report", open_report_note: "Rain and cases against usual, the rain forecast, and messages ready to send.",
    back: "← Back to map", month: "Month",
    why_warning: "Rain and cases are both above normal for this district. Prioritise local review and preventive outreach.",
    why_watch: "Rain or cases are up, but not both. Check the latest case count.",
    why_normal: "Neither rain nor cases are above normal for this time of year.",
    why_nodata: "Not enough data to assess this district.",
    why_rain_only: "It has been wetter than usual. Rain alone is not enough to be sure, so check the latest case count.",
    why_rain_not_cases: "Wetter than usual, but cases are not above normal. Keep an eye on it.",
    why_rain_cases_low: "Wetter than usual and cases are above normal, but not yet 1.4 times normal, which a Warning needs. Keep a close eye on it.",
    rain_only: "rain only", watch_rain_meaning: "Wetter than usual; no rise in cases known yet",
    why_cases_not_rain: "Cases are above normal, but rain is not. Keep an eye on it.",
    why_normal_nocase: "Rain is not above usual. This month's case count is not available yet.",
    basis_full: "Based on rain and cases for <b>{month}</b>.",
    basis_rain: "Based on rain only (<b>{month}</b>). Add the case count below for a clearer answer.",
    suggestions_note: "These are suggestions for health officers. A coloured outlook is not a confirmed outbreak.",
    nothing_extra: "Nothing extra this month.",
    why_says: "Why it says {level}", rainy_days_in: "Rainy days · {month}", cases_in: "Cases · {month}",
    usual_days: "Usual: {n} days", usual: "Usual: {n}", wetter: "▲ Wetter than usual", not_wetter: "Not wetter",
    more_cases: "▲ More than usual", not_more: "Not more", not_reported: "Not reported yet", waiting: "Waiting for count",
    rule_note: "Both up gives a Warning, one up gives a Watch, neither gives Normal.",
    usual_month: "A usual {month} in {district}", about_cases: "about {n} cases", worked_from: " · worked out from cases up to {month}",
    both_months: "Both months", both_note: "Both use the same {month} data. Two months ahead is less certain.",
    cases_chart: "Cases each month · 3 years to {month}", rain_chart: "Rainy days · last 12 months",
    past_record: "Past record here · {level}, {ahead} ahead",
    add_count: "Add {month} case count", update_count: "Update {month} case count", add_btn: "Add count", update_btn: "Update",
    count_placeholder: "Number of cases", count_whole: "Enter a whole number of cases.", saving: "Saving…",
    count_saved: "Saved. The outlook has been updated.", count_used: "Saved counts are used straight away.",
    count_hint: "Public reports arrive weeks late. Adding this month's count from hospital and PHI records makes the outlook more reliable.",
    to_warning: "{n} or more cases in {month} would make this a Warning.",
    risk_none: "<b>No risk percentage {ahead} ahead.</b> The model did not pass its calibration check at this distance, so only the alert level is shown.",
    risk_need: "Add the {month} case count to see the risk percentage.",
    risk_line: "chance of more cases than usual in {month}", risk_range: "(likely range {low} to {high})",
    disagree_long: "<b>Signals disagree.</b> The alert says {level}, but the risk percentage points the other way. Check local hospital and PHI data before acting.",
    low_conf: "Low confidence", low_conf_upto: "The usual case level here is based on case reports up to {month}.",
    low_conf_few: "The usual case level here is based on fewer than 9 of the last 12 months.",
    noun_warning: "Warnings", noun_watch: "Watch alerts", noun_normal: "Normal outlooks",
    rec_few: "Too few past {noun} here to judge", rec_short: "Right {right} of {times} times before",
    rec_long: "Past {noun} here were right {right} of {times} times ({pct}%)", rec_period: "{line}, {from} to {to}.",
    rec_held: "Since {from}, years the method was not built on: right {right} of {times} times ({pct}%)",
    rec_held_few: ", too few to judge on their own",
    rec_base: "For comparison, a month here had more cases than usual {pct}% of the time anyway",
    rec_base_normal: ", so a Normal outlook is right {pct}% of the time by chance",
    rec_watch_hint: " A Watch is an early hint; a Warning needs both rain and cases to be up.",
    rec_right: "\"Right\" means that month really did have more cases than usual for this district. These are past results, not the chance for next month.",
    rec_right_normal: "\"Right\" means that month really did not have more cases than usual for this district. These are past results, not the chance for next month.",
    no_record: "No past record yet.",
    lg_wetter: "Wetter than usual", lg_not_wetter: "Not wetter", lg_usual: "Usual", lg_reported: "Reported cases",
    lg_usual_month: "Usual for that month", lg_no_report: "No public report",
    hp_badge: "High priority",
    hp_note: "One of the strongest Warnings. Since 2018, Warnings like this were right {right} of {alerts} times ({pct}%), against {base}% of months by chance.",
    wk_next: "Next 4 weeks", wk_after: "Weeks 5–8", wk_eyebrow: "Weekly outlook", wk_range: "{from} to {to}",
    wk_risk: "chance of more cases than usual in these 4 weeks",
    wk_hp: "Since 2018, weekly Warnings like this were right {right} of {alerts} times ({pct}%).",
    wk_no_pct: "No risk percentage for weeks 5–8: the model did not pass its calibration check this far ahead.",
    wk_basis: "Based on rain in the 8 weeks and cases in the 4 weeks to <b>{date}</b>.",
    wk_basis_rain: "Based on <b>rain only</b> in the 8 weeks to <b>{date}</b>. Add the cases notified in the last 4 weeks to make it more reliable.",
    wk_rain: "Rainy days · 8 weeks to {date}", wk_cases: "Cases · 4 weeks to {date}",
    wk_add: "Cases notified in the 4 weeks to {date}",
    wk_hint: "Add up this district's notifications for the last 4 weeks from hospital and PHI returns. The outlook updates straight away.",
    wk_to_warning: "{n} or more cases in these 4 weeks would make this a Warning.",
    wk_fc_wet: "Rain forecast {from} to {to}: about {n} rainy days, usually {u}. Wetter than usual.",
    wk_fc_dry: "Rain forecast {from} to {to}: about {n} rainy days, usually {u}. Not wetter than usual.",
    wk_fc_note: "For information; not part of the alert.",
    wk_record: "Tested on 2018 onwards: weekly Warnings for the {lead} were right {p}% of the time, against {b}% by chance.",
    monthly_title: "Monthly outlook", monthly_tag: "{month} · monthly",
    past_right: "The forecast was right.", past_wrong: "The forecast was wrong.",
    past_unknown: "We don't know yet how this month turned out.", past_sub: "{month} · forecast made {ahead} before",
    what_happened: "What happened", usual_or_fewer: "Usual or fewer", fc_right: "✓ Forecast right", fc_wrong: "✕ Forecast wrong",
    past_record_short: "How often {level} was right here",
    rec_chance: "By chance alone, {pct}% of months here have more cases than usual.",
    wk_overview: "Based on data up to {date}. Click a district to see its outlook.",
    msg_title: "Messages to send", msg_farmer: "For farmers", msg_sms: "SMS to health staff", copy: "Copy", copied: "Copied",
    msg_note: "Drafts for the officer to check and send through their usual channels. LeptoWatch does not send anything.",
    sms_len: "{n} characters · {parts} SMS",
  },
  si: {
    tagline: "දිස්ත්‍රික් මී උණ පූර්ව අනතුරු ඇඟවීම",
    nav_home: "මුල් පිටුව", nav_map: "සිතියම", nav_history: "පසුගිය කන්න", nav_about: "ක්‍රියා කරන ආකාරය",
    src_rain: "වර්ෂාපතනය", src_cases: "රෝගී වාර්තා", language: "භාෂාව",
    toast_saved: "{district}: {month} සංඛ්‍යාව සුරකින ලදී, පුරෝකථනය යාවත්කාලීන විය",
    province: "{p} පළාත",
    when_this: "මෙම මාසය", when_next: "ලබන මාසය", when_last: "පසුගිය මාසය", when_in: "මාස {n}කින්", when_ago: "මාස {n}කට පෙර",
    forecast: "පුරෝකථනය", outlook: "පුරෝකථනය", past_seasons: "පසුගිය කන්න",
    ov_outlook: "{month} දක්වා වර්ෂාපතනය මත පදනම්ව. දිස්ත්‍රික්කයක පුරෝකථනය බැලීමට සිතියමේ එය ක්ලික් කරන්න.",
    ov_past: "LeptoWatch {ahead}කට පෙර පවසනු ඇති දේ, සැබවින්ම සිදු වූ දේ සමඟ සසඳා ඇත.",
    one_month: "මාසය", two_months: "මාස දෙක",
    needs_attention: "අවධානය අවශ්‍යයි", none_attention: "මේ මොහොතේ කිසිදු දිස්ත්‍රික්කයක අනතුරු ඇඟවීමක් හෝ සුපරීක්ෂාවක් නැත.",
    not_outbreak: "වර්ණ ගැන්වූ දිස්ත්‍රික්කයක් යනු සුපුරුදු ප්‍රමාණයට වඩා වැඩි අවදානමකි, තහවුරු වූ වසංගතයක් නොවේ.",
    pick_month: "ස්ලයිඩරයෙන් මාසයක් තෝරා, දිස්ත්‍රික්කයක් ක්ලික් කරන්න.",
    loading: "පූරණය වෙමින්…", outlook_for: "{month} සඳහා පුරෝකථනය",
    basis_full_short: "<b>{month}</b> වර්ෂාපතනය සහ රෝගීන් මත පදනම්ව.",
    basis_rain_short: "<b>වර්ෂාපතනය පමණක්</b> මත පදනම්ව. {month} රෝගී සංඛ්‍යාව තවම ලැබී නැත.",
    model_estimate: "අවදානම: සුපුරුදු ප්‍රමාණයට වඩා රෝගීන් වැඩිවීමේ සම්භාවිතාව <b>{p}</b>",
    signals_disagree: "සංඥා එකඟ නොවේ", what_to_do: "කළ යුතු දේ",
    open_report: "සම්පූර්ණ වාර්තාව විවෘත කරන්න", open_report_note: "සුපුරුදු ප්‍රමාණය සමඟ වැසි සහ රෝගීන්, වැසි පුරෝකථනය සහ යැවීමට සූදානම් පණිවිඩ.",
    back: "← සිතියමට ආපසු", month: "මාසය",
    why_warning: "මෙම දිස්ත්‍රික්කයේ වැසි සහ රෝගීන් යන දෙකම සාමාන්‍යයට වඩා වැඩිය. ප්‍රාදේශීය සමාලෝචනයට සහ වැළැක්වීමේ ක්‍රියාවලට ප්‍රමුඛත්වය දෙන්න.",
    why_watch: "වැසි හෝ රෝගීන් ඉහළයි, නමුත් දෙකම නොවේ. නවතම රෝගී සංඛ්‍යාව පරීක්ෂා කරන්න.",
    why_normal: "මෙම කාලයට වැසි හෝ රෝගීන් සාමාන්‍යයට වඩා වැඩි නැත.",
    why_nodata: "මෙම දිස්ත්‍රික්කය තක්සේරු කිරීමට ප්‍රමාණවත් දත්ත නැත.",
    why_rain_only: "සුපුරුදු ප්‍රමාණයට වඩා වැසි ඇත. වැසි පමණක් නිශ්චිත වීමට ප්‍රමාණවත් නැත, එබැවින් නවතම රෝගී සංඛ්‍යාව පරීක්ෂා කරන්න.",
    why_rain_not_cases: "සුපුරුදු ප්‍රමාණයට වඩා වැසි ඇත, නමුත් රෝගීන් සාමාන්‍යයට වඩා වැඩි නැත. අවධානයෙන් සිටින්න.",
    why_rain_cases_low: "සුපුරුදු ප්‍රමාණයට වඩා වැසි ඇති අතර රෝගීන්ද සාමාන්‍යයට වඩා වැඩිය, නමුත් අනතුරු ඇඟවීමකට අවශ්‍ය පරිදි සාමාන්‍යය මෙන් 1.4 ගුණයක් නොවේ. සමීපව අවධානයෙන් සිටින්න.",
    rain_only: "වැසි පමණක්", watch_rain_meaning: "සුපුරුදු ප්‍රමාණයට වඩා වැසි; රෝගීන් වැඩිවීමක් තවම නොදනී",
    why_cases_not_rain: "රෝගීන් සාමාන්‍යයට වඩා වැඩිය, නමුත් වැසි වැඩි නැත. අවධානයෙන් සිටින්න.",
    why_normal_nocase: "වැසි සුපුරුදු ප්‍රමාණයට වඩා වැඩි නැත. මෙම මාසයේ රෝගී සංඛ්‍යාව තවම නොලැබේ.",
    basis_full: "<b>{month}</b> වැසි සහ රෝගීන් මත පදනම්ව.",
    basis_rain: "වැසි පමණක් මත පදනම්ව (<b>{month}</b>). වඩා පැහැදිලි පිළිතුරක් සඳහා පහතින් රෝගී සංඛ්‍යාව ඇතුළත් කරන්න.",
    suggestions_note: "මේවා සෞඛ්‍ය නිලධාරීන් සඳහා යෝජනා පමණි. වර්ණ ගැන්වූ පුරෝකථනයක් තහවුරු වූ වසංගතයක් නොවේ.",
    nothing_extra: "මෙම මාසයේ අමතර දෙයක් නැත.",
    why_says: "{level} යැයි කියන්නේ ඇයි", rainy_days_in: "වැසි දින · {month}", cases_in: "රෝගීන් · {month}",
    usual_days: "සුපුරුදු: දින {n}", usual: "සුපුරුදු: {n}", wetter: "▲ සුපුරුදු ප්‍රමාණයට වඩා වැසි", not_wetter: "වැසි වැඩි නැත",
    more_cases: "▲ සුපුරුදු ප්‍රමාණයට වඩා වැඩි", not_more: "වැඩි නැත", not_reported: "තවම වාර්තා වී නැත", waiting: "සංඛ්‍යාව බලාපොරොත්තුවෙන්",
    rule_note: "දෙකම ඉහළ නම් අනතුරු ඇඟවීම, එකක් නම් සුපරීක්ෂාව, කිසිවක් නැත්නම් සාමාන්‍ය.",
    usual_month: "{district} හි සුපුරුදු {month} මාසයක්", about_cases: "රෝගීන් {n} පමණ", worked_from: " · {month} දක්වා රෝගීන්ගෙන් ගණනය කළේ",
    both_months: "මාස දෙකම", both_note: "දෙකම එකම {month} දත්ත භාවිතා කරයි. මාස දෙකකට පෙර පුරෝකථනය අඩු නිශ්චිතය.",
    cases_chart: "මාසිකව රෝගීන් · {month} දක්වා වසර 3", rain_chart: "වැසි දින · පසුගිය මාස 12",
    past_record: "මෙහි පසුගිය වාර්තාව · {level}, {ahead}කට පෙර",
    add_count: "{month} රෝගී සංඛ්‍යාව ඇතුළත් කරන්න", update_count: "{month} රෝගී සංඛ්‍යාව යාවත්කාලීන කරන්න", add_btn: "ඇතුළත් කරන්න", update_btn: "යාවත්කාලීන කරන්න",
    count_placeholder: "රෝගීන් ගණන", count_whole: "රෝගීන් ගණන පූර්ණ සංඛ්‍යාවක් ලෙස ඇතුළත් කරන්න.", saving: "සුරකිමින්…",
    count_saved: "සුරකින ලදී. පුරෝකථනය යාවත්කාලීන විය.", count_used: "සුරකින ලද සංඛ්‍යා වහාම භාවිතා වේ.",
    count_hint: "ප්‍රසිද්ධ වාර්තා සති ගණනක් ප්‍රමාද වේ. රෝහල් සහ මහජන සෞඛ්‍ය පරීක්ෂක වාර්තාවලින් මෙම මාසයේ සංඛ්‍යාව ඇතුළත් කිරීමෙන් පුරෝකථනය වඩා විශ්වාසදායක වේ.",
    to_warning: "{month} දී රෝගීන් {n} හෝ ඊට වැඩි නම් මෙය අනතුරු ඇඟවීමක් වේ.",
    risk_none: "<b>{ahead}කට පෙර අවදානම් ප්‍රතිශතයක් නැත.</b> මෙම කාල පරාසයේදී ආකෘතිය ක්‍රමාංකන පරීක්ෂාව සමත් නොවූ බැවින් අනතුරු ඇඟවීමේ මට්ටම පමණක් පෙන්වයි.",
    risk_need: "අවදානම් ප්‍රතිශතය බැලීමට {month} රෝගී සංඛ්‍යාව ඇතුළත් කරන්න.",
    risk_line: "{month} දී සුපුරුදු ප්‍රමාණයට වඩා රෝගීන් වැඩිවීමේ සම්භාවිතාව", risk_range: "(බොහෝ විට {low} සිට {high} දක්වා)",
    disagree_long: "<b>සංඥා එකඟ නොවේ.</b> අනතුරු ඇඟවීම {level} යැයි කියයි, නමුත් අවදානම් ප්‍රතිශතය වෙනත් දිශාවකට යයි. ක්‍රියා කිරීමට පෙර ප්‍රාදේශීය රෝහල් සහ PHI දත්ත පරීක්ෂා කරන්න.",
    low_conf: "අඩු විශ්වාසය", low_conf_upto: "මෙහි සුපුරුදු රෝගී මට්ටම {month} දක්වා රෝගී වාර්තා මත පදනම් වේ.",
    low_conf_few: "මෙහි සුපුරුදු රෝගී මට්ටම පසුගිය මාස 12 න් 9 කට අඩු ප්‍රමාණයක් මත පදනම් වේ.",
    noun_warning: "අනතුරු ඇඟවීම්", noun_watch: "සුපරීක්ෂා දැනුම්දීම්", noun_normal: "සාමාන්‍ය පුරෝකථන",
    rec_few: "විනිශ්චය කිරීමට මෙහි පසුගිය {noun} ප්‍රමාණවත් නැත", rec_short: "මීට පෙර වාර {times} න් {right} ක් නිවැරදියි",
    rec_long: "මෙහි පසුගිය {noun} වාර {times} න් {right} ක් නිවැරදි විය ({pct}%)", rec_period: "{line}, {from} සිට {to} දක්වා.",
    rec_held: "ක්‍රමය ගොඩනැගීමට භාවිතා නොකළ වසර වන {from} සිට: වාර {times} න් {right} ක් නිවැරදියි ({pct}%)",
    rec_held_few: ", තනිව විනිශ්චය කිරීමට ඉතා අඩුය",
    rec_base: "සැසඳීමට, මෙහි මාසයක රෝගීන් සුපුරුදු ප්‍රමාණයට වඩා වැඩි වූයේ කෙසේ හෝ කාලයෙන් {pct}% කි",
    rec_base_normal: ", එබැවින් සාමාන්‍ය පුරෝකථනයක් අහම්බෙන් {pct}% ක් නිවැරදි වේ",
    rec_watch_hint: " සුපරීක්ෂාව මුල් ඉඟියකි; අනතුරු ඇඟවීමකට වැසි සහ රෝගීන් යන දෙකම ඉහළ යා යුතුය.",
    rec_right: "\"නිවැරදි\" යනු එම මාසයේ මෙම දිස්ත්‍රික්කයට සුපුරුදු ප්‍රමාණයට වඩා රෝගීන් සැබවින්ම සිටි බවයි. මේවා පසුගිය ප්‍රතිඵල මිස ලබන මාසයේ සම්භාවිතාව නොවේ.",
    rec_right_normal: "\"නිවැරදි\" යනු එම මාසයේ මෙම දිස්ත්‍රික්කයට සුපුරුදු ප්‍රමාණයට වඩා රෝගීන් නොසිටි බවයි. මේවා පසුගිය ප්‍රතිඵල මිස ලබන මාසයේ සම්භාවිතාව නොවේ.",
    no_record: "තවම පසුගිය වාර්තාවක් නැත.",
    lg_wetter: "සුපුරුදු ප්‍රමාණයට වඩා වැසි", lg_not_wetter: "වැසි වැඩි නැත", lg_usual: "සුපුරුදු", lg_reported: "වාර්තා වූ රෝගීන්",
    lg_usual_month: "එම මාසයට සුපුරුදු", lg_no_report: "ප්‍රසිද්ධ වාර්තාවක් නැත",
    hp_badge: "ඉහළ ප්‍රමුඛතාව",
    hp_note: "ප්‍රබලතම අනතුරු ඇඟවීම්වලින් එකකි. 2018 සිට, මෙවැනි අනතුරු ඇඟවීම් වාර {alerts} න් {right} ක් නිවැරදි විය ({pct}%); අහම්බෙන් එය මාසවලින් {base}% කි.",
    wk_next: "ඉදිරි සති 4", wk_after: "සති 5–8", wk_eyebrow: "සතිපතා පුරෝකථනය", wk_range: "{from} සිට {to} දක්වා",
    wk_risk: "මෙම සති 4 තුළ සුපුරුදු ප්‍රමාණයට වඩා රෝගීන් වැඩිවීමේ සම්භාවිතාව",
    wk_hp: "2018 සිට, මෙවැනි සතිපතා අනතුරු ඇඟවීම් වාර {alerts} න් {right} ක් නිවැරදි විය ({pct}%).",
    wk_no_pct: "සති 5–8 සඳහා අවදානම් ප්‍රතිශතයක් නැත: මෙතරම් ඉදිරියට ආකෘතිය ක්‍රමාංකන පරීක්ෂාව සමත් නොවීය.",
    wk_basis: "<b>{date}</b> දක්වා සති 8 තුළ වැසි සහ සති 4 තුළ රෝගීන් මත පදනම්ව.",
    wk_basis_rain: "<b>{date}</b> දක්වා සති 8 තුළ <b>වැසි පමණක්</b> මත පදනම්ව. වඩා විශ්වාසදායක කිරීමට පසුගිය සති 4 තුළ දැනුම් දුන් රෝගීන් ඇතුළත් කරන්න.",
    wk_rain: "වැසි දින · {date} දක්වා සති 8", wk_cases: "රෝගීන් · {date} දක්වා සති 4",
    wk_add: "{date} දක්වා සති 4 තුළ දැනුම් දුන් රෝගීන්",
    wk_hint: "රෝහල් සහ PHI වාර්තාවලින් පසුගිය සති 4 තුළ මෙම දිස්ත්‍රික්කයේ දැනුම්දීම් එකතු කරන්න. පුරෝකථනය වහාම යාවත්කාලීන වේ.",
    wk_to_warning: "මෙම සති 4 තුළ රෝගීන් {n} හෝ ඊට වැඩි නම් මෙය අනතුරු ඇඟවීමක් වේ.",
    wk_fc_wet: "{from} සිට {to} දක්වා වැසි පුරෝකථනය: වැසි දින {n} පමණ, සාමාන්‍යයෙන් {u}. සුපුරුදු ප්‍රමාණයට වඩා වැසි.",
    wk_fc_dry: "{from} සිට {to} දක්වා වැසි පුරෝකථනය: වැසි දින {n} පමණ, සාමාන්‍යයෙන් {u}. සුපුරුදු ප්‍රමාණයට වඩා වැසි නැත.",
    wk_fc_note: "තොරතුරු සඳහා පමණි; අනතුරු ඇඟවීමේ කොටසක් නොවේ.",
    wk_record: "2018 සිට පරීක්ෂා කළ විට: {lead} සඳහා සතිපතා අනතුරු ඇඟවීම් {p}% ක් නිවැරදි විය; අහම්බෙන් එය {b}% කි.",
    monthly_title: "මාසික පුරෝකථනය", monthly_tag: "{month} · මාසික",
    past_right: "පුරෝකථනය නිවැරදි විය.", past_wrong: "පුරෝකථනය වැරදි විය.",
    past_unknown: "මෙම මාසය කෙසේ අවසන් වූයේදැයි තවම නොදනිමු.", past_sub: "{month} · {ahead}කට පෙර කළ පුරෝකථනය",
    what_happened: "සිදු වූ දේ", usual_or_fewer: "සුපුරුදු හෝ අඩු", fc_right: "✓ පුරෝකථනය නිවැරදියි", fc_wrong: "✕ පුරෝකථනය වැරදියි",
    past_record_short: "මෙහි {level} කොතරම් නිවැරදි වීද",
    rec_chance: "අහම්බෙන් පමණක්, මෙහි මාසවලින් {pct}% ක සුපුරුදු ප්‍රමාණයට වඩා රෝගීන් සිටී.",
    wk_overview: "{date} දක්වා දත්ත මත පදනම්ව. දිස්ත්‍රික්කයක පුරෝකථනය බැලීමට එය ක්ලික් කරන්න.",
    msg_title: "යැවිය යුතු පණිවිඩ", msg_farmer: "ගොවීන් සඳහා", msg_sms: "සෞඛ්‍ය කාර්ය මණ්ඩලයට SMS", copy: "පිටපත් කරන්න", copied: "පිටපත් විය",
    msg_note: "නිලධාරියා පරීක්ෂා කර සුපුරුදු මාර්ග හරහා යැවීමට කෙටුම්පත්. LeptoWatch කිසිවක් නොයවයි.",
    sms_len: "අක්ෂර {n} · SMS {parts}",
  },
  ta: {
    tagline: "மாவட்ட எலிக்காய்ச்சல் முன்னெச்சரிக்கை",
    nav_home: "முகப்பு", nav_map: "வரைபடம்", nav_history: "கடந்த பருவங்கள்", nav_about: "இது எப்படி வேலை செய்கிறது",
    src_rain: "மழைவீழ்ச்சி", src_cases: "நோயாளர் அறிக்கைகள்", language: "மொழி",
    toast_saved: "{district}: {month} எண்ணிக்கை சேமிக்கப்பட்டது, முன்னறிவிப்பு புதுப்பிக்கப்பட்டது",
    province: "{p} மாகாணம்",
    when_this: "இந்த மாதம்", when_next: "அடுத்த மாதம்", when_last: "கடந்த மாதம்", when_in: "{n} மாதங்களில்", when_ago: "{n} மாதங்களுக்கு முன்",
    forecast: "முன்னறிவிப்பு", outlook: "முன்னறிவிப்பு", past_seasons: "கடந்த பருவங்கள்",
    ov_outlook: "{month} வரையான மழைவீழ்ச்சியின் அடிப்படையில். ஒரு மாவட்டத்தின் முன்னறிவிப்பைப் பார்க்க வரைபடத்தில் அதைக் கிளிக் செய்யுங்கள்.",
    ov_past: "LeptoWatch {ahead} முன்பு என்ன கூறியிருக்கும் என்பது, உண்மையில் நடந்ததுடன் ஒப்பிடப்பட்டுள்ளது.",
    one_month: "ஒரு மாதம்", two_months: "இரண்டு மாதங்கள்",
    needs_attention: "கவனம் தேவை", none_attention: "இப்போது எந்த மாவட்டத்திலும் எச்சரிக்கையோ கண்காணிப்போ இல்லை.",
    not_outbreak: "நிறமிடப்பட்ட மாவட்டம் என்பது வழக்கத்தை விட அதிக ஆபத்து, உறுதிப்படுத்தப்பட்ட பரவல் அல்ல.",
    pick_month: "ஸ்லைடரில் ஒரு மாதத்தைத் தேர்ந்தெடுத்து, ஒரு மாவட்டத்தைக் கிளிக் செய்யுங்கள்.",
    loading: "ஏற்றுகிறது…", outlook_for: "{month} முன்னறிவிப்பு",
    basis_full_short: "<b>{month}</b> மழைவீழ்ச்சி மற்றும் நோயாளர்களின் அடிப்படையில்.",
    basis_rain_short: "<b>மழைவீழ்ச்சி மட்டும்</b> அடிப்படையில். {month} நோயாளர் எண்ணிக்கை இன்னும் வரவில்லை.",
    model_estimate: "ஆபத்து: வழக்கத்தை விட அதிக நோயாளர்களுக்கான வாய்ப்பு <b>{p}</b>",
    signals_disagree: "சமிக்ஞைகள் முரண்படுகின்றன", what_to_do: "செய்ய வேண்டியவை",
    open_report: "முழு அறிக்கையைத் திறக்கவும்", open_report_note: "வழக்கத்துடன் ஒப்பிட்ட மழையும் நோயாளர்களும், மழை முன்னறிவிப்பு, அனுப்பத் தயாரான செய்திகள்.",
    back: "← வரைபடத்திற்குத் திரும்பு", month: "மாதம்",
    why_warning: "இந்த மாவட்டத்தில் மழையும் நோயாளர்களும் வழக்கத்தை விட அதிகம். உள்ளூர் மீளாய்வுக்கும் தடுப்பு நடவடிக்கைகளுக்கும் முன்னுரிமை கொடுங்கள்.",
    why_watch: "மழை அல்லது நோயாளர்கள் உயர்ந்துள்ளனர், ஆனால் இரண்டும் அல்ல. சமீபத்திய நோயாளர் எண்ணிக்கையைச் சரிபாருங்கள்.",
    why_normal: "இந்தக் காலத்திற்கு மழையோ நோயாளர்களோ வழக்கத்தை விட அதிகமில்லை.",
    why_nodata: "இந்த மாவட்டத்தை மதிப்பிடப் போதுமான தரவு இல்லை.",
    why_rain_only: "வழக்கத்தை விட அதிக மழை பெய்துள்ளது. மழை மட்டும் உறுதியாகச் சொல்லப் போதாது, எனவே சமீபத்திய நோயாளர் எண்ணிக்கையைச் சரிபாருங்கள்.",
    why_rain_not_cases: "வழக்கத்தை விட அதிக மழை, ஆனால் நோயாளர்கள் வழக்கத்தை விட அதிகமில்லை. கவனித்து வாருங்கள்.",
    why_rain_cases_low: "வழக்கத்தை விட அதிக மழை, நோயாளர்களும் வழக்கத்தை விட அதிகம், ஆனால் எச்சரிக்கைக்குத் தேவையான வழக்கத்தின் 1.4 மடங்கை இன்னும் எட்டவில்லை. நெருக்கமாகக் கவனித்து வாருங்கள்.",
    rain_only: "மழை மட்டும்", watch_rain_meaning: "வழக்கத்தை விட அதிக மழை; நோயாளர் உயர்வு இன்னும் தெரியவில்லை",
    why_cases_not_rain: "நோயாளர்கள் வழக்கத்தை விட அதிகம், ஆனால் மழை அதிகமில்லை. கவனித்து வாருங்கள்.",
    why_normal_nocase: "மழை வழக்கத்தை விட அதிகமில்லை. இந்த மாத நோயாளர் எண்ணிக்கை இன்னும் கிடைக்கவில்லை.",
    basis_full: "<b>{month}</b> மழை மற்றும் நோயாளர்களின் அடிப்படையில்.",
    basis_rain: "மழை மட்டும் அடிப்படையில் (<b>{month}</b>). தெளிவான பதிலுக்கு கீழே நோயாளர் எண்ணிக்கையைச் சேருங்கள்.",
    suggestions_note: "இவை சுகாதார அதிகாரிகளுக்கான பரிந்துரைகள் மட்டுமே. நிறமிடப்பட்ட முன்னறிவிப்பு உறுதிப்படுத்தப்பட்ட பரவல் அல்ல.",
    nothing_extra: "இந்த மாதம் கூடுதலாக எதுவும் இல்லை.",
    why_says: "ஏன் {level}", rainy_days_in: "மழை நாட்கள் · {month}", cases_in: "நோயாளர்கள் · {month}",
    usual_days: "வழக்கம்: {n} நாட்கள்", usual: "வழக்கம்: {n}", wetter: "▲ வழக்கத்தை விட அதிக மழை", not_wetter: "மழை அதிகமில்லை",
    more_cases: "▲ வழக்கத்தை விட அதிகம்", not_more: "அதிகமில்லை", not_reported: "இன்னும் அறிவிக்கப்படவில்லை", waiting: "எண்ணிக்கைக்காகக் காத்திருக்கிறது",
    rule_note: "இரண்டும் உயர்ந்தால் எச்சரிக்கை, ஒன்று உயர்ந்தால் கண்காணிப்பு, எதுவுமில்லையெனில் இயல்பு.",
    usual_month: "{district} மாவட்டத்தில் ஒரு வழக்கமான {month}", about_cases: "சுமார் {n} நோயாளர்கள்", worked_from: " · {month} வரையான நோயாளர்களிலிருந்து கணக்கிடப்பட்டது",
    both_months: "இரு மாதங்களும்", both_note: "இரண்டும் ஒரே {month} தரவைப் பயன்படுத்துகின்றன. இரண்டு மாதங்களுக்கு முந்தைய முன்னறிவிப்பு குறைவான உறுதியானது.",
    cases_chart: "மாதாந்த நோயாளர்கள் · {month} வரை 3 ஆண்டுகள்", rain_chart: "மழை நாட்கள் · கடந்த 12 மாதங்கள்",
    past_record: "இங்கு கடந்த பதிவு · {level}, {ahead} முன்பு",
    add_count: "{month} நோயாளர் எண்ணிக்கையைச் சேர்க்கவும்", update_count: "{month} நோயாளர் எண்ணிக்கையைப் புதுப்பிக்கவும்", add_btn: "சேர்க்கவும்", update_btn: "புதுப்பிக்கவும்",
    count_placeholder: "நோயாளர்களின் எண்ணிக்கை", count_whole: "நோயாளர் எண்ணிக்கையை முழு எண்ணாக உள்ளிடுங்கள்.", saving: "சேமிக்கிறது…",
    count_saved: "சேமிக்கப்பட்டது. முன்னறிவிப்பு புதுப்பிக்கப்பட்டது.", count_used: "சேமித்த எண்ணிக்கைகள் உடனடியாகப் பயன்படுத்தப்படும்.",
    count_hint: "பொது அறிக்கைகள் பல வாரங்கள் தாமதமாக வருகின்றன. மருத்துவமனை மற்றும் PHI பதிவுகளிலிருந்து இந்த மாத எண்ணிக்கையைச் சேர்ப்பது முன்னறிவிப்பை மேலும் நம்பகமாக்கும்.",
    to_warning: "{month} இல் {n} அல்லது அதற்கு மேற்பட்ட நோயாளர்கள் இருந்தால் இது எச்சரிக்கையாக மாறும்.",
    risk_none: "<b>{ahead} முன்பு ஆபத்து சதவீதம் இல்லை.</b> இந்த இடைவெளியில் மாதிரி அளவுத்திருத்தச் சோதனையில் தேறவில்லை, எனவே எச்சரிக்கை நிலை மட்டுமே காட்டப்படுகிறது.",
    risk_need: "ஆபத்து சதவீதத்தைப் பார்க்க {month} நோயாளர் எண்ணிக்கையைச் சேருங்கள்.",
    risk_line: "{month} இல் வழக்கத்தை விட அதிக நோயாளர்களுக்கான வாய்ப்பு", risk_range: "(பெரும்பாலும் {low} முதல் {high} வரை)",
    disagree_long: "<b>சமிக்ஞைகள் முரண்படுகின்றன.</b> எச்சரிக்கை {level} என்கிறது, ஆனால் ஆபத்து சதவீதம் வேறு திசையைக் காட்டுகிறது. செயல்படுவதற்கு முன் உள்ளூர் மருத்துவமனை மற்றும் PHI தரவைச் சரிபாருங்கள்.",
    low_conf: "குறைந்த நம்பகத்தன்மை", low_conf_upto: "இங்குள்ள வழக்கமான நோயாளர் அளவு {month} வரையான நோயாளர் அறிக்கைகளை அடிப்படையாகக் கொண்டது.",
    low_conf_few: "இங்குள்ள வழக்கமான நோயாளர் அளவு கடந்த 12 மாதங்களில் 9 இற்கும் குறைவானவற்றை அடிப்படையாகக் கொண்டது.",
    noun_warning: "எச்சரிக்கைகள்", noun_watch: "கண்காணிப்பு அறிவிப்புகள்", noun_normal: "இயல்பு முன்னறிவிப்புகள்",
    rec_few: "மதிப்பிட இங்கு கடந்த {noun} போதுமானதாக இல்லை", rec_short: "முன்பு {times} முறைகளில் {right} சரி",
    rec_long: "இங்கு கடந்த {noun} {times} முறைகளில் {right} சரியாக இருந்தன ({pct}%)", rec_period: "{line}, {from} முதல் {to} வரை.",
    rec_held: "முறை உருவாக்கப் பயன்படுத்தப்படாத ஆண்டுகளான {from} முதல்: {times} முறைகளில் {right} சரி ({pct}%)",
    rec_held_few: ", தனியாக மதிப்பிட மிகக் குறைவு",
    rec_base: "ஒப்பிடுவதற்கு, இங்கு ஒரு மாதத்தில் வழக்கத்தை விட அதிக நோயாளர்கள் இருந்தது எப்படியும் {pct}% நேரம்",
    rec_base_normal: ", எனவே இயல்பு முன்னறிவிப்பு தற்செயலாக {pct}% நேரம் சரியாகும்",
    rec_watch_hint: " கண்காணிப்பு ஒரு ஆரம்பக் குறிப்பு; எச்சரிக்கைக்கு மழையும் நோயாளர்களும் இரண்டும் உயர வேண்டும்.",
    rec_right: "\"சரி\" என்பது அந்த மாதம் இந்த மாவட்டத்தில் வழக்கத்தை விட அதிக நோயாளர்கள் உண்மையில் இருந்தனர் என்பதாகும். இவை கடந்த முடிவுகள், அடுத்த மாதத்துக்கான வாய்ப்பு அல்ல.",
    rec_right_normal: "\"சரி\" என்பது அந்த மாதம் இந்த மாவட்டத்தில் வழக்கத்தை விட அதிக நோயாளர்கள் இருக்கவில்லை என்பதாகும். இவை கடந்த முடிவுகள், அடுத்த மாதத்துக்கான வாய்ப்பு அல்ல.",
    no_record: "இன்னும் கடந்த பதிவு இல்லை.",
    lg_wetter: "வழக்கத்தை விட அதிக மழை", lg_not_wetter: "மழை அதிகமில்லை", lg_usual: "வழக்கம்", lg_reported: "அறிவிக்கப்பட்ட நோயாளர்கள்",
    lg_usual_month: "அந்த மாதத்துக்கு வழக்கம்", lg_no_report: "பொது அறிக்கை இல்லை",
    hp_badge: "உயர் முன்னுரிமை",
    hp_note: "மிக வலுவான எச்சரிக்கைகளில் ஒன்று. 2018 முதல், இத்தகைய எச்சரிக்கைகள் {alerts} முறைகளில் {right} சரியாக இருந்தன ({pct}%); தற்செயலாக இது {base}% மாதங்கள்.",
    wk_next: "அடுத்த 4 வாரங்கள்", wk_after: "வாரங்கள் 5–8", wk_eyebrow: "வாராந்த முன்னறிவிப்பு", wk_range: "{from} முதல் {to} வரை",
    wk_risk: "இந்த 4 வாரங்களில் வழக்கத்தை விட அதிக நோயாளர்களுக்கான வாய்ப்பு",
    wk_hp: "2018 முதல், இத்தகைய வாராந்த எச்சரிக்கைகள் {alerts} முறைகளில் {right} சரியாக இருந்தன ({pct}%).",
    wk_no_pct: "வாரங்கள் 5–8 க்கு ஆபத்து சதவீதம் இல்லை: இவ்வளவு முன்னதாக மாதிரி அளவுத்திருத்தச் சோதனையில் தேறவில்லை.",
    wk_basis: "<b>{date}</b> வரையான 8 வாரங்களின் மழை மற்றும் 4 வாரங்களின் நோயாளர்களின் அடிப்படையில்.",
    wk_basis_rain: "<b>{date}</b> வரையான 8 வாரங்களின் <b>மழை மட்டும்</b> அடிப்படையில். மேலும் நம்பகமாக்க கடந்த 4 வாரங்களில் அறிவிக்கப்பட்ட நோயாளர்களைச் சேருங்கள்.",
    wk_rain: "மழை நாட்கள் · {date} வரை 8 வாரங்கள்", wk_cases: "நோயாளர்கள் · {date} வரை 4 வாரங்கள்",
    wk_add: "{date} வரையான 4 வாரங்களில் அறிவிக்கப்பட்ட நோயாளர்கள்",
    wk_hint: "மருத்துவமனை மற்றும் PHI அறிக்கைகளிலிருந்து கடந்த 4 வாரங்களில் இந்த மாவட்டத்தின் அறிவிப்புகளைக் கூட்டுங்கள். முன்னறிவிப்பு உடனடியாகப் புதுப்பிக்கப்படும்.",
    wk_to_warning: "இந்த 4 வாரங்களில் {n} அல்லது அதற்கு மேற்பட்ட நோயாளர்கள் இருந்தால் இது எச்சரிக்கையாக மாறும்.",
    wk_fc_wet: "{from} முதல் {to} வரை மழை முன்னறிவிப்பு: சுமார் {n} மழை நாட்கள், வழக்கமாக {u}. வழக்கத்தை விட அதிக மழை.",
    wk_fc_dry: "{from} முதல் {to} வரை மழை முன்னறிவிப்பு: சுமார் {n} மழை நாட்கள், வழக்கமாக {u}. வழக்கத்தை விட அதிக மழை இல்லை.",
    wk_fc_note: "தகவலுக்கு மட்டும்; எச்சரிக்கையின் பகுதி அல்ல.",
    wk_record: "2018 முதல் சோதித்ததில்: {lead} க்கான வாராந்த எச்சரிக்கைகள் {p}% சரியாக இருந்தன; தற்செயலாக இது {b}%.",
    monthly_title: "மாதாந்த முன்னறிவிப்பு", monthly_tag: "{month} · மாதாந்தம்",
    past_right: "முன்னறிவிப்பு சரியாக இருந்தது.", past_wrong: "முன்னறிவிப்பு தவறாக இருந்தது.",
    past_unknown: "இந்த மாதம் எப்படி முடிந்தது என்பது இன்னும் தெரியவில்லை.", past_sub: "{month} · {ahead} முன்பு செய்த முன்னறிவிப்பு",
    what_happened: "நடந்தது என்ன", usual_or_fewer: "வழக்கம் அல்லது குறைவு", fc_right: "✓ முன்னறிவிப்பு சரி", fc_wrong: "✕ முன்னறிவிப்பு தவறு",
    past_record_short: "இங்கு {level} எத்தனை முறை சரியாக இருந்தது",
    rec_chance: "தற்செயலாக மட்டும், இங்கு {pct}% மாதங்களில் வழக்கத்தை விட அதிக நோயாளர்கள் இருக்கின்றனர்.",
    wk_overview: "{date} வரையான தரவின் அடிப்படையில். ஒரு மாவட்டத்தின் முன்னறிவிப்பைப் பார்க்க அதைக் கிளிக் செய்யுங்கள்.",
    msg_title: "அனுப்ப வேண்டிய செய்திகள்", msg_farmer: "விவசாயிகளுக்கு", msg_sms: "சுகாதாரப் பணியாளர்களுக்கு SMS", copy: "நகலெடு", copied: "நகலெடுக்கப்பட்டது",
    msg_note: "அதிகாரி சரிபார்த்து வழக்கமான வழிகளில் அனுப்புவதற்கான வரைவுகள். LeptoWatch எதையும் அனுப்பாது.",
    sms_len: "{n} எழுத்துகள் · {parts} SMS",
  },
};

/** Awareness message for farmers, in any of the three languages (independent of the screen language). */
export function farmerMessage(l, district, level) {
  const d = dname(district, l);
  const M = {
    en: {
      warning: `Rat fever warning for ${d}. Rain and rat fever cases are both higher than usual this season.`,
      watch: `Rat fever alert for ${d}. There has been more rain than usual, which can raise the risk of rat fever.`,
      body: "When working in paddy fields or muddy water, wear boots and gloves and cover any cuts or wounds. "
        + "If you get a fever after working in fields or water, go to the hospital straight away and say that you work in the fields.",
      sign: `${d} MOH office`,
    },
    si: {
      warning: `${d} දිස්ත්‍රික්කයට මී උණ අනතුරු ඇඟවීමකි. මෙම කන්නයේ වැසි සහ මී උණ රෝගීන් යන දෙකම සුපුරුදු ප්‍රමාණයට වඩා වැඩිය.`,
      watch: `${d} දිස්ත්‍රික්කයට මී උණ දැනුම්දීමකි. සුපුරුදු ප්‍රමාණයට වඩා වැසි ඇති බැවින් මී උණ අවදානම වැඩි විය හැක.`,
      body: "කුඹුරුවල හෝ මඩ වතුරේ වැඩ කරන විට බූට් සපත්තු සහ අත්වැසුම් පළඳින්න, කැපුම් හා තුවාල ආවරණය කරන්න. "
        + "කුඹුරේ හෝ වතුරේ වැඩ කිරීමෙන් පසු උණ ආවොත් වහාම රෝහලට ගොස්, ඔබ කුඹුරේ වැඩ කරන බව පවසන්න.",
      sign: `${d} සෞඛ්‍ය වෛද්‍ය නිලධාරී කාර්යාලය`,
    },
    ta: {
      warning: `${d} மாவட்டத்திற்கான எலிக்காய்ச்சல் எச்சரிக்கை. இந்தப் பருவத்தில் மழையும் எலிக்காய்ச்சல் நோயாளர்களும் வழக்கத்தை விட அதிகம்.`,
      watch: `${d} மாவட்டத்திற்கான எலிக்காய்ச்சல் அறிவிப்பு. வழக்கத்தை விட அதிக மழை பெய்துள்ளதால் எலிக்காய்ச்சல் ஆபத்து அதிகரிக்கலாம்.`,
      body: "வயல்களில் அல்லது சேற்று நீரில் வேலை செய்யும்போது பூட்ஸ், கையுறைகள் அணிந்து, வெட்டுக்காயங்களை மூடிக்கொள்ளுங்கள். "
        + "வயல் அல்லது நீரில் வேலை செய்த பின் காய்ச்சல் வந்தால் உடனடியாக மருத்துவமனைக்குச் சென்று, நீங்கள் வயலில் வேலை செய்வதைக் கூறுங்கள்.",
      sign: `${d} சுகாதார வைத்திய அதிகாரி அலுவலகம்`,
    },
  }[l];
  return `${level === "warning" ? M.warning : M.watch} ${M.body} (${M.sign})`;
}

/** Short alert for PHIs and hospital staff, sized for SMS. */
export function staffSms(l, district, c) {
  const day = (iso) => `${+iso.slice(8)} ${MONTH_NAMES[l][+iso.slice(5, 7) - 1]}`;
  const monthName = c.target_from ? `${day(c.target_from)} – ${day(c.target_end)}`
    : `${MONTH_NAMES[l][+c.target.slice(5) - 1]} ${c.target.slice(0, 4)}`;
  const d = dname(district, l);
  const lv = { en: { warning: "WARNING", watch: "WATCH" }, si: { warning: "අනතුරු ඇඟවීම", watch: "සුපරීක්ෂාව" },
    ta: { warning: "எச்சரிக்கை", watch: "கண்காணிப்பு" } }[l][c.level];
  const rd = c.rainy_days, rn = Math.round(c.rainy_days_normal);
  const hasCases = c.cases_data_month != null && c.cases_normal != null;
  const cn = hasCases ? Math.round(c.cases_normal) : null;
  return {
    en: `LeptoWatch ${d}: rat fever ${lv} for ${monthName}. Rainy days ${rd} (usual ${rn})`
      + (hasCases ? `, cases ${c.cases_data_month} (usual ${cn})` : "") + ". Please start farmer awareness and report new cases early.",
    si: `LeptoWatch ${d}: ${monthName} සඳහා මී උණ ${lv}. වැසි දින ${rd} (සුපුරුදු ${rn})`
      + (hasCases ? `, රෝගීන් ${c.cases_data_month} (සුපුරුදු ${cn})` : "") + ". ගොවි දැනුවත් කිරීම අරඹා නව රෝගීන් ඉක්මනින් වාර්තා කරන්න.",
    ta: `LeptoWatch ${d}: ${monthName} எலிக்காய்ச்சல் ${lv}. மழை நாட்கள் ${rd} (வழக்கம் ${rn})`
      + (hasCases ? `, நோயாளர்கள் ${c.cases_data_month} (வழக்கம் ${cn})` : "") + ". விவசாயிகள் விழிப்புணர்வைத் தொடங்கி புதிய நோயாளர்களை விரைவில் அறிவியுங்கள்.",
  }[l];
}

/** SMS parts: 160/153 characters in plain Latin text, 70/67 once any Sinhala or Tamil letter is used. */
export function smsParts(text) {
  const unicode = [...text].some((ch) => ch.codePointAt(0) > 127);
  const [one, many] = unicode ? [70, 67] : [160, 153];
  const n = [...text].length;
  return n <= one ? 1 : Math.ceil(n / many);
}
