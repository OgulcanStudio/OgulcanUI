/**
 * Universal component test — 3-file template + banking security + perf + one-line attributes.
 *
 * Usage:
 *   bun run test
 *   bun run test -- StatCard
 *   node scripts/test-all-components.js --runtime
 */

const fs = require('fs');
const path = require('path');
const suite = require('./lib/component-test-suite');
const contract = require('./component-contract');
const { parseUserArgv, printHelp, resolveTargets, loadComponentCatalog } = require('./lib/cli');

const green = '\x1b[32m';
const red = '\x1b[31m';
const yellow = '\x1b[33m';
const cyan = '\x1b[36m';
const reset = '\x1b[0m';
const bold = '\x1b[1m';

/**
 * @param {string} name
 * @param {{ runtime?: boolean }} [options]
 */
async function testComponent(name, options = {}) {
  return suite.auditComponent(name, {
    runtime: options.runtime,
    template: true,
    security: true,
    performance: true,
    oneLine: true
  });
}

function listComponentNames(target) {
  const componentsDir = path.join(__dirname, '../src/components');
  const catalog = fs.readdirSync(componentsDir)
    .filter((entry) => fs.statSync(path.join(componentsDir, entry)).isDirectory())
    .sort();
  if (target) return resolveTargets([path.basename(target)], catalog);
  return catalog;
}

function printResult(result, verbose) {
  const status = result.passed ? `${green}PASS${reset}` : `${red}FAIL${reset}`;
  console.log(`[${status}] ${bold}[${result.tier}] ${result.name}${reset} <${result.tag}>`);
  if (!verbose && result.passed) return;
  result.warnings.forEach((w) => console.log(`  ${yellow}⚠ ${w.name}: ${w.desc}${reset}`));
  result.issues.forEach((i) => console.log(`  ${red}✘ ${i.name}: ${i.desc}${reset}`));
  if (result.metrics && verbose) {
    console.log(`  ${cyan}Metrics:${reset} ${JSON.stringify(result.metrics)}`);
  }
}

async function runCli(argv = process.argv.slice(2)) {
  const parsed = parseUserArgv(argv);
  if (parsed.help) {
    printHelp('OgulcanUI — test-all-components', [
      'Usage:',
      '  bun run test',
      '  bun run test -- <ComponentName>',
      '  node scripts/test-all-components.js --runtime <ComponentName>',
      '',
      'Gates: template contract, banking security, burst perf, one-line attributes',
      'Flags: --runtime, -v/--verbose, -h/--help'
    ]);
    process.exit(0);
  }

  const runtime = argv.includes('--runtime');
  const verbose = argv.includes('--verbose') || argv.includes('-v');

  let targets;
  try {
    targets = listComponentNames(parsed.names[0]);
  } catch (err) {
    console.error(`${red}${err.message}${reset}`);
    process.exit(1);
  }

  const mode = runtime
    ? 'template + banking security + realtime perf + one-line (runtime)'
    : 'template + banking security + one-line (static)';

  console.log(`${bold}${cyan}OgulcanUI Universal Component Test${reset}`);
  console.log(`Mode: ${mode} | Components: ${targets.length}\n`);

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const name of targets) {
    const result = await testComponent(name, { runtime });
    printResult(result, verbose);
    if (result.passed) passed++;
    else {
      failed++;
      failures.push(name);
    }
  }

  console.log(`\n${bold}--- Summary ---${reset}`);
  console.log(`${green}✔ Passed: ${passed}${reset}`);
  if (failed > 0) {
    console.log(`${red}✘ Failed: ${failed}${reset} [${failures.join(', ')}]`);
    process.exit(1);
  }
  console.log(
    `${green}✔ All ${passed} components pass template, banking security, performance, and one-line attribute contracts.${reset}`
  );
  process.exit(0);
}

if (require.main === module) {
  runCli().catch((err) => {
    console.error(`${red}Fatal: ${err.message}${reset}`);
    process.exit(1);
  });
}

module.exports = { testComponent, testAllComponents: runCli, runCli, toKebabTag: contract.toKebabTag };
