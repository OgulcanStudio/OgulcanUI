/**
 * Shared CLI helpers for test/verify scripts.
 */
const fs = require('fs');
const path = require('path');

const HELP_FLAG = new Set(['--help', '-h']);

/**
 * @param {string[]} argv
 */
function parseUserArgv(argv = []) {
  const help = argv.some((a) => HELP_FLAG.has(a));
  const flags = argv.filter((a) => a.startsWith('-') && !HELP_FLAG.has(a));
  const names = argv.filter((a) => !a.startsWith('-'));
  return { help, flags, names };
}

/**
 * @param {string[]} names
 * @param {string[]} catalog
 */
function resolveTargets(names, catalog) {
  if (!names.length) return catalog;
  const target = names[0];
  if (!catalog.includes(target)) {
    const hint = catalog
      .filter((n) => n.toLowerCase().includes(target.toLowerCase()))
      .slice(0, 5);
    const suffix = hint.length ? ` Did you mean: ${hint.join(', ')}?` : '';
    throw new Error(`Unknown component "${target}".${suffix}`);
  }
  return [target];
}

/**
 * @param {string} listPath
 */
function loadComponentCatalog(listPath) {
  if (fs.existsSync(listPath)) {
    return JSON.parse(fs.readFileSync(listPath, 'utf8'));
  }
  const dir = path.join(path.dirname(listPath), 'components');
  return fs
    .readdirSync(dir)
    .filter((f) => fs.statSync(path.join(dir, f)).isDirectory())
    .sort();
}

/**
 * @param {string} title
 * @param {string[]} lines
 */
function printHelp(title, lines) {
  const bold = '\x1b[1m';
  const cyan = '\x1b[36m';
  const reset = '\x1b[0m';
  console.log(`${bold}${cyan}${title}${reset}\n`);
  lines.forEach((line) => console.log(line));
}

/**
 * Merge passthrough argv with required flags (deduped).
 * @param {string[]} argv
 * @param {string[]} required
 */
function withFlags(argv, required = []) {
  const set = new Set(argv.filter((a) => a.startsWith('-')));
  required.forEach((f) => set.add(f));
  const flags = [...set];
  const names = argv.filter((a) => !a.startsWith('-'));
  return [...names, ...flags];
}

module.exports = {
  parseUserArgv,
  resolveTargets,
  loadComponentCatalog,
  printHelp,
  withFlags
};