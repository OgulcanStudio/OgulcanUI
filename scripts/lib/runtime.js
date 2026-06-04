/**
 * Prefer Bun for script execution (faster startup). Falls back to current process.
 */
const { spawnSync } = require('child_process');

function resolveRunner() {
  if (process.versions.bun) {
    return { cmd: process.execPath, args: [] };
  }
  const probe = spawnSync('bun', ['--version'], { encoding: 'utf8', shell: true });
  if (probe.status === 0) {
    return { cmd: 'bun', args: [], shell: true };
  }
  return { cmd: process.execPath, args: [], shell: false };
}

/**
 * @param {string} scriptPath absolute path to .js script
 * @param {string[]} [args]
 * @param {import('child_process').SpawnSyncOptions} [options]
 */
function runScript(scriptPath, args = [], options = {}) {
  const runner = resolveRunner();
  const spawnArgs = [...runner.args, scriptPath, ...args];
  return spawnSync(runner.cmd, spawnArgs, {
    stdio: 'inherit',
    env: process.env,
    shell: runner.shell,
    ...options
  });
}

module.exports = { resolveRunner, runScript };