"""Risk percentage: a logistic regression on the same signals as the rule, with a calibration check.

The model is trained on 2011-2017 targets only and tested once on 2018 onwards, the same split as
the rule. Its percentage is only published if it passes a calibration check fixed in advance:

  1. its Brier score on 2018+ beats always predicting the 2011-2017 base rate, and
  2. in every 10-point probability band holding at least CAL_MIN_BAND test months, the average
     prediction is within CAL_MAX_GAP of the share of months that really were above normal.

If the raw model fails, it is refitted on 2011-2015 and recalibrated (Platt scaling) on 2016-2017,
then checked again on 2018+. If that fails too, no percentage is shown. Live outlooks use the exact
model that was checked, not a refit, so the published percentage is the one that was tested.

The check is passed almost entirely on months that had a case count. Months without one are rare in
the test years and the model was not well calibrated on them, so a percentage is only shown when
the outlook's data month has a case count (from the reports or entered by an officer).

Also here: a small gradient-boosted tree model, used only in the comparison table.
Pure Python, because numpy is not available on the development machine.
"""
import math
import random
import statistics as st

from . import config

CAL_MIN_BAND = 30
CAL_MAX_GAP = 0.10
L2 = 1.0
BOOTSTRAPS = 25
HIGH_PRIORITY_SHARE = 0.10         # high-priority Warning: percentage in the top 10% of development months
RECAL_TRAIN_END = "2016-01"       # recalibration route: model on targets before this, Platt on the rest of dev
FEATURES = ["bias", "rain anomaly", "rain signal", "case anomaly", "case signal", "case missing", "season sin", "season cos"]


# ---------------------------------------------------------------- features and logistic regression
def features(a):
    rn = max(a["rainy_days_normal"], 1.0)
    has_case = a["cases_data_month"] is not None and a["cases_normal"]
    ca = math.log((a["cases_data_month"] + 1) / (a["cases_normal"] + 1)) if has_case else 0.0
    m = int(a["target"][5:])
    return [1.0,
            (a["rainy_days"] - rn) / rn,           # rain anomaly (relative to the usual rainy days)
            float(a["rain_signal"]),
            ca,                                    # case anomaly (log ratio to the usual level)
            float(bool(a["case_signal"])),
            0.0 if has_case else 1.0,              # case data missing
            math.sin(2 * math.pi * m / 12), math.cos(2 * math.pi * m / 12)]


def _sigmoid(z):
    return 1 / (1 + math.exp(-z)) if z > -35 else 0.0


def _solve(A, b):
    """Gaussian elimination with partial pivoting for a small dense system."""
    n = len(b)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        M[c], M[p] = M[p], M[c]
        for r in range(c + 1, n):
            f = M[r][c] / M[c][c]
            for k in range(c, n + 1):
                M[r][k] -= f * M[c][k]
    x = [0.0] * n
    for r in range(n - 1, -1, -1):
        x[r] = (M[r][n] - sum(M[r][k] * x[k] for k in range(r + 1, n))) / M[r][r]
    return x


def fit_logreg(X, y, l2=L2, iters=30):
    """L2 logistic regression by Newton's method; the bias is not penalised."""
    d = len(X[0])
    w = [0.0] * d
    for _ in range(iters):
        g = [l2 * w[j] * (j > 0) for j in range(d)]
        H = [[l2 * (i == j and i > 0) for j in range(d)] for i in range(d)]
        for x, t in zip(X, y):
            p = _sigmoid(sum(a * b for a, b in zip(w, x)))
            r, s = p - t, p * (1 - p)
            for i in range(d):
                g[i] += r * x[i]
                si = s * x[i]
                Hi = H[i]
                for j in range(i, d):
                    Hi[j] += si * x[j]
        for i in range(d):
            for j in range(i):
                H[i][j] = H[j][i]
        step = _solve(H, g)
        w = [a - b for a, b in zip(w, step)]
        if max(abs(v) for v in step) < 1e-7:
            break
    return w


