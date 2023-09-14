/*
Filters for processing content.
*/

const katex = require('katex');

// Blurbify a piece of text (extract first 50 words)
const blurbify = (content) => {
  const words = content.trim().split(' ');
  return words.length > 50 ? words.slice(0, 50).join(' ') + '...' : content;
};

// Replace tex source with HTML.
const latexFilter = (content) => {
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
    [/\\begin{align\*?}/g, '\\[\\begin{aligned}'],
    [/\\end{align\*?}/g, '\\end{aligned}\\]'],
    [
      /\\href{(.+?)}{(.+?)}/g,
      (_, url, text) => `<a href="${url}" target="_blank">${text}</a>`,
    ],

    // Typographic things
    [/--/g, '&mdash;'],
    [/\\emph{(.+?)}/g, (_, p1) => `<i>${p1}</i>`],
    [/\\\]\./g, '.\\]'], // Put periods *inside* of display equations

    // Chatgpt-generated
    // What this does is wrap all blocks of text surrounded by 2+ newlines in
    //   <p> tags
    [
      /(?:^|\r\n|\r|\n){2,}([\s\S]+?)(?=(?:\r\n|\r|\n){2,}|$)/g,
      (_, p1) => `<p>${p1}</p>\n\n`,
    ],
  ]);

  content = content
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, equation) => {
      return katex.renderToString(equation, {
        throwOnError: false,
        displayMode: true,
      });
    })
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, equation) => {
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
    // Trash
    [/\\\\/g, ''],
    [/\\maketitle/g, '\n\n'],

    // Typography
    [/``/g, '&ldquo;'],
    [/''/g, '&rdquo;'],
    [/(?:&rdquo;|")([,.])/g, (_, p1) => `${p1}&rdquo;`],
    // [/\\\w+?{(.+?)?}/g, (_, p1) => p1],
  ]);

  return content;
};

module.exports = { latexFilter, blurbify };