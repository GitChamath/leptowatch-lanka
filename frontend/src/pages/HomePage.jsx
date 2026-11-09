import { motion } from "framer-motion";
import { Icon } from "../icons.jsx";
import { FieldScene, SpreadArt } from "../components/illustrations.jsx";
import { t, useLang } from "../i18n.js";
import { LEVEL, LEVELS, SHOWN, fmt, fmtDay, levelColor, shownLevel, whenLabel } from "../lib.js";

/** First screen: what LeptoWatch is, how to read it and how to use it, before the map. */
const TEXT = {
  en: {
    eyebrow: "For district health officers in Sri Lanka",
    title: "Know weeks ahead if rat fever will be worse than usual in your district",
    lead: "LeptoWatch checks rainfall and leptospirosis (rat fever) case reports for all 25 districts every week. It compares them with what is normal for each district at that time of year and gives one early alert for the next 8 weeks, so prevention can start before patients arrive.",
    cta_map: "Open the map", cta_how: "How it works",
    snap: "Right now",
    rf_title: "What is rat fever?",
    rf_lead: [
      "Rat fever (leptospirosis) is caused by spiral-shaped bacteria, Leptospira, that live in the kidneys of rats and other animals such as cattle and dogs. Their urine carries the bacteria into water and wet soil, where they can survive for weeks.",
      "People are infected when that water or mud touches cuts, scratches or soaked skin, or splashes into the eyes, nose or mouth. Paddy farmers and people wading through floodwater are most at risk, which is why cases rise after heavy rain.",
      "Treated early it can be cured. Treated late it can damage the kidneys and lungs and kill, so warning early matters.",
    ],
    rf_cards: [
      ["rat", "Rats carry it", "Infected rats, cattle and dogs pass the bacteria in their urine, often without looking sick."],
      ["water", "Water spreads it", "Rain and floods wash it into paddy fields, canals and puddles."],
      ["skin", "It enters through skin", "Cuts, scratches and soaked skin in dirty water or mud let it in."],
      ["protect", "Protect and act early", "Wear boots and gloves, cover wounds, and see a doctor early if a fever follows contact with water or mud."],
    ],
    decide: "How it decides",
    steps: [
      ["rain", "Rain", "Have the last 8 weeks been wetter than usual for this district? Rainy days are compared with the same weeks in past years."],
      ["cases", "Cases", "Were rat fever cases in the last 4 weeks above this district's normal for the season?"],
      ["bell", "Alert", "Rain up and cases more than 1.4 times usual gives a Warning. One up gives a Watch. Neither gives Normal."],
    ],
    colours: "What the colours mean",
    level: {
      normal: "Neither signal is up. Continue routine prevention.",
      needcount: "Wetter than usual, but no case count yet for the last 4 weeks. Add it to get a Watch, Warning or Normal.",
      watch: "Rain or cases are up, but not enough for a Warning. Monitor closely.",
      warning: "Rain is up and cases are well above usual. Start preventive outreach and alert hospitals.",
    },
    use: "How to use it",
    uses: [
      ["Open the map", "Each district is coloured by its alert for the next 8 weeks."],
      ["Click your district", "A short card shows the alert, the reason, what to do first and a box for the case count."],
      ["Open the full report", "Rain and cases against usual, the rain forecast, what to do, and messages for farmers and staff ready to send."],
      ["Add the case count", "Public reports arrive 8 to 11 weeks late. Enter the cases notified in the last 4 weeks from hospital and PHI records; a Watch can become a Warning straight away."],
    ],
    know: "Good to know",
    knows: [
      "It is for planning prevention across a district. It does not diagnose patients or give treatment advice.",
      "A coloured district means higher risk than usual, not a confirmed outbreak.",
      "On years the system never learned from, Warnings were right {w}% of the time for weeks 1–4 and {w2}% for weeks 5–8 with an up-to-date case count, and {q}% and {q2}% using public reports alone (they go online about 8 weeks late), against {b}% by chance.",
      "Switch between English, Sinhala and Tamil at the top of every page.",
    ],
  },
  si: {
    eyebrow: "ශ්‍රී ලංකාවේ දිස්ත්‍රික් සෞඛ්‍ය නිලධාරීන් සඳහා",
    title: "ඔබේ දිස්ත්‍රික්කයේ මී උණ සුපුරුදු ප්‍රමාණයට වඩා වැඩි වේදැයි සති කිහිපයකට පෙර දැනගන්න",
    lead: "LeptoWatch සෑම සතියකම දිස්ත්‍රික්ක 25 සඳහාම වර්ෂාපතනය සහ මී උණ (ලෙප්ටොස්පයිරෝසිස්) රෝගී වාර්තා පරීක්ෂා කරයි. එම කාලයට එක් එක් දිස්ත්‍රික්කයට සාමාන්‍ය දේ සමඟ ඒවා සසඳා, ඉදිරි සති 8 සඳහා එක් පූර්ව අනතුරු ඇඟවීමක් ලබා දෙයි. එවිට රෝගීන් පැමිණීමට පෙර වැළැක්වීමේ කටයුතු ආරම්භ කළ හැක.",
    cta_map: "සිතියම විවෘත කරන්න", cta_how: "ක්‍රියා කරන ආකාරය",
    snap: "මේ මොහොතේ",
    rf_title: "මී උණ යනු කුමක්ද?",
    rf_lead: [
      "මී උණ (ලෙප්ටොස්පයිරෝසිස්) ඇති වන්නේ මීයන්ගේ සහ ගවයන්, බල්ලන් වැනි වෙනත් සතුන්ගේ වකුගඩුවල ජීවත් වන සර්පිලාකාර ලෙප්ටොස්පයිරා බැක්ටීරියාව නිසාය. ඔවුන්ගේ මුත්‍රා මගින් එම බැක්ටීරියාව ජලයට සහ තෙත් පසට එක් වන අතර, එහි සති ගණනක් ජීවත් විය හැක.",
      "එම ජලය හෝ මඩ කැපුම්, සීරීම් හෝ පෙඟුණු සමට ගැටුණු විට, නැතහොත් ඇසට, නාසයට හෝ මුඛයට ඉසුණු විට මිනිසුන්ට ආසාදනය වේ. කුඹුරු ගොවීන්ට සහ ගංවතුරෙන් ගමන් කරන අයට වැඩි අවදානමක් ඇති අතර, අධික වැසිවලින් පසු රෝගීන් වැඩි වන්නේ එබැවිනි.",
      "කලින් ප්‍රතිකාර කළහොත් සුව කළ හැක. ප්‍රමාද වුවහොත් වකුගඩු සහ පෙනහළුවලට හානි කර මරණය දක්වා යා හැකි බැවින් කලින් අනතුරු ඇඟවීම වැදගත්ය.",
    ],
    rf_cards: [
      ["rat", "මීයන් එය රැගෙන යයි", "ආසාදිත මීයන්, ගවයන් සහ බල්ලන් බොහෝ විට අසනීප බවක් නොපෙන්වා මුත්‍රා මගින් බැක්ටීරියාව පිට කරයි."],
      ["water", "ජලය එය පතුරුවයි", "වැසි සහ ගංවතුර එය කුඹුරු, ඇළ මාර්ග සහ වළවල්වලට ගෙන යයි."],
      ["skin", "එය සම හරහා ඇතුළු වේ", "අපිරිසිදු ජලයේ හෝ මඩේ කැපුම්, සීරීම් සහ පෙඟුණු සම හරහා එය ඇතුළු වේ."],
      ["protect", "ආරක්ෂා වී කලින් ක්‍රියා කරන්න", "බූට් සපත්තු සහ අත්වැසුම් පළඳින්න, තුවාල වසා තබන්න, ජලය හෝ මඩ ගැටීමෙන් පසු උණ ආවොත් ඉක්මනින් වෛද්‍යවරයකු හමුවන්න."],
    ],
    decide: "එය තීරණය කරන්නේ කෙසේද",
    steps: [
      ["rain", "වැසි", "පසුගිය සති 8 තුළ මෙම දිස්ත්‍රික්කයට සුපුරුදු ප්‍රමාණයට වඩා වැසි තිබුණාද? වැසි දින පසුගිය වසරවල එම සති සමඟ සසඳයි."],
      ["cases", "රෝගීන්", "පසුගිය සති 4 තුළ මී උණ රෝගීන් මෙම කන්නයට දිස්ත්‍රික්කයේ සාමාන්‍ය මට්ටමට වඩා වැඩිද?"],
      ["bell", "අනතුරු ඇඟවීම", "වැසි ඉහළ සහ රෝගීන් සුපුරුදු ප්‍රමාණය මෙන් 1.4 ගුණයකට වඩා වැඩි නම් අනතුරු ඇඟවීම. එකක් ඉහළ නම් සුපරීක්ෂාව. කිසිවක් නැත්නම් සාමාන්‍ය."],
    ],
    colours: "වර්ණවලින් අදහස් වන්නේ",
    level: {
      normal: "කිසිදු සංඥාවක් ඉහළ නැත. සුපුරුදු වැළැක්වීමේ කටයුතු කරගෙන යන්න.",
      needcount: "සුපුරුදු ප්‍රමාණයට වඩා තෙත්, නමුත් පසුගිය සති 4 සඳහා රෝගී සංඛ්‍යාවක් තවම නැත. සුපරීක්ෂාව, අනතුරු ඇඟවීම හෝ සාමාන්‍ය ලබා ගැනීමට එය ඇතුළත් කරන්න.",
      watch: "වැසි හෝ රෝගීන් ඉහළයි, නමුත් අනතුරු ඇඟවීමකට ප්‍රමාණවත් නැත. සමීපව නිරීක්ෂණය කරන්න.",
      warning: "වැසි ඉහළයි, රෝගීන් සුපුරුදු ප්‍රමාණයට වඩා බොහෝ වැඩියි. වැළැක්වීමේ දැනුවත් කිරීම් අරඹා රෝහල් දැනුවත් කරන්න.",
    },
    use: "භාවිතා කරන ආකාරය",
    uses: [
      ["සිතියම විවෘත කරන්න", "සෑම දිස්ත්‍රික්කයක්ම ඉදිරි සති 8 සඳහා එහි අනතුරු ඇඟවීම අනුව වර්ණ ගන්වා ඇත."],
      ["ඔබේ දිස්ත්‍රික්කය ක්ලික් කරන්න", "කෙටි කාඩ්පතක අනතුරු ඇඟවීම, හේතුව, මුලින්ම කළ යුතු දේ සහ රෝගී සංඛ්‍යාව ඇතුළත් කිරීමට කොටුවක් පෙන්වයි."],
      ["සම්පූර්ණ වාර්තාව විවෘත කරන්න", "සුපුරුදු ප්‍රමාණය සමඟ වැසි සහ රෝගීන්, වැසි පුරෝකථනය, කළ යුතු දේ සහ ගොවීන්ට හා කාර්ය මණ්ඩලයට යැවීමට සූදානම් පණිවිඩ."],
      ["රෝගී සංඛ්‍යාව ඇතුළත් කරන්න", "ප්‍රසිද්ධ වාර්තා සති 8 සිට 11 දක්වා ප්‍රමාද වේ. පසුගිය සති 4 තුළ දැනුම් දුන් රෝගීන් රෝහල් සහ PHI වාර්තාවලින් ඇතුළත් කරන්න; සුපරීක්ෂාවක් වහාම අනතුරු ඇඟවීමක් විය හැක."],
    ],
    know: "දැනගත යුතු දේ",
    knows: [
      "මෙය දිස්ත්‍රික්කයක් පුරා වැළැක්වීම සැලසුම් කිරීම සඳහා ය. එය රෝගීන් හඳුනා ගැනීම හෝ ප්‍රතිකාර උපදෙස් ලබා දීම නොකරයි.",
      "වර්ණ ගැන්වූ දිස්ත්‍රික්කයක් යනු සුපුරුදු ප්‍රමාණයට වඩා වැඩි අවදානමකි, තහවුරු වූ වසංගතයක් නොවේ.",
      "පද්ධතිය ඉගෙන නොගත් වසරවලදී, අනතුරු ඇඟවීම් යාවත්කාලීන රෝගී සංඛ්‍යාවක් සමඟ සති 1–4 සඳහා {w}% ක් සහ සති 5–8 සඳහා {w2}% ක් ද, පොදු වාර්තා පමණක් සමඟ (ඒවා සති 8 කට පමණ පසු අන්තර්ජාලයට එයි) {q}% සහ {q2}% ක් ද නිවැරදි විය; අහම්බෙන් එය {b}% කි.",
      "සෑම පිටුවකම ඉහළින් ඉංග්‍රීසි, සිංහල සහ දෙමළ අතර මාරු වන්න.",
    ],
  },
  ta: {
    eyebrow: "இலங்கையின் மாவட்டச் சுகாதார அதிகாரிகளுக்கு",
    title: "உங்கள் மாவட்டத்தில் எலிக்காய்ச்சல் வழக்கத்தை விட அதிகமாகுமா என்பதைப் பல வாரங்களுக்கு முன்பே அறியுங்கள்",
    lead: "LeptoWatch ஒவ்வொரு வாரமும் 25 மாவட்டங்களுக்கும் மழைவீழ்ச்சியையும் எலிக்காய்ச்சல் (லெப்டோஸ்பைரோசிஸ்) நோயாளர் அறிக்கைகளையும் சரிபார்க்கிறது. அவற்றை அந்தக் காலத்தில் ஒவ்வொரு மாவட்டத்துக்கும் இயல்பானவற்றுடன் ஒப்பிட்டு, அடுத்த 8 வாரங்களுக்கு ஒரு முன்னெச்சரிக்கை தருகிறது. இதனால் நோயாளர்கள் வருவதற்கு முன்பே தடுப்பு நடவடிக்கைகளைத் தொடங்கலாம்.",
    cta_map: "வரைபடத்தைத் திறக்கவும்", cta_how: "இது எப்படி வேலை செய்கிறது",
    snap: "இப்போது",
    rf_title: "எலிக்காய்ச்சல் என்றால் என்ன?",
    rf_lead: [
      "எலிக்காய்ச்சல் (லெப்டோஸ்பைரோசிஸ்) எலிகள் மற்றும் மாடுகள், நாய்கள் போன்ற பிற விலங்குகளின் சிறுநீரகங்களில் வாழும் சுருள் வடிவ லெப்டோஸ்பைரா பாக்டீரியாவால் ஏற்படுகிறது. அவற்றின் சிறுநீர் இந்த பாக்டீரியாவை நீரிலும் ஈரமான மண்ணிலும் சேர்க்கிறது; அங்கு அது பல வாரங்கள் உயிர்வாழலாம்.",
      "அந்த நீர் அல்லது சேறு வெட்டுக்காயங்கள், கீறல்கள், ஊறிய தோலில் படும்போது அல்லது கண், மூக்கு, வாயில் தெறிக்கும்போது மனிதர்களுக்குத் தொற்று ஏற்படுகிறது. வயல் விவசாயிகளும் வெள்ள நீரில் நடப்பவர்களும் அதிக ஆபத்தில் உள்ளனர்; அதனால்தான் கனமழைக்குப் பின் நோயாளர்கள் அதிகரிக்கின்றனர்.",
      "ஆரம்பத்திலேயே சிகிச்சை பெற்றால் குணமாகும். தாமதித்தால் சிறுநீரகங்களையும் நுரையீரல்களையும் பாதித்து உயிரிழப்பை ஏற்படுத்தலாம்; எனவே முன்கூட்டிய எச்சரிக்கை முக்கியம்.",
    ],
    rf_cards: [
      ["rat", "எலிகள் இதைக் காவுகின்றன", "தொற்றுள்ள எலிகள், மாடுகள், நாய்கள் பெரும்பாலும் நோயுற்றதாகத் தெரியாமலேயே சிறுநீர் மூலம் பாக்டீரியாவை வெளியேற்றுகின்றன."],
      ["water", "நீர் இதைப் பரப்புகிறது", "மழையும் வெள்ளமும் இதை வயல்கள், கால்வாய்கள், குட்டைகளுக்குக் கொண்டு செல்கின்றன."],
      ["skin", "இது தோல் வழியாக நுழைகிறது", "அழுக்கு நீரிலோ சேற்றிலோ வெட்டுக்காயங்கள், கீறல்கள், ஊறிய தோல் வழியாக இது நுழைகிறது."],
      ["protect", "பாதுகாத்து, விரைவாகச் செயல்படுங்கள்", "பூட்ஸ், கையுறைகள் அணியுங்கள், காயங்களை மூடுங்கள், நீர் அல்லது சேற்றுடன் தொடர்புக்குப் பின் காய்ச்சல் வந்தால் விரைவில் மருத்துவரைச் சந்தியுங்கள்."],
    ],
    decide: "இது எப்படித் தீர்மானிக்கிறது",
    steps: [
      ["rain", "மழை", "கடந்த 8 வாரங்களில் இந்த மாவட்டத்தில் வழக்கத்தை விட அதிக மழை பெய்ததா? மழை நாட்கள் கடந்த ஆண்டுகளின் அதே வாரங்களுடன் ஒப்பிடப்படுகின்றன."],
      ["cases", "நோயாளர்கள்", "கடந்த 4 வாரங்களில் எலிக்காய்ச்சல் நோயாளர்கள் இந்தப் பருவத்துக்கான மாவட்டத்தின் இயல்பை விட அதிகமா?"],
      ["bell", "எச்சரிக்கை", "மழை உயர்ந்து, நோயாளர்கள் வழக்கத்தின் 1.4 மடங்குக்கு மேல் இருந்தால் எச்சரிக்கை. ஒன்று உயர்ந்தால் கண்காணிப்பு. எதுவுமில்லையெனில் இயல்பு."],
    ],
    colours: "நிறங்களின் அர்த்தம்",
    level: {
      normal: "எந்தச் சமிக்ஞையும் உயரவில்லை. வழக்கமான தடுப்பைத் தொடருங்கள்.",
      needcount: "வழக்கத்தை விட ஈரமானது, ஆனால் கடந்த 4 வாரங்களுக்கான நோயாளர் எண்ணிக்கை இன்னும் இல்லை. கண்காணிப்பு, எச்சரிக்கை அல்லது இயல்பு பெற அதைச் சேர்க்கவும்.",
      watch: "மழை அல்லது நோயாளர்கள் உயர்ந்துள்ளனர், ஆனால் எச்சரிக்கைக்குப் போதாது. உன்னிப்பாகக் கண்காணியுங்கள்.",
      warning: "மழை உயர்ந்துள்ளது, நோயாளர்கள் வழக்கத்தை விட மிக அதிகம். தடுப்பு விழிப்புணர்வைத் தொடங்கி மருத்துவமனைகளுக்குத் தெரிவியுங்கள்.",
    },
    use: "எப்படிப் பயன்படுத்துவது",
    uses: [
      ["வரைபடத்தைத் திறக்கவும்", "ஒவ்வொரு மாவட்டமும் அடுத்த 8 வாரங்களுக்கான அதன் எச்சரிக்கைக்கு ஏற்ப நிறமிடப்பட்டுள்ளது."],
      ["உங்கள் மாவட்டத்தைக் கிளிக் செய்யுங்கள்", "ஒரு சிறிய அட்டை எச்சரிக்கை, காரணம், முதலில் செய்ய வேண்டியவை, நோயாளர் எண்ணிக்கைக்கான பெட்டி ஆகியவற்றைக் காட்டும்."],
      ["முழு அறிக்கையைத் திறக்கவும்", "வழக்கத்துடன் ஒப்பிட்ட மழையும் நோயாளர்களும், மழை முன்னறிவிப்பு, செய்ய வேண்டியவை, விவசாயிகளுக்கும் பணியாளர்களுக்கும் அனுப்பத் தயாரான செய்திகள்."],
      ["நோயாளர் எண்ணிக்கையைச் சேருங்கள்", "பொது அறிக்கைகள் 8 முதல் 11 வாரங்கள் தாமதமாக வருகின்றன. கடந்த 4 வாரங்களில் அறிவிக்கப்பட்ட நோயாளர்களை மருத்துவமனை மற்றும் PHI பதிவுகளிலிருந்து உள்ளிடுங்கள்; கண்காணிப்பு உடனடியாக எச்சரிக்கையாக மாறலாம்."],
    ],
    know: "தெரிந்துகொள்ள வேண்டியவை",
    knows: [
      "இது ஒரு மாவட்டம் முழுவதும் தடுப்பைத் திட்டமிடுவதற்கானது. இது நோயாளர்களைக் கண்டறிவதோ சிகிச்சை ஆலோசனை வழங்குவதோ இல்லை.",
      "நிறமிடப்பட்ட மாவட்டம் என்பது வழக்கத்தை விட அதிக ஆபத்து, உறுதிப்படுத்தப்பட்ட பரவல் அல்ல.",
      "அமைப்பு கற்றுக்கொள்ளாத ஆண்டுகளில், எச்சரிக்கைகள் புதுப்பித்த நோயாளர் எண்ணிக்கையுடன் வாரங்கள் 1–4 க்கு {w}% உம் வாரங்கள் 5–8 க்கு {w2}% உம், பொது அறிக்கைகள் மட்டும் கொண்டு (அவை சுமார் 8 வாரங்கள் தாமதமாக இணையத்தில் வரும்) {q}% உம் {q2}% உம் சரியாக இருந்தன; தற்செயலாக இது {b}%.",
      "ஒவ்வொரு பக்கத்தின் மேலேயும் ஆங்கிலம், சிங்களம், தமிழ் இடையே மாறலாம்.",
    ],
  },
};

