# SIMC content structure

The active React/Vite build reads Markdown records from three content roots:

| Source root | Route pattern |
| --- | --- |
| `src/events/<slug>/index.md` | `/events/<slug>` |
| `src/press-releases/<slug>/index.md` | `/press-releases/<slug>` |
| `src/past-tests/<slug>/index.md` | `/past-tests/<slug>` |

Each record folder owns its Markdown and any local images or PDFs used by that record. The home and About pages use the supplied classroom photograph at `public/assets/images/about-classroom.png`. Sponsor and SLG image paths point to local files in `public/assets/images/`.

## Past tests

The `/past-tests` archive is a three-column, image-free card list. Each card links to its own detail route. A detail page embeds each direct problem PDF and lists solutions as links to their exact source destinations. When the source archive contains only a folder or no usable material URL, the page says so instead of fabricating a PDF.

Events declare their related past-test slugs in front matter. Event detail pages render those links back into the `/past-tests/<slug>` archive.
