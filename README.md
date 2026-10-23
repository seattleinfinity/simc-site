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

The build is written to `dist/client`.

## Content structure

Every public event, press release, and past test is a self-contained folder:

- `src/events/<slug>/index.md` → `/events/<slug>`
- `src/press-releases/<slug>/index.md` → `/press-releases/<slug>`
- `src/past-tests/<slug>/index.md` → `/past-tests/<slug>`

Images and other local assets belong beside the Markdown that uses them. Past-test problem PDFs are embedded on their detail pages when a direct PDF URL is available; solutions remain exact external links. The archive does not invent replacement materials when the source has no usable file.

The attached classroom image used on the home and About pages is `public/assets/images/about-classroom.png`. Sponsor marks and student portraits are also local files under `public/assets/images/`.

## Redirects

Legacy URL redirects are authored in `redirects.json`. `npm run build` generates the Cloudflare `dist/client/_redirects` artifact and checks content front-matter aliases against the same manifest. Do not edit the generated artifact directly.

## Deployment

Cloudflare Workers Builds watches the production `main` branch and runs `npm run build` followed by `npx wrangler deploy` on every push.

## Mailing list: one-time Cloudflare setup

Both signup forms save addresses in a private D1 table. They do not send email or verify mailbox ownership. No email service, public subscriber API, or admin UI is required. Existing Google Form responses are not imported.

1. In Cloudflare **Turnstile**, create an **Invisible** widget for `seattleinfinity.org` (include any other hostname where you serve the site). The site's `/privacy` notice references Cloudflare's [Turnstile Privacy Addendum](https://www.cloudflare.com/turnstile-privacy-policy/). Keep the widget's site key and secret key.
2. From this repository, create the database and table. The first command writes the binding into `wrangler.jsonc` automatically; keep that config change:

   ```sh
   npx wrangler@4.94.0 d1 create simc-mailing-list --binding MAILING_LIST_DB --update-config
   npx wrangler@4.94.0 d1 execute simc-mailing-list --remote --file worker/migrations/0001_mailing_list.sql
   ```

3. Paste each key at its prompt (neither goes into Git):

   ```sh
   npx wrangler@4.94.0 secret put TURNSTILE_SITE_KEY
   npx wrangler@4.94.0 secret put TURNSTILE_SECRET_KEY
   ```

4. Deploy using the existing `main` build, or run:

   ```sh
   npm run build
   npx wrangler@4.94.0 deploy
   ```

Wrangler prompts for Cloudflare login if needed. No build-time environment variables are needed. Both Turnstile secret names are required in `wrangler.jsonc`, so deploys fail if either is missing. The public site key is served by `/api/mailing-list/config`; missing runtime bindings disable signup instead of showing a false success.

After deployment, submit your own address and confirm its row in **D1 → simc-mailing-list → Console**. Addresses and signup timestamps are visible only to authorized Cloudflare account members. Handle removal requests sent through the form's “email us” link there, and use your mailing provider's confirmation/unsubscribe flow before sending campaigns. This feature only collects addresses; Turnstile does not prove ownership of an email address.

Security: server-verified Turnstile tokens with hostname/action checks, same-origin JSON requests, a 4 KB body limit, email validation, parameterized SQL, case-insensitive deduplication, and identical new/existing responses. The configured rate limit is 10 attempts per minute per IP per Cloudflare location; it is approximate, not a global quota. No addresses, IPs, or tokens are logged by application code. Basic browser security headers also cover static assets; the CSP restricts framing, forms, base URLs, and objects, but is not a complete script allowlist.

Run `npm run test:mailing-list` with Node 22.13+ or 24, then `npm run build`. The regression check uses in-memory SQLite and mocked Cloudflare bindings/Siteverify, never the live list. `npm run dev` and `npm run preview` only serve the frontend; use `npx wrangler@4.94.0 dev` for the Worker after configuring a local D1 database and local Turnstile keys. Live signup still needs the deployment check above.

Cloudflare references: [D1 setup](https://developers.cloudflare.com/d1/get-started/), [Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
