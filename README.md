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

## Redirects

Legacy URL redirects are authored in `redirects.json`. `npm run build` generates the Cloudflare `dist/client/_redirects` artifact and checks content front-matter aliases against the same manifest. Do not edit the generated artifact directly.

## Deployment

Cloudflare Workers Builds watches the production `main` branch and runs `npm run build` followed by `npx wrangler deploy` on every push.
