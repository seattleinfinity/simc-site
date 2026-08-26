import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';
import 'katex/dist/katex.min.css';
import SLG_DATA from './_data/slg.json';
import POTM_DATA from './_data/potm.json';
import {
  EVENT_CONTENT,
  EVENT_CONTENT_BY_SLUG,
  LEGACY_PRESS_CONTENT,
  PAGE_CONTENT_BY_SLUG,
  PRESS_CONTENT,
  PRESS_CONTENT_BY_SLUG,
  slugify,
} from './content.js';
import { EVENT_MATERIALS, TEST_ARCHIVE, TEST_GAPS } from './test-archive.js';
import { localizeImage } from './image-map.js';
import './styles.css';

const EMAIL = 'seattleinfinitymathcircle@gmail.com';
const DISCORD_URL = 'https://discord.gg/wE5RREqekM';
const MAILING_LIST_URL = 'https://forms.gle/FDvWGo1FHqQSGkNK6';
const INSTAGRAM_URL = 'https://www.instagram.com/seattleinfinitymathcircle/';
const MOCK_CONTENT_URL = '/announcements/mathcounts';
const SOURCE_SITE = 'https://seattleinfinity.netlify.app';

const SPONSORS = [
  { name: 'Jane Street', href: 'https://www.janestreet.com/', image: '/assets/images/logo/logo_horizontal_white_registered-01.png', className: 'sponsor-image-jane' },
  { name: 'AoPS Academy Bellevue', href: 'https://bellevue.aopsacademy.org/', image: '/assets/images/logo/aops-logo.svg', className: 'sponsor-image-aops' },
  { name: 'X-Camp', href: 'https://www.x-camp.org/', image: '/assets/images/logo/logo.jpg', className: 'sponsor-image-xcamp' },
];

const AWARDS_BY_YEAR = [
  {
    year: '2025 — 2026',
    rows: 4,
    awards: [
      ['HMMT February 2026', '1st'],
      ['HMMT Guts February 2026', '1st'],
      ['HMMT Team Round February 2026', '5th'],
      ['SMT 2026', '1st'],
      ['SMT Guts 2026', '1st'],
      ['SMT Power 2026', '2nd'],
      ['SMT Team Round 2026', '10th'],
      ['PUMaC 2025', '2nd'],
      ['PUMaC Power 2025', '7th'],
      ['PUMaC Team Round 2025', '5th'],
      ['BMT 2025', '7th'],
      ['CMIMC TCS Round 2026', '10th'],
    ],
  },
  {
    year: '2024 — 2025',
    rows: 4,
    awards: [
      ['HMMT February 2025', '7th'],
      ['HMMT Guts February 2025', '7th'],
      ['HMMT Team Round February 2025', '9th'],
      ['SMT 2025', '1st'],
      ['SMT Guts 2025', '1st'],
      ['SMT Power 2025', '1st'],
      ['SMT Team Round 2025', '1st'],
      ['PUMaC 2024', '5th'],
      ['PUMaC Power 2024', '6th'],
      ['PUMaC Team Round 2024', '7th'],
      ['BMT 2024', '4th'],
      ['BMT Guts 2024', '4th'],
      ['BMT Power 2024', '3rd'],
    ],
  },
  {
    year: '2023 — 2024',
    rows: 2,
    awards: [
      ['HMMT February 2024', '5th'],
      ['HMMT Guts February 2024', '2nd'],
      ['HMMT Guts February 2024 (2nd team)', '5th'],
      ['BMT 2023', '3rd'],
      ['BMT Guts 2023', '5th'],
      ['BMT Power 2023', '1st'],
    ],
  },
  {
    year: '2022 — 2023',
    rows: 2,
    awards: [
      ['HMMT February 2023', '9th'],
      ['HMMT Guts February 2023', '9th'],
      ['HMMT Team Round February 2023', '8th'],
      ['PUMaC 2022', '3rd'],
      ['PUMaC Power 2022', '2nd'],
      ['PUMaC Team Round 2022', '3rd'],
    ],
  },
  {
    year: '2021 — 2022',
    rows: 2,
    awards: [
      ['HMMT February 2022', '8th'],
      ['HMMT Guts February 2022', '9th'],
      ['HMMT Team Round February 2022', '8th'],
      ['PUMaC Team Round 2021', '10th'],
    ],
  },
];

const TOP_THREE = new Set(['1st', '2nd', '3rd']);
const CAROUSEL_AWARDS = AWARDS_BY_YEAR.flatMap(({ awards }) => awards.filter(([, rank]) => TOP_THREE.has(rank)));

