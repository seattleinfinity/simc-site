# SIMC content migration audit

The React/Vite build reads the existing Markdown and JSON files in `src/` at build time. No source article body is replaced with a summary. Press-release bodies are rendered from the original Markdown, including tables, links, images, and embedded HTML.

## Content coverage

| Source collection | Records/routes | React destination |
| --- | ---: | --- |
| Press releases | 40 documents (39 dated releases plus `past-press-releases.md`) | `/press-releases`, `/press-releases/:slug`, `/press-releases/past-press-releases` |
| Events | 8 files (index plus 7 event/detail files) | `/events`, `/events/:slug` and case-preserving aliases |
| SLG | 23 members from `src/_data/slg.json` | `/slg`, `/about`, `/about-us` |
| Problems of the Month | 15 records from `src/_data/potm.json` | `/potm` |
| Newsletters | `src/newsletters.md` | `/newsletters`, `/newsletter`, `/newletter` |
| Calendar | `src/gcalender.md` plus legacy `src/calender/index.htm` | `/gcalender`, `/calender`, `/calendar` |
| The Circle | live issue/article data from `seattleinfinity/simc-circle-articles` | `/circle`, `/circle/:issue/:article` |
| Local event assets | 4 PDFs | `/resources` under SIMC Day materials |

## Image migration

Fifty-one recoverable image URLs from the source Markdown, event pages, SLG data, and fallback cards are stored under `public/assets/images/migrated/` and are used automatically by the React renderer. The source URLs are retained as a fallback for links that could not be fetched: four expired Discord attachments returned 404, Presentermedia returned 403, the NSBE logo returned 404, and two stale Googleusercontent links returned 400/HTML. No replacement image was fabricated for those cases.

Footer sponsor marks are transparent assets from official sources: Jane Street's official wordmark SVG was rasterized to `public/assets/images/sponsors/jane-street-logo.png`, while AoPS's official PNG and X-Camp's official PNG are stored as `aops-logo.png` and `xcamp-logo.png`.

## Past-test archive

Material links below are copied from the source repository. The React archive does not fabricate links; records marked `needs-source` remain visibly unresolved.

