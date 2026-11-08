import { useEffect, useState } from "react";

/** Hash routes, so the plain Python server needs no changes: #/ (home), #/map, #/district/<name>, #/history, #/about. */
const parse = () => {
  const [, page = "", ...rest] = (window.location.hash || "#/").slice(1).split("/");
  return { page: page || "home", param: rest.length ? decodeURIComponent(rest.join("/")) : null };
};

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export const districtHref = (name) => `#/district/${encodeURIComponent(name)}`;
