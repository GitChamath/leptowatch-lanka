"""Does a trained ML model beat the simple Watch/Warning rule?

Same task, same data, same split as the system: predict whether month t is worse than the
district's normal, using only data up to t-lag. Train on targets before 2018, test on 2018+.

Models:
  rule      - the deployed rule (Warning = rain signal AND case signal)
  logreg    - L2 logistic regression on continuous anomalies + season + missing flags
Comparison: ROC AUC, and precision when each model raises the same number of alerts.
Pure Python (numpy is blocked on the dev machine).   usage: python research/ml_compare.py
"""
import math
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lw import config, engine, store  # noqa: E402
from lw.series import month_range, monthly_cases, monthly_rain  # noqa: E402


def records():
    with store.connect() as con:
        cases, (rainy, _) = monthly_cases(con), monthly_rain(con)
    last = max(m for d in rainy.values() for m in d)
    months = month_range(config.FIRST_MONTH, last)
    out = []
    for name in config.DISTRICTS:
        model = engine.District(months, cases.get(name, {}), rainy.get(name, {}))
        for lag in config.LAGS:
            for t in range(config.WARMUP_MONTHS, len(months)):
                a = model.assess(t, lag)
                if a and a["outcome"] is not None:
                    a["district"] = name
                    out.append(a)
    return out


def features(a):
    rn = max(a["rainy_days_normal"], 1.0)
    has_case = a["cases_data_month"] is not None and a["cases_normal"]
    ca = math.log((a["cases_data_month"] + 1) / (a["cases_normal"] + 1)) if has_case else 0.0
    m = int(a["target"][5:])
    return [1.0,                                   # bias
            (a["rainy_days"] - rn) / rn,           # rain anomaly (relative)
            float(a["rain_signal"]),
            ca,                                    # case anomaly (log ratio)
            float(bool(a["case_signal"])),
            0.0 if has_case else 1.0,              # case data missing
            math.sin(2 * math.pi * m / 12), math.cos(2 * math.pi * m / 12)]


def fit(X, y, l2=1.0, epochs=400, lr=0.1):
    w = [0.0] * len(X[0])
    n = len(X)
    for _ in range(epochs):
        grad = [0.0] * len(w)
        for xi, yi in zip(X, y):
            p = 1 / (1 + math.exp(-sum(a * b for a, b in zip(w, xi))))
            for j, v in enumerate(xi):
                grad[j] += (p - yi) * v
        for j in range(len(w)):
            grad[j] = grad[j] / n + (l2 / n) * w[j] * (j > 0)
            w[j] -= lr * grad[j]
    return w


def predict(w, X):
    return [1 / (1 + math.exp(-sum(a * b for a, b in zip(w, x)))) for x in X]


def auc(scores, y):
    pairs = sorted(zip(scores, y))
    rank_sum, n_pos, i = 0.0, sum(y), 0
    while i < len(pairs):                          # average ranks for ties
        j = i
        while j < len(pairs) and pairs[j][0] == pairs[i][0]:
            j += 1
        r = (i + j + 1) / 2
        rank_sum += r * sum(yy for _, yy in pairs[i:j])
        i = j
    n_neg = len(y) - n_pos
    return (rank_sum - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg)


def precision_at(scores, y, k):
    top = sorted(zip(scores, y), key=lambda p: -p[0])[:k]
    return sum(yy for _, yy in top) / k


def main():
    random.seed(0)
    recs = records()
    for lag in config.LAGS:
        rs = [r for r in recs if r["lag"] == lag]
        train = [r for r in rs if r["target"] < config.HELDOUT_FROM]
        test = [r for r in rs if r["target"] >= config.HELDOUT_FROM]
        Xtr, ytr = [features(r) for r in train], [int(r["outcome"]) for r in train]
        Xte, yte = [features(r) for r in test], [int(r["outcome"]) for r in test]
        w = fit(Xtr, ytr)
        p = predict(w, Xte)

        rule_score = [2 * (r["level"] == "warning") + (r["level"] == "watch") for r in test]
        k = sum(r["level"] == "warning" for r in test)          # same number of alerts as the rule
        rule_prec = sum(r["outcome"] for r in test if r["level"] == "warning") / k
        base = sum(yte) / len(yte)
        print(f"\nlag {lag}: train {len(train)} months (2011-2017), test {len(test)} months (2018+), base rate {base:.1%}")
        print(f"  rule    AUC {auc(rule_score, yte):.3f}   precision of its {k} Warnings: {rule_prec:.1%}")
        print(f"  logreg  AUC {auc(p, yte):.3f}   precision of its top {k} alerts: {precision_at(p, yte, k):.1%}")
        names = ["bias", "rain anomaly", "rain signal", "case anomaly", "case signal", "case missing", "season sin", "season cos"]
        print("  logreg weights:", ", ".join(f"{n} {v:+.2f}" for n, v in zip(names, w)))
        # rain-only model, to answer "can rain alone predict it?"
        keep = [0, 1, 2, 6, 7]
        wr = fit([[x[i] for i in keep] for x in Xtr], ytr)
        pr = predict(wr, [[x[i] for i in keep] for x in Xte])
        print(f"  rain-only logreg  AUC {auc(pr, yte):.3f}   precision of top {k}: {precision_at(pr, yte, k):.1%}")


if __name__ == "__main__":
    main()