const FALLBACK_PRESS_RELEASES = [
  {
    slug: '2026-03-07-february-hmmt-results',
    title: 'February HMMT Results',
    date: 'March 7, 2026',
    description: 'February HMMT Results!',
    body: 'Last month, SIMC sent Washington Gold 1 and Washington Gold 2 to the Harvard-MIT Math Tournament in Boston. Washington Gold 1 placed first overall in Team Sweepstakes, first in Guts, and fifth in the Team Round. Benjamin Fu also placed first in Geometry and seventh overall individually.',
    image: 'https://i.imgur.com/mgAMlxW.png',
  },
  {
    slug: '2026-03-05-mock-mathcounts-recap',
    title: 'Mock Mathcounts Recap',
    date: 'March 5, 2026',
    description: 'SIMC Mock Mathcounts Recap',
    body: 'Thanks to everyone who attended the SIMC Mock Mathcounts! Congratulations to Stephen Cui, Shuyan Liu, and Derek Wang for placing first, second, and third individually. Problems and solutions are available for last-minute practice before State.',
    image: 'https://i.imgur.com/7DXK7W7.png',
  },
  {
    slug: '2026-2-28-mockmathcounts',
    title: 'Mock Mathcounts Announcement',
    date: 'February 28, 2026',
    description: 'SIMC Mock MATHCOUNTS Announcement!',
    body: 'The 2026 SIMC Mock Mathcounts took place March 3 from 4:00–7:30 PM at Bellevue Library. Problems were written by MOPpers, USAMO qualifiers, and former Mathcounts Nationals participants, and teams and individuals were welcome to compete.',
    image: 'https://i.imgur.com/fDv6pw3.png',
  },
  {
    slug: '2025-11-02-amc10recap',
    title: 'SIMC 10A Recap',
    date: 'November 2, 2025',
    description: 'Thank you to everyone who participated in SIMC 10A.',
    body: 'Thank you to all the participants of SIMC’s 2025 Mock AMC 10A! We were excited to see so many enthusiastic test takers and wish everyone the best on the official exam.',
    image: 'https://media.istockphoto.com/id/1191225063/photo/multiple-choice-test-with-clock-time-concept-in-exam.jpg?s=612x612&w=0&k=20&c=aFdIy_5-9LpFOuMvw6RDWFuOJgIbyfz0jDjf52pckWY=',
  },
  {
    slug: '2025-11-05-simc10brecap',
    title: 'SIMC 10B Recap',
    date: 'November 5, 2025',
    description: 'Thank you to everyone who participated at Redmond Library.',
    body: 'Thank you to everyone who participated in SIMC 10B at the Redmond Library. The competition was intense, and we hope to see you at future SIMC events.',
    image: 'https://i.imgur.com/7sXxPo5.jpeg',
  },
  {
    slug: '2025-10-03-simc-tst-conclusion',
    title: 'SIMC TST Conclusion',
    date: 'October 3, 2025',
    description: 'A problem-solving competition featuring a proof-writing round.',
    body: 'SIMC’s Team Selection Test selects teams for the Harvard-MIT Math Tournament, Berkeley Math Tournament, and Stanford Math Tournament. The 2025 test featured a proof-writing round.',
    image: 'https://imgur.com/zDUECqV.jpeg',
  },
  {
    slug: '2025-01-20-simc8concludion',
    title: 'SIMC8 Conclusion',
    date: 'January 20, 2025',
    description: 'What a great time we had at SIMC8!',
    body: 'Thank you to everyone who joined SIMC 8, our mock AMC 8 competition. We are grateful to AoPS Academy Redmond for hosting the event.',
    image: 'https://i.imgur.com/Zi0fJmW.png',
  },
  {
    slug: '2024-01-21-sime-2024-has-concluded',
    title: 'SIME 2024 has concluded',
    date: 'January 21, 2024',
    description: 'Our first ever mock AIME has concluded.',
    body: 'The 2024 SIME, our first ever mock AIME, has concluded. Thanks to everyone who participated.',
    image: 'https://drive.google.com/thumbnail?id=100j69bL351ilo2GS5AhX9oH7eK3spFy3&sz=w1000',
  },
  {
    slug: '2025-03-07-Mock-Mathcounts',
    title: 'Mock Mathcounts Conclusion',
    date: 'March 7, 2025',
    description: 'SIMC Mock MATHCOUNTS results and problems.',
    body: 'Congratulations to everyone who participated in SIMC Mock MATHCOUNTS. Problems and solutions are available for continued practice.',
    image: 'https://i.imgur.com/FLNGVbJ.jpeg',
  },
  {
    slug: '2024-01-28-2024-mock-mathcounts',
    title: '2024 Mock Mathcounts',
    date: 'January 29, 2024',
    description: 'The 2024 SIMC Mock Mathcounts took place on January 28.',
    body: 'Thanks to all the teams and individuals who attended the 2024 SIMC Mock Mathcounts.',
    image: 'https://lh3.googleusercontent.com/fife/ALs6j_H_J9KL0xQaTzqC4hqjVXDWp4Y0FrQaWjdkKi0ui-hm1LX8JETSaQE1bgSEhIbk8-B7MziRyz_dXEbBgoIec0NGYdeEG2NFDCY7dLR39uLfyza2UvNL40m_fm-TOJEZmlU-wK4n1gbQ1s34RX08WhH9ZXXeuzxA6-BXSzDTuUkCf9tsHLg4Yp_2X7E6Jfh1mTUdkqDWYIrTM4M2RyUTxlz9i71k-ogwoyqukn1gMPIM7lLtul7Hrqi9RArJ2azlc3HiQnSWeSaO28o46nS0nB9dEesM5bdef1N0kLeb9e7IjsYWC5ZewDfu2PKnmVUTbZ96fQo1ZcTbghcNDXUGw-dGpEmEnP_0x2u4xxmuNBP27AS9Z_Wb-JJ63Sicnlfwambu_P3Hpg7nM3OhIOWpgR7RG-X7lW77g-I6dGdUQeznIA3vlKHYxr5qdgLiyyarWvHDpFV8hKiPHRpOOPc8RNb6LGiMJbtqDQx389hpk4GjR36yPe7kX1nvr8qxlaQNGAELmz2NpV_buQfyrZtm1gxH4fLLeTjrhBxhBPPygofyoMwJ9Vuq-jMBuybHWi87FDuH7bPjbu4KfOr81EhRDY9lFtQEBKDI2KTk7IzSkWI-udVcC4yU8iBkGQBsuHSzYqRBTiYtwqR38bDvJej_dGcJL-ORQonpI_eX_x1d_8yoKgIiSFlVR7KzE45PQYhKU7tRHyX89rEkJFM0l0SR5NBCUEvL_Pt0wsVHzflSSxR1quhhBxhR1quhhBxhBPPygofyoMwJ9Vuq-7RZ5?authuser=0',
  },
  {
    slug: '2023-11-04-2023simc10recap',
    title: 'SIMC 10 2023 is over',
    date: 'November 4, 2023',
    description: 'SIMC 10 results are out.',
    body: 'SIMC 10 results are out. Congratulations to all the test takers!',
    image: 'https://i.imgur.com/7qI17Dd.jpeg',
  },
  {
    slug: '2022-09-24-simc10recap',
    title: 'SIMC 10 2022 is over',
    date: 'September 24, 2022',
    description: 'Congratulations to all the test takers!',
    body: 'The SIMC 10 2022 is over. Congratulations to all the test takers, and stay tuned for future SIMC competitions.',
    image: 'https://i.ibb.co/N1KkS48/IMG-7551.jpg',
  },
  {
    slug: '2022-09-04-2022-23-hmmt-pumac-tst',
    title: '2022 HMMT/PUMaC TST Results',
    date: 'September 4, 2022',
    description: 'The Washington Gold team selection test concluded.',
    body: 'The 2022 Washington Gold HMMT/PUMaC Team Selection Test concluded with results published for registered participants.',
    image: 'https://images.unsplash.com/photo-1634117622592-114e3024ff27?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaGdlfDB8fHx8&auto=format&fit=crop&w=1025&q=80',
  },
  {
    slug: '2021-12-09-conclusion-mock-mathcounts',
    title: '2021–22 Mock Mathcounts has concluded',
    date: 'December 9, 2021',
    description: 'The 2021–22 SIMC Mock MATHCOUNTS has concluded.',
    body: 'Thanks to everyone who participated in the 2021–22 SIMC Mock MATHCOUNTS. Congratulations to the outstanding individual and team performers.',
    image: 'https://images.unsplash.com/photo-1581574919402-5b7d733224d6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8fHx8&auto=format&fit=crop&w=1170&q=80',
  },
  {
    slug: '2022-06-01-2021-22-potm',
    title: '2021–22 Problems of the Month',
    date: 'June 1, 2022',
    description: 'All of our PoTMs from 2021–22 are now released.',
    body: 'Explore the 2021–22 Problems of the Month, with geometry, modular arithmetic, probability, and algebra problems written by SIMC student leaders.',
    image: 'https://i.ibb.co/fqf7YJX/potm-2021-22.png',
  },
  {
    slug: '2022-09-25-launching-circle',
    title: 'Launching The Circle',
    date: 'September 25, 2022',
    description: 'Our very own math-literacy magazine for K–12 students.',
    body: 'The Circle is SIMC’s math-literacy magazine for K–12 students. Read the latest issue online and explore math beyond competition problems.',
    image: 'https://images.unsplash.com/photo-1527117499127-8169c886e66e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8fHx8&auto=format&fit=crop&w=387&q=80',
  },
  {
    slug: '2023-09-10-sept-circle-published',
    title: 'September Circle issue published',
    date: 'September 10, 2023',
    description: 'The September issue of our math-literacy magazine has been released.',
    body: 'Our latest issue of The Circle is online, with new math-literacy writing for students.',
    image: 'https://plus.unsplash.com/premium_photo-1682192408589-0c854e40d98e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500',
  },
  {
    slug: '2022-06-25-2022-summer-reading-challenge',
    title: 'SIMC Summer Reading Challenge',
    date: 'June 25, 2022',
    description: 'An event designed to expand math education beyond competitions and combat summer learning loss.',
    body: 'An event designed to expand math education beyond competitions and combat summer learning loss.',
    image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80',
  },
  {
    slug: '2022-06-27-2022-23-new-slg',
    title: '2022–23 SIMC Student Leadership Group',
    date: 'June 27, 2022',
    description: 'Join us in welcoming the 2022–23 Student Leadership Group.',
    body: 'Join us in welcoming the members of the 2022–23 SIMC Student Leadership Group.',
    image: 'https://i.ibb.co/ZTHx9S0/slg-2022-23.png',
  },
  {
    slug: '2022-08-01-2022-23-hmmt-pumac-reg-open',
    title: 'HMMT/PUMaC TST registration is open',
    date: 'August 1, 2022',
    description: 'Join the Washington Gold teams competing at HMMT February 2023 and PUMaC 2022–23.',
    body: 'Join the Washington Gold teams competing at HMMT February 2023 and PUMaC 2022–23.',
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
  },
  {
    slug: '2022-09-01-2022-summer-reading-challenge-winners',
    title: '2022 Summer Reading Challenge Results',
    date: 'September 1, 2022',
    description: 'Congratulations to Samarth Das and Jason Yao for winning our first SIMC Summer Reading Challenge.',
    body: 'Congratulations to Samarth Das and Jason Yao for winning our first SIMC Summer Reading Challenge.',
    image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1373&q=80',
  },
  {
    slug: '2022-09-07-2022-simc-10',
    title: 'Announcing the inaugural 2022 SIMC 10',
    date: 'September 7, 2022',
    description: 'SIMC is hosting its first mock AMC 10 contest.',
    body: 'SIMC is hosting its first mock AMC 10 contest, the SIMC 10.',
    image: 'https://images.unsplash.com/photo-1606326608802-164e734c2fd9?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
  },
  {
    slug: '2023-01-16-announce-mock-mathcounts',
    title: 'Announcing the 2023 SIMC Mock Mathcounts',
    date: 'January 16, 2023',
    description: 'The 2023 SIMC Mock MATHCOUNTS is for elementary and middle school students.',
    body: 'SIMC holds an annual Mock MATHCOUNTS before the official competitions for elementary and middle school students.',
    image: 'https://photos.prnewswire.com/prnfull/20160504/363785LOGO?max=200',
  },
  {
    slug: '2023-03-01-slg-apps',
    title: '2023–24 SIMC SLG Applications',
    date: 'March 1, 2023',
    description: 'Apply to join next year’s Student Leadership Group.',
    body: 'Students passionate about math can apply to give back to the math community through SIMC’s Student Leadership Group.',
    image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaGdlfDB8fHx8&auto=format&fit=crop&w=1170&q=80',
  },
  {
    slug: '2023-07-13-simc-july-2023-math-and-coding-panel',
    title: 'SIMC July 2023 Math and Coding Panel',
    date: 'July 13, 2023',
    description: 'A virtual panel with rising math and programming stars.',
    body: 'A virtual panel where rising math and programming stars share their experiences with high-school contests.',
    image: 'https://content.presentermedia.com/files/clipart/00010000/10090/panel_discussion_800_wht.jpg',
  },
  {
    slug: '2023-09-09-hm-b-s-mt-tst',
    title: '[HM/B/S]MT TST 2023',
    date: 'September 9, 2023',
    description: 'Team selection for our 2023–24 collegiate competition teams.',
    body: 'The team selection test for SIMC’s 2023–24 collegiate competition teams took place on September 10, 2023.',
    image: 'https://images.unsplash.com/photo-1563089145-599997674d42?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaGdlfDB8fHx8&auto=format&fit=crop&w=800',
  },
  {
    slug: '2023-10-18-pre-simc10',
    title: 'Register for the SIMC 10',
    date: 'October 18, 2023',
    description: 'Sign up for SIMC 10, our mock AMC 10.',
    body: 'Sign up for SIMC 10, our mock AMC 10, in person or online.',
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaGdlfDB8fHx8&auto=format&fit=crop&w=1470&q=80',
  },
  {
    slug: '2023-11-18-2023-bmt',
    title: 'BMT Washington Gold!',
    date: 'November 18, 2023',
    description: 'Congratulations to Washington Gold at BMT 2023.',
    body: 'Congratulations to Washington Gold at the Berkeley Math Tournament in 2023.',
    image: 'https://cdn.discordapp.com/attachments/742959309473841165/1173053269317255238/IMG_0699.jpg',
  },
  {
    slug: '2023-11-23-2024-summer-math-camps-panel',
    title: '2024 Summer Math Camps Panel',
    date: 'November 24, 2023',
    description: 'Learn about summer math camps and how to prepare.',
    body: 'Learn about summer math camps from students who have experienced them.',
    image: 'https://t3.ftcdn.net/jpg/02/34/60/60/360_F_234606035_DM6Qb2gXn57DUkJjXfhdi45Vetab3rk7.jpg',
  },
  {
    slug: '2023-09-11-tst',
    title: '[HM/B/S]MT TST 2023 Concluded',
    date: 'September 11, 2023',
    description: 'Our 2023 Washington Gold team selection test concluded.',
    body: 'Our 2023 Washington Gold BMT/HMMT/SMT team selection test concluded.',
    image: 'https://images.unsplash.com/photo-1472289065668-ce650ac443d2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaGdlfDB8fHx8&auto=format&fit=crop&w=2069&q=80',
  },
  {
    slug: '2024-02-29-finding-and-eating-pi-march-14-2024',
    title: 'Finding (and eating) Pi: March 14th, 2024',
    date: 'February 29, 2024',
    description: 'Join SIMC on 3/14/2024 for Pi Day.',
    body: 'Join Seattle Infinity Math Circle on March 14, 2024, as we find an approximate value of pi and eat pie.',
    image: 'https://i.imgur.com/b8YBhj3.jpeg',
  },
  {
    slug: '2024-05-14-simc-day',
    title: 'SIMC Day',
    date: 'May 26, 2024',
    description: 'Estimathon, puzzle hunt, merch, and food.',
    body: 'SIMC Day brought an Estimathon, puzzle hunt, merch, food, and a math-camp panel to Kingsgate Library.',
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaGdlfDB8fHx8&auto=format&fit=crop&w=1470&q=80',
  },
  {
    slug: '2024-05-27-slg-apps',
    title: '2024–25 SIMC SLG Applications',
    date: 'May 27, 2024',
    description: 'Apply to give back to the math community through SIMC.',
    body: 'Students who enjoy SIMC events can apply to give back through the Student Leadership Group.',
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaGdlfDB8fHx8&auto=format&fit=crop&w=1470&q=80',
  },
  {
    slug: '2024-03-21-pi-day-talk',
    title: 'Pi Day Talk',
    date: 'March 21, 2024',
    description: 'Celebrate Pi Day by calculating pi and eating pie.',
    body: 'Happy Pi Day! Celebrate by calculating pi and eating pie.',
    image: 'https://i.imgur.com/b8YBhj3.jpeg',
  },
  {
    slug: '2025-01-02-simc8announce',
    title: 'SIMC 8 Announcement',
    date: 'January 2, 2025',
    description: 'Start 2025 with a high-quality Mock AMC 8.',
    body: 'Start 2025 with a high-quality Mock AMC 8 for younger students.',
    image: 'https://i.imgur.com/7qI17Dd.jpeg',
  },
  {
    slug: '2025-01-26-amc8debreif',
    title: 'AMC 8 Debrief Announcement',
    date: 'January 26, 2025',
    description: 'An AMC 8 contest review night at AoPS Academy.',
    body: 'SIMC collaborated with AoPS Academy on an AMC 8 debrief for students to review the test and share insights.',
    image: 'https://i.imgur.com/d6poAje.jpeg',
  },
  {
    slug: '2025-05-04-simc-elementary-math-competition-announce',
    title: 'Debuting SIMC Elementary Math Competition',
    date: 'May 4, 2025',
    description: 'A fast-paced competition to spark children’s love of math.',
    body: 'SIMC introduced an elementary competition with Sprint, Team, Guts, and Puzzle Hunt rounds.',
    image: 'https://images.unsplash.com/photo-1563089145-599997674d42?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8fHx8&auto=format&fit=crop&w=800',
  },
  {
    slug: '2025-06-11-elementary-math-competition-2025',
    title: 'SIMC Elementary Math Competition Conclusion',
    date: 'June 11, 2025',
    description: 'The SIMC Elementary Math Competition has concluded.',
    body: 'The SIMC Elementary Math Competition concluded after a fast-paced day of math challenges.',
    image: 'https://i.imgur.com/6fGdnvB.jpeg',
  },
  {
    slug: '2025-10-11-beyond-borders-sierra-leone',
    title: 'Beyond Borders',
    date: 'October 11, 2025',
    description: 'Partnering with the United for Development School in Sierra Leone.',
    body: 'SIMC partnered with the United for Development School in Sierra Leone through Beyond Borders.',
    image: 'https://i.imgur.com/tEQP0eT.png',
  },
];

