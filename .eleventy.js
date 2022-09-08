const { EleventyRenderPlugin } = require('@11ty/eleventy');
const MarkdownIt = require('markdown-it');

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(EleventyRenderPlugin);

  // There's gotta be a way to automate this later
  eleventyConfig.addPassthroughCopy('./src/assets/js');
  eleventyConfig.addPassthroughCopy('./src/assets/images');
  eleventyConfig.addPassthroughCopy('./src/assets/quadtree-art');

  // We want to wrap all markdown content with a div for styling purposes
  // We're doing this: https://github.com/11ty/eleventy/issues/464
  // Unstable, but works ¯\_(ツ)_/¯
  const md = MarkdownIt({
    html: true
  })
  eleventyConfig.setLibrary('md', {
    render: (source) => {
      return `<div class="markdown-content">${md.render(source)}</div>`;
    }
  })

  return {
    // Special folders in the config
    dir: {
      input: 'src',
      data: '_data',
      includes: '_includes',
      layouts: '_layouts',
    },
  };
};
