# Seattle Infinity Math Circle site

React/Vite static site for Seattle Infinity Math Circle.

## Local development

```sh
npm install
npm run dev
```

Build the deployable static site with:

```sh
npm run build
```

The build is written to `dist`.

## Content structure

Every public event, press release, and past test is a self-contained folder:

- `src/events/<slug>/index.md` → `/events/<slug>`
- `src/press-releases/<slug>/index.md` → `/press-releases/<slug>`
- `src/past-tests/<slug>/index.md` → `/past-tests/<slug>`

Images and other local assets belong beside the Markdown that uses them. Past-test problem PDFs are embedded on their detail pages when a direct PDF URL is available; solutions remain exact external links. The archive does not invent replacement materials when the source has no usable file.

The attached classroom image used on the home and About pages is `public/assets/images/about-classroom.png`. Sponsor marks and student portraits are also local files under `public/assets/images/`.

## Mailing list

The signup forms submit to the same-origin `POST /api/subscribe` Worker endpoint. The Worker validates the request, verifies the Turnstile token, and idempotently stores a normalized email in the D1 `subscribers` table. It does not expose a subscriber list or send bulk email. Successful signups receive a signed `/unsubscribe` link.

One-time Cloudflare setup:

```sh
npx wrangler d1 create simc-mailing-list
# Copy the returned database_id into wrangler.jsonc.
npx wrangler d1 migrations apply simc-mailing-list --remote
npx wrangler secret put TURNSTILE_SECRET
npx wrangler secret put UNSUBSCRIBE_SECRET
```

Set `VITE_TURNSTILE_SITE_KEY` as a public build-time variable in the Cloudflare Workers Build settings. For local development, put the matching local/test sitekey in the ignored `.env.local` file and set `TURNSTILE_SECRET` plus `UNSUBSCRIBE_SECRET` in the ignored `.dev.vars` file. Then run:

```sh
npm run build
npx wrangler d1 migrations apply simc-mailing-list --local
npx wrangler dev
```

Run the remote migration command before deploying any future migration. The current Cloudflare Workers Build command builds and deploys the Worker, but does not apply D1 migrations automatically.

## Deployment

Cloudflare Workers Builds watches the production `main` branch and runs `npm run build` followed by `npx wrangler deploy` on every push.
