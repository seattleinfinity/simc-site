// This should probably be scoped down to just src/circle when we get the chance
const EleventyFetch = require('@11ty/eleventy-fetch');
const { GITHUB_API_KEY } = process.env;

const fetchContents = async () => {
  let folder = 'sept23';

  const url = `https://api.github.com/repos/seattleinfinity/simc-circle-articles/contents/${folder}`;
  const data = await EleventyFetch(url, {
    duration: '0s',
    type: 'json',
    fetchOptions: { headers: { Accept: 'application/vnd.github+json' } },
  });

  let articleContents = await Promise.all(
    data
      .filter((object) => object.type === 'file')
      .map(async (object) => {
        let content = await EleventyFetch(object.download_url, {
          duration: '0s',
          type: 'text',
          fetchOptions: { headers: { Accept: 'application/vnd.github+json' } },
        });

        // Extract body, author, etc. from tex source
        let body = /\\begin{document}([\s\S]+)\\end{document}/g.exec(
          content
        )[1];
        console.log(body);
        const author = /\\author{([\s\S]+)}/g.exec(content)[1];
        const title = /\\title{([\s\S]+)}/g.exec(content)[1];

        // Replace all images

        body = body.replace(
          /\\begin{center}[\s\S]*?\\includegraphics.*?{(.+?)}[\s\S]*?\\end{center}/g,
          (_, url) =>
            `<img
               class="!max-w-24 !max-h-60"
               src="https://raw.githubusercontent.com/seattleinfinity/simc-circle-articles/main/${folder}/${url}"
             />\n\n`
        );

        return { body, author, title };
      })
  );

  // Extract body, title, etc.

  return { articleContents };
};

module.exports = fetchContents();
