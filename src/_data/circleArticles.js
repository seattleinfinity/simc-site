// This should probably be scoped down to just src/circle when we get the chance
const EleventyFetch = require('@11ty/eleventy-fetch');
const { blurbify } = require('../utils/filters.js');

const eleventyFetchOptions = (type) => {
  return {
    duration: '0s',
    type: type,
    fetchOptions: { headers: { Accept: 'application/vnd.github+json' } },
  };
};

const fetchContents = async () => {
  const contentsURL =
    'https://api.github.com/repos/seattleinfinity/simc-circle-articles/contents/';

  // Fetch all folders in the Circle github repo
  const allIssues = (
    await EleventyFetch(contentsURL, eleventyFetchOptions('json'))
  ).map((dir) => dir.name);

  const articlesByIssue = await Promise.all(
    allIssues.map(async (issueName) => {
      const url = `${contentsURL}/${issueName}`;
      const data = await EleventyFetch(url, eleventyFetchOptions('json'));

      const articles = await Promise.all(
        data
          .filter((object) => object.type === 'file')
          .map(async (object) => {
            let content = await EleventyFetch(
              object.download_url,
              eleventyFetchOptions('text')
            );

            // Extract body, author, etc. from tex source
            let body = /\\begin{document}([\s\S]+)\\end{document}/g
              .exec(content)[1]
              .replace(/\\maketitle\s*|\\section{.+?}\s*/, '');
            const author = /\\author{([\s\S]+?)}/g.exec(content)[1];
            const title = /\\title{([\s\S]+?)}/g.exec(content)[1];

            let blurb = /\\blurb{(.+?)}/g.exec(content);
            blurb = blurb ? blurb[1] : blurbify(body);

            // Replace all images
            body = body.replace(
              /(?:\\begin{center})?\s*\\includegraphics(?:\[.*?(?:width=(.+))?.*?\])?{(.+?)}\s*(?:\\end{center})?/g,
              (_, width, url) => {
                // Extract width from \includegraphics syntax
                let widthProp = width ? `style="width: ${width}"` : '';
                let classProp = !width ? 'class="max-w-xs max-h-72"' : '';

                // Set up image source
                let ghImgBase =
                  'https://raw.githubusercontent.com/seattleinfinity/simc-circle-articles/main';
                return `\n\n<img src="${ghImgBase}/${issueName}/${url}" ${widthProp} ${classProp} />\n\n`;
              }
            );

            return { body, author, title, issue: issueName, blurb };
          })
      );

      return articles;
    })
  );

  // Combine them in one big array
  articlesArray = Array.from(Object.values(articlesByIssue)).flat(1);

  return { articlesByIssue, articlesArray };
};

module.exports = fetchContents();
