import { Icon } from "../icons.jsx";
import { dname, useLang } from "../i18n.js";
import { LEVEL, fmt, fmtDay, levelColor } from "../lib.js";

/**
 * How it works, as the arithmetic an officer could do by hand: count, compare with the usual, combine.
 * Methods, full test results and model comparisons live in the technical README (served at /readme).
 */
const TEXT = {
  en: {
    title: "How it works",
    lead: "Every Saturday, LeptoWatch compares the last few weeks in your district with the same weeks in past years. It uses two numbers: rainy days in the last 8 weeks and cases in the last 4 weeks.",
    rainStep: {
      title: "Rain",
      points: [
        "A rainy day is a day with at least 1 mm of rain, averaged over the district.",
        "Count the rainy days in the last 8 weeks (56 days).",
        "Count them for the same 8 weeks in each past year, and take the middle value (the median). That is the usual number.",
        "If this year's count is higher than the usual number, rain is up.",
      ],
      example: "{d}, 8 weeks to {date}",
      lines: ["Rainy days: {rd}", "Usual (middle of past years): {rn}"],
      up: "{rd} is more than {rn} → rain is up",
      notUp: "{rd} is not more than {rn} → rain is not up",
    },
    caseStep: {
      title: "Cases",
      points: [
        "Take the cases notified in the last 12 months and divide by 13. That gives an average 4 weeks for your district.",
        "Some times of year are always busier. The season factor says how much: 1.3 means this time of year usually has 1.3 times an average 4 weeks. It is the middle value from past years.",
        "Usual cases = average 4 weeks × season factor.",
        "If the cases notified in the last 4 weeks are more than the usual number, cases are up.",
        "For a Warning, cases must be more than 1.4 times the usual number (40% above usual).",
      ],
      example: "Example with round numbers",
      lines: ["Last 12 months: 650 cases → 650 ÷ 13 = 50", "Season factor 1.3 → usual = 50 × 1.3 = 65",
        "Warning bar = 65 × 1.4 = 91", "Cases in the last 4 weeks: 95"],
      up: "95 is more than 91 → cases are well above usual",
    },
    alertStep: "The alert",
    level: {
      normal: "Neither is up. Continue routine prevention.",
      needcount: "Wetter than usual, but no case count yet. Add the last 4 weeks' cases to get a Watch, Warning or Normal.",
      watch: "Rain or cases is up, but not enough for a Warning. Check your latest case count.",
      warning: "Rain is up and cases are more than 1.4 times usual. Start preventive outreach and alert hospitals.",
    },
    leads: ["One alert for the next 8 weeks", "It comes from the last few weeks' rain and cases. We check it against weeks 1–4 and against weeks 5–8 separately: it is more often right for the nearer weeks. We also tested a separate rule for weeks 5–8, written down before the test; none of 180 versions did better, so there is one alert."],
    reliable: "How often is it right?",
    rows: [
      ["{w} of 100", "Warnings for the next 4 weeks were followed by more cases than usual, when the officer entered an up-to-date case count."],
      ["{w2} of 100", "Warnings for weeks 5–8 were followed by more cases than usual, with an up-to-date case count."],
      ["{q} and {q2} of 100", "The same two, using public reports alone. They go online about 8 weeks after the week they cover, so the case count is older."],
      ["{b} of 100", "4-week periods have more cases than usual anyway, with no forecast at all."],
    ],
    tested: "We set the rules using 2011 to 2017 only, then tested them on {from} to {to}, treating each Saturday as if it were today. For the public-report figures, each Saturday only uses reports that would already have been online.",
    example: {"title": "A real example: Jaffna, 2024", "text": "In December 2024 a leptospirosis outbreak in Jaffna caused several deaths after heavy rain and floods. We replayed LeptoWatch using only the data that existed on each date:", "rows": [["2 Nov", "Warning: 39 rainy days in 8 weeks (usual 33), 5 cases in 4 weeks (usual 1)"], ["2 – 30 Nov", "Warning every week"], ["Public reports only", "Watch through November; first Warning on 7 Dec, four days before deaths were reported"], ["Mid-December", "Outbreak recognised; deaths reported from 11 December"], ["4 weeks to 28 Dec", "218 cases, against about 5 in a usual year"]], "note": "So the Warning came about six weeks before cases peaked. This is a replay of past data, not a forecast anyone saw at the time, and the weekly Warnings in November assume the officer entered the case counts. With public reports alone, which go online about 8 weeks late, it stayed on Watch until 7 December, so the early warning depends on the officer's own counts."},
    mind: "Keep in mind",
    minds: [
      "Public case reports come 8 to 11 weeks late. Add the cases notified in the last 4 weeks, so a Warning is possible.",
      "Rain alone is a weak sign, so rain alone only gives a Watch, never a Warning.",
      "Leptospirosis is under-reported. Comparing your district with its own past reduces this problem.",
      "It helps you plan prevention. It does not diagnose patients or give treatment advice.",
    ],
    data: "Where the data comes from",
    sources: [
      ["Cases", "Epidemiology Unit, Weekly Epidemiological Reports (to {cases})"],
      ["Rain", "Open-Meteo daily rainfall (to {om}); CHIRPS satellite rainfall for Past seasons (to {rain})"],
      ["Map", "geoBoundaries district boundaries"],
    ],
  },
  si: {
    title: "ක්‍රියා කරන ආකාරය",
    lead: "සෑම සෙනසුරාදාවකම LeptoWatch ඔබේ දිස්ත්‍රික්කයේ පසුගිය සති කිහිපය, පසුගිය වසරවල එම සති සමඟ සසඳයි. එය අංක දෙකක් භාවිතා කරයි: පසුගිය සති 8 තුළ වැසි දින සහ පසුගිය සති 4 තුළ රෝගීන්.",
    rainStep: {
      title: "වැසි",
      points: [
        "වැසි දිනයක් යනු දිස්ත්‍රික්කය පුරා සාමාන්‍යයෙන් අවම වශයෙන් මි.මී. 1 ක වැසි ලැබුණු දිනයකි.",
        "පසුගිය සති 8 (දින 56) තුළ වැසි දින ගණන් කරන්න.",
        "පසුගිය සෑම වසරකම එම සති 8 සඳහාද ගණන් කර, මැද අගය (මධ්‍යස්ථය) ගන්න. එය සුපුරුදු අගයයි.",
        "මෙම වසරේ ගණන සුපුරුදු අගයට වඩා වැඩි නම්, වැසි ඉහළයි.",
      ],
      example: "{d}, {date} දක්වා සති 8",
      lines: ["වැසි දින: {rd}", "සුපුරුදු (පසුගිය වසරවල මැද අගය): {rn}"],
      up: "{rd} > {rn} → වැසි ඉහළයි",
      notUp: "{rd} යනු {rn} ට වඩා වැඩි නොවේ → වැසි ඉහළ නැත",
    },
    caseStep: {
      title: "රෝගීන්",
      points: [
        "පසුගිය මාස 12 තුළ දැනුම් දුන් රෝගීන් ගණන 13 න් බෙදන්න. එය ඔබේ දිස්ත්‍රික්කයේ සාමාන්‍ය සති 4 කි.",
        "වසරේ සමහර කාලවලදී සැමවිටම රෝගීන් වැඩිය. කන්න සාධකය එය පෙන්වයි: 1.3 යනු මෙම කාලයේ සාමාන්‍ය සති 4 කට වඩා 1.3 ගුණයක් රෝගීන් සාමාන්‍යයෙන් සිටින බවයි. එය පසුගිය වසරවල මැද අගයයි.",
        "සුපුරුදු රෝගීන් = සාමාන්‍ය සති 4 × කන්න සාධකය.",
        "පසුගිය සති 4 තුළ දැනුම් දුන් රෝගීන් සුපුරුදු අගයට වඩා වැඩි නම්, රෝගීන් ඉහළයි.",
        "අනතුරු ඇඟවීමක් සඳහා රෝගීන් සුපුරුදු අගය මෙන් 1.4 ගුණයකට වඩා (40% කට වඩා) වැඩි විය යුතුය.",
      ],
      example: "රවුම් අංක සහිත උදාහරණයක්",
      lines: ["පසුගිය මාස 12: රෝගීන් 650 → 650 ÷ 13 = 50", "කන්න සාධකය 1.3 → සුපුරුදු = 50 × 1.3 = 65",
        "අනතුරු ඇඟවීමේ සීමාව = 65 × 1.4 = 91", "පසුගිය සති 4 තුළ රෝගීන්: 95"],
      up: "95 > 91 → රෝගීන් සුපුරුදු ප්‍රමාණයට වඩා බොහෝ වැඩියි",
    },
    alertStep: "අනතුරු ඇඟවීම",
    level: {
      normal: "කිසිවක් ඉහළ නැත. සුපුරුදු වැළැක්වීමේ කටයුතු කරගෙන යන්න.",
      needcount: "සුපුරුදු ප්‍රමාණයට වඩා තෙත්, නමුත් තවම රෝගී සංඛ්‍යාවක් නැත. සුපරීක්ෂාව, අනතුරු ඇඟවීම හෝ සාමාන්‍ය ලබා ගැනීමට පසුගිය සති 4 රෝගීන් ඇතුළත් කරන්න.",
      watch: "වැසි හෝ රෝගීන් ඉහළයි, නමුත් අනතුරු ඇඟවීමකට ප්‍රමාණවත් නැත. ඔබේ නවතම රෝගී සංඛ්‍යාව පරීක්ෂා කරන්න.",
      warning: "වැසි ඉහළයි, රෝගීන් සුපුරුදු ප්‍රමාණය මෙන් 1.4 ගුණයකට වඩා වැඩියි. වැළැක්වීමේ දැනුවත් කිරීම් අරඹා රෝහල් දැනුවත් කරන්න.",
    },
    leads: ["ඉදිරි සති 8 සඳහා එක් අනතුරු ඇඟවීමක්", "එය පසුගිය සති කිහිපයේ වැසි සහ රෝගීන්ගෙන් ලැබේ. අපි එය සති 1–4 සහ සති 5–8 සමඟ වෙන වෙනම පරීක්ෂා කරමු: ආසන්න සති සඳහා එය බොහෝ විට නිවැරදිය. පරීක්ෂාවට පෙර ලියා තැබූ, සති 5–8 සඳහා වෙනම නීතියක් ද අපි පරීක්ෂා කළෙමු; අනුවාද 180 න් කිසිවක් වඩා හොඳ නොවූ බැවින් එක් අනතුරු ඇඟවීමක් ඇත."],
    reliable: "එය කොපමණ වාරයක් නිවැරදිද?",
    rows: [
      ["100 න් {w}", "නිලධාරියා යාවත්කාලීන රෝගී සංඛ්‍යාවක් ඇතුළත් කළ විට, ඉදිරි සති 4 සඳහා වූ අනතුරු ඇඟවීම්වලින් පසු සුපුරුදු ප්‍රමාණයට වඩා රෝගීන් සිටියහ."],
      ["100 න් {w2}", "යාවත්කාලීන රෝගී සංඛ්‍යාවක් සමඟ, සති 5–8 සඳහා වූ අනතුරු ඇඟවීම්වලින් පසු සුපුරුදු ප්‍රමාණයට වඩා රෝගීන් සිටියහ."],
      ["100 න් {q} සහ {q2}", "පොදු වාර්තා පමණක් භාවිතා කළ විට එම අගයන් දෙක. ඒවා අදාළ සතියෙන් සති 8 කට පමණ පසු අන්තර්ජාලයට එන බැවින් රෝගී සංඛ්‍යාව පැරණිය."],
      ["100 න් {b}", "පුරෝකථනයක් නැතිව වුවද සති 4 කාලපරිච්ඡේදවල සුපුරුදු ප්‍රමාණයට වඩා රෝගීන් සිටියි."],
    ],
    tested: "අපි නීති සකස් කළේ 2011 සිට 2017 දක්වා දත්ත පමණක් භාවිතයෙන්. පසුව සෑම සෙනසුරාදාවක්ම අද දිනය ලෙස සලකා ඒවා {from} සිට {to} දක්වා පරීක්ෂා කළෙමු. පොදු වාර්තා අගයන් සඳහා, සෑම සෙනසුරාදාවකම එදිනට අන්තර්ජාලයේ තිබූ වාර්තා පමණක් භාවිතා විය.",
    example: {"title": "සැබෑ උදාහරණයක්: යාපනය, 2024", "text": "2024 දෙසැම්බරයේ අධික වැසි සහ ගංවතුරෙන් පසු යාපනයේ ඇති වූ මී උණ පැතිරීමෙන් කිහිප දෙනෙක් මිය ගියහ. එක් එක් දිනයේ තිබූ දත්ත පමණක් භාවිතා කර අපි LeptoWatch නැවත ධාවනය කළෙමු:", "rows": [["නොවැ. 2", "අනතුරු ඇඟවීම: සති 8 තුළ වැසි දින 39 (සුපුරුදු 33), සති 4 තුළ රෝගීන් 5 (සුපුරුදු 1)"], ["නොවැ. 2 – 30", "සෑම සතියකම අනතුරු ඇඟවීම"], ["පොදු වාර්තා පමණක්", "නොවැම්බර් පුරා සුපරීක්ෂාව; පළමු අනතුරු ඇඟවීම දෙසැ. 7, මරණ වාර්තා වීමට දින හතරකට පෙර"], ["දෙසැම්බර් මැද", "පැතිරීම හඳුනා ගැනිණි; දෙසැ. 11 සිට මරණ වාර්තා විය"], ["දෙසැ. 28 දක්වා සති 4", "රෝගීන් 218, සුපුරුදු වසරක 5 ක් පමණ"]], "note": "එනම් රෝගීන් උපරිමයට පැමිණීමට සති හයකට පමණ පෙර අනතුරු ඇඟවීම ලැබුණි. මෙය අතීත දත්ත නැවත ධාවනය කිරීමකි, එකල කිසිවෙකු දුටු පුරෝකථනයක් නොවේ; නොවැම්බරයේ සතිපතා අනතුරු ඇඟවීම් නිලධාරියා රෝගී සංඛ්‍යා ඇතුළත් කළ බව උපකල්පනය කරයි. සති 8 කට පමණ පසු අන්තර්ජාලයට එන පොදු වාර්තා පමණක් සමඟ එය දෙසැ. 7 දක්වා සුපරීක්ෂාවේ පැවතුණි; එබැවින් කලින් අනතුරු ඇඟවීම නිලධාරියාගේම සංඛ්‍යා මත රඳා පවතී."},
    mind: "මතක තබා ගන්න",
    minds: [
      "ප්‍රසිද්ධ රෝගී වාර්තා සති 8 සිට 11 දක්වා ප්‍රමාද වේ. අනතුරු ඇඟවීමක් ලැබිය හැකි වන පරිදි පසුගිය සති 4 තුළ දැනුම් දුන් රෝගීන් ඇතුළත් කරන්න.",
      "වැසි පමණක් දුර්වල ලකුණකි, එබැවින් වැසි පමණක් සුපරීක්ෂාවක් පමණක් දෙයි, කිසිදා අනතුරු ඇඟවීමක් නොදෙයි.",
      "මී උණ අඩුවෙන් වාර්තා වේ. ඔබේ දිස්ත්‍රික්කය එහිම අතීතය සමඟ සැසඳීමෙන් මෙම ගැටලුව අඩු වේ.",
      "එය වැළැක්වීම සැලසුම් කිරීමට උපකාරී වේ. එය රෝගීන් හඳුනා ගැනීම හෝ ප්‍රතිකාර උපදෙස් ලබා දීම නොකරයි.",
    ],
    data: "දත්ත ලැබෙන්නේ කොහෙන්ද",
    sources: [
      ["රෝගීන්", "වසංගත රෝග විද්‍යා ඒකකය, සතිපතා වසංගත රෝග විද්‍යා වාර්තා ({cases} දක්වා)"],
      ["වැසි", "Open-Meteo දෛනික වර්ෂාපතනය ({om} දක්වා); පසුගිය කන්න සඳහා CHIRPS චන්ද්‍රිකා වර්ෂාපතනය ({rain} දක්වා)"],
      ["සිතියම", "geoBoundaries දිස්ත්‍රික් මායිම්"],
    ],
  },
  ta: {
    title: "இது எப்படி வேலை செய்கிறது",
    lead: "ஒவ்வொரு சனிக்கிழமையும் LeptoWatch உங்கள் மாவட்டத்தின் கடந்த சில வாரங்களைக் கடந்த ஆண்டுகளின் அதே வாரங்களுடன் ஒப்பிடுகிறது. அது இரண்டு எண்களைப் பயன்படுத்துகிறது: கடந்த 8 வாரங்களின் மழை நாட்களும் கடந்த 4 வாரங்களின் நோயாளர்களும்.",
    rainStep: {
      title: "மழை",
      points: [
        "மழை நாள் என்பது மாவட்டம் முழுவதும் சராசரியாகக் குறைந்தது 1 மி.மீ மழை பெய்த நாள்.",
        "கடந்த 8 வாரங்களில் (56 நாட்கள்) மழை நாட்களை எண்ணுங்கள்.",
        "கடந்த ஒவ்வொரு ஆண்டின் அதே 8 வாரங்களுக்கும் எண்ணி, நடு மதிப்பை (இடைநிலை) எடுங்கள். அதுவே வழக்கமான எண்.",
        "இந்த ஆண்டின் எண்ணிக்கை வழக்கமான எண்ணை விட அதிகமெனில், மழை உயர்ந்துள்ளது.",
      ],
      example: "{d}, {date} வரையான 8 வாரங்கள்",
      lines: ["மழை நாட்கள்: {rd}", "வழக்கம் (கடந்த ஆண்டுகளின் நடு மதிப்பு): {rn}"],
      up: "{rd} > {rn} → மழை உயர்ந்துள்ளது",
      notUp: "{rd} என்பது {rn} ஐ விட அதிகமில்லை → மழை உயரவில்லை",
    },
    caseStep: {
      title: "நோயாளர்கள்",
      points: [
        "கடந்த 12 மாதங்களில் அறிவிக்கப்பட்ட நோயாளர்களை 13 ஆல் வகுங்கள். அதுவே உங்கள் மாவட்டத்தின் சராசரி 4 வாரங்கள்.",
        "ஆண்டின் சில காலங்களில் எப்போதும் அதிக நோயாளர்கள் இருப்பர். பருவக் காரணி அதைக் காட்டுகிறது: 1.3 என்றால் இந்தக் காலத்தில் சராசரி 4 வாரங்களை விட 1.3 மடங்கு நோயாளர்கள் வழக்கமாக இருப்பர். இது கடந்த ஆண்டுகளின் நடு மதிப்பு.",
        "வழக்கமான நோயாளர்கள் = சராசரி 4 வாரங்கள் × பருவக் காரணி.",
        "கடந்த 4 வாரங்களில் அறிவிக்கப்பட்ட நோயாளர்கள் வழக்கமான எண்ணை விட அதிகமெனில், நோயாளர்கள் உயர்ந்துள்ளனர்.",
        "எச்சரிக்கைக்கு, நோயாளர்கள் வழக்கமான எண்ணின் 1.4 மடங்குக்கு (40% க்கு) மேல் இருக்க வேண்டும்.",
      ],
      example: "முழு எண்களுடன் ஓர் உதாரணம்",
      lines: ["கடந்த 12 மாதங்கள்: 650 நோயாளர்கள் → 650 ÷ 13 = 50", "பருவக் காரணி 1.3 → வழக்கம் = 50 × 1.3 = 65",
        "எச்சரிக்கை எல்லை = 65 × 1.4 = 91", "கடந்த 4 வாரங்களில் நோயாளர்கள்: 95"],
      up: "95 > 91 → நோயாளர்கள் வழக்கத்தை விட மிக அதிகம்",
    },
    alertStep: "எச்சரிக்கை",
    level: {
      normal: "எதுவும் உயரவில்லை. வழக்கமான தடுப்பைத் தொடருங்கள்.",
      needcount: "வழக்கத்தை விட ஈரமானது, ஆனால் இன்னும் நோயாளர் எண்ணிக்கை இல்லை. கண்காணிப்பு, எச்சரிக்கை அல்லது இயல்பு பெற கடந்த 4 வார நோயாளர்களைச் சேர்க்கவும்.",
      watch: "மழை அல்லது நோயாளர்கள் உயர்ந்துள்ளனர், ஆனால் எச்சரிக்கைக்குப் போதாது. உங்கள் சமீபத்திய நோயாளர் எண்ணிக்கையைச் சரிபாருங்கள்.",
      warning: "மழை உயர்ந்துள்ளது, நோயாளர்கள் வழக்கத்தின் 1.4 மடங்குக்கு மேல். தடுப்பு விழிப்புணர்வைத் தொடங்கி மருத்துவமனைகளுக்குத் தெரிவியுங்கள்.",
    },
    leads: ["அடுத்த 8 வாரங்களுக்கு ஒரு எச்சரிக்கை", "இது கடந்த சில வாரங்களின் மழை மற்றும் நோயாளர்களிலிருந்து வருகிறது. இதை வாரங்கள் 1–4 உடனும் வாரங்கள் 5–8 உடனும் தனித்தனியாகச் சோதிக்கிறோம்: அருகிலுள்ள வாரங்களுக்கு இது அதிகம் சரியாக உள்ளது. சோதனைக்கு முன் எழுதி வைத்த, வாரங்கள் 5–8 க்கான தனி விதியையும் சோதித்தோம்; 180 பதிப்புகளில் எதுவும் சிறப்பாக இல்லை, எனவே ஒரே எச்சரிக்கை."],
    reliable: "இது எத்தனை முறை சரியாக இருக்கிறது?",
    rows: [
      ["100 இல் {w}", "அதிகாரி புதுப்பித்த நோயாளர் எண்ணிக்கையை உள்ளிட்டபோது, அடுத்த 4 வாரங்களுக்கான எச்சரிக்கைகளுக்குப் பின் வழக்கத்தை விட அதிக நோயாளர்கள் இருந்தனர்."],
      ["100 இல் {w2}", "புதுப்பித்த நோயாளர் எண்ணிக்கையுடன், வாரங்கள் 5–8 க்கான எச்சரிக்கைகளுக்குப் பின் வழக்கத்தை விட அதிக நோயாளர்கள் இருந்தனர்."],
      ["100 இல் {q} மற்றும் {q2}", "பொது அறிக்கைகளை மட்டும் கொண்டு அதே இரண்டும். அவை உரிய வாரத்துக்குச் சுமார் 8 வாரங்களுக்குப் பின் இணையத்தில் வருவதால் நோயாளர் எண்ணிக்கை பழையது."],
      ["100 இல் {b}", "முன்னறிவிப்பு இல்லாமலும் 4 வாரக் காலங்களில் வழக்கத்தை விட அதிக நோயாளர்கள் இருக்கின்றனர்."],
    ],
    tested: "விதிகளை 2011 முதல் 2017 வரையான தரவை மட்டும் கொண்டு அமைத்தோம். பின்னர் ஒவ்வொரு சனிக்கிழமையையும் இன்று போலக் கருதி {from} முதல் {to} வரை சோதித்தோம். பொது அறிக்கை எண்களுக்கு, ஒவ்வொரு சனிக்கிழமையும் அன்று ஏற்கனவே இணையத்தில் இருந்த அறிக்கைகள் மட்டுமே பயன்படுத்தப்பட்டன.",
    example: {"title": "ஓர் உண்மை உதாரணம்: யாழ்ப்பாணம், 2024", "text": "2024 டிசம்பரில் கனமழை மற்றும் வெள்ளத்தின் பின் யாழ்ப்பாணத்தில் ஏற்பட்ட எலிக்காய்ச்சல் பரவலால் பலர் உயிரிழந்தனர். ஒவ்வொரு திகதியிலும் இருந்த தரவை மட்டும் கொண்டு LeptoWatch ஐ மீண்டும் இயக்கினோம்:", "rows": [["நவ. 2", "எச்சரிக்கை: 8 வாரங்களில் 39 மழை நாட்கள் (வழக்கம் 33), 4 வாரங்களில் 5 நோயாளர்கள் (வழக்கம் 1)"], ["நவ. 2 – 30", "ஒவ்வொரு வாரமும் எச்சரிக்கை"], ["பொது அறிக்கைகள் மட்டும்", "நவம்பர் முழுவதும் கண்காணிப்பு; முதல் எச்சரிக்கை டிச. 7, மரணங்கள் அறிவிக்கப்படுவதற்கு நான்கு நாட்களுக்கு முன்"], ["டிசம்பர் நடுப்பகுதி", "பரவல் அடையாளம் காணப்பட்டது; டிச. 11 முதல் மரணங்கள் அறிவிக்கப்பட்டன"], ["டிச. 28 வரை 4 வாரங்கள்", "218 நோயாளர்கள், வழக்கமான ஆண்டில் சுமார் 5"]], "note": "அதாவது நோயாளர்கள் உச்சத்தை அடைவதற்குச் சுமார் ஆறு வாரங்களுக்கு முன்பே எச்சரிக்கை வந்தது. இது கடந்த தரவின் மீள் இயக்கம், அப்போது யாரும் பார்த்த முன்னறிவிப்பு அல்ல; நவம்பர் மாத வாராந்த எச்சரிக்கைகள் அதிகாரி நோயாளர் எண்ணிக்கைகளை உள்ளிட்டதாகக் கருதுகின்றன. சுமார் 8 வாரங்கள் தாமதமாக இணையத்தில் வரும் பொது அறிக்கைகள் மட்டும் கொண்டு, அது டிச. 7 வரை கண்காணிப்பில் இருந்தது; எனவே முன்கூட்டிய எச்சரிக்கை அதிகாரியின் சொந்த எண்ணிக்கைகளைச் சார்ந்துள்ளது."},
    mind: "நினைவில் கொள்ளுங்கள்",
    minds: [
      "பொது நோயாளர் அறிக்கைகள் 8 முதல் 11 வாரங்கள் தாமதமாக வருகின்றன. எச்சரிக்கை சாத்தியமாக, கடந்த 4 வாரங்களில் அறிவிக்கப்பட்ட நோயாளர்களைச் சேருங்கள்.",
      "மழை மட்டும் பலவீனமான அறிகுறி, எனவே மழை மட்டும் கண்காணிப்பை மட்டுமே தரும், எச்சரிக்கையை ஒருபோதும் தராது.",
      "எலிக்காய்ச்சல் குறைவாக அறிவிக்கப்படுகிறது. உங்கள் மாவட்டத்தை அதன் சொந்தக் கடந்த காலத்துடன் ஒப்பிடுவது இந்தப் பிரச்சினையைக் குறைக்கிறது.",
      "இது தடுப்பைத் திட்டமிட உதவுகிறது. இது நோயாளர்களைக் கண்டறிவதோ சிகிச்சை ஆலோசனை வழங்குவதோ இல்லை.",
    ],
    data: "தரவு எங்கிருந்து வருகிறது",
    sources: [
      ["நோயாளர்கள்", "தொற்றுநோயியல் பிரிவு, வாராந்த தொற்றுநோயியல் அறிக்கைகள் ({cases} வரை)"],
      ["மழை", "Open-Meteo தினசரி மழைவீழ்ச்சி ({om} வரை); கடந்த பருவங்களுக்கு CHIRPS செயற்கைக்கோள் மழைவீழ்ச்சி ({rain} வரை)"],
      ["வரைபடம்", "geoBoundaries மாவட்ட எல்லைகள்"],
    ],
  },
};

