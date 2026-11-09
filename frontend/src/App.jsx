import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Footer from "./components/Footer.jsx";
import { Loading } from "./components/bits.jsx";
import { Icon } from "./icons.jsx";
import { api, fmt, fmtDay } from "./lib.js";
import { useRoute } from "./router.js";
import { LANGS, dname, setLang, t, useLang } from "./i18n.js";
import AboutPage from "./pages/AboutPage.jsx";
import DistrictPage from "./pages/DistrictPage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import MapPage from "./pages/MapPage.jsx";

const NAV = [["home", "nav_home", "#/"], ["map", "nav_map", "#/map"], ["history", "nav_history", "#/history"], ["about", "nav_about", "#/about"]];

export default function App() {
  const [summary, setSummary] = useState(null);
  const [geo, setGeo] = useState(null);
  const [error, setError] = useState("");
  const [lag, setLag] = useState("2");
  const [view, setView] = useState("w1");
  const [weekly, setWeekly] = useState(null);
  const [toast, setToast] = useState("");
  const cache = useRef({});
  const route = useRoute();
  const lang = useLang();

  useEffect(() => {
    Promise.all([api("/api/summary"), api("/data/districts.geojson")])
      .then(([s, g]) => { setSummary(s); setGeo(g); })
      .catch((e) => setError(e.message));
    api("/api/weekly").then(setWeekly).catch(() => setWeekly(null));   // optional: the monthly site works without it
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [route.page, route.param]);

  const getDistrict = (n) => cache.current[n] || (cache.current[n] = api(`/api/district/${encodeURIComponent(n)}`)
    .catch((e) => { delete cache.current[n]; throw e; }));

  const saveCount = async (district, month, value) => {
    await api("/api/cases", { method: "POST", body: `${district},${month},${value}` });
    cache.current = {};
    setSummary(await api("/api/summary"));
    setToast(t("toast_saved", { district: dname(district), month: fmt(month) }));
    setTimeout(() => setToast(""), 3200);
  };

  const saveWeekly = async (district, end, value) => {
    await api("/api/weekly_cases", { method: "POST", body: `${district},${end},${value}` });
    setWeekly(await api("/api/weekly"));
    setToast(t("toast_saved", { district: dname(district), month: fmtDay(end) }));
    setTimeout(() => setToast(""), 3200);
  };
  const onView = (v) => { setView(v); if (!v.startsWith("w")) setLag(v); };

  if (error) return <div className="fatal"><h2>Could not load data</h2><p>{error}</p></div>;
  if (!summary || !geo) return <Loading />;

  const page = route.page === "district" ? "map" : NAV.some(([k]) => k === route.page) ? route.page : "home";
  const shared = { summary, geo, lag, onLag: onView, getDistrict, onSaveCount: saveCount,
    weekly, view: weekly ? view : lag, onView, onSaveWeekly: saveWeekly };

  return (
    <>
      <header className="appbar">
        <a className="brand" href="#/" title={t("nav_home")} aria-label={`LeptoWatch Lanka, ${t("nav_home")}`}>
          <motion.div className="logo" animate={{ y: [0, -2, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}><Icon.logo /></motion.div>
          <div>
            <div className="name">LeptoWatch <span>Lanka</span></div>
            <div className="tag">{t("tagline")}</div>
          </div>
        </a>
        <div className="sources">
          <div className="lang" role="group" aria-label={t("language")}>
            {LANGS.map(([code, label]) => (
              <button key={code} lang={code} aria-pressed={lang === code} onClick={() => setLang(code)}>{label}</button>
            ))}
          </div>
        </div>
      </header>

      {/* CSS fade-in, not AnimatePresence mode="wait": that could leave the new page stuck invisible after
          a reload or Back with framer-motion 11 on React 19. If the animation never runs, the page still shows. */}
      <div key={`${route.page}/${route.param || ""}`} className="page-in">
        {route.page === "district" && route.param ? <DistrictPage name={route.param} {...shared} />
          : page === "history" ? <HistoryPage {...shared} />
            : page === "about" ? <AboutPage {...shared} />
              : page === "map" ? <MapPage {...shared} />
                : <HomePage {...shared} />}
      </div>

      <Footer summary={summary} />

      <AnimatePresence>
        {toast && (
          <motion.div className="toast" role="status" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
            <Icon.normal />{toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
