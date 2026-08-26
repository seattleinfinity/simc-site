/** @typedef {{ category: 'mock-aime'|'mock-amc10'|'mock-amc12'|'mock-mathcounts'|'elementary'|'tst', year: number, title: string, materials: { label: string, href: string }[], relatedPressSlug?: string, status: 'confirmed'|'reference-only'|'needs-source' }} TestRecord */

export const TEST_ARCHIVE = [
  {
    category: 'mock-aime',
    year: 2024,
    title: 'SIME 2024',
    materials: [{ label: 'Problems + solutions', href: 'https://drive.google.com/drive/folders/1GEylsdhhHswrfrWXxqUfdOsDMs6XquKn' }],
    relatedPressSlug: '2024-01-21-sime-2024-has-concluded',
    status: 'confirmed',
  },
  {
    category: 'mock-amc10',
    year: 2022,
    title: 'SIMC10 2022',
    materials: [
      { label: 'Problems', href: 'https://drive.google.com/file/d/1nDQqIW0kbkpTB6fJggvljSJCmusPFboB/view?usp=sharing' },
      { label: 'Solutions', href: 'https://drive.google.com/file/d/1cLENnvhtsWBiPSFQXVcQc30h2tb6-Cu6/view?usp=sharing' },
    ],
    relatedPressSlug: '2022-09-24-simc10recap',
    status: 'confirmed',
  },
  {
    category: 'mock-amc10',
    year: 2023,
    title: 'SIMC10 2023',
    materials: [
      { label: 'Problems', href: 'https://drive.google.com/file/d/11S5FLiYYv3hEm_cadhttBHh5_HD6zX7B/view?usp=sharing' },
      { label: 'Solutions', href: 'https://drive.google.com/file/d/1z4ug8Q67j2c5yeZRyKHbUvl3WioXb034/view?usp=sharing' },
    ],
    relatedPressSlug: '2023-11-04-2023simc10recap',
    status: 'confirmed',
  },
  {
    category: 'mock-amc10',
    year: 2024,
    title: 'SIMC10 2024',
    materials: [
      { label: 'Problems', href: 'https://drive.google.com/file/d/1UHSHGXNQEBYbd3jGj4sTy4X6GabGuKPc/view?usp=sharing' },
      { label: 'Solutions', href: 'https://drive.google.com/file/d/1CyfYbSM1dKPKZuIuI7xmFjHWFoIIB6ye/view?usp=sharing' },
    ],
    status: 'confirmed',
  },
  {
    category: 'mock-mathcounts',
    year: 2021,
    title: 'Mock MATHCOUNTS 2021–22',
    materials: [
      { label: 'Sprint round', href: 'https://drive.google.com/file/d/1N2E4vl2nH27S29Y-yPcVskzIiV0WczI8/view' },
      { label: 'Target round 1', href: 'https://drive.google.com/file/d/1JaZ-QCEn8Xiu-rSBVo9iqj59lJXZS8ey/view' },
      { label: 'Target round 2', href: 'https://drive.google.com/file/d/1Nn11hsfdXG8uxqiO--88x7A6nTXRiyqf/view' },
      { label: 'Target round 3', href: 'https://drive.google.com/file/d/1NEkd05w_jmvPlxWa0o4fw7d7_Izas0A-/view' },
      { label: 'Target round 4', href: 'https://drive.google.com/file/d/1Rsx9VQ-qoLTUwdV9D-bnouaLmkC7HffG/view' },
      { label: 'Team round', href: 'https://drive.google.com/file/d/1IpqVA8aKD2cdCurSHVzPTjmu8mQg5DD5/view' },
      { label: 'Answer keys', href: 'https://drive.google.com/file/d/1mwrbIY0yMgBaZjq3OmQrj2-1KHrxIg_S/view' },
    ],
    relatedPressSlug: '2021-12-09-conclusion-mock-mathcounts',
    status: 'confirmed',
  },
  {
    category: 'mock-mathcounts',
    year: 2023,
    title: 'Mock MATHCOUNTS 2023',
    materials: [{ label: 'Contest files', href: 'https://drive.google.com/drive/folders/1E1ZdA-7VVWXbRAlYthy1vcQIgJ22sXiQ' }],
    relatedPressSlug: '2023-01-16-announce-mock-mathcounts',
    status: 'confirmed',
  },
  {
    category: 'mock-mathcounts',
    year: 2024,
    title: 'Mock MATHCOUNTS 2024',
    materials: [{ label: 'Problems + solutions', href: 'https://drive.google.com/drive/folders/19LMoLxYP4TO7h2cBwJ2T8Oocr4YegUyh?usp=drive_link' }],
    relatedPressSlug: '2024-01-28-2024-mock-mathcounts',
    status: 'confirmed',
  },
  {
    category: 'mock-mathcounts',
    year: 2025,
    title: 'Mock MATHCOUNTS 2025',
    materials: [],
    relatedPressSlug: '2025-03-07-mock-mathcounts',
    status: 'needs-source',
  },
  {
    category: 'mock-mathcounts',
    year: 2026,
    title: 'Mock MATHCOUNTS 2026',
    materials: [{ label: 'Problems + solutions', href: 'https://drive.google.com/drive/u/1/folders/1LRSnX4WsUaKaqLfRnqcAyJ-6G-w4IThe?usp=sharing' }],
    relatedPressSlug: '2026-03-05-mock-mathcounts-recap',
    status: 'confirmed',
  },
  {
    category: 'elementary',
    year: 2025,
    title: 'SIMC Elementary Math Competition 2025',
    materials: [{ label: 'Problems + solutions', href: 'https://drive.google.com/drive/folders/1aUvFPs_UyV-LjprcsFfjupGz-_hk6j8n?usp=sharing' }],
    relatedPressSlug: '2025-06-11-elementarymathcompetition2025',
    status: 'confirmed',
  },
  {
    category: 'tst',
    year: 2020,
    title: 'SIMC TST 2020',
    materials: [
      { label: 'Problems', href: 'http://drive.google.com/file/d/1krIHO5IISN4uxL7Q-eOs-W0E9m9LidM3/view?usp=sharing' },
      { label: 'Solutions', href: 'http://drive.google.com/file/d/1vlXYt_Ugh8LpPUL28NfpSLfwXhfqWYdH/view?usp=sharing' },
    ],
    status: 'confirmed',
  },
  {
    category: 'tst',
    year: 2021,
    title: 'SIMC TST 2021',
    materials: [
      { label: 'Problems', href: 'https://drive.google.com/file/d/10g8aiLwl2PVZFe_OuxAt1ZvHzTq2BClt/view' },
      { label: 'Solutions', href: 'https://drive.google.com/file/d/1nsd_XmOudGGIVezClPSB8XBs-scAzQfN/view' },
    ],
    status: 'confirmed',
  },
  {
    category: 'tst',
    year: 2022,
    title: 'SIMC TST 2022',
    materials: [
      { label: 'Problems', href: 'https://drive.google.com/file/d/1IkqiunSoElTCF-KQR92pXtuQzlYnrJQR/view?usp=sharing' },
      { label: 'Solutions', href: 'https://drive.google.com/file/d/1LoaxykPAv_JmOE37MpRQDABSp1o2HwNt/view?usp=drive_link' },
    ],
    relatedPressSlug: '2022-09-04-2022-23-hmmt-pumac-tst',
    status: 'confirmed',
  },
  {
    category: 'tst',
    year: 2023,
    title: 'SIMC TST 2023',
    materials: [
      { label: 'Problems (event archive)', href: 'https://drive.google.com/file/d/1xzdhMzIzXOKylESNXbHFI2DEgBjtcNGh/view' },
      { label: 'Problems (press release)', href: 'https://drive.google.com/file/d/1Ffh9y84WfxLJHPDtALjgpiPpuhq2I1qm/view?usp=sharing' },
      { label: 'Solutions', href: 'https://drive.google.com/file/d/1u9SgM_c1pP7Z5sldFlSON8IiuIawAoJ6/view?usp=sharing' },
    ],
    relatedPressSlug: '2023-9-11-tst',
    status: 'confirmed',
  },
  {
    category: 'tst',
    year: 2024,
    title: 'SIMC TST 2024',
    materials: [{ label: 'Problems', href: 'https://drive.google.com/file/d/1UxPygg3ED3D-Eh-sgNztSLA6WsOOIUrT/view?usp=sharing' }],
    status: 'confirmed',
  },
  {
    category: 'tst',
    year: 2025,
    title: 'SIMC TST 2025',
    materials: [
      { label: 'Problems + solutions', href: 'https://drive.google.com/drive/folders/1lltxUZqCTE1QBwPuV84PguL2ZMpp5li7?usp=sharing' },
      { label: 'Results', href: 'https://docs.google.com/spreadsheets/d/1XWd0Zvk9xvDErG4T9UU-Mc-mcHr6M8wQoLEnr5bUZh8' },
    ],
    relatedPressSlug: '2025-10-03-simc-tst-conclusion',
    status: 'confirmed',
  },
];