const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");
const pct = (x) => (x == null ? "—" : Math.round(x * 100));
const fullDay = (iso) => (iso ? `${fmtDay(iso)} ${iso.slice(0, 4)}` : "—");
const EXAMPLE_DISTRICT = "Kurunegala";

/** One numbered step: what to count, then a worked example with the sums written out. */
function Step({ n, icon, step, vars, result }) {
  const I = Icon[icon];
  return (
    <section className="about-step">
      <h2><span className="home-num big">{n}</span><span className="home-step-icon"><I /></span>{step.title}</h2>
      <ol className="about-points">{step.points.map((p, i) => <li key={i}>{p}</li>)}</ol>
      {vars && (
        <div className="about-calc">
          <div className="about-calc-head">{fill(step.example, vars)}</div>
          {step.lines.map((l, i) => <div key={i}>{fill(l, vars)}</div>)}
          <div className="about-calc-result">{fill(result, vars)}</div>
        </div>
      )}
    </section>
  );
}

export default function AboutPage({ summary, weekly }) {
  const T = TEXT[useLang()] || TEXT.en;
  const d = summary.data;
  const ev = weekly?.evaluation;
  const h1 = ev?.["1"]?.heldout || summary.pooled?.["1"]?.heldout;
  const h2 = ev?.["2"]?.heldout || summary.pooled?.["2"]?.heldout;
  const v = {
    w: pct(h1?.warning?.precision), w2: pct(h2?.warning?.precision), b: pct(h1?.base_rate),
    q: pct(ev?.["1"]?.heldout_public?.warning?.precision), q2: pct(ev?.["2"]?.heldout_public?.warning?.precision),
    from: "2018", to: (d.last_case_report || "").slice(0, 4),
    cases: fullDay(d.last_case_report), rain: fmt(d.last_rain_month), om: fullDay(weekly?.decided),
  };
  // the rain example uses this week's real numbers for one district
  const ex = weekly?.districts?.[EXAMPLE_DISTRICT]?.["1"];
  const rainVars = ex && { d: dname(EXAMPLE_DISTRICT), date: fullDay(ex.decided), rd: ex.rainy_days, rn: ex.rainy_days_normal };

  return (
    <div className="page about-page simple">
      <header className="about-intro">
        <h1>{T.title}</h1>
        <p className="lead">{T.lead}</p>
      </header>

      <Step n={1} icon="rain" step={T.rainStep} vars={rainVars}
        result={ex && (ex.rain_signal ? T.rainStep.up : T.rainStep.notUp)} />
      <Step n={2} icon="cases" step={T.caseStep} vars={{}} result={T.caseStep.up} />

      <section className="about-step">
        <h2><span className="home-num big">3</span><span className="home-step-icon"><Icon.bell /></span>{T.alertStep}</h2>
        <div className="home-levels">
          {["warning", "watch", "needcount", "normal"].map((l) => (
            <div key={l} className={`home-level ${l}`}>
              <div className="home-level-name"><i className="key" style={{ background: levelColor(l) }} />{LEVEL[l]}</div>
              <p>{T.level[l]}</p>
            </div>
          ))}
        </div>
        <p className="about-leads"><b>{T.leads[0]}.</b> {T.leads[1]}</p>
      </section>

      <section className="about-section">
        <h2>{T.reliable}</h2>
        <div className="about-numbers">
          {T.rows.map(([n, text], i) => (
            <div key={i} className={`about-number ${i === T.rows.length - 1 ? "muted" : ""}`}>
              <b>{fill(n, v)}</b>
              <span>{text}</span>
            </div>
          ))}
        </div>
        <p className="note">{fill(T.tested, v)}</p>
      </section>

      <section className="about-section">
        <h2>{T.example.title}</h2>
        <p className="about-leads">{T.example.text}</p>
        <dl className="about-sources about-case">
          {T.example.rows.map(([k, text]) => <div key={k}><dt>{k}</dt><dd>{text}</dd></div>)}
        </dl>
        <p className="note">{T.example.note}</p>
      </section>

      <section className="about-section">
        <h2>{T.mind}</h2>
        <ul className="home-know">
          {T.minds.map((m, i) => <li key={i}><Icon.info />{m}</li>)}
        </ul>
      </section>

      <section className="about-section">
        <h2>{T.data}</h2>
        <dl className="about-sources">
          {T.sources.map(([k, text]) => <div key={k}><dt>{k}</dt><dd>{fill(text, v)}</dd></div>)}
        </dl>
      </section>
    </div>
  );
}
