import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Footer from "./components/Footer.jsx";
import { Loading } from "./components/bits.jsx";
import { Icon } from "./icons.jsx";
import { api, fmt } from "./lib.js";
import { useRoute } from "./router.js";
import AboutPage from "./pages/AboutPage.jsx";
import DistrictPage from "./pages/DistrictPage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import MapPage from "./pages/MapPage.jsx";

const NAV = [["map", "Map", "#/"], ["history", "Past seasons", "#/history"], ["about", "How it works", "#/about"]];

export default function App() {
  const [summary, setSummary] = useState(null);
  const [geo, setGeo] = useState(null);
  const [error, setError] = useState("");
  const [lag, setLag] = useState("2");
  const [toast, setToast] = useState("");
  const cache = useRef({});
  const route = useRoute();

  useEffect(() => {
    Promise.all([api("/api/summary"), api("/data/districts.geojson")])
      .then(([s, g]) => { setSummary(s); setGeo(g); })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [route.page, route.param]);

  const getDistrict = (n) => cache.current[n] || (cache.current[n] = api(`/api/district/${encodeURIComponent(n)}`)
    .catch((e) => { delete cache.current[n]; throw e; }));

  const saveCount = async (district, month, value) => {
    await api("/api/cases", { method: "POST", body: `${district},${month},${value}` });
    cache.current = {};
    setSummary(await api("/api/summary"));
    setToast(`${district}: ${fmt(month)} count saved, outlook updated`);
    setTimeout(() => setToast(""), 3200);
  };

  if (error) return <div className="fatal"><h2>Could not load data</h2><p>{error}</p></div>;
  if (!summary || !geo) return <Loading />;

  const d = summary.data;
  const page = { district: "map" }[route.page] || (NAV.some(([k]) => k === route.page) ? route.page : "map");
  const shared = { summary, geo, lag, onLag: setLag, getDistrict, onSaveCount: saveCount };

  return (
    <>
      <motion.header className="appbar" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }}>
        <a className="brand" href="#/">
          <motion.div className="logo" animate={{ y: [0, -2, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}><Icon.logo /></motion.div>
          <div>
            <div className="name">LeptoWatch <span>Lanka</span></div>
            <div className="tag">District leptospirosis early warning</div>
          </div>
        </a>
        <nav className="nav" aria-label="Pages">
          {NAV.map(([k, label, href]) => (
            <a key={k} href={href} aria-current={page === k ? "page" : undefined}>
              {page === k && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="sources">
          <div className="source"><span className="status-dot" />Rainfall <b>{fmt(d.last_rain_month)}</b></div>
          <div className="source"><span className="status-dot late" />Case reports <b>{fmt(d.last_case_report?.slice(0, 7))}</b></div>
        </div>
      </motion.header>

      <AnimatePresence mode="wait">
        <motion.div key={`${route.page}/${route.param || ""}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
          {route.page === "district" && route.param ? <DistrictPage name={route.param} {...shared} />
            : page === "history" ? <HistoryPage {...shared} />
              : page === "about" ? <AboutPage {...shared} />
                : <MapPage {...shared} />}
        </motion.div>
      </AnimatePresence>

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
