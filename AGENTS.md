# SIMC site contributor guide

## Project snapshot

- Seattle Infinity Math Circle's public website.
- Typed React component code rendered by Vite; this is a client-side static site, not a server-rendered app.
- The production build directory is `dist/` (configured in `vite.config.ts`). It is ignored by Git.
- The app source is TypeScript/TSX and uses React Router for client-side navigation.

## Development commands

```sh
npm install
npm run dev       # Vite development server
npm run typecheck # validates the TypeScript source
npm run build     # typechecks, then writes the deployable site to dist/
npm run preview   # serves the built dist/ output
```

There is no test or lint script in `package.json`. Run `npm run typecheck` for a fast check and `npm run build` for the production compilation.

## Application architecture

- `src/main.tsx` contains the app, shared layout components, page components, content-derived lists, and the React Router route table.
- `BrowserRouter`, `Routes`, `Route`, `Link`, `useLocation`, and `useParams` provide client-side navigation. `ScrollToTop` handles route changes; `SiteRoutes` owns the route table.
- `src/content.ts` uses eager `import.meta.glob()` calls to bundle Markdown and adjacent media at build time. It parses the repository's simple YAML-like front matter, creates typed records and slugs/aliases, resolves local relative assets, and exposes records grouped as press releases, events, past tests, and generic pages.
- Markdown is rendered in `src/main.tsx` with `markdown-it`, then sanitized with DOMPurify. KaTeX CSS is imported for math content. Keep the sanitizer and local-asset rewriting in mind when changing Markdown features.
- `src/_data/slg.json` supplies Student Leadership Group people and photos; `src/main.tsx` sorts and presents this data.
- `src/styles.css` is the stylesheet entry point and remains the main styling API for semantic classes.

## Routes

Canonical route families are:

- `/` home
- `/events` and `/events/<slug>` event archive/detail pages
- `/resources` resources plus past tests, `/past-tests` and `/mock-tests` past-test archive aliases, and `/past-tests/<slug>` detail pages
- `/press-releases` and `/press-releases/<slug>` archive/detail pages
- `/about-us` Student Leadership Group page; `/about` and `/slg` are aliases
- `/contact`
- `/newsletters` and `/newsletter` (plus the historical `/newletter` typo alias)
- `/calendar` (plus `/gcalender` and `/calender` aliases)
- `/potm`

Unknown paths render the in-app missing-page screen. Cloudflare's asset configuration uses SPA fallback so direct deep links can load the client app.

## Content workflow

Each content item is a folder containing `index.md`:

- `src/events/<folder>/index.md`
- `src/press-releases/<folder>/index.md`
- `src/past-tests/<folder>/index.md`

Use the existing front matter conventions. Common fields include `title`, `blurb`, `date`, `schedule`, `featured`, `aliases`, `past_tests`, and `image`; past tests additionally use `type: past-test`, `category`, `year`, `hosted_date`, `problem_pdfs`, `solution_links`, and `source_links`. Multiple material links are separated with semicolons. Relative images/PDFs should live beside the Markdown file; external URLs are preserved. Do not invent missing problem or solution files.

Generic pages such as newsletters/resources are also Markdown records with `type: page`.

## Assets and external services

- Static public assets are under `public/`; use root URLs such as `/assets/images/...` and `/int.svg` from JSX.
- Content-local assets are imported by Vite through `src/content.ts` and should be referenced relative to their Markdown source.
- The footer and contact/home surfaces link to Discord, Instagram, Google Forms, sponsor websites, and Google Calendar embeds. The mailing-list email fields are currently client-only confirmation states; they do not submit to a backend.
- `worker/index.js` is a minimal Cloudflare Worker that forwards requests to the `ASSETS` binding.
- `wrangler.jsonc` names the Worker `simc-site`, points at `dist/`, enables SPA `not_found_handling`, and uses the repository's compatibility date. The README says Cloudflare Workers Builds runs `npm run build` and then `npx wrangler deploy` on pushes to production `main`; verify hosting state separately from a local build.

## Change guidance

- Inspect `git status` and the scoped diff before editing; do not reset or overwrite unrelated work.
- For content changes, update the relevant Markdown/front matter first and let the glob-derived records drive the UI. Only change `src/main.tsx` when presentation or route behavior actually needs it.
- Preserve accessible labels, `target="_blank"`/`rel="noreferrer"` behavior for external links, direct-PDF fallback behavior, and the responsive rules in the lower portion of `src/styles.css`.
- When changing styles, keep the stylesheet's global semantic selectors and responsive rules in mind. Recheck desktop and narrow/mobile layouts after TSX or CSS edits.
- A successful `npm run build` proves static compilation only; it does not prove Worker deployment, custom-domain routing, external embeds, or browser-level behavior.