const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");
const pct = (x) => (x == null ? "—" : Math.round(x * 100));

export default function HomePage({ summary, weekly }) {
  const T = TEXT[useLang()] || TEXT.en;
  const held = summary.pooled?.["1"]?.heldout;
  const wk = weekly?.evaluation?.["1"]?.heldout || held;
  const nums = { w: pct(wk?.warning?.precision), b: pct(wk?.base_rate),
    q: pct(weekly?.evaluation?.["1"]?.heldout_public?.warning?.precision),
    w2: pct(weekly?.evaluation?.["2"]?.heldout?.warning?.precision),
    q2: pct(weekly?.evaluation?.["2"]?.heldout_public?.warning?.precision) };
  const tally = (lag) => {
    const out = { warning: 0, watch: 0, normal: 0 };
    Object.values(summary.districts).forEach((x) => {
      const l = x.current?.[lag]?.level;
      if (l in out) out[l]++;
    });
    return out;
  };

  return (
    <motion.div className="page home stagger">
      <motion.section className="home-hero rise">
        <div className="home-hero-text">
          <div className="eyebrow">{T.eyebrow}</div>
          <h1>{T.title}</h1>
          <p className="lead">{T.lead}</p>
          <div className="home-ctas">
            <motion.a className="btn big" href="#/map" whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
              {T.cta_map} <span aria-hidden="true">→</span>
            </motion.a>
            <a className="btn ghost big" href="#/history">{t("nav_history")}</a>
            <a className="btn ghost big" href="#/about">{T.cta_how}</a>
          </div>
        </div>
        <aside className="home-snap" aria-label={T.snap}>
          <div className="eyebrow">{T.snap}</div>
          {weekly && ["1"].map((lead) => {
            const first = Object.values(weekly.districts)[0]?.[lead];
            const c = { warning: 0, watch: 0, needcount: 0, normal: 0 };
            Object.values(weekly.districts).forEach((x) => { const l = shownLevel(x[lead]); if (l in c) c[l]++; });
            return (
              <a key={lead} className="snap-row" href="#/map">
                <span className="snap-when"><b>{t("wk_8")}</b>
                  <span>{first ? t("wk_range", { from: fmtDay(first.target_from), to: fmtDay(first.target_end) }) : ""}</span></span>
                <span className="snap-counts">
                  {SHOWN.filter((l) => l !== "needcount" || c[l] > 0).map((l) => (
                    <span key={l} title={LEVEL[l]}><i className="key" style={{ background: levelColor(l) }} />{c[l]}</span>
                  ))}
                </span>
              </a>
            );
          })}
          {!weekly && summary.horizon.map((m, i) => {
            const c = tally(String(i + 1));
            return (
              <a key={m} className="snap-row" href="#/map">
                <span className="snap-when"><b>{fmt(m)}</b><span>{whenLabel(m)}</span></span>
                <span className="snap-counts">
                  {LEVELS.map((l) => (
                    <span key={l} title={LEVEL[l]}><i className="key" style={{ background: levelColor(l) }} />{c[l]}</span>
                  ))}
                </span>
              </a>
            );
          })}
        </aside>
      </motion.section>

      <section className="home-section home-rf rise">
        <h2>{T.rf_title}</h2>
        <div className="rf-intro">
          <figure className="rf-scene"><FieldScene /></figure>
          <div className="rf-text">{T.rf_lead.map((p, i) => <p key={i}>{p}</p>)}</div>
        </div>
        <ol className="rf-cards">
          {T.rf_cards.map(([kind, title, text], i) => (
            <li key={kind} className={`rf-card ${kind}`}>
              <SpreadArt kind={kind} />
              <div className="rf-card-body">
                <h3><span className="home-num">{i + 1}</span>{title}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <motion.section className="home-section rise">
        <h2>{T.decide}</h2>
        <ol className="home-steps">
          {T.steps.map(([icon, title, text], i) => {
            const I = Icon[icon];
            return (
              <li key={icon}>
                <span className="home-step-icon"><I /></span>
                <h3><span className="home-num">{i + 1}</span>{title}</h3>
                <p>{text}</p>
              </li>
            );
          })}
        </ol>
      </motion.section>

      <motion.section className="home-section rise">
        <h2>{T.colours}</h2>
        <div className="home-levels">
          {["normal", "needcount", "watch", "warning"].map((l) => (
            <div key={l} className={`home-level ${l}`}>
              <div className="home-level-name"><i className="key" style={{ background: levelColor(l) }} />{LEVEL[l]}</div>
              <p>{T.level[l]}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section className="home-section rise">
        <h2>{T.use}</h2>
        <ol className="home-use">
          {T.uses.map(([title, text], i) => (
            <li key={i}>
              <span className="home-num big">{i + 1}</span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </li>
          ))}
        </ol>
      </motion.section>

      <motion.section className="home-section rise">
        <h2>{T.know}</h2>
        <ul className="home-know">
          {T.knows.map((k, i) => <li key={i}><Icon.info />{fill(k, nums)}</li>)}
        </ul>
      </motion.section>

    </motion.div>
  );
}
