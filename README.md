# Seattle Infinity Math Circle site

React/Vite static site for Seattle Infinity Math Circle. The visual system is based on the Figma-derived SIMC mockup and keeps the Netlify `_site` output directory.

## Local development

```sh
npm install
npm run dev
```

Open `http://localhost:5173`. Build a deployable static site with:

```sh
npm run build
```

The build is written to `_site`. Netlify’s `public/_redirects` keeps client-side routes working on direct visits.

## Editing content

Markdown and JSON remain the editable source of truth:

- `src/press-releases/*.md` → `/press-releases/:slug`
- `src/events/*.md` → `/events/:slug`
- `src/_data/slg.json` → `/slg` and `/about-us`
- `src/_data/potm.json` → `/potm`
- `src/resources.md`, `src/newsletters.md`, and `src/gcalender.md` feed their React pages
- `src/test-archive.js` contains the structured Past Tests registry and explicit unresolved gaps
- `src/assets` is copied to `public/assets`; the LaTeX-generated integral mark is `public/int.svg`

Press-release and event detail pages render the complete Markdown body, including links, tables, images, raw HTML, and iframes. The Circle archive loads current issue/article files from `seattleinfinity/simc-circle-articles` at runtime and links to its historical archive.

The Decap CMS entry point remains at `/admin`; its configuration and preview assets are under `src/admin` and are copied to `public/admin`.

## Routes and legacy aliases

The app preserves the existing pages and aliases, including `/events/SIMC10`, `/events/SIMC8`, `/events/SIME`, `/gcalender`, `/calender`, `/newletter`, `/about-us`, and `/past-tests`. Additional coverage includes `/newsletters`, `/calendar`, `/potm`, `/circle`, `/announcements/mathcounts`, and every press-release detail route.

See [`docs/content-migration-audit.md`](docs/content-migration-audit.md) for the migration counts, source links, test-material audit, and unresolved gaps.