export const EVENT_MATERIALS = [
  { label: 'SIMC Day Estimathon questions', href: '/assets/tests/SIMC_2024_Estimathon_Questions.pdf' },
  { label: 'SIMC Day Estimathon answers', href: '/assets/tests/SIMC_2024_Estimathon_Answers.pdf' },
  { label: 'SIMC Day Puzzle Hunt', href: '/assets/tests/SIMC_2024_Puzzle_Hunt.pdf' },
  { label: 'SIMC Day Puzzle Hunt solutions', href: '/assets/tests/SiMC_2024_Puzzle_Hunt_Solutions.pdf' },
];

export const TEST_GAPS = [
  {
    category: 'mock-amc12',
    title: 'No mock AMC12 material found',
    detail: 'The source repository contains official AMC10/12 calendar references and AMC12 mentions in bios, but no SIMC mock AMC12 test or solutions.',
  },
  {
    category: 'mock-mathcounts',
    title: 'Mock MATHCOUNTS 2025 materials need a source URL',
    detail: 'The 2025 conclusion release says the problems and solutions exist, but the source file does not include a usable link.',
  },
];

export const TEST_PRESS_RELEASE_GAPS = [
  { category: 'mock-amc10', year: 2024, title: 'SIMC10 2024', detail: 'Materials are listed in events/SIMC10.md, but there is no dedicated 2024 press release.' },
  { category: 'tst', year: 2020, title: 'SIMC TST 2020', detail: 'Materials are listed in events/tst.md, but there is no dedicated 2020 press release.' },
  { category: 'tst', year: 2021, title: 'SIMC TST 2021', detail: 'Materials are listed in events/tst.md and mentioned in the legacy aggregate page, but there is no dedicated 2021 press release.' },
  { category: 'tst', year: 2024, title: 'SIMC TST 2024', detail: 'Materials are listed in events/tst.md, but there is no dedicated 2024 press release.' },
  { category: 'mock-mathcounts', year: 2020, title: 'Mock MATHCOUNTS 2020', detail: 'The legacy aggregate page mentions the event, but no test-material URL is present in the source repository.' },
];