| Category | Year | Title | Materials | Related release |
| --- | ---: | --- | --- | --- |
| Mock AIME | 2024 | SIME 2024 | [Problems + solutions](https://drive.google.com/drive/folders/1GEylsdhhHswrfrWXxqUfdOsDMs6XquKn) | `2024-01-21-sime-2024-has-concluded` |
| Mock AMC10 | 2022 | SIMC10 2022 | [Problems](https://drive.google.com/file/d/1nDQqIW0kbkpTB6fJggvljSJCmusPFboB/view?usp=sharing), [solutions](https://drive.google.com/file/d/1cLENnvhtsWBiPSFQXVcQc30h2tb6-Cu6/view?usp=sharing) | `2022-09-24-simc10recap` |
| Mock AMC10 | 2023 | SIMC10 2023 | [Problems](https://drive.google.com/file/d/11S5FLiYYv3hEm_cadhttBHh5_HD6zX7B/view?usp=sharing), [solutions](https://drive.google.com/file/d/1z4ug8Q67j2c5yeZRyKHbUvl3WioXb034/view?usp=sharing) | `2023-11-04-2023simc10recap` |
| Mock AMC10 | 2024 | SIMC10 2024 | [Problems](https://drive.google.com/file/d/1UHSHGXNQEBYbd3jGj4sTy4X6GabGuKPc/view?usp=sharing), [solutions](https://drive.google.com/file/d/1CyfYbSM1dKPKZuIuI7xmFjHWFoIIB6ye/view?usp=sharing) | No dedicated release |
| Mock MATHCOUNTS | 2021–22 | Mock MATHCOUNTS 2021–22 | [Sprint](https://drive.google.com/file/d/1N2E4vl2nH27S29Y-yPcVskzIiV0WczI8/view), [target 1](https://drive.google.com/file/d/1JaZ-QCEn8Xiu-rSBVo9iqj59lJXZS8ey/view), [target 2](https://drive.google.com/file/d/1Nn11hsfdXG8uxqiO--88x7A6nTXRiyqf/view), [target 3](https://drive.google.com/file/d/1NEkd05w_jmvPlxWa0o4fw7d7_Izas0A-/view), [target 4](https://drive.google.com/file/d/1Rsx9VQ-qoLTUwdV9D-bnouaLmkC7HffG/view), [team](https://drive.google.com/file/d/1IpqVA8aKD2cdCurSHVzPTjmu8mQg5DD5/view), [answer keys](https://drive.google.com/file/d/1mwrbIY0yMgBaZjq3OmQrj2-1KHrxIg_S/view) | `2021-12-09-conclusion-mock-mathcounts` |
| Mock MATHCOUNTS | 2023 | Mock MATHCOUNTS 2023 | [Contest files](https://drive.google.com/drive/folders/1E1ZdA-7VVWXbRAlYthy1vcQIgJ22sXiQ) | `2023-01-16-announce-mock-mathcounts` |
| Mock MATHCOUNTS | 2024 | Mock MATHCOUNTS 2024 | [Problems + solutions](https://drive.google.com/drive/folders/19LMoLxYP4TO7h2cBwJ2T8Oocr4YegUyh?usp=drive_link) | `2024-01-28-2024-mock-mathcounts` |
| Mock MATHCOUNTS | 2025 | Mock MATHCOUNTS 2025 | **No usable URL in source** | `2025-03-07-Mock-Mathcounts` |
| Mock MATHCOUNTS | 2026 | Mock MATHCOUNTS 2026 | [Problems + solutions](https://drive.google.com/drive/u/1/folders/1LRSnX4WsUaKaqLfRnqcAyJ-6G-w4IThe?usp=sharing) | `2026-03-05-mock-mathcounts-recap` |
| Elementary | 2025 | SIMC Elementary Math Competition 2025 | [Problems + solutions](https://drive.google.com/drive/folders/1aUvFPs_UyV-LjprcsFfjupGz-_hk6j8n?usp=sharing) | `2025-06-11-elementaryMathCompetition2025` |
| SIMC TST | 2020 | SIMC TST 2020 | [Problems](http://drive.google.com/file/d/1krIHO5IISN4uxL7Q-eOs-W0E9m9LidM3/view?usp=sharing), [solutions](http://drive.google.com/file/d/1vlXYt_Ugh8LpPUL28NfpSLfwXhfqWYdH/view?usp=sharing) | No dedicated release |
| SIMC TST | 2021 | SIMC TST 2021 | [Problems](https://drive.google.com/file/d/10g8aiLwl2PVZFe_OuxAt1ZvHzTq2BClt/view), [solutions](https://drive.google.com/file/d/1nsd_XmOudGGIVezClPSB8XBs-scAzQfN/view) | No dedicated release |
| SIMC TST | 2022 | SIMC TST 2022 | [Problems](https://drive.google.com/file/d/1IkqiunSoElTCF-KQR92pXtuQzlYnrJQR/view?usp=sharing), [solutions](https://drive.google.com/file/d/1LoaxykPAv_JmOE37MpRQDABSp1o2HwNt/view?usp=sharing) | `2022-09-04-2022-23-hmmt-pumac-tst` |
| SIMC TST | 2023 | SIMC TST 2023 | [Event problems](https://drive.google.com/file/d/1xzdhMzIzXOKylESNXbHFI2DEgBjtcNGh/view), [press problems](https://drive.google.com/file/d/1Ffh9y84WfxLJHPDtALjgpiPpuhq2I1qm/view?usp=sharing), [solutions](https://drive.google.com/file/d/1u9SgM_c1pP7Z5sldFlSON8IiuIawAoJ6/view?usp=sharing) | `2023-9-11-tst` |
| SIMC TST | 2024 | SIMC TST 2024 | [Problems](https://drive.google.com/file/d/1UxPygg3ED3D-Eh-sgNztSLA6WsOOIUrT/view?usp=sharing) | No dedicated release |
| SIMC TST | 2025 | SIMC TST 2025 | [Problems + solutions](https://drive.google.com/drive/folders/1lltxUZqCTE1QBwPuV84PguL2ZMpp5li7?usp=sharing), [results](https://docs.google.com/spreadsheets/d/1XWd0Zvk9xvDErG4T9UU-Mc-mcHr6M8wQoLEnr5bUZh8) | `2025-10-03-simc-tst-conclusion` |

### Confirmed gaps

- Mock AMC12: no SIMC mock AMC12 problems or solutions were found. The source has official AMC10/12 references and AMC12 mentions in member bios only.
- Mock MATHCOUNTS 2025: the conclusion release says problems and solutions exist, but the source file has no usable URL.
- Mock MATHCOUNTS 2020 is mentioned in the legacy aggregate release without a material URL.

## Event-only materials

SIMC Day’s local PDFs remain separate from the competition categories: `SIMC_2024_Estimathon_Questions.pdf`, `SIMC_2024_Estimathon_Answers.pdf`, `SIMC_2024_Puzzle_Hunt.pdf`, and `SiMC_2024_Puzzle_Hunt_Solutions.pdf`.