const PRESS_RELEASES = (PRESS_CONTENT.filter(({ slug }) => slug !== 'past-press-releases').length
  ? PRESS_CONTENT.filter(({ slug }) => slug !== 'past-press-releases')
  : FALLBACK_PRESS_RELEASES).map((article) => ({
    ...article,
    description: article.description || article.blurb || '',
    body: article.body || article.description || article.blurb || '',
  }));

PRESS_RELEASES.sort((a, b) => (b.dateValue?.getTime() || new Date(b.date).getTime() || 0) - (a.dateValue?.getTime() || new Date(a.date).getTime() || 0));

const PRESS_RELEASES_BY_SLUG = {
  ...PRESS_CONTENT_BY_SLUG,
  ...Object.fromEntries(PRESS_RELEASES.flatMap((article) => [[article.slug, article], [article.sourceSlug || article.slug, article]])),
};

const FALLBACK_EVENT_ITEMS = [
  { slug: 'simc10', title: 'SIMC 10', date: '2025–26', description: 'An excellent mock AMC 10-style contest.', body: 'SIMC’s SLG create high-quality mocks for the AMC 10: a 25-question, 75-minute competition with no restrictions on who can participate.', image: 'https://images.unsplash.com/photo-1606326608802-164e734c2fd9?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaGdlfDB8fHx8&auto=format&fit=crop&w=1170&q=80' },
  { slug: 'simc8', title: 'SIMC 8', date: '2025–26', description: 'A mock AMC 8 for eighth graders and younger.', body: 'SIMC 8 is a 25-question, 40-minute mock AMC 8 for eighth graders and younger. The 2025 event was hosted by AoPS Academy Redmond.', image: 'https://images.unsplash.com/photo-1606326608802-164e734c2fd9?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8fHx8&auto=format&fit=crop&w=1170&q=80' },
  { slug: 'lectures', title: 'Panels & Lectures', date: '2025–26', description: 'Math literacy panels and lectures from the SIMC community.', body: 'SIMC holds panels and lectures about a wide array of math topics and questions. The current program continues summer-camp panels while focusing more on competitions.', image: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8fHx8&auto=format&fit=crop&w=1170&q=80' },
  { slug: 'summer-reading-challenge', title: 'Summer Reading Challenge', date: '2025–26', description: 'Math literacy beyond competition problems.', body: 'The Summer Reading Challenge expands math education beyond competitions while helping combat summer learning loss.', image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8fHx8&auto=format&fit=crop&w=687&q=80' },
  { slug: 'tst', title: 'SIMC TST', date: '2025–26', description: 'Team selection for SIMC competition teams.', body: 'Every year, SIMC hosts teams for HMMT, BMT, and SMT. SIMC TST determines those teams.', image: 'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8fHx8&auto=format&fit=crop&w=1470&q=80' },
  { slug: 'mock-mathcounts', title: 'Mock MATHCOUNTS', date: 'March 2026', description: 'Sprint, target, team, and countdown rounds.', body: 'SIMC holds an annual Mock MATHCOUNTS before the official competitions for elementary and middle school students. Teams and individuals are welcome.', image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8fHx8&auto=format&fit=crop&w=687&q=80' },
];

const EVENT_ITEMS = [
  ...FALLBACK_EVENT_ITEMS.map((event) => ({
    ...event,
    ...(EVENT_CONTENT_BY_SLUG[event.slug] || {}),
    slug: event.slug,
    title: EVENT_CONTENT_BY_SLUG[event.slug]?.title || event.title,
    date: EVENT_CONTENT_BY_SLUG[event.slug]?.date || event.date,
    description: EVENT_CONTENT_BY_SLUG[event.slug]?.description || event.description,
    body: EVENT_CONTENT_BY_SLUG[event.slug]?.body || event.body,
    image: EVENT_CONTENT_BY_SLUG[event.slug]?.image || event.image,
  })),
  ...EVENT_CONTENT
    .filter((event) => !FALLBACK_EVENT_ITEMS.some((fallback) => fallback.slug === event.slug))
    .map((event) => ({
      ...event,
      title: event.title || event.slug,
      date: event.date || 'Archive',
      description: event.description || event.blurb || '',
      body: event.body || event.description || event.blurb || '',
    })),
];

const UPCOMING_EVENTS = [
  {
    slug: 'tst',
    title: 'SIMC TST',
    date: 'September 12, 2026',
    description: 'Team selection for SIMC competition teams.',
  },
  {
    slug: 'simc10',
    title: 'Mock AMC 10',
    date: 'Mid-October 2026',
    description: 'A high-quality mock AMC 10-style contest.',
  },
];

const RESOURCE_CARDS = [
  { title: 'Online classes', description: 'Art of Problem Solving is recognized worldwide.', href: 'https://artofproblemsolving.com/' },
  { title: 'YouTube channels', description: 'Explore 3Blue1Brown and Numberphile for visual and conversational math.', href: 'https://www.youtube.com/@3blue1brown' },
  { title: 'Books', description: 'The source recommends the AoPS Bookstore, Things to Make and Do in the Fourth Dimension, and Real Mathematical Analysis.', href: 'https://artofproblemsolving.com/store' },
];

const SLG_PEOPLE = [
  {
    name: 'Immanuel Whang',
    role: 'President',
    bio: 'After taking his first AMC 8 in 4th grade, Immanuel fell in love with problem solving and never looked back. Since then, some of his mathematical experiences include taking the USAJMO, attending PROMYS, and competing at HMMT. In his free time, Immanuel enjoys listening to music and going on walks.',
    image: 'https://i.ibb.co/Ldf3QXn/yb-picture-Immanuel-Whang.png',
  },
  {
    name: 'Amy Cui',
    role: 'Vice-President',
    bio: 'Amy is a senior at Lakeside School. She began participating in math competitions in elementary school and has since attended MOP twice, won a gold medal in the Math Prize Olympiad, won a bronze medal in the AMO, and was a top winner in the JMO. Her favorite subject in math is geometry. Outside of math, she is a competitive runner in track and cross country, and she enjoys spending time with friends, listening to music, and trying new foods.',
    image: `${SOURCE_SITE}/assets/images/slg-photos/Amy-Cropped.jpg`,
  },
  {
    name: 'Owen Xuan',
    role: 'Elementary Competition Director, Webmaster',
    bio: "Owen is a senior at Lakeside School. He likes applied math (poker) and game theory. If he's not teaching elementary schoolers math over the summer, or drinking chocolate milk after a cross country meet, don't hesitate to ask to duo on bughouse or go bouldering. He's qualified for the USAJMO 2x, AIME 5x, and his favorite math experience has been, unequivocally, HCSSiM.",
    image: `${SOURCE_SITE}/assets/images/slg-photos/Owen-Uncropped.JPG`,
  },
  {
    name: 'Christina Liu',
    role: 'Outreach Director, Webmaster',
    bio: 'Christina is a senior at Lakeside School. She is a USAMO and USAJMO qualifier, has qualified for the AIME six times, been on the AMC 10/12 Distinguished Honor Roll three times, and is a Canada/USA Mathcamp and HCSSiM alum. Outside of math, she enjoys any kind of board sport, playing cello and electric guitar, and annihilating people at volleyball.',
    image: `${SOURCE_SITE}/assets/images/slg-photos/Christina-Cropped.png`,
  },
  {
    name: 'Jai Bindlish Test',
    role: 'Web Outreach Director, Webmaster',
    bio: "Jai is a junior at Tesla STEM High School. He started his math journey in 4th grade with the AMC 8 and has participated in SMT, AIME, BMT, and ARML. Outside of math, he plays football, teaches TaeKwonDo, and experiments with Arduinos and other microcontrollers.",
    image: 'https://i.ibb.co/XjfBNRR/1501782.png',
  },
  {
    name: 'Christopher Peng',
    role: 'AMC 8 Committee Co-Director, Puzzles Writer',
    bio: 'Christopher is a junior at Lakeside School. He is a 4x AIME qualifier and has qualified for USAJMO, USAMTS, BMT, and HMMT. Outside of math, he enjoys Ultimate Frisbee, chess, board games, reading, music, and Brawl Stars.',
    image: 'https://i.ibb.co/bXD1w2f/IMG-8422-1-Christopher-Peng.jpg',
  },
  {
    name: 'Erin Bian',
    role: 'AMC 10 Committee Co-Director, Problem Writer',
    bio: 'Erin is a sophomore at Lakeside School. She is a 4x AIME qualifier, 3x MP4G qualifier, 2x USAJMO qualifier, and USACO Gold contestant. Her other hobbies include chess and ultimate frisbee.',
    image: 'https://i.ibb.co/FxWwqqt/pic-Erin-Bian.jpg',
  },
  {
    name: 'Sophia Shen',
    role: 'Sierra Leone Committee Co-Director, AMC 10 Committee Co-Director',
    bio: 'Sophia is a junior at Interlake High School with a passion for competitive math. She has qualified for the AIME, USAJMO, and twice for the Math Prize for Girls. She values the community and friendships she has built through competitive math.',
    image: 'https://i.ibb.co/gm77Nq9/Sophia-Shen-Sophia-Shen.jpg',
  },
  {
    name: 'Raymond Zhu',
    role: 'AIME Committee Co-Director, Problem Writer',
    bio: "Raymond Zhu is a junior from Lakeside School. He started competition math with the AMC 8 and attended MOP in 2025. Outside of math, he enjoys rowing with Lakeside Crew and has qualified for Nationals with the school's U17 8+ boat.",
    image: `${SOURCE_SITE}/assets/images/slg-photos/Raymond-Uncropped.png`,
  },
  {
    name: 'Hannah Ma',
    role: 'Sierra Leone Committee Co-Director, Mathcounts Committee Co-Director',
    bio: 'Hannah is a junior at Lakeside School. She has qualified for the AIME four times, the USAJMO twice, and attended PROMYS. She also enjoys dancing, golfing, fluting, and watching sunsets with friends.',
    image: `${SOURCE_SITE}/assets/images/slg-photos/Hannah-Uncropped.jpg`,
  },
  {
    name: 'Max Xie',
    role: 'Elementary Competition Co-Director, Problem Writer',
    bio: 'Max is an 11th grader at Tesla STEM High School. His least favorite math topic is geometry like any sane person.',
    image: `${SOURCE_SITE}/assets/images/slg-photos/Max-Cropped.png`,
  },
  {
    name: 'Eason Deng',
    role: 'AMC 10 Committee, Problem Writer',
    bio: 'Eason practices competitive math for AMC 12, AIME, JMO, and other olympiads. His favorite topic is Algebra/Number Theory, and outside of math he enjoys tennis and violin.',
    image: `${SOURCE_SITE}/assets/images/slg-photos/Eason-Cropped.jpg`,
  },
  {
    name: 'Daniel Ge',
    role: 'Mathcounts Committee, Problem Writer',
    bio: 'Daniel Ge is a senior at Newport High School and a MOP and Mathcamp alumnus. He coaches the Tyee Competition Math Club and enjoys hiking, skiing, and biking with friends and family.',
    image: `${SOURCE_SITE}/assets/images/slg-photos/Daniel-Uncropped.png`,
  },
  {
    name: 'Laura Wang',
    role: 'AIME Committee Co-Director',
    bio: 'Laura is a sophomore at Lakeside School. She has qualified for JMO, tied for 7th at Math Prize for Girls in 2024, and was a MATHCOUNTS Nationals semifinalist. She enjoys drawing, ice skating, and listening to music.',
    image: 'https://i.ibb.co/n0QXfGB/AP1-Gcz-Mi-SLUj-LI8p-Jpvn-Xc2r-Ilp-Qk8eg-Zd-D1-Ij1-POCB7-EKOBrk1i-F1-Fragb-Ws-Hgc-E29-BDJf-DU8nry8tm.png',
  },
  {
    name: 'Edward Li',
    role: 'AIME Committee, Problem Writer',
    bio: 'Edward is a junior at Mercer Island High School, a USAJMO qualifier, Mathcounts State winner, and 3-time AIME qualifier. He also enjoys chess, robotics, running, and studying world politics and law.',
    image: `${SOURCE_SITE}/assets/images/slg-photos/Edward-Cropped.jpg`,
  },
  {
    name: 'Patrick Yee',
    role: 'Elementary School Competition Committee',
    bio: 'Patrick is an 8th grader at Heatherwood Middle School. He has a strong passion for math and enjoys playing trombone and hanging out with friends.',
    image: `${SOURCE_SITE}/assets/images/slg-photos/Patrick-Uncropped.png`,
  },
  {
    name: 'Eric Shao',
    role: 'AMC 8 Committee Co-Director, Problem Writer',
    bio: 'Eric Shao is a sophomore at Mercer Island High School and a multi-time AIME qualifier who qualified for MATHCOUNTS Nationals in 2023. He enjoys tennis, debate, and trading card games.',
    image: 'https://i.ibb.co/VC2BZvP/8-B228-F01-8-FD8-43-E2-B15-A-721806-D069846-U9-A3992-2024-10-06-T05-45-04-648-Eric-Shao.jpg',
  },
  {
    name: 'Harry Liu',
    role: 'AMC 8 Committee, Problem Writer',
    bio: 'Harry is a junior at Lakeside School who is passionate about mathematics, coding, and electrical engineering. He is a USACO Gold contestant and enjoys piano, violin, reading, hiking, tennis, and swimming.',
    image: `${SOURCE_SITE}/assets/images/slg-photos/Harry-Uncropped.jpeg`,
  },
  {
    name: 'James Yang',
    role: 'AMC 10 Committee, Problem Writer',
    bio: 'James is a freshman at Lakeside School and a three-time AIME qualifier. He enjoys soccer, spending time with friends, and watching movies.',
    image: `${SOURCE_SITE}/assets/images/slg-photos/James-Uncropped.png`,
  },
  {
    name: 'Benjamin Fu',
    role: 'Mathcounts Committee Director, Testing Coordinator',
    bio: 'Benjamin is a MOP 2024 qualifier who has attended HMMT and ARML. In his free time, he enjoys playing Minecraft.',
    image: 'https://i.ibb.co/1Z1bX2G/Tiktok-Default-Profile-Picture-Sticker-Sticker-by-tgamez522.jpg',
  },
  {
    name: 'Lalith Durbhakula',
    role: '',
    bio: 'Lalith is a junior at Redmond High School. He earned 74/75 on the USAMTS and is a 3-time AIME qualifier. He enjoys ball sports, indoor games, and cooking.',
    image: `${SOURCE_SITE}/assets/images/slg-photos/Lalith-Uncropped.png`,
  },
  {
    name: 'Guhan Thiagarajan',
    role: 'Elementary Competition Committee, Problem Writer',
    bio: 'Guhan is a new SLG member from North Creek High School.',
    image: 'https://i.ibb.co/1Z1bX2G/Tiktok-Default-Profile-Picture-Sticker-Sticker-by-tgamez522.jpg',
  },
  {
    name: 'Wesley Wu',
    role: 'SIME Committee, Mock Mathcounts Committee',
    bio: 'Wesley Wu is a sophomore at Newport High School. His favorite subjects are algebra and geometry, and he also plays competitive tennis.',
    image: 'https://i.ibb.co/1Z1bX2G/Tiktok-Default-Profile-Picture-Sticker-Sticker-by-tgamez522.jpg',
  },
];

const PEOPLE = Array.isArray(SLG_DATA) && SLG_DATA.length
  ? SLG_DATA.map(({ name, title, photoURL, bio }) => ({
      name,
      role: title || '',
      image: photoURL === '/assets/images/slg-photos/Owen-Uncropped.jpg' ? '/assets/images/slg-photos/Owen-Uncropped.JPG' : photoURL,
      bio,
    }))
  : SLG_PEOPLE;

const markdown = new MarkdownIt({ html: true, linkify: true, typographer: true });
const localizeImages = (html) => html.replace(/(<(?:img|source)[^>]+(?:src|srcset)=['"])([^'"\s]+)/gi, (_, prefix, source) => `${prefix}${localizeImage(source)}`);
const renderMarkdown = (source) => DOMPurify.sanitize(localizeImages(markdown.render(source || '')), {
  USE_PROFILES: { html: true },
  ADD_TAGS: ['iframe'],
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target', 'rel', 'style'],
});

function MarkdownBody({ source, className = 'markdown-content' }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }} />;
}

function RichTitle({ children }) {
  return <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(String(children || '')) }} />;
}

function resolvePress(slug) {
  const key = decodeURIComponent(slug || '').replace(/^\/+|\/+$/g, '');
  return PRESS_RELEASES_BY_SLUG[key] || PRESS_RELEASES_BY_SLUG[slugify(key)] || PRESS_RELEASES[0];
}

function resolveEvent(slug) {
  const key = decodeURIComponent(slug || '').replace(/^\/+|\/+$/g, '');
  return EVENT_ITEMS.find((event) => event.slug === key || event.sourceSlug === key || slugify(event.slug) === slugify(key)) || EVENT_ITEMS[0];
}

function navigate(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function usePath() {
  const [path, setPath] = useState(`${window.location.pathname}${window.location.search}`);
  useEffect(() => {
    const update = () => setPath(`${window.location.pathname}${window.location.search}`);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  return path.replace(/\/+$/, '') || '/';
}

function InternalLink({ href, children, className = '', ...props }) {
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        if (href.startsWith('/')) {
          event.preventDefault();
          navigate(href);
        }
      }}
      {...props}
    >
      {children}
    </a>
  );
}

function Logo({ full = false, inverse = false }) {
  return (
    <InternalLink href="/" className={`logo ${full ? 'logo-full' : 'logo-simc'} ${inverse ? 'logo-inverse' : ''}`}>
      <img src="/int.svg" alt="" aria-hidden="true" />
      <span>{full ? 'SEATTLE INFINITY MATH CIRCLE' : 'SIMC'}</span>
    </InternalLink>
  );
}

function Button({ href, children, tone = 'primary', external = false, type = 'button', ...props }) {
  const className = `button button-${tone}`;
  if (external) return <a className={className} href={href} target="_blank" rel="noreferrer" {...props}>{children}</a>;
  if (href) return <InternalLink className={className} href={href} {...props}>{children}</InternalLink>;
  return <button className={className} type={type} {...props}>{children}</button>;
}

function Header() {
  return (
    <header className="site-header">
      <Logo inverse />
      <nav className="main-nav" aria-label="Main navigation">
        <InternalLink href="/events">Events</InternalLink>
        <InternalLink href="/resources">Resources</InternalLink>
        <InternalLink href="/press-releases">Press releases</InternalLink>
        <InternalLink href="/slg">About us</InternalLink>
        <Button href="/contact" tone="light">Contact us</Button>
      </nav>
    </header>
  );
}

function Checkerboard({ className = '', label = 'Placeholder image' }) {
  return <div className={`checkerboard ${className}`} role="img" aria-label={label} />;
}

function SignupBanner() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  return (
    <section className="signup-banner" aria-label="Join the SIMC community">
      <div className="signup-copy">
        <h2>Stay in the loop.</h2>
        <p>Sign up for our mailing list so you don't miss out!</p>
      </div>
      <div className="signup-spacer" aria-hidden="true" />
      <form id="banner-email-form" className="signup-form" onSubmit={(event) => { event.preventDefault(); if (email.trim()) setSubmitted(true); }}>
        <label className="sr-only" htmlFor="banner-email">Email address</label>
        <input id="banner-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setSubmitted(false); }} placeholder="your@email.com" required />
      </form>
      <button className="button button-primary" type="submit" form="banner-email-form">{submitted ? 'You are in' : 'Join mailing list'}</button>
      <Button href={DISCORD_URL} external tone="outline">Join our Discord</Button>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <Logo full />
        <div className="footer-links">
          <InternalLink href="/press-releases">Press releases</InternalLink>
          <InternalLink href="/contact">Mailing list</InternalLink>
          <a href={DISCORD_URL} target="_blank" rel="noreferrer">Discord</a>
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">Instagram</a>
        </div>
      </div>
      <div className="footer-spacer" aria-hidden="true" />
      <div className="sponsors">
        <p className="eyebrow">Sponsors</p>
        <div className="sponsor-row">
          {SPONSORS.map((sponsor) => (
            <a className="sponsor-link" key={sponsor.name} href={sponsor.href} target="_blank" rel="noreferrer" aria-label={`Visit ${sponsor.name}`}>
              <img className={`sponsor-image ${sponsor.className}`} src={sponsor.image} alt={`${sponsor.name} logo`} />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

function PageShell({ children }) {
  return <><Header />{children}<Footer /></>;
}

function SourceImage({ src, className, alt, label = alt }) {
  if (!src) return <Checkerboard className={className} label={label} />;
  return <img className={`source-image ${className}`} src={localizeImage(src)} alt={alt} loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; event.currentTarget.parentElement?.classList.add('image-fallback'); }} />;
}

function PressCard({ variant = 'page', title = 'Mock MATHCOUNTS Announcement', date = 'March 7, 2026', description = '', image, href = MOCK_CONTENT_URL }) {
  return (
    <InternalLink href={href} className={`press-card press-card-${variant}`}>
      {variant !== 'compact' && <SourceImage src={image} className="card-image" alt={`${title} source image`} />}
      <div className="card-copy">
        <p className="card-kicker">{date}</p>
        <h3><RichTitle>{title}</RichTitle></h3>
        {variant !== 'compact' && description && <p>{description}</p>}
      </div>
    </InternalLink>
  );
}

function CompactCard({ title, date = 'March 7, 2026', description = '', image, href = MOCK_CONTENT_URL }) {
  return <PressCard variant="compact" title={title} date={date} description={description} image={image} href={href} />;
}

function LinkCard({ title, description, href = MOCK_CONTENT_URL }) {
  const content = <><h3>{title}</h3><p>{description}</p></>;
  if (!href.startsWith('/') || href.startsWith('/assets/')) return <a className="link-card" href={href} target={href.startsWith('/') ? undefined : '_blank'} rel={href.startsWith('/') ? undefined : 'noreferrer'}>{content}</a>;
  return <InternalLink href={href} className="link-card">{content}</InternalLink>;
}

function PersonCard({ name, role, bio, image }) {
  return (
    <article className="person-card">
      <SourceImage src={image} className="card-image" alt={`Photo of ${name}`} label={`${name} portrait`} />
      <div className="card-copy">
        <h3>{name}</h3>
        <p className="card-kicker">{role}</p>
        <p>{bio}</p>
      </div>
    </article>
  );
}

function ResultsAwardItem({ competition, rank, ariaHidden = false }) {
  return (
    <div className="results-award-item" aria-hidden={ariaHidden || undefined}>
      <span className="results-rank">{rank}</span>
      <span className="results-competition">{competition}</span>
    </div>
  );
}

function ResultsYear({ year, rows, awards }) {
  return (
    <div className="results-year">
      <div className="results-year-rule"><span>{year}</span></div>
      <div className="results-awards-grid" style={{ '--results-rows': rows }}>
        {awards.map(([competition, rank]) => <ResultsAwardItem key={`${competition}-${rank}`} competition={competition} rank={rank} />)}
      </div>
    </div>
  );
}

function ResultsSection() {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className={`results-section ${expanded ? 'results-expanded' : 'results-collapsed'}`} aria-label="SIMC results">
      <div className="results-header">
        <h2 className="results-label">The most decorated team in the USA</h2>
        <div className="results-toggle-controls">
          {!expanded && <button className="results-toggle" type="button" aria-expanded="false" aria-controls="results-carousel" onClick={() => setExpanded(true)}>View all results</button>}
          {expanded && <button className="results-toggle results-close" type="button" aria-label="Show top three results" aria-expanded="true" aria-controls="results-list" onClick={() => setExpanded(false)}>×</button>}
        </div>
      </div>
      <div className="results-stage">
        <div id="results-carousel" className="results-carousel" role="region" aria-label="Top results carousel" aria-hidden={expanded || undefined}>
          <div className="results-carousel-track">
            {[0, 1].map((set) => (
              <div className="results-carousel-set" key={set}>
                {CAROUSEL_AWARDS.map(([competition, rank], index) => <ResultsAwardItem key={`${set}-${index}-${competition}-${rank}`} competition={competition} rank={rank} ariaHidden={set === 1} />)}
              </div>
            ))}
          </div>
        </div>
        <div id="results-list" className="results-awards-list" aria-hidden={!expanded || undefined}>
          {AWARDS_BY_YEAR.map((section) => <ResultsYear key={section.year} {...section} />)}
        </div>
      </div>
    </section>
  );
}

function HomeHero() {
  return (
    <div className="home-hero">
      <div className="home-support">
        <div className="home-title">
          <img src="/int.svg" alt="" aria-hidden="true" />
          <h1>Seattle Infinity Math Circle</h1>
        </div>
        <div className="hero-panel">
          <p>Our goal is to inspire students to engage in mathematics and expand their mathematical interests and capabilities.</p>
          <div className="hero-actions">
            <Button href="/contact">Join us</Button>
            <span className="hero-actions-spacer" aria-hidden="true" />
            <Button href="/slg" tone="primary">Who are we</Button>
          </div>
        </div>
      </div>
      <Checkerboard className="home-hero-image" label="SIMC placeholder image" />
    </div>
  );
}

function HomeLatest() {
  return (
    <section className="home-latest">
      <div className="home-latest-column">
        <div className="section-title-row">
          <h2>Upcoming events</h2>
          <div className="title-spacer" />
          <Button href="/events" tone="outline">View all events</Button>
        </div>
        <div className="compact-stack">
          {UPCOMING_EVENTS.map((event) => <CompactCard key={event.slug} title={event.title} date={event.date} description={event.description} href={`/events/${event.slug}`} />)}
        </div>
      </div>
      <div className="home-latest-column">
        <div className="section-title-row">
          <h2>Latest press releases</h2>
          <div className="title-spacer" />
          <Button href="/press-releases" tone="outline">View all press releases</Button>
        </div>
        <div className="featured-press-grid">
          {PRESS_RELEASES.slice(0, 2).map((article) => <PressCard key={article.slug} variant="featured" title={article.title} date={article.date} description={article.description} image={article.image} href={`/press-releases/${article.slug}`} />)}
        </div>
      </div>
    </section>
  );
}

function HomePage() {
  return (
    <main className="home-page">
      <section className="home-dark">
        <HomeHero />
        <ResultsSection />
      </section>
      <SignupBanner />
      <HomeLatest />
    </main>
  );
}

function Intro({ title, body, className = '', children }) {
  return (
    <section className={`page-intro ${className}`}>
      <h1>{title}</h1>
      {body && <p>{body}</p>}
      {children}
    </section>
  );
}

function PressReleasesPage() {
  return (
    <main>
      <Intro title="Press releases" body="A collection of all our press releases." />
      <SignupBanner />
      <section className="press-page-list">
        <h2>Latest press releases</h2>
        <div className="press-page-grid">
          {PRESS_RELEASES.map((article) => <PressCard key={article.slug} title={article.title} date={article.date} description={article.description} image={article.image} href={`/press-releases/${article.slug}`} />)}
        </div>
      </section>
    </main>
  );
}

function EventsPage() {
  return (
    <main>
      <Intro title="Events" body="A collection of upcoming events from SIMC." />
      <SignupBanner />
      <section className="events-page-list">
        <h2>Upcoming events</h2>
        <div className="compact-grid">{UPCOMING_EVENTS.map((event) => <CompactCard key={event.slug} title={event.title} date={event.date} description={event.description} href={`/events/${event.slug}`} />)}</div>
      </section>
    </main>
  );
}

function YearRule({ children }) {
  return <div className="section-year-rule"><span>{children}</span></div>;
}

const TEST_CATEGORY_LABELS = {
  'mock-aime': 'Mock AIME',
  'mock-amc10': 'Mock AMC 10',
  'mock-amc12': 'Mock AMC 12',
  'mock-mathcounts': 'Mock MATHCOUNTS',
  elementary: 'Elementary competition',
  tst: 'SIMC TST',
};

function TestArchiveCard({ test }) {
  const related = test.relatedPressSlug ? resolvePress(test.relatedPressSlug) : null;
  return (
    <article className="test-archive-card">
      <div className="test-archive-copy">
        <p className="card-kicker">{TEST_CATEGORY_LABELS[test.category]}</p>
        <h3>{test.title}</h3>
        <p className={`test-status test-status-${test.status}`}>{test.status === 'needs-source' ? 'Source needed' : 'Materials available'}</p>
      </div>
      <div className="test-material-links">
        {test.materials.length ? test.materials.map((material) => <a key={`${test.title}-${material.label}`} href={material.href} target="_blank" rel="noreferrer">{material.label}</a>) : <span>No material URL in source</span>}
        {related && <InternalLink href={`/press-releases/${related.slug}`}>Related press release</InternalLink>}
      </div>
    </article>
  );
}

function ResourcesPage() {
  const groupedTests = Array.from(new Set(TEST_ARCHIVE.map((test) => test.year)))
    .sort((a, b) => b - a)
    .map((year) => ({ year, tests: TEST_ARCHIVE.filter((test) => test.year === year) }));
  return (
    <main>
      <Intro title="Resources" body="Online classes, YouTube channels, books, and past tests from SIMC." />
      <SignupBanner />
      <section className="resources-tests">
        <h2>Past tests</h2>
        <div className="test-year-list">
          {groupedTests.map(({ year, tests }) => (
            <div className="test-year" key={year}>
              <YearRule>{year}</YearRule>
              <div className="test-archive-grid">{tests.map((test) => <TestArchiveCard key={`${test.category}-${test.year}`} test={test} />)}</div>
            </div>
          ))}
        </div>
        <div className="test-gaps">
          <h3>Archive notes</h3>
          {TEST_GAPS.map((gap) => <p key={gap.title}><strong>{gap.title}.</strong> {gap.detail}</p>)}
        </div>
      </section>
      <section className="resources-external">
        <h2>Online classes, YouTube, and books</h2>
        <div className="link-grid">
          {RESOURCE_CARDS.map((resource) => <LinkCard key={resource.title} {...resource} />)}
        </div>
      </section>
      <section className="resources-materials">
        <h2>SIMC Day materials</h2>
        <div className="link-grid">{EVENT_MATERIALS.map((material) => <LinkCard key={material.href} title={material.label} description="Local event material" href={material.href} />)}</div>
      </section>
      <section className="resources-source">
        <h2>Competition calendar and reading list</h2>
        <MarkdownBody source={(PAGE_CONTENT_BY_SLUG.resources?.body || '').replace(/^#\s+.+(?:\r?\n){1,2}/, '')} />
      </section>
    </main>
  );
}

function SourceArticlePage({ article, backHref, backLabel }) {
  if (!article) return <NotFoundPage />;
  return (
    <main>
      <section className="announcement-hero">
        <p className="card-kicker card-kicker-light">{article.date}</p>
        <h1><RichTitle>{article.title}</RichTitle></h1>
        <Button href={backHref} tone="light">{backLabel}</Button>
      </section>
      <SignupBanner />
      <article className="announcement-article">
        <h2><RichTitle>{article.title}</RichTitle></h2>
        <SourceImage src={article.image} className="announcement-image" alt={`${article.title} source image`} label={`${article.title} placeholder image`} />
        <MarkdownBody source={article.body || article.description} />
      </article>
    </main>
  );
}

function AnnouncementPage() {
  return <SourceArticlePage article={resolvePress('2026-2-28-mockmathcounts')} backHref="/press-releases" backLabel="Back to press releases" />;
}

function PressDetailPage({ slug }) {
  const article = resolvePress(slug);
  return <SourceArticlePage article={article} backHref="/press-releases" backLabel="Back to press releases" />;
}

function EventDetailPage({ slug }) {
  const event = resolveEvent(slug);
  return <SourceArticlePage article={{ ...event, date: event.date }} backHref="/events" backLabel="Back to events" />;
}

function MarkdownPage({ record, title, body }) {
  const pageTitle = title || record?.title || 'SIMC';
  const content = (body || record?.body || '').replace(/^#\s+.+(?:\r?\n){1,2}/, '');
  return (
    <main>
      <Intro title={pageTitle} body={record?.description} />
      <section className="source-page-content">
        <MarkdownBody source={content} />
      </section>
    </main>
  );
}

function NewslettersPage() {
  return <MarkdownPage record={PAGE_CONTENT_BY_SLUG.newsletters} />;
}

const CALENDAR_EMBEDS = [
  'https://calendar.google.com/calendar/embed?height=600&wkst=1&bgcolor=%23ffffff&ctz=America%2FLos_Angeles&showTitle=1&showCalendars=1&mode=AGENDA&src=YTkxNzhhNzU4ZGRjYjhmM2FjM2ZmNGQ1MWQ2OGNiNTcwNjdmMDUyODljZTc4YmUyNDliMDM0MWJhNmQyYzY3MUBncm91cC5jYWxlbmRhci5nb29nbGUuY29t&color=%23C0CA33',
  'https://calendar.google.com/calendar/embed?height=600&wkst=1&ctz=America%2FLos_Angeles&showPrint=0&src=YWRkcmVzc2Jvb2sjY29udGFjdHNAZ3JvdXAudi5jYWxlbmRhci5nb29nbGUuY29t&src=MDBkNmVmNGIyMWNmNWQxODI4ZmExNGM0M2M2OGQzNzYwNTkyZTY4ZTgyYzQxZGM5ODMyNmIwNWFjODVkN2FmYkBncm91cC5jYWxlbmRhci5nb29nbGUuY29t&src=YTkxNzhhNzU4ZGRjYjhmM2FjM2ZmNGQ1MWQ2OGNiNTcwNjdmMDUyODljZTc4YmUyNDliMDM0MWJhNmQyYzY3MUBncm91cC5jYWxlbmRhci5nb29nbGUuY29t&color=%2333B679&color=%23F09300&color=%23C0CA33',
];

function CalendarPage() {
  return (
    <main>
      <Intro title="Calendar" body="Upcoming SIMC events and competition dates." />
      <section className="embedded-page">
        <iframe title="SIMC calendar" src={CALENDAR_EMBEDS[0]} loading="lazy" />
      </section>
    </main>
  );
}

function PotmPage() {
  return (
    <main>
      <Intro title="Problem of the Month" body="Every month, members of SIMC's Student Leadership Group write math problems." />
      <section className="potm-page">
        {Object.entries(POTM_DATA).map(([year, problems]) => (
          <div className="potm-year" key={year}>
            <h2>{year} problems</h2>
            <div className="link-grid">
              {problems.map((problem) => <LinkCard key={`${year}-${problem.month}`} title={problem.month} description={problem.blurb} href={problem.url} />)}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

const CIRCLE_ISSUES = ['may24', 'feb24', 'jan24', 'dec23', 'nov23', 'oct23', 'sept23'];
const CIRCLE_BASE = 'https://raw.githubusercontent.com/seattleinfinity/simc-circle-articles/main';
const CIRCLE_FALLBACK_ARTICLES = [
  ['may24', 'terence_amicable_numbers.tex', 'Amicable numbers', 'Terence Wu'],
  ['feb24', 'christina.tex', "The Story of Christina's Sandwich", 'Christina Liu'],
  ['jan24', 'christna 0.tex', 'The Discovery of ... Nothing', 'Christina Liu'],
  ['jan24', 'eric_pythag.tex', 'The Pythagoreans', 'Eric Yee'],
  ['jan24', 'williamg_jmm2024.tex', 'Short Encounters at JMM 2024: an Extension from Last Year', 'William Gvozdjak'],
  ['dec23', 'eric-Sampling+Gambling.tex', 'Data Sampling? Statistics? Gambling!!??', 'Eric Yee'],
  ['dec23', 'hongning_RNG.tex', "Random Number Generators, featuring Java's random function", 'Hongning Wang'],
  ['dec23', 'lily_complex.tex', 'The Power of the Complex Plane', 'By Lily Sun'],
  ['dec23', 'nishka-Collatz.tex', 'The Collatz Conjecture', 'Nishka Kacheria'],
  ['dec23', 'william_aperiodic_monotile.tex', 'A Strange Shape: Aperiodic Monotiles', 'William Gvozdjak'],
  ['nov23', 'christina_2048.tex', '2048', 'Christina Liu'],
  ['nov23', 'eric_burnsides.tex', 'Abstract Algebra in the AMC!?', 'Eric Yee'],
  ['nov23', 'hongning_CLT.tex', 'Central Limit Theorem', 'Hongning Wang'],
  ['nov23', 'nishka_secret.tex', "Shamir's Secret Sharing", 'Nishka Kacheria'],
  ['nov23', 'williamg_probabilisticmethod.tex', 'The Probabilistic Method', 'William Gvozdjak'],
  ['oct23', 'christina_x.tex', 'X', 'Christina Liu'],
  ['oct23', 'ericy_randomwalking.tex', "Polya's Neverending Walk", 'Eric Yee'],
  ['oct23', 'hongning_characteristic.tex', 'Characteristic polynomials', 'Hongning Wang'],
  ['oct23', 'nishka_spirograph.tex', 'Spirograph', 'Nishka Kacheria'],
  ['oct23', 'williamg_expectedvalue.tex', 'Analyzing Decisions with Expected Value', 'William Gvozdjak'],
  ['sept23', 'christinal_cranks.tex', 'Tinfoil Hats in the Math Community', 'Christina Liu'],
  ['sept23', 'ericy_chipfiring.tex', 'Chip-Firing Games', 'Eric Yee'],
  ['sept23', 'hongningw_godel.tex', 'No one can discover all of math', 'Hongning Wang'],
  ['sept23', 'lilys_coinrotation.tex', 'A Different Way of Thinking About The Coin Rotation Paradox', 'Lily Sun (Guest Writer)'],
  ['sept23', 'lilys_pascal.tex', 'Proof by Story Telling', 'Lily Sun (Guest Writer)'],
  ['sept23', 'williamg_groups.tex', 'Group Theory', 'William Gvozdjak'],
];
const CIRCLE_FALLBACK_ISSUES = CIRCLE_ISSUES.map((issue) => ({
  issue,
  issueFullName: circleIssueName(issue),
  articles: CIRCLE_FALLBACK_ARTICLES.filter(([articleIssue]) => articleIssue === issue).map(([, file, title, author]) => ({ issue, file, title, author, blurb: author, body: `Read the full article in the [${title} source file](${CIRCLE_BASE}/${issue}/${encodeURIComponent(file)}).`, issueFullName: circleIssueName(issue), slug: `${slugify(issue)}/${slugify(title)}` })),
}));

function circleIssueName(issue) {
  const match = /^([a-z]+)(\d+)$/.exec(issue);
  if (!match) return issue;
  const month = match[1].replace(/^sept$/, 'September').replace(/^feb$/, 'February').replace(/^jan$/, 'January').replace(/^dec$/, 'December').replace(/^nov$/, 'November').replace(/^oct$/, 'October').replace(/^may$/, 'May');
  return `${month} 20${match[2]}`;
}

function parseCircleTex(raw, issue, file) {
  const match = (pattern, fallback = '') => pattern.exec(raw)?.[1]?.trim() || fallback;
  const title = match(/\\title\{([\s\S]+?)\}/, file.replace(/\.tex$/, '').replace(/[_+-]/g, ' '));
  const author = match(/\\author\{([\s\S]+?)\}/, 'SIMC');
  const blurbLine = raw.match(/^%%\s*\\blurb\{([^\r\n]*)/m)?.[1]?.trim() || '';
  const blurb = (blurbLine.endsWith('}') ? blurbLine.slice(0, -1) : blurbLine).replace(/\\[a-zA-Z]+\{([^}]+)\}/g, '$1');
  let body = raw.match(/\\begin\{document\}([\s\S]+?)\\end\{document\}/)?.[1] || raw;
  body = body.replace(/\\maketitle/g, '').replace(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g, (_, image) => `![${image}](${CIRCLE_BASE}/${issue}/${image})`);
  body = body.replace(/\\section\{([^}]+)\}/g, '## $1').replace(/\\subsection\{([^}]+)\}/g, '### $1').replace(/\\textbf\{([^}]+)\}/g, '**$1**').replace(/\\emph\{([^}]+)\}/g, '*$1*').replace(/\\href\{([^}]+)\}\{([^}]+)\}/g, '[$2]($1)').replace(/\\url\{([^}]+)\}/g, '$1').replace(/\\begin\{itemize\}/g, '').replace(/\\end\{itemize\}/g, '').replace(/\\item\s+/g, '- ').replace(/\\\\/g, '\n').replace(/\$\$([\s\S]+?)\$\$/g, (_, equation) => `\n$$${equation}$$\n`);
  return { title, author, blurb, body, issue, issueFullName: circleIssueName(issue), file, slug: `${slugify(issue)}/${slugify(title)}` };
}

function CirclePage() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    Promise.all(CIRCLE_ISSUES.map(async (issue) => {
      const response = await fetch(`https://api.github.com/repos/seattleinfinity/simc-circle-articles/contents/${issue}`);
      if (!response.ok) throw new Error(`Circle issue ${issue} unavailable`);
      const files = (await response.json()).filter((file) => file.name.endsWith('.tex'));
      const articles = await Promise.all(files.map(async (file) => parseCircleTex(await fetch(file.download_url).then((result) => result.text()), issue, file.name)));
      return { issue, issueFullName: circleIssueName(issue), articles };
    })).then((data) => { if (active) setIssues(data); }).catch(() => { if (active) setIssues(CIRCLE_FALLBACK_ISSUES); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return (
    <main>
      <Intro title="The Circle" body="A math-literacy magazine written by the SIMC community." />
      <section className="circle-page">
        {loading && <p>Loading current articles…</p>}
        {!loading && !issues.length && <p>Circle articles are temporarily unavailable. Browse the <a href="https://github.com/seattleinfinity/simc-circle-articles" target="_blank" rel="noreferrer">article archive on GitHub</a>.</p>}
        {issues.map((issue) => <div className="circle-issue" key={issue.issue}>
          <YearRule>{issue.issueFullName}</YearRule>
          <div className="link-grid">{issue.articles.map((article) => <InternalLink className="link-card" key={article.slug} href={`/circle/${article.issue}/${slugify(article.title)}`}><h3>{article.title}</h3><p>{article.blurb || article.author}</p></InternalLink>)}</div>
        </div>)}
        <div className="circle-archive-links"><h2>Earlier volumes</h2><a href="https://github.com/seattleinfinity/simc-circle-articles/tree/main/archive" target="_blank" rel="noreferrer">Browse the full Circle archive</a></div>
      </section>
    </main>
  );
}

function CircleArticlePage({ issue, title }) {
  const fallbackArticle = CIRCLE_FALLBACK_ISSUES.flatMap((entry) => entry.articles).find((entry) => entry.issue === issue && slugify(entry.title) === slugify(title));
  const [article, setArticle] = useState(fallbackArticle || null);
  useEffect(() => {
    let active = true;
    fetch(`https://api.github.com/repos/seattleinfinity/simc-circle-articles/contents/${issue}`).then((response) => response.json()).then(async (files) => {
      const results = await Promise.all(files.filter((entry) => entry.name.endsWith('.tex')).map(async (entry) => parseCircleTex(await fetch(entry.download_url).then((response) => response.text()), issue, entry.name)));
      const result = results.find((entry) => slugify(entry.title) === slugify(title));
      if (!result) return;
      if (active) setArticle(result);
    }).catch(() => { if (active && fallbackArticle) setArticle(fallbackArticle); }).finally(() => {});
    return () => { active = false; };
  }, [issue, title]);
  if (!article) return <SourceArticlePage article={{ title, date: circleIssueName(issue), description: 'Loading Circle article…', body: 'The article is loading from the Circle archive.' }} backHref="/circle" backLabel="Back to The Circle" />;
  return <SourceArticlePage article={{ ...article, date: article.issueFullName }} backHref="/circle" backLabel="Back to The Circle" />;
}

function LegacyPressPage() {
  return <SourceArticlePage article={{ ...LEGACY_PRESS_CONTENT, date: 'Archive' }} backHref="/press-releases" backLabel="Back to press releases" />;
}

function ContactMailingForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  return (
    <form className="contact-option" onSubmit={(event) => { event.preventDefault(); if (email.trim()) setSubmitted(true); }}>
      <h2>Join our mailing list</h2>
      <p><a href={MAILING_LIST_URL} target="_blank" rel="noreferrer">Sign up for our mailing list</a> so you don't miss out on any of our fun events!</p>
      <div className="contact-form-row">
        <label className="sr-only" htmlFor="contact-email">Email address</label>
        <input id="contact-email" type="email" placeholder="your@email.com" value={email} onChange={(event) => { setEmail(event.target.value); setSubmitted(false); }} required />
        <Button type="submit">{submitted ? 'You are in' : 'Join mailing list'}</Button>
      </div>
    </form>
  );
}

function ContactPage() {
  return (
    <main>
      <Intro title="Contact Us" className="contact-hero" />
      <section className="contact-layout">
        <div className="contact-email">
          <h2>Want to get in touch with us?</h2>
          <p>For questions, comments, or general inquiries, reach out through our <a href={DISCORD_URL} target="_blank" rel="noreferrer">Discord Server</a>. You can also email us at <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.</p>
        </div>
        <div className="contact-options-row">
          <div className="contact-option">
            <h2>Join our Discord!</h2>
            <p>Join our Discord Server to connect with the SIMC community.</p>
            <Button href={DISCORD_URL} external>Join our Discord</Button>
          </div>
          <ContactMailingForm />
        </div>
      </section>
    </main>
  );
}

function SlgPage() {
  return (
    <main>
      <section className="about-hero">
        <div className="about-copy">
          <h1>Student Leadership Group</h1>
          <div className="about-panel"><p>Our student leaders create competitions, write problems, and expand math literacy for students across the Seattle area.</p></div>
        </div>
        <SourceImage src={PEOPLE[1]?.image} className="about-image" alt="SIMC student leader" label="About us source image" />
      </section>
      <SignupBanner />
      <section className="slg-page-list">
        <h2>Meet the Student Leadership Group</h2>
        <div className="people-grid">{PEOPLE.map((person) => <PersonCard key={person.name} {...person} />)}</div>
      </section>
    </main>
  );
}

function NotFoundPage() {
  return <main><Intro title="That page is missing."><Button href="/">Back home</Button></Intro></main>;
}

function renderRoute(path) {
  if (path === '/') return HomePage;
  if (path === '/events') return EventsPage;
  if (path.startsWith('/events/')) return () => <EventDetailPage slug={path.slice('/events/'.length)} />;
  if (path === '/resources' || path === '/mock-tests' || path === '/past-tests') return ResourcesPage;
  if (path === '/press-releases') return PressReleasesPage;
  if (path === '/press-releases/past-press-releases') return LegacyPressPage;
  if (path.startsWith('/press-releases/')) return () => <PressDetailPage slug={path.slice('/press-releases/'.length)} />;
  if (path === '/announcements/mathcounts' || path === '/announcement') return AnnouncementPage;
  if (path === '/contact') return ContactPage;
  if (path === '/slg' || path === '/about' || path === '/about-us') return SlgPage;
  if (path === '/newsletters' || path === '/newsletter' || path === '/newletter') return NewslettersPage;
  if (path === '/gcalender' || path === '/calender' || path === '/calendar') return CalendarPage;
  if (path === '/potm') return PotmPage;
  if (path === '/circle') return CirclePage;
  if (path.startsWith('/circle/')) {
    const [issue, ...titleParts] = path.slice('/circle/'.length).split('/');
    if (issue && titleParts.length) return () => <CircleArticlePage issue={issue} title={titleParts.join('-')} />;
    return CirclePage;
  }
  return NotFoundPage;
}

function App() {
  const path = usePath();
  useEffect(() => {
    const requestedTheme = new URLSearchParams(path.split('?')[1] || '').get('theme');
    document.documentElement.dataset.theme = requestedTheme === 'dark' ? 'dark' : 'light';
  }, [path]);
  const Page = renderRoute(path.split('?')[0]);
  return <PageShell><Page /></PageShell>;
}

createRoot(document.getElementById('root')).render(<App />);
