# Seattle Infinity Math Circle site

Revamped website for the Seattle Infinity Math Circle. The current site is at [www.seattleinfinity.org](https://www.seattleinfinity.org). This new site can be viewed at [seattleinfinity.netlify.app](https://seattleinfinity.netlify.app).

[![Netlify Status](https://api.netlify.com/api/v1/badges/016843a2-c554-4a5b-92d6-4a41605870fe/deploy-status)](https://app.netlify.com/sites/seattleinfinity/deploys)

Since this documentation is pretty incomplete, **please bug William with questions** and eventually he will either explain and write documentation.

## tl;dr: How do I edit content and deploy it?

If you ever run into trouble or have questions, feel free to ask William!

All site content is in `/src`. Things in `/src/_data`, `/src/_includes`, `/src/_layouts`, and `/src/assets` are special and don't get rendered, but everything else corresponds to a real page on the site.

For example, `/src/magazine/index.njk` maps to `/magazine` on the site, while `/src/press-releases/article-1234.md` maps to `/press-releases/article-1234.md` on the site.

### Option 0: Decap CMS, still in beta

Just go to https://seattleinfinity.netlify.app/admin, log in, and begin editing content. There's a limited selection of files that can be uploaded at the moment.

### Option 1: Web editor, for quick changes

You don't even need to download anything to make edits! Everything can be done in the browser.

1. Head over to https://github.com/seattleinfinity/simc-site.
2. Navigate to the file corresponding to the page you want to edit (e.g. [here](https://github.com/seattleinfinity/simc-site/blob/main/src/index.njk) if you want to edit the homepage).
3. Click the edit button (or press `e`) and make your changes.
   1. **Note:** If you're editing [Markdown](https://www.markdownguide.org/), you can preview your changes as you make them, but it might look a bit weird because it's actually Nunjucks. (See "Detailed Documentation" for more information.)
4. Once you're done making changes, scroll to the bottom of the page and make your commit. Detailed commit message optional but encouraged.
5. That's it! If you were on the `main` branch when you went to the repository, these changes will be automatically deployed.

### Option 2: Local editing, for larger changes

1. Make sure you have [git](https://git-scm.com/) installed.
2. Clone the repository:

```
git clone https://github.com/seattleinfinity/simc-site.git
```

3. Navigate to the directory containing the file you want to edit, make your changes, and commit them.
4. Push changes with `git push origin main`.

### About branches

Changes made on the `main` branch are automatically deployed to Netlify. If you want to make lots of commits but would rather update the site in one big batch, make commits on a different branch and merge when you're ready to deploy. Read about branches [here](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-branches).

## Detailed documentation

### About this site

This new site is built using the static site generator [Eleventy](https://www.11ty.dev), the templating language [Nunjucks](https://mozilla.github.io/nunjucks), and the CSS framework [Tailwind](https://tailwindcss.com).

### Decap CMS

William set up [Decap CMS](https://decapcms.org) for the site in June 2023. It's all static and open source! The dynamic functionality comes from Netlify Identity and Git Gateway (two things used by Decap).

There's some custom styles and stuff in here; they all live in `src/admin`.

Developing locally with Decap requires:

1. Run `npx netlify-cms-proxy-server`
2. Start the Eleventy development server with `npm run dev`
3. Go to `localhost:8080/admin` (eleventy port)

### Local development

1. Install [Node](https://nodejs.org/en/)
2. Install all dependencies with `npm install` (or your package manager of choice)
3. To run the development server, use `npm run dev` and follow the instructions in terminal
   - Site should be live at `http://localhost:8080/`
4. To build the site, use `npm run build`

### Writing content

Content is written in Nunjucks or Markdown. Markdown is rendered with [markdown-it](https://github.com/markdown-it/markdown-it), and configuration options are in `/.eleventy.js`.

### Project structure

There are a lot of files and folders! I encourage you to dig around and explore, but here's a brief overview:

#### Folders

1. `/_site` contains the built site (once built) and should be ignored.
2. `/.meta` contains some meta utility scripts. Check out `./meta/meta.md` for more documentation.
3. `/src` contains all the source code:
   - `/_data` contains data like SLG bios, navbar links, and problem of the month.
   - `/_includes` contains reusable components for the site.
   - `/_layouts` contains [layouts](https://www.11ty.dev/docs/layouts/), sort of the inverse of components. There are already layouts in `./_includes/layouts`, but the ones in `/_layouts` are processed by Eleventy and are simpler to use.
   - `/assets` includes static assets, including images, CSS source code and JS.
   - Miscellaneous files in here are probably pages.

#### Files

1. `/eleventy.js` contains configuration for Eleventy. Learn more [here](https://www.11ty.dev/docs/).
2. `/tailwind.config.json` contains configuration for Tailwind.
