import datetime as dt
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lw import wer  # noqa: E402

# Shape of Table 1 text as extracted from WER Vol. 45 No. 30 (2018); numbers shortened to two districts.
PAGE_2018 = """WER Sri Lanka - Vol. 45 No. 30    21st– 27th July  2018
Table 1:  Selected notifiable diseases reported by Medical Officers of Health    14th – 20th July 2018 (29th  Week)
Source:  Weekly  Returns of Communicable   Diseases  (WRCD).
Kurunegala 60 1614 0 91 1 9 1 11 0 3 3 102 0 13 1 13 0 1 7 337 3 65 7 192 66 100
paha 225 3102 6 45 1 6 1 15 0 14 3 137 0 4 0 10 0 0 6 458 2 29 1 23 66 100
Ampara 8 170 2 41 0 3 0 1 0 5 0 32 0 0 0 5 0 1 5 146 1 15 0 1 67 100
Kalmune 28 1418 3 29 1 3 1 2 1 29 0 4 0 0 0 1 0 0 6 130 0 8 0 1 51 100
SRILANKA 1551 32047 29 1135 7 128 8 225 5 653 89 2506 20 790 4 167 0 14 131 4758 34 690 45 1601 53 99
"""

# 2010 header style: "January  - 2010(04th  Week"
PAGE_2010 = """Table 4:  Selected notifiable diseases reported by Medical Officers of Health
23rd – 29th January  - 2010(04th  Week)
Polonnaruwa 1 66 1 4 0 1 0 3 0 9 2 19 0 3 0 3 0 0
"""

# 2026 retitled Table 1 (Vol. 53 No. 37); same columns
PAGE_2026 = """WER Sri Lanka - Vol. 53 No. 37    07th – 13th  Sep 2026
Table 1: Distribution of Notified Diseases reported by Medical Officers of Health    31st Aug – 06th  Sep 2026 (36th  Week)
Colombo 186 19316 0 18 0 2 0 4 0 21 3 236 0 2 2 17 0 0 10 409 3 83 0 4 48 1317 0 117 28 97
SRILANKA 680 93420 17 800 3 189 1 99 9 740 75 5499 7 655 39 477 0 8 101 8668 30 2468 30 2840 173 5681 14 832 18 95
"""


class ParseTable(unittest.TestCase):
    def test_reads_leptospirosis_year_to_date(self):
        week_end, week, counts, national = wer.parse_table_text(PAGE_2018)
        self.assertEqual(week_end, dt.date(2018, 7, 20))
        self.assertEqual(week, 29)
        self.assertEqual(counts["Kurunegala"], 102)
        self.assertEqual(national, 2506)

    def test_truncated_name_and_kalmunai_merge(self):
        _, _, counts, _ = wer.parse_table_text(PAGE_2018)
        self.assertEqual(counts["Gampaha"], 137)            # "paha" in the text layer
        self.assertEqual(counts["Ampara"], 32 + 4)          # Kalmunai RDHS folded into Ampara
        self.assertNotIn("Kalmunai", counts)

    def test_older_date_format(self):
        week_end, week, counts, _ = wer.parse_table_text(PAGE_2010)
        self.assertEqual(week_end, dt.date(2010, 1, 29))
        self.assertEqual(counts["Polonnaruwa"], 19)

    def test_2026_table_title(self):
        week_end, week, counts, national = wer.parse_table_text(PAGE_2026)
        self.assertEqual(week_end, dt.date(2026, 9, 6))
        self.assertEqual(week, 36)
        self.assertEqual(counts["Colombo"], 236)
        self.assertEqual(national, 5499)

    def test_issue_number_from_url(self):
        # the old pattern misread issue 22 as 2; keep this from coming back
        m = wer.ISSUE.search("wer/2007/vol_34_no_22_english.pdf")
        self.assertEqual((m.group(1), m.group(2)), ("34", "22"))
        m = wer.ISSUE.search("pdfs/Vol%2038%20NO%2001%20English.pdf")
        self.assertEqual((m.group(1), m.group(2)), ("38", "01"))

    def test_page_without_table(self):
        self.assertIsNone(wer.parse_table_text("Influenza surveillance summary"))


if __name__ == "__main__":
    unittest.main()