def _logit(p):
    p = min(max(p, 1e-6), 1 - 1e-6)
    return math.log(p / (1 - p))


def prob(model, x):
    """Probability from {"w": weights, "platt": [a, b] or None}."""
    p = _sigmoid(sum(a * b for a, b in zip(model["w"], x)))
    if model.get("platt"):
        a, b = model["platt"]
        p = _sigmoid(a * _logit(p) + b)
    return p


# ---------------------------------------------------------------- scoring
def auc(scores, y):
    pairs = sorted(zip(scores, y))
    rank_sum, n_pos, i = 0.0, sum(y), 0
    while i < len(pairs):                          # average ranks for ties
        j = i
        while j < len(pairs) and pairs[j][0] == pairs[i][0]:
            j += 1
        rank_sum += (i + j + 1) / 2 * sum(yy for _, yy in pairs[i:j])
        i = j
    n_neg = len(y) - n_pos
    return (rank_sum - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg) if n_pos and n_neg else None


def brier(p, y):
    return sum((a - b) ** 2 for a, b in zip(p, y)) / len(y)


def precision_at(scores, y, k):
    top = sorted(zip(scores, y), key=lambda q: -q[0])[:k]
    return sum(yy for _, yy in top) / k if k else None


def calibration(p, y, base):
    """Reliability bands, Brier against the constant base rate, and the pass/fail verdict."""
    bands = []
    for b in range(10):
        lo, hi = b / 10, (b + 1) / 10
        idx = [i for i, v in enumerate(p) if lo <= v < hi or (b == 9 and v == 1.0)]
        if idx:
            mp = sum(p[i] for i in idx) / len(idx)
            ob = sum(y[i] for i in idx) / len(idx)
            bands.append({"from": lo, "to": hi, "n": len(idx), "predicted": round(mp, 3), "observed": round(ob, 3),
                          "counted": len(idx) >= CAL_MIN_BAND, "ok": abs(mp - ob) <= CAL_MAX_GAP})
    b_model, b_base = brier(p, y), brier([base] * len(y), y)
    bands_ok = all(b["ok"] for b in bands if b["counted"])
    return {"brier": round(b_model, 4), "brier_base_rate": round(b_base, 4),
            "ece": round(sum(b["n"] * abs(b["predicted"] - b["observed"]) for b in bands) / len(y), 3),
            "bands": bands, "beats_base_rate": b_model < b_base, "bands_ok": bands_ok,
            "passed": b_model < b_base and bands_ok}


# ---------------------------------------------------------------- training and the published model
def _xy(recs):
    return [features(r) for r in recs], [int(r["outcome"]) for r in recs]


def _platt(model, recs):
    """Fit p' = sigmoid(a * logit(p) + b) on held-aside development months."""
    X = [[1.0, _logit(prob(model, features(r)))] for r in recs]
    b, a = fit_logreg(X, [int(r["outcome"]) for r in recs], l2=0.0)
    return [a, b]


def _bootstrap(recs, n, seed):
    """Refit on development years resampled with replacement, for the likely range."""
    rnd = random.Random(seed)
    by_year = {}
    for r in recs:
        by_year.setdefault(r["target"][:4], []).append(r)
    years = sorted(by_year)
    out = []
    for _ in range(n):
        sample = [r for yr in (rnd.choice(years) for _ in years) for r in by_year[yr]]
        X, y = _xy(sample)
        if 0 < sum(y) < len(y):
            out.append(fit_logreg(X, y))
    return out


