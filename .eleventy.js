const { EleventyRenderPlugin } = require('@11ty/eleventy');
const MarkdownIt = require('markdown-it');
const katex = require('katex');

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

  // Katex parsing for math
  // https://benborgers.com/posts/eleventy-katex
  eleventyConfig.addFilter('latex', (content) => {
    const runReplacements = (content, replacements) => {
      for (let [og, repl] of replacements) {
        content = content.replace(og, repl);
      }
      return content;
    };

    // Text replacements to do before katex rendering
    content = runReplacements(content, [
      // Latex syntax
      [/\\title{(.+)}/g, (_, p1) => `<h2>${p1}</h2>`],
      [/\\begin{itemize}/g, '<ol>'],
      [/\\end{itemize}/g, '</ol>\n\n'],
      [/\\begin{enumerate}/g, '<ul>\n\n'],
      [/\\end{enumerate}/g, '</ul>'],
      [/\\item (.+?)\n/g, (_, p1) => `<li class="pl-2">${p1}</li>`],
      [/\\documentclass{.+?}/g, ''],

      // Typographic things
      [/--/g, '&mdash;'],
      [/\\emph{(.+?)}/g, (_, p1) => `<i>${p1}</i>`],

      // Newlines
      [/\\\\/g, ''],
      // Chatgpt-generated
      // What this does is wrap all blocks of text surrounded by 2+ newlines in
      //   <p> tags
      [
        /(?:^|\r\n|\r|\n){2,}([\s\S]+?)(?=(?:\r\n|\r|\n){2,}|$)/g,
        (_, p1) => `<p>${p1}</p>\n\n`,
      ],
    ]);

    content = content
      .replace(/\$\$(.+?)\$\$/g, (_, equation) => {
        return katex.renderToString(equation, {
          throwOnError: false,
          displayMode: true,
        });
      })
      .replace(/\\\[(.+?)\\\]/g, (_, equation) => {
        return katex.renderToString(equation, {
          throwOnError: false,
          displayMode: true,
        });
      })
      .replace(/\$(.+?)\$/g, (_, equation) => {
        return katex.renderToString(equation, {
          throwOnError: false,
          displayMode: false,
          inline: true,
        });
      });

    content = runReplacements(content, [
      [/``/g, '&ldquo;'],
      [/''/g, '&rdquo;'],
      [/(?:&rdquo;|")([,.])/g, (_, p1) => `${p1}&rdquo;`],
    ]);

    return content;
  });

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
