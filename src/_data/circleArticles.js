// This should probably be scoped down to just src/circle when we get the chance
const EleventyFetch = require('@11ty/eleventy-fetch');
const { GITHUB_API_KEY } = process.env;

const fetchContents = async () => {
  const url =
    'https://api.github.com/repos/seattleinfinity/simc-slg-2023-2024-overleaf/contents/Magazines/sept23';
  const data = await EleventyFetch(url, {
    duration: '1d',
    type: 'json',
    fetchOptions: {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${GITHUB_API_KEY}`,
      },
    },
  });

  let parsedData = await Promise.all(
    data
      .filter((object) => object.type === 'file')
      .map(async (object) => {
        content = await EleventyFetch(object.download_url, {
          duration: '1d',
          type: 'text',
          fetchOptions: {
            headers: {
              Accept: 'application/vnd.github+json',
              Authorization: `Bearer ${GITHUB_API_KEY}`,
            },
          },
        });

        // return JSON.stringify(content, null, 2);
        return content;
      })
  );

  return {
    rawData: JSON.stringify(data, null, 2),
    parsedData: parsedData,
  };
};

module.exports = fetchContents();
