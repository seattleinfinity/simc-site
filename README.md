# Seattle Infinity Math Circle site

Revamped website for the Seattle Infinity Math Circle. The current site is at https://www.seattleinfinity.org.

This new site can be viewed at https://seattleinfinity.netlify.app.

[Insert pretty screenshot here when ready]

## About this site

This new site is built using the static site generator [Eleventy](https://www.11ty.dev/), the templating language [Nunjucks](https://mozilla.github.io/nunjucks/), and the CSS framework [Tailwind](https://tailwindcss.com/).

## Local development

1. Install [Node](https://nodejs.org/en/) (comes with npm)
2. Install all dependencies with `npm install` (or your package manager of choice)
3. To run the development server, use `npm run dev` and follow the instructions in termal
   - Site should be live at `http://localhost:8080/`
4. To build the site, use `npm run build`

## Project structures

There are a lot of files and folders! Brief overview:

### Folders

1. `./_site` contains the built site (once built) and should be ignored.
2. `./.meta` contains some meta utility scripts. Check out `./meta/meta.md` for more documentation.
3. `./src` contains all the source code:
   - `./_data` contains data that is better left out of source code.
   - `./_includes` contains reusable components for the site.
   - `./_layouts` contains [layouts](https://www.11ty.dev/docs/layouts/), sort of the inverse of components. There are already layouts in `./_includes/layouts`, but the ones in here are processed by Eleventy and are easier to use.
   - `./assets` includes static assets, including images, CSS source code and JS.
   - Miscellaneous files in here are probably pages.

### Files

1. `./eleventy.js` contains configuration for Eleventy. Learn more [here](https://www.11ty.dev/docs/).
2. `./tailwind.config.json` contains configuration for Tailwind.
