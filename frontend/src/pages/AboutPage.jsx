import { Icon } from "../icons.jsx";
import { LEVEL, LEVELS, fmt, levelColor } from "../lib.js";

const pct = (x) => (x == null ? "—" : `${Math.round(x * 100)}%`);

const STEPS = [
  ["rain", "Monitor rainfall", "We monitor rainfall across each district using satellite-based rainfall data."],
  ["chart", "Compare with case reports", "We compare rainfall and reported leptospirosis cases with each district's usual pattern for that time of year."],
  ["bell", "Identify potential warnings", "The system flags months where the pattern suggests higher-than-usual disease activity."],
];

const LEVEL_TEXT = {
  warning: "Rain and cases both above usual",
  watch: "One of the two above usual, usually rain",
  normal: "Neither above usual",
  nodata: "Not enough data to say",
};

const RULES = [
  ["Warning", "rain and cases both up", "warning"],
  ["Any alert", "Watch or Warning", "any_alert"],
  ["Rain alone", "alert whenever rain is up", "rain_only_rule"],
  ["Cases alone", "alert whenever cases are up", "cases_only_rule"],
];

/** How it works: the process and the headline results first; tables and sources on demand. */
export default function AboutPage({ summary }) {
  const d = summary.data;
  const caseTo = fmt(d.last_case_report?.slice(0, 7));
  const held = (L) => summary.pooled?.[L]?.heldout;
  const h1 = held("1");

  return (
    <div className="page about-page">
      <header className="about-intro">
        <h1>How the Early-Warning System Works</h1>
        <p className="lead">
          Learn how rainfall and reported leptospirosis cases help identify periods when disease activity may be higher than usual.
        </p>
        <p className="note">New here? Open the <a href="#/">Map</a>, click your district, then open its full report.</p>
      </header>

      {/* B: the process */}
      <section className="about-section" aria-labelledby="how-h">
        <h2 id="how-h">From rainfall to a warning</h2>
        <ol className="flow">
          {STEPS.map(([icon, title, text], i) => {
            const I = Icon[icon];
            return (
              <li key={title} className="flow-step">
                <span className="flow-icon"><I /></span>
                <span className="flow-num">Step {i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            );
          })}
        </ol>
        <dl className="level-key">
          {LEVELS.concat("nodata").map((l) => (
            <div key={l}>
              <dt><i className="key" style={{ background: levelColor(l) }} aria-hidden="true" />{LEVEL[l]}</dt>
              <dd>{LEVEL_TEXT[l]}</dd>
            </div>
          ))}
        </dl>
        <p className="note">Warnings indicate potential increases in activity. They do not guarantee that an outbreak will occur.</p>
      </section>

      {/* C: headline results */}
      <section className="about-section" aria-labelledby="rel-h">
        <h2 id="rel-h">How Reliable Are the Warnings?</h2>
        <p className="section-sub">The system was evaluated using historical data that was not used to develop the warning rules.</p>
        <div className="stat-pair">
          {["1", "2"].map((L) => {
            const h = held(L);
            if (!h) return null;
            return (
              <div key={L} className="big-stat">
                <div className="big-stat-label">{L === "1" ? "1 month ahead" : "2 months ahead"}</div>
                <div className="big-stat-n">{pct(h.warning?.precision)}</div>
                <p>of Warnings were followed by a month with higher-than-usual reported cases
                  ({h.warning?.correct} of {h.warning?.alerts}).</p>
              </div>
            );
          })}
        </div>
        {h1 && (
          <div className="meaning" role="note">
            <span className="meaning-icon"><Icon.info /></span>
            <div>
              <h3>What does this mean?</h3>
              <p>
                The one-month Warning was correct {pct(h1.warning?.precision)} of the time in the historical evaluation.
                However, months with higher-than-usual activity also occurred by chance {pct(h1.base_rate)} of the time.
                Warnings should therefore be read as useful signals, not guarantees, and not as the chance of an outbreak.
              </p>
            </div>
          </div>
        )}
        <p className="note">Evaluation period: January 2018 to {caseTo}, across all 25 districts.</p>
        {summary.ml?.["1"] && (
          <p className="section-sub risk-summary">
            {summary.ml["1"].passed
              ? <>District reports also show a <b>risk percentage</b> for next month when that month's case count is known.
                It passed a calibration check fixed in advance{summary.ml["2"]?.passed ? "" : "; for two months ahead it did not, so none is shown there"}.</>
              : <>No risk percentage is shown, because the model did not pass its calibration check.</>}
          </p>
        )}

        {/* D: detailed tables */}
        <details className="accordion">
          <summary>View Detailed Performance Statistics</summary>
          <div className="accordion-body">
            <dl className="defs">
              <div><dt>Correct</dt><dd>Of all alerts a rule raised, the share followed by a month with more cases than usual.</dd></div>
              <div><dt>Busy months caught</dt><dd>Of all months with more cases than usual, the share that had an alert beforehand.</dd></div>
              <div><dt>Chance level</dt><dd>How often a month had more cases than usual anyway, with no forecast at all.</dd></div>
              <div><dt>2011 to 2017</dt><dd>The years used to build the rules, shown for comparison only.</dd></div>
            </dl>
            {["1", "2"].map((L) => {
              const h = held(L), dv = summary.pooled?.[L]?.dev;
              if (!h) return null;
              return (
                <div key={L} className="table-wrap">
                  <table className="perf">
                    <caption>{L === "1" ? "One month ahead" : "Two months ahead"} · chance level {pct(h.base_rate)}</caption>
                    <thead>
                      <tr>
                        <th scope="col">Rule</th>
                        <th scope="col">Correct, 2018 on</th>
                        <th scope="col">Busy months caught</th>
                        <th scope="col">Correct / alerts</th>
                        <th scope="col">Correct, 2011 to 2017</th>
                      </tr>
                    </thead>
                    <tbody>
                      {RULES.map(([name, sub, k]) => (
                        <tr key={k}>
                          <th scope="row">{name}<span>{sub}</span></th>
                          <td>{pct(h[k]?.precision)}</td>
                          <td>{pct(h[k]?.recall)}</td>
                          <td>{h[k]?.correct} / {h[k]?.alerts}</td>
                          <td>{pct(dv?.[k]?.precision)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
            <p className="note">Percentages are past results, not the probability for a coming month.</p>
          </div>
        </details>

        {summary.ml && <ModelDetails ml={summary.ml} comparison={summary.model_comparison} />}
      </section>

      {/* E: limitations */}
      <section className="about-section" aria-labelledby="lim-h">
        <h2 id="lim-h">What Should You Keep in Mind?</h2>
        <ul className="limits-list">
          <li>
            <span className="lim-icon"><Icon.rain /></span>
            <div>
              <h3>Rainfall is only one signal</h3>
              <p>Rainfall alone is only slightly better than chance at identifying higher-than-usual activity, so on its own
                it can raise a Watch but never a Warning. Case counts are needed to confirm a meaningful increase. In testing, last month's case count on its own predicted
                about as well as the full model, so most of the skill comes from case counts.</p>
            </div>
          </li>
          <li>
            <span className="lim-icon"><Icon.file /></span>
            <div>
              <h3>Case reports may be incomplete or delayed</h3>
              <p>Leptospirosis is under-reported, and reporting delays can affect the results. Comparing each district with its
                own usual level reduces, but does not remove, this effect. The strength of the signal has also changed between
                periods (compare 2011 to 2017 with 2018 on in the detailed statistics), possibly partly because reporting was
                disrupted during COVID-19.</p>
            </div>
          </li>
          <li>
            <span className="lim-icon"><Icon.history /></span>
            <div>
              <h3>Historical results do not guarantee future performance</h3>
              <p>The rules were evaluated on historical data, and future results may differ. Public case reports end in {caseTo},
                so recent outlooks rely on rainfall and any counts officers add. The risk percentage needs a case count, so
                it is missing from most outlooks until officers add recent numbers.</p>
            </div>
          </li>
        </ul>
      </section>

      {/* F: sources and method */}
      <section className="about-section">
        <details className="accordion">
          <summary>Data Sources and Methodology</summary>
          <div className="accordion-body">
            <dl className="sources-dl">
              <div><dt>Rainfall</dt><dd>CHIRPS daily satellite rainfall, averaged over each district, available to {fmt(d.last_rain_month)}. A rainy day is one with at least 1 mm.</dd></div>
              <div><dt>Cases</dt><dd>Epidemiology Unit Weekly Epidemiological Reports, with public reports available to {caseTo}.</dd></div>
              <div><dt>Reporting delay</dt><dd>Public case reports are published about 8 to 11 weeks late.</dd></div>
              <div><dt>Officer counts</dt><dd>Case numbers entered by district health staff in the district reports.</dd></div>
              <div><dt>District boundaries</dt><dd>geoBoundaries, licensed CC BY 4.0.</dd></div>
              <div><dt>Usual levels</dt><dd>Usual rain is the median rainy days for that calendar month in past years. Usual cases are the district's
                average over its latest 12 complete months, multiplied by the typical ratio for that month, taken as the median over at least
                five past years. Months with missing reports are left out, not guessed. With fewer than 9 complete months in the last 12, or
                when the latest public reports are old, the outlook is marked low confidence.</dd></div>
              {summary.baseline_comparison && <BaselineNote b={summary.baseline_comparison} />}
              <div><dt>Risk percentage</dt><dd>A logistic regression on the same signals, trained on 2011 to 2017 only. The likely range comes from
                refitting it on resampled years. When the rule gives a Warning but the model's estimate is below the 2011 to 2017 chance level,
                or the rule says Normal but the model is as confident as a typical Warning, the report says the signals disagree.</dd></div>
              <div><dt>Evaluation</dt><dd>Rules were developed on 2011 to 2017 data and evaluated on unseen months from January 2018 to {caseTo},
                using only data that would have been available when each forecast was made.</dd></div>
            </dl>
          </div>
        </details>
      </section>
    </div>
  );
}

/** Predicted vs observed, per 10-point band: points on the diagonal mean the percentages can be taken at face value. */
function Reliability({ bands }) {
  const W = 270, H = 212, L = 34, B = 36, T = 8, R = 18;
  const x = (v) => L + v * (W - L - R), y = (v) => H - B - v * (H - B - T);
  const max = Math.max(...bands.map((b) => b.n));
  return (
    <svg className="reliability" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Calibration chart: predicted against observed share">
      <path className="rel-band" d={`M${x(0)},${y(0.1)} L${x(0.9)},${y(1)} L${x(1)},${y(1)} L${x(1)},${y(0.9)} L${x(0.1)},${y(0)} L${x(0)},${y(0)} Z`} />
      <line className="rel-diag" x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} />
      {[0, 0.5, 1].map((v) => (
        <g key={v}>
          <text x={x(v)} y={H - B + 14} textAnchor="middle">{v * 100}%</text>
          <text x={L - 6} y={y(v) + 3.5} textAnchor="end">{v * 100}%</text>
        </g>
      ))}
      <text x={(L + W - R) / 2} y={H - 3} textAnchor="middle" className="axis-label">predicted</text>
      {bands.map((b) => (
        <circle key={b.from} cx={x(b.predicted)} cy={y(b.observed)} r={2.5 + 5 * Math.sqrt(b.n / max)}
          className={b.counted ? (b.ok ? "rel-pt" : "rel-pt off") : "rel-pt few"}>
          <title>{`${Math.round(b.from * 100)} to ${Math.round(b.to * 100)}%: predicted ${Math.round(b.predicted * 100)}%, observed ${Math.round(b.observed * 100)}% (${b.n} months)`}</title>
        </circle>
      ))}
    </svg>
  );
}

function ModelDetails({ ml, comparison }) {
  return (
    <details className="accordion">
      <summary>Risk Percentage and Model Comparison</summary>
      <div className="accordion-body">
        <p className="note">
          The pass mark was fixed before testing: on 2018 onwards the model must beat always predicting the 2011 to 2017 chance level
          (Brier score, lower is better), and in every 10-point band with at least 30 months, its average prediction must be within
          10 points of what really happened.
        </p>
        <div className="cal-grid">
          {["1", "2"].map((L) => {
            const m = ml[L];
            if (!m) return null;
            const c = m.report.calibration, w = m.report.without_case_count;
            return (
              <div key={L} className="cal-card">
                <h3>{L === "1" ? "One month ahead" : "Two months ahead"} · <span className={m.passed ? "pass" : "fail"}>{m.passed ? "passed" : "did not pass"}</span></h3>
                <Reliability bands={c.bands} />
                <p className="note">
                  Brier {c.brier} vs {c.brier_base_rate} for the chance level · ranking (AUC) {m.report.auc} · {m.method}.
                  {m.tried.length > 1 ? " Recalibration on 2016 to 2017 was also tried." : ""}
                </p>
                {w && (
                  <p className="note">Months without a case count ({w.months}): predicted {Math.round(w.predicted * 100)}%,
                    observed {Math.round(w.observed * 100)}%. This is why no percentage is shown without a count.</p>
                )}
              </div>
            );
          })}
        </div>
        <p className="note">Each dot is a 10-point band of predictions (across) against how often those months really were busier (up), sized by how
          many months it holds. The shaded strip is within 10 points of the diagonal. Hollow dots hold fewer than 30 months and are not counted.</p>

        {comparison && ["1", "2"].map((L) => {
          const c = comparison.lags?.[L];
          if (!c) return null;
          return (
            <div key={L} className="table-wrap">
              <table className="perf">
                <caption>{L === "1" ? "One month ahead" : "Two months ahead"} · every method trained on 2011 to 2017, tested on 2018 on</caption>
                <thead>
                  <tr><th scope="col">Method</th><th scope="col">Ranking (AUC)</th><th scope="col">Brier</th>
                    <th scope="col">Correct, top {c.alerts_k} months</th></tr>
                </thead>
                <tbody>
                  {c.rows.map((r) => (
                    <tr key={r.method}>
                      <th scope="row">{r.method}<span>{r.what}</span></th>
                      <td>{r.auc?.toFixed(3)}</td>
                      <td>{r.brier == null ? "—" : r.brier.toFixed(3)}</td>
                      <td>{r.precision_at_k == null ? "—" : `${Math.round(r.precision_at_k * 100)}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
        {comparison && (
          <p className="note">AUC: how well a method ranks busier months above quieter ones (0.5 is guessing). "Correct, top" gives every method the
            same number of alerts as the rule's Warnings. Brier is only shown for methods that give a probability.</p>
        )}
      </div>
    </details>
  );
}

/** The proposal's check of a simpler usual level, reported with its outcome and the reason for the choice in use. */
function BaselineNote({ b }) {
  const h = b.heldout_2018_on;
  const p = (v) => `${Math.round(v * 100)}%`;
  return (
    <div>
      <dt>Simpler usual level tested</dt>
      <dd>
        On 2011 to 2017 we compared the usual level above with the median of the same month over the last three years.
        The 3-year median was steadier ({b.three_year.year_to_year_change} vs {b.current.year_to_year_change} typical yearly change) and flagged
        more sharp rises ({p(b.three_year.real_rises_flagged)} vs {p(b.current.real_rises_flagged)}), but fitted actual months less well
        ({b.three_year.typical_error} vs {b.current.typical_error} typical error).
        {h && <> On 2018 onwards it would call {p(h.three_year["1"].base_rate)} of all months above usual (against {p(h.current["1"].base_rate)}),
          and its Warnings beat chance by {h.three_year["1"].lift}x against {h.current["1"].lift}x.</>}
        {" "}{b.in_use === "current" ? "The current usual level is kept." : "The 3-year median is in use."}
      </dd>
    </div>
  );
}
