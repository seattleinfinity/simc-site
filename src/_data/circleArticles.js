// This should probably be scoped down to just src/circle when we get the chance
const EleventyFetch = require('@11ty/eleventy-fetch');

const fetchContents = async () => {
  let folder = 'sept23';

  const url = `https://api.github.com/repos/seattleinfinity/simc-circle-articles/contents/${folder}`;
  const data = await EleventyFetch(url, {
    duration: '1d',
    type: 'json',
    fetchOptions: { headers: { Accept: 'application/vnd.github+json' } },
  });

  let articleContents = await Promise.all(
    data
      .filter((object) => object.type === 'file')
      .map(async (object) => {
        let content = await EleventyFetch(object.download_url, {
          duration: '1d',
          type: 'text',
          fetchOptions: { headers: { Accept: 'application/vnd.github+json' } },
        });

        // Extract body, author, etc. from tex source
        let body = /\\begin{document}([\s\S]+)\\end{document}/g
          .exec(content)[1]
          .replace(/\\maketitle\s*|\\section{.+?}\s*/, '');
        const author = /\\author{([\s\S]+?)}/g.exec(content)[1];
        const title = /\\title{([\s\S]+?)}/g.exec(content)[1];

        // Replace all images
        body = body.replace(
          /\\begin{center}[\s\S]*?\\includegraphics(?:.*?width=(.+?)[,\]].*?)?{(.+?)}[\s\S]*?\\end{center}/g,
          (_, width, url) => {
            if (width) widthProp = ` style="width=${width}"`;
            return `<img
                      src="https://raw.githubusercontent.com/seattleinfinity/simc-circle-articles/main/${folder}/${url}"\
                      ${widthProp}
                    />`;
          }
        );

        return { body, author, title };
      })
  );

  // Extract body, title, etc.

  return articleContents;
};

module.exports = fetchContents();
