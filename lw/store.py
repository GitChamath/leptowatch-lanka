"""SQLite store: raw case-report rows, daily district rainfall, officer-entered counts and a run log."""
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone

from . import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS case_reports (
    week_end TEXT NOT NULL,          -- last day of the reporting week (from the PDF itself)
    week INTEGER,
    district TEXT NOT NULL,
    ytd INTEGER NOT NULL,            -- leptospirosis cases, year to date
    national_ytd INTEGER,
    source TEXT,                     -- URL or file the row came from
    fetched_at TEXT,
    PRIMARY KEY (week_end, district)
);
CREATE TABLE IF NOT EXISTS rain_daily (
    date TEXT NOT NULL,
    district TEXT NOT NULL,
    mm REAL,
    PRIMARY KEY (date, district)
);
CREATE TABLE IF NOT EXISTS officer_counts (
    month TEXT NOT NULL,             -- YYYY-MM
    district TEXT NOT NULL,
    cases INTEGER NOT NULL,
    entered_at TEXT,
    PRIMARY KEY (month, district)
);
CREATE TABLE IF NOT EXISTS runs (
    started_at TEXT, job TEXT, status TEXT, detail TEXT
);
"""


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@contextmanager
def connect(path=None):
    con = sqlite3.connect(path or config.DB_PATH)
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA)
    try:
        yield con
        con.commit()
    finally:
        con.close()


def log_run(con, job, status, detail=""):
    con.execute("INSERT INTO runs VALUES (?,?,?,?)", (now(), job, status, detail[:2000]))


def upsert_reports(con, rows):
    con.executemany(
        "INSERT OR REPLACE INTO case_reports VALUES (:week_end,:week,:district,:ytd,:national_ytd,:source,:fetched_at)",
        rows)


def upsert_rain(con, rows):
    con.executemany("INSERT OR REPLACE INTO rain_daily VALUES (?,?,?)", rows)


def upsert_officer(con, rows):
    con.executemany("INSERT OR REPLACE INTO officer_counts VALUES (?,?,?,?)", [(*r, now()) for r in rows])


def last_rain_date(con, district=None):
    q = "SELECT MAX(date) FROM rain_daily" + (" WHERE district=?" if district else "")
    return con.execute(q, (district,) if district else ()).fetchone()[0]


def last_report(con):
    return con.execute("SELECT MAX(week_end) FROM case_reports").fetchone()[0]


def recent_runs(con, n=10):
    return [dict(r) for r in con.execute("SELECT * FROM runs ORDER BY started_at DESC LIMIT ?", (n,))]
