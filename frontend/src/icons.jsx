const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };

export const Icon = {
  warning: () => <svg {...base} strokeWidth="2.2"><path d="M12 3 2 20h20L12 3z" /><path d="M12 10v4M12 17.5v.01" /></svg>,
  watch: () => <svg {...base} strokeWidth="2.2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  normal: () => <svg {...base} strokeWidth="2.4"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>,
  nodata: () => <svg {...base} strokeWidth="2.2"><path d="M6 12h12" /></svg>,
  rain: () => (
    <svg {...base} strokeWidth="2"><path d="M7 15a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6 1.5A3.5 3.5 0 0 1 17 15H7z" /><path d="M8 18.5l-1 2M12 18.5l-1 2M16 18.5l-1 2" /></svg>
  ),
  cases: () => (
    <svg {...base} strokeWidth="2"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 5.5a3 3 0 0 1 0 5.6M18 19a5.5 5.5 0 0 0-2.5-4.6" /></svg>
  ),
  pointer: () => (
    <svg {...base} strokeWidth="2"><path d="M9 11V5a1.5 1.5 0 0 1 3 0v5M12 10V4a1.5 1.5 0 0 1 3 0v6M15 10V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3.5 14a1.5 1.5 0 0 1 2.4-1.8L9 15" /></svg>
  ),
  chart: () => <svg {...base} strokeWidth="2"><path d="M4 4v16h16" /><path d="m7 15 4-4 3 3 5-6" /></svg>,
  bell: () => <svg {...base} strokeWidth="2"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></svg>,
  info: () => <svg {...base} strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5v.01" /></svg>,
  file: () => <svg {...base} strokeWidth="2"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>,
  history: () => <svg {...base} strokeWidth="2"><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" /><path d="M3 4v4h4M12 8v4.5l3 2" /></svg>,
  close: () => <svg {...base} strokeWidth="2.2"><path d="M6 6l12 12M18 6 6 18" /></svg>,
  play: () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor" /></svg>,
  pause: () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor" /></svg>,
  logo: () => (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 3c5 7 9 11.6 9 16.5A9 9 0 0 1 7 19.5C7 14.6 11 10 16 3z" fill="currentColor" />
      <path d="M12 20.5a4 4 0 0 0 4 4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  ),
};
