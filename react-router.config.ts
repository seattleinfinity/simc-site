import type { Config } from '@react-router/dev/config';
import { SEO_ROUTES } from './src/seo';

const prerenderPaths = [
  ...SEO_ROUTES.map(({ path }) => path),
  '/404',
];

export default {
  appDirectory: 'src',
  buildDirectory: 'dist',
  ssr: false,
  prerender: {
    paths: prerenderPaths,
    concurrency: 4,
  },
} satisfies Config;
