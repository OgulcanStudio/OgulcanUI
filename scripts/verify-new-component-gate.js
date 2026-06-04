/**
 * New-component gate — registry sync + strict UI testing rules for every folder under src/components/.
 *
 * Usage:
 *   bun run verify:component-gate
 *   bun scripts/verify-new-component-gate.js
 *   bun scripts/verify-new-component-gate.js MyWidget
 */

const path = require('path');
const suite = require('./lib/component-test-suite');
const uiRules = require('./lib/ui-testing-rules');
const { parseUserArgv, printHelp, resolveTargets } = require('./lib/cli');

const green = '\x1b[32m';
const red = '\x1b[31m';
const cyan = '\x1b[36m';
const reset = '\x1b[0m';
const bold = '\x1b[1m';

async function runGate(targetNames) {
  const sync = uiRules.syncManifestWithFolders();
  let failed = false;

  console.log(`${bold}${cyan}OgulcanUI — new component gate${reset}`);
  console.log(`Strict UI rules: ${uiRules.UI_TESTING_RULE_COUNT}`);
  console.log(`Components on disk: ${sync.folders.length}`);
  console.log(`Manifest entries: ${sync.manifest.length}\n`);

  if (sync.orphanFolders.length > 0) {
    failed = true;
    console.log(`${red}✘ Folders missing from src/components.json:${reset}`);
    sync.orphanFolders.forEach((name) => console.log(`  - ${name}`));
    console.log('');
  }

  if (sync.orphanManifest.length > 0) {
    failed = true;
    console.log(`${red}✘ Manifest entries without a component folder:${reset}`);
    sync.orphanManifest.forEach((name) => console.log(`  - ${name}`));
    console.log('');
  }

  if (sync.orphanFolders.length > 0) {
    console.log(
      `${red}Register or remove ${sync.orphanFolders.length} unlisted folder(s) before merge.${reset}\n`
    );
  }

  const names = targetNames.length ? targetNames : sync.manifest;

  for (const name of names) {
    const result = await suite.auditComponent(name, {
      runtime: false,
      template: true,
      security: true,
      performance: false,
      oneLine: true
    });

    const status = result.passed ? `${green}PASS${reset}` : `${red}FAIL${reset}`;
    console.log(`[${status}] ${name}`);
    if (!result.passed) {
      failed = true;
      result.issues.forEach((issue) => {
        console.log(`  ${red}✘ ${issue.name}: ${issue.desc}${reset}`);
      });
    }
  }

  if (failed) {
    console.log(`\n${red}${bold}Component gate FAILED.${reset}`);
    process.exit(1);
  }

  console.log(`\n${green}${bold}Component gate PASSED (${names.length} component(s)).${reset}`);
}

async function main() {
  const parsed = parseUserArgv(process.argv.slice(2));
  if (parsed.help) {
    printHelp('OgulcanUI — verify-new-component-gate', [
      'Usage:',
      '  bun run verify:component-gate',
      '  bun scripts/verify-new-component-gate.js <ComponentName>',
      '',
      'Checks:',
      '  - src/components/* folders match src/components.json',
      `  - ${uiRules.UI_TESTING_RULE_COUNT} strict UI testing rules (see docs/UI_TESTING_STANDARDS.md)`,
      '  - 3-file template, security, and one-line attribute contract',
      '',
      '  -h, --help'
    ]);
    process.exit(0);
  }

  const sync = uiRules.syncManifestWithFolders();
  let names = [];
  if (parsed.names.length) {
    try {
      names = resolveTargets(parsed.names, sync.folders);
    } catch (err) {
      console.error(`${red}${err.message}${reset}`);
      process.exit(1);
    }
  }

  await runGate(names);
}

main().catch((err) => {
  console.error(`${red}${err.message || err}${reset}`);
  process.exit(1);
});