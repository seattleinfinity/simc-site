module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy('assets');

  return {
    dir: {
      input: 'src',
      data: '_data',
      includes: '_includes',
      layouts: '_layouts',
    },
  };
};
