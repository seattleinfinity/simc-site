// This should probably be scoped down to just src/circle when we get the chance
const EleventyFetch = require('@11ty/eleventy-fetch');
const { blurbify, latexFilter } = require('../utils/filters.js');
const { cyrb53 } = require('../utils/utils.js');

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
  let allIssues = (
    await EleventyFetch(contentsURL, eleventyFetchOptions('json'))
  )
    .filter((item) => item.type === 'dir')
    .map((dir) => dir.name);
  console.log(allIssues);

  let articlesByIssue = await Promise.all(
    allIssues.map(async (issueName) => {
      // Get the full name of this issue (e.g. "nov22" -> "November 2022")
      const [_, monthAbbrev, year] = /^([a-zA-Z]+)(\d+)$/g.exec(issueName);
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      const monthIndex = monthNames.findIndex((x) =>
        x.toLowerCase().startsWith(monthAbbrev)
      );
      const issueFullName = `${monthNames[monthIndex]} 20${year}`;
      const issueDate = `20${year}-${(monthIndex + 1)
        .toString()
        .padStart(2, '0')}`;

      // Get contents
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

            let epigraph = /\\epigraph{(.+?)}{(.+)}/g.exec(content);
            epigraph = epigraph
              ? epigraph.slice(1, 3).map((x) => latexFilter(x))
              : '';

            // Render the Latex
            body = latexFilter(body);

            // Replace all images
            body = body.replace(
              /(?:\\begin{center})?\s*\\includegraphics(?:\[.*?(?:width=(.+))?.*?\])?{(.+?)}\s*(?:\\end{center})?/g,
              (_, width, url) => {
                // Extract width from \includegraphics syntax
                let widthProp = width
                  ? `class="my-4" style="width: ${width}"`
                  : '';
                let classProp = !width ? 'class="my-4 max-w-xs max-h-72"' : '';

                // Set up image source
                let ghImgBase =
                  'https://raw.githubusercontent.com/seattleinfinity/simc-circle-articles/main';
                return `\n\n<img src="${ghImgBase}/${issueName}/${url}" ${widthProp} ${classProp} />\n\n`;
              }
            );

            // Get a cover image
            let titleHash = cyrb53(`${title}-${author}`) % 1003;
            let coverImage = /<img .*? src="(.+?)"/g.exec(body);
            coverImage = coverImage
              ? coverImage[1]
              : `https://loremflickr.com/1920/1080/abstract?lock=${titleHash}`;

            return {
              body,
              author,
              title,
              coverImage,
              issue: issueName,
              issueFullName,
              blurb,
              epigraph,
            };
          })
      );

      return { issue: issueName, issueDate, issueFullName, articles };
    })
  );

  // Combine them in one big array
  // This is necessary for Eleventy's pagination
  articlesArray = Array.from(Object.values(articlesByIssue))
    .map((issue) => issue.articles)
    .flat(1);

  // Sort issues by date (descending)
  articlesByIssue = articlesByIssue.sort((a, b) => {
    return a.issueDate < b.issueDate ? 1 : -1;
  });

  return { articlesByIssue, articlesArray };
};

module.exports = fetchContents();