def train_lag(recs, lag):
    """Train, check calibration on 2018+, and return the model to publish (or a failed verdict)."""
    judged = [r for r in recs if r["outcome"] is not None]
    dev = [r for r in judged if r["target"] < config.HELDOUT_FROM]
    test = [r for r in judged if r["target"] >= config.HELDOUT_FROM]
    base_dev = sum(r["outcome"] for r in dev) / len(dev)
    Xt, yt = _xy(test)

    model = {"w": fit_logreg(*_xy(dev)), "platt": None}
    method, check = "logistic regression", calibration([prob(model, x) for x in Xt], yt, base_dev)
    tried = [{"method": method, **{k: check[k] for k in ("brier", "brier_base_rate", "ece", "passed")}}]
    if not check["passed"]:
        early = [r for r in dev if r["target"] < RECAL_TRAIN_END]
        late = [r for r in dev if r["target"] >= RECAL_TRAIN_END]
        model = {"w": fit_logreg(*_xy(early)), "platt": None}
        model["platt"] = _platt(model, late)
        method, check = "logistic regression, recalibrated on 2016-2017", calibration([prob(model, x) for x in Xt], yt, base_dev)
        tried.append({"method": method, **{k: check[k] for k in ("brier", "brier_base_rate", "ece", "passed")}})
        boot_recs = early
    else:
        boot_recs = dev

    p_test = [prob(model, x) for x in Xt]
    # disagreement thresholds, both taken from development data only
    dev_warn = [r for r in dev if r["level"] == "warning"]
    th_low = base_dev
    th_high = sum(r["outcome"] for r in dev_warn) / len(dev_warn) if dev_warn else 0.7
    dis = [(r, p) for r, p in zip(test, p_test)
           if (r["level"] == "warning" and p < th_low) or (r["level"] == "normal" and p >= th_high)]

    # High-priority Warning: a Warning whose percentage is in the top 10% of development months (threshold from 2011-2017)
    p_dev = sorted((prob(model, x) for x in _xy(dev)[0]), reverse=True)
    th_hp = p_dev[int(HIGH_PRIORITY_SHARE * len(p_dev))]
    hp = {period: _hp_record([(r, prob(model, features(r))) for r in recs_], th_hp)
          for period, recs_ in (("dev", dev), ("heldout", test))}

    return {
        "lag": lag, "method": method, "passed": check["passed"], "tried": tried,
        "model": {"w": [round(v, 6) for v in model["w"]], "platt": model["platt"]},
        "boot": [[round(v, 6) for v in w] for w in _bootstrap(boot_recs, BOOTSTRAPS, seed=lag)],
        "thresholds": {"warning_below": round(th_low, 3), "normal_at_or_above": round(th_high, 3),
                       "high_priority": round(th_hp, 3)},
        "high_priority": hp,
        "report": {
            "train_months": len(dev), "test_months": len(test), "base_rate_dev": round(base_dev, 3),
            "base_rate_test": round(sum(yt) / len(yt), 3), "auc": round(auc(p_test, yt), 3),
            "calibration": check,
            "weights": dict(zip(FEATURES, [round(v, 3) for v in model["w"]])),
            "without_case_count": _subgroup([(p, y) for p, y, x in zip(p_test, yt, Xt) if x[5] == 1.0]),
            "disagreements": {"months": len(dis),
                              "above_normal_share": round(sum(r["outcome"] for r, _ in dis) / len(dis), 3) if dis else None},
        },
    }


def _hp_record(pairs, th):
    """How often a high-priority Warning was right, and what share of above-normal months it caught."""
    flagged = [r for r, p in pairs if r["level"] == "warning" and features(r)[5] == 0.0 and p >= th]
    right, pos = sum(r["outcome"] for r in flagged), sum(r["outcome"] for r, _ in pairs)
    return {"alerts": len(flagged), "right": right,
            "precision": round(right / len(flagged), 3) if flagged else None,
            "recall": round(right / pos, 3) if pos else None,
            "share_of_months": round(len(flagged) / len(pairs), 3) if pairs else None}


def _subgroup(pairs):
    if not pairs:
        return None
    p, y = zip(*pairs)
    return {"months": len(p), "predicted": round(sum(p) / len(p), 3), "observed": round(sum(y) / len(y), 3)}


