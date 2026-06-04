const os = require('os');

/**
 * @param {string} [envKey]
 * @param {number} [maxCap]
 */
function resolveConcurrency(envKey, maxCap = 8) {
  if (envKey && process.env[envKey] !== undefined && process.env[envKey] !== '') {
    const parsed = Number.parseInt(process.env[envKey], 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const cpus = os.cpus()?.length || 4;
  return Math.min(maxCap, Math.max(1, cpus - 1));
}

/**
 * Run async work over items with a fixed worker pool.
 * @template T,R,C
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T, index: number, workerId: number, ctx: C) => Promise<R>} workerFn
 * @param {{
 *   createContext?: (workerId: number) => Promise<C>,
 *   destroyContext?: (ctx: C, workerId: number) => Promise<void>
 * }} [options]
 * @returns {Promise<R[]>}
 */
async function runPool(items, concurrency, workerFn, options = {}) {
  if (items.length === 0) return [];
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Math.min(Math.max(1, concurrency), items.length);
  const { createContext, destroyContext } = options;

  async function worker(workerId) {
    const ctx = createContext ? await createContext(workerId) : undefined;
    try {
      while (true) {
        const index = nextIndex++;
        if (index >= items.length) break;
        results[index] = await workerFn(items[index], index, workerId, ctx);
      }
    } finally {
      if (destroyContext) await destroyContext(ctx, workerId);
    }
  }

  await Promise.all(Array.from({ length: workers }, (_, workerId) => worker(workerId)));
  return results;
}

module.exports = { resolveConcurrency, runPool };