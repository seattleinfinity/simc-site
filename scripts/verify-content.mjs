import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const roots = ['events', 'press-releases', 'past-tests'];
const records = new Map();

for (const topLevel of roots) {
  const directory = path.join(root, 'src', topLevel);
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  assert.equal(entries.filter((entry) => entry.isFile()).length, 0, `${topLevel} contains a flat file`);
  for (const entry of entries.filter((entry) => entry.isDirectory())) {
    const folder = path.join(directory, entry.name);
    const indexPath = path.join(folder, 'index.md');
    assert(fs.existsSync(indexPath), `${topLevel}/${entry.name} lacks index.md`);
    const source = fs.readFileSync(indexPath, 'utf8');
    records.set(`${topLevel}/${entry.name}`, source);
    const frontMatter = source.match(/^---\n([\s\S]*?)\n---/m)?.[1] || '';
    const image = frontMatter.match(/^image:\s*['"]?([^'"\n]+)['"]?\s*$/m)?.[1];
    if (image && !/^(?:https?:|\/)/i.test(image)) assert(fs.existsSync(path.resolve(folder, image)), `${topLevel}/${entry.name} image is missing`);
    const imageReference = /!\[[^\]]*\]\(\s*([^\s)]+)|<(?:img|source)\b[^>]+\b(?:src|srcset)=['"]([^'"]+)['"]/gi;
    for (const match of source.matchAll(imageReference)) {
      const reference = match[1] || match[2];
      if (!reference || /^(?:https?:|\/\/|data:|#|\/)/i.test(reference)) continue;
      assert(fs.existsSync(path.resolve(folder, reference.split(/[?#]/)[0])), `${topLevel}/${entry.name} image reference is missing`);
    }
  }
}

const pastTestFolders = new Set(fs.readdirSync(path.join(root, 'src/past-tests'), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name));
for (const [recordPath, source] of records) {
  if (!recordPath.startsWith('events/')) continue;
  const related = source.match(/^past_tests:\s*(.+)$/m)?.[1]?.split(/\s*;\s*/).filter(Boolean) || [];
  for (const slug of related) assert(pastTestFolders.has(slug), `${recordPath} references missing past test ${slug}`);
}

const content = [...records.values()].join('\n');
assert(!/!\[[^\]]*\]\(\s*(?:https?:)?\/\//i.test(content), 'active content contains an external Markdown image');
assert(!/<(?:img|source)\b[^>]+\bsrc(?:set)?\s*=\s*["']https?:/i.test(content), 'active content contains an external HTML image');
assert(!/(?:imgur|unsplash)\.com/i.test(content), 'active content contains a retired image-host URL');
assert(!/related\s+press\s+release/i.test(read('src/main.jsx') + '\n' + content), 'past-test content mentions a related press release');

const slg = JSON.parse(read('src/_data/slg.json'));
for (const person of slg) assert(fs.existsSync(path.join(root, 'public', person.photoURL.replace(/^\//, ''))), `${person.name} image is missing`);
for (const asset of ['public/assets/images/about-classroom.png', 'public/assets/images/sponsors/jane-street-logo.png', 'public/assets/images/sponsors/aops-logo.png', 'public/assets/images/sponsors/xcamp-logo.png']) assert(fs.existsSync(path.join(root, asset)), `${asset} is missing`);

const main = read('src/main.jsx');
const card = main.slice(main.indexOf('function TestArchiveCard'), main.indexOf('function ResourcesPage'));
const css = read('src/styles.css');
assert(card.includes('/past-tests/') && !card.includes('<img'), 'past-test cards are not image-free links');
assert(main.includes('past-test-problems') && main.includes('<iframe'), 'past-test problems are not embedded');
assert(main.includes('past-test-solutions') && main.includes('target="_blank"'), 'past-test solutions are not linked');
assert(/\.test-archive-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,/.test(css), 'past-test cards are not three columns');
assert(/\.people-grid\s*\{[^}]*columns:\s*3;/.test(css), 'About cards are not three columns');
assert(/SPONSORS\.map/.test(main) && /sponsors\/(?:jane-street-logo|aops-logo|xcamp-logo)\.png/.test(main), 'sponsors are not wired to local assets');

console.log(`PASS: verified ${records.size} folder records, local image ownership, event/test links, archive/detail behavior, About layout, and sponsors.`);