def train(history):
    """One published model per lag, from the full district history (records carry 'outcome')."""
    return {str(lag): train_lag([h for h in history if h["lag"] == lag], lag) for lag in config.LAGS}


def risk(m, a):
    """Percentage, likely range and disagreement flag for one outlook, or None if the model failed its check."""
    if not m or not m["passed"]:
        return None
    x = features(a)
    if x[5] == 1.0:                                # no case count: not covered by the calibration check
        return {"p": None, "needs_cases": True}
    p = prob(m["model"], x)
    spread = sorted(prob({"w": w, "platt": m["model"]["platt"]}, x) for w in m["boot"]) or [p]
    lo, hi = spread[int(0.1 * (len(spread) - 1))], spread[int(round(0.9 * (len(spread) - 1)))]
    th = m["thresholds"]
    disagree = (a["level"] == "warning" and p < th["warning_below"]) or (a["level"] == "normal" and p >= th["normal_at_or_above"])
    high_priority = a["level"] == "warning" and th.get("high_priority") is not None and p >= th["high_priority"]
    return {"p": round(p, 3), "low": round(min(lo, p), 3), "high": round(max(hi, p), 3), "disagree": disagree,
            "high_priority": high_priority}


# ---------------------------------------------------------------- small gradient-boosted trees (comparison only)
def _best_split(X, g, h, idx, min_leaf, lam):
    best = None
    G, Hs = sum(g[i] for i in idx), sum(h[i] for i in idx)
    parent = G * G / (Hs + lam)
    for f in range(1, len(X[0])):
        vals = sorted({X[i][f] for i in idx})
        if len(vals) < 2:
            continue
        cuts = vals if len(vals) <= 16 else [vals[int(q * (len(vals) - 1) / 16)] for q in range(1, 16)]
        for c in set(cuts):
            left = [i for i in idx if X[i][f] <= c]
            if len(left) < min_leaf or len(idx) - len(left) < min_leaf:
                continue
            GL, HL = sum(g[i] for i in left), sum(h[i] for i in left)
            gain = GL * GL / (HL + lam) + (G - GL) ** 2 / (Hs - HL + lam) - parent
            if best is None or gain > best[0]:
                best = (gain, f, c)
    return best


def _grow(X, g, h, idx, depth, min_leaf, lam):
    split = _best_split(X, g, h, idx, min_leaf, lam) if depth > 0 else None
    if not split or split[0] <= 0:
        return -sum(g[i] for i in idx) / (sum(h[i] for i in idx) + lam)
    _, f, c = split
    left = [i for i in idx if X[i][f] <= c]
    right = [i for i in idx if X[i][f] > c]
    return (f, c, _grow(X, g, h, left, depth - 1, min_leaf, lam), _grow(X, g, h, right, depth - 1, min_leaf, lam))


def _tree_value(node, x):
    while isinstance(node, tuple):
        f, c, left, right = node
        node = left if x[f] <= c else right
    return node


def fit_gbt(X, y, rounds=80, depth=2, rate=0.1, min_leaf=30, lam=1.0):
    base = st.mean(y)
    f0 = math.log(base / (1 - base))
    F = [f0] * len(X)
    trees = []
    for _ in range(rounds):
        p = [_sigmoid(v) for v in F]
        g = [pi - yi for pi, yi in zip(p, y)]
        h = [pi * (1 - pi) for pi in p]
        tree = _grow(X, g, h, list(range(len(X))), depth, min_leaf, lam)
        trees.append(tree)
        F = [v + rate * _tree_value(tree, x) for v, x in zip(F, X)]
    return {"f0": f0, "rate": rate, "trees": trees}


def predict_gbt(m, X):
    return [_sigmoid(m["f0"] + m["rate"] * sum(_tree_value(t, x) for t in m["trees"])) for x in X]
