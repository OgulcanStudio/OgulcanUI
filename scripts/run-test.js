/**
 * bun run test — full quality gate (component + enterprise verify).
 *
 *   bun run test
 *   bun run test -- StatCard
 *   bun run test -- --static-only StatCard
 *   bun run test -- --runtime-only StatCard
 */

require('./ensure-bun');
const path = require('path');
const { runScript } = require('./lib/runtime');
const { parseUserArgv, printHelp } = require('./lib/cli');
const { getVerifySteps, runVerifySteps } = require('./run-verify');

const scriptsDir = __dirname;
const passthrough = process.argv.slice(2);
const parsed = parseUserArgv(passthrough);

const bold = '\x1b[1m';
const cyan = '\x1b[36m';
const red = '\x1b[31m';
const reset = '\x1b[0m';

if (parsed.help) {
  printHelp('OgulcanUI — test', [
    'Usage:',
    '  bun run test',
    '  bun run test -- <ComponentName>',
    '',
    'Component gates: static contract, runtime mount',
    'Enterprise gates: build, suite, a11y, browser, visual, load, package',
    '',
    'Flags:',
    '  --static-only   Skip runtime + enterprise gates',
    '  --runtime-only  Skip static + enterprise gates',
    '  -v, --verbose   Show warnings on pass',
    '  -h, --help      This help'
  ]);
  process.exit(0);
}

const staticOnly = passthrough.includes('--static-only');
const runtimeOnly = passthrough.includes('--runtime-only');
const baseArgs = passthrough.filter(
  (a) => a !== '--static-only' && a !== '--runtime-only'
);

const componentSteps = [];
if (!runtimeOnly) {
  componentSteps.push({ label: 'Static contract', script: 'test-all-components.js', args: baseArgs });
}
if (!staticOnly) {
  componentSteps.push({
    label: 'Runtime mount',
    script: 'test-all-components.js',
    args: [...baseArgs.filter((a) => a !== '--runtime'), '--runtime']
  });
}

if (componentSteps.length === 0 && (staticOnly || runtimeOnly)) {
  console.error('Nothing to run. Drop --static-only and --runtime-only together.');
  process.exit(1);
}

const runEnterprise = !staticOnly && !runtimeOnly;
const verifyPlan = runEnterprise ? getVerifySteps(baseArgs) : { steps: [], quick: false, componentName: null };
const allSteps = [...componentSteps, ...verifyPlan.steps];

if (allSteps.length === 0) {
  console.error('Nothing to run.');
  process.exit(1);
}

console.log(`${bold}${cyan}OgulcanUI — test (components + enterprise)${reset}`);
if (verifyPlan.quick && verifyPlan.componentName) {
  console.log(`${cyan}Scoped:${reset} ${verifyPlan.componentName} (enterprise quick path)\n`);
} else {
  console.log('');
}

let stepIndex = 0;

for (const step of componentSteps) {
  stepIndex += 1;
  console.log(`${bold}[${stepIndex}/${allSteps.length}] ${step.label}${reset}\n`);

  const result = runScript(path.join(scriptsDir, step.script), step.args);

  if (result.status !== 0) {
    console.error(`\n${red}✘ Stopped at "${step.label}" (exit ${result.status ?? 1})${reset}`);
    process.exit(result.status || 1);
  }

  console.log('');
}

if (runEnterprise && verifyPlan.steps.length > 0) {
  const code = runVerifySteps(verifyPlan.steps, {
    offset: componentSteps.length,
    total: allSteps.length
  });
  if (code !== 0) process.exit(code);
}

console.log(`${bold}${cyan}✔ All tests passed (components + enterprise).${reset}\n`);
process.exit(0);