/*
Filters for processing content.
*/

const katex = require('katex');

// Blurbify a piece of text (extract first 50 words)
const blurbify = (content) => {
  let nwords = 20;
  const words = content.trim().split(' ');
  return words.length > nwords
    ? words.slice(0, nwords).join(' ') + '...'
    : content;
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
    // Typographic things
    [/-{2,3}/g, '&mdash;'],
    [/–/g, '&ndash;'],
    [/\\emph{([^]+?)}/g, (_, p1) => `<i>${p1}</i>`],
    [/\\textit{([^\$]+?)}/g, (_, p1) => `<i>${p1}</i>`],
    [/\\textbf{([^]+?)}/g, (_, p1) => `<b>${p1}</b>`],
    [/\\\]\./g, '.\\]'], // Put periods *inside* of display equations
    [/(``)|('')|“|”/g, '"'],
    [/`|‘|’/g, "'"],
    [/"([^"]+)?"/g, (_, p1) => `&ldquo;${p1}&rdquo;`], // Double fancy quotes
    [/'([^']+)?'/g, (_, p1) => `&lsquo;${p1}&rsquo;`], // Single fancy quotes
    [/(?<=[a-zA-Z\)])"([,.])(?!\.)/g, (_, p1) => `${p1}"`], // Put periods, commas *inside* quotes

    // Latex syntax
    [/\\title{(.+)}/g, (_, p1) => `<h2>${p1}</h2>`],
    [/\\begin{itemize}/g, '<ol>'],
    [/\\end{itemize}/g, '</ol>\n\n'],
    [/\\begin{enumerate}/g, '<ul>'],
    [/\\end{enumerate}/g, '</ul>\n\n'],
    [/\\item (.+?)\n/g, (_, p1) => `<li class="pl-2">${p1}</li>`],
    [/\\begin{align\*?}/g, '\\[\\begin{aligned}'],
    [/\\end{align\*?}/g, '\\end{aligned}\\]'],
    [/\\begin{table}/g, '\\[\\begin{table}'],
    [/\\end{table}/g, '\\end{table}\\]'],
    [
      /\\href{(.+?)}{(.+?)}/g,
      (_, url, text) => `<a href="${url}" target="_blank">${text}</a>`,
    ],
    [
      /\\section{(.+?)}\n/g,
      (_, p1) => `<h2 class="mt-8 text-2xl">${p1}</h2>\n\n`,
    ],
    [
      /\\subsection{(.+?)}\n/g,
      (_, p1) => `<h3 class="mt-4 text-xl">${p1}</h3>\n\n`,
    ],
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
    .replace(/\\\[([^]+?)\\\]/g, (_, equation) => {
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
    [/>,/g, '>&#8288;,'], // Don't let equations break line

    // Trash
    [/\\\\/g, ''],
    [/%.+(\n|\r)/g, ''],
    [/\\%/g, '%'],
    [/\\maketitle/g, '\n\n'],
    [/\\\w+?{(.+?)?}/g, ''], // No more LaTeX stuf
    [/\\centering/g, ''],
  ]);

  return content;
};

module.exports = { latexFilter, blurbify };
