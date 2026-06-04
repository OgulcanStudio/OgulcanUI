/**
 * Enterprise verification pipeline (invoked from run-test.js).
 */

require('./ensure-bun');
const path = require('path');
const { runScript } = require('./lib/runtime');
const { parseUserArgv, printHelp, withFlags } = require('./lib/cli');

const scriptsDir = __dirname;

const bold = '\x1b[1m';
const cyan = '\x1b[36m';
const red = '\x1b[31m';
const reset = '\x1b[0m';

/**
 * @param {string[]} passthrough
 * @returns {{ steps: { label: string; script: string; args: string[] }[]; quick: boolean; componentName: string | null }}
 */
function getVerifySteps(passthrough = []) {
  const parsed = parseUserArgv(passthrough);
  const quick = parsed.names.length > 0;

  const fullSteps = [
    { label: 'Build dist', script: 'build.js', args: [] },
    { label: 'Enterprise suite', script: 'verify-enterprise-suite.js', args: ['--runtime', '--json'] },
    { label: 'Accessibility audit', script: 'verify-accessibility.js', args: [] },
    { label: 'Browser metrics', script: 'verify-browser-metrics.js', args: [] },
    { label: 'Visual regression', script: 'verify-visual-regression.js', args: [] },
    { label: 'Load bench', script: 'verify-load-bench.js', args: [] },
    { label: 'Package surface', script: 'verify-package.js', args: [] }
  ];

  const steps = quick
    ? [
        { label: 'Build dist', script: 'build.js', args: [] },
        {
          label: 'Enterprise suite',
          script: 'verify-enterprise-suite.js',
          args: withFlags(passthrough, ['--runtime', '--json'])
        }
      ]
    : fullSteps;

  return {
    steps,
    quick,
    componentName: quick ? parsed.names[0] : null
  };
}

/**
 * @param {{ label: string; script: string; args: string[] }[]} steps
 * @param {{ offset?: number; total?: number }} [options]
 * @returns {number} exit code
 */
function runVerifySteps(steps, options = {}) {
  const offset = options.offset ?? 0;
  const total = options.total ?? steps.length;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const index = offset + i + 1;
    console.log(`${bold}[${index}/${total}] ${step.label}${reset}\n`);

    const result = runScript(path.join(scriptsDir, step.script), step.args);

    if (result.status !== 0) {
      console.error(`\n${red}✘ Stopped at "${step.label}" (exit ${result.status ?? 1})${reset}`);
      return result.status || 1;
    }

    console.log('');
  }

  return 0;
}

function runCli(argv = process.argv.slice(2)) {
  const parsed = parseUserArgv(argv);
  if (parsed.help) {
    printHelp('OgulcanUI - verify', [
      'Usage:',
      '  npm run verify',
      '  npm run verify -- <ComponentName>',
      '',
      'Full gates: build, enterprise, a11y, browser, visual, load, package',
      'Scoped mode runs build + enterprise suite for the named component.',
      '',
      'Flags:',
      '  -h, --help'
    ]);
    process.exit(0);
  }

  const plan = getVerifySteps(argv);
  console.log(`${bold}${cyan}OgulcanUI - verify${reset}\n`);
  if (plan.quick && plan.componentName) {
    console.log(`${cyan}Scoped:${reset} ${plan.componentName}\n`);
  }

  const code = runVerifySteps(plan.steps);
  if (code !== 0) process.exit(code);

  console.log(`${bold}${cyan}OK verify passed.${reset}\n`);
  process.exit(0);
}

module.exports = {
  getVerifySteps,
  runVerifySteps,
  runCli
};

if (require.main === module) {
  runCli();
}
