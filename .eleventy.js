const { EleventyRenderPlugin } = require('@11ty/eleventy');
const MarkdownIt = require('markdown-it');
const { latexFilter, blurbify } = require('./src/utils/filters.js');

require('dotenv').config();

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(EleventyRenderPlugin);

  // There's gotta be a way to automate this later
  eleventyConfig.addPassthroughCopy('./src/assets/js');
  eleventyConfig.addPassthroughCopy('./src/assets/images');
  eleventyConfig.addPassthroughCopy('./src/assets/quadtree-art');

  eleventyConfig.addPassthroughCopy('./src/admin'); // Decap CMS

  // Date formatting for articles (e.g. "July 4, 2023")
  eleventyConfig.addFilter('dateFormat', (date) => {
    return (
      date.toLocaleDateString &&
      date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    );
  });

  // We want to wrap all markdown content with a div for styling purposes
  // We're doing this: https://github.com/11ty/eleventy/issues/464
  // Unstable, but works ¯\_(ツ)_/¯
  const md = MarkdownIt({
    html: true,
    typographer: true,
    linkify: true,
  });
  eleventyConfig.setLibrary('md', {
    render: (source) => {
      return `<div class="markdown-content">${md.render(source)}</div>`;
    },
  });

  // Write Markdown in Nunjucks :)
  // https://www.aleksandrhovhannisyan.com/blog/custom-markdown-components-in-11ty/
  eleventyConfig.addPairedShortcode('md', (children) => {
    const content = md.render(children);
    return `<div>${content}</div>`;
  });

  // Come up with blurbs
  eleventyConfig.addFilter('blurbify', blurbify);

  // JSON filter for stringifying objects
  eleventyConfig.addFilter('json', (content) => {
    return JSON.stringify(content, null, 2);
  });

  // Katex parsing for math
  // https://benborgers.com/posts/eleventy-katex
  eleventyConfig.addFilter('latex', latexFilter);

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
