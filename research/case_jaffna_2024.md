# Case study: Jaffna, December 2024

A back-test of the current weekly rule (`research/case_study.py`). Each Saturday uses only rain up to that day and
case reports dated on or before it. In real use the case counts would come from the officer, because public reports
are published weeks later.

## What happened

A leptospirosis outbreak in Jaffna district after heavy north-east monsoon rain and the floods of Cyclone Fengal
(late November 2024). Deaths from an unidentified fever were reported from 11 December and identified as
leptospirosis; reports gave 5 to 8 deaths, mostly in Point Pedro, Chavakachcheri and Karaveddy MOH areas. The
Epidemiology Unit counted 221 patients with symptoms compatible with leptospirosis from 1 December 2024 to
10 January 2025.

Sources: [Ada Derana](https://adaderana.lk/news.php?nid=104183),
[Daily Mirror](https://dailymirror.lk/print/breaking-news/Fever-outbreak-in-Jaffna-identified-as-Leptospirosis/108-297954),
[News 1st](https://www.newsfirst.lk/2024/12/16/leptospirosis-outbreak-8-deaths-reported-in-jaffna-district),
[Epidemiology Unit WER Vol 52 No 02](https://epid.gov.lk/storage/post/pdfs/en_67c96592b4988_Vol_52_no_02-english.pdf),
[J Coll Community Physicians Sri Lanka](https://jccpsl.sljol.info/articles/10.4038/jccpsl.v31i4.8854).

## What LeptoWatch would have said

| Saturday | Next 4 weeks | Weeks 5–8 | Rainy days, 8 weeks (usual) | Cases, 4 weeks (usual) | Cases in the next 4 weeks |
|---|---|---|---|---|---|
| 5 Oct 2024 | Watch | Watch | 28 (22) | 0 (0.2) | 5 |
| 12 Oct | Warning | Warning | 29 (25) | 1 (0.7) | 6 |
| 19–26 Oct | Watch | Watch | 31–34 (27–29) | 1 (1.0–1.2) | 6–8 |
| **2 Nov** | **Warning** | **Warning** | 39 (33) | 5 (1.0) | 8 |
| 9 Nov | Warning | Warning | 42 (35) | 6 (0.9) | 13 |
| 16 Nov | Warning | Warning | 49 (39) | 6 (2.3) | 62 |
| 23 Nov | Warning | Warning | 52 (40) | 8 (3.2) | 170 |
| 30 Nov | Warning | Warning | 53 (43) | 8 (4.6) | 218 |
| 7 Dec | Watch | Watch | 48 (42.5) | 8 (6.3) | 240 |
| 14 Dec onwards | Warning | Warning | 47 (40) | 45 (12) | 214 |

From 2 November the district was on Warning every week but one, about six weeks before cases peaked (218 in the
4 weeks to 28 December, against about 5 usual) and before Cyclone Fengal.

## Limits, said plainly

- It is a replay of past data, not a forecast that anyone saw at the time.
- Jaffna normally has very few cases, so a handful (5 against about 1 usual) was enough to pass the 1.4 × usual bar.
  Here that early signal was right; in low-case districts it will also cause some false alarms.
- On 7 December, the week before the outbreak was recognised, it dropped to Watch for one week: cases (8) were
  above usual (6.3) but not 1.4 times it.
- The case counts assume the officer knew the cases notified in the last 4 weeks on each Saturday.
