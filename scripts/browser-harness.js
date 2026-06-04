const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

function resolveBrowserPath() {
  const candidates = [
    process.env.OGULCAN_BROWSER_BIN,
    process.env.CHROME_BIN,
    process.env.CHROMIUM_BIN,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
  ].filter(Boolean);

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error('No Chromium browser found. Set OGULCAN_BROWSER_BIN.');
  }
  return found;
}

function getOpenPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

function startStaticServer(rootDir, port, defaultPage) {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8'
  };

  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
    const relPath = urlPath === '/' ? defaultPage : urlPath;
    const filePath = path.normalize(path.join(rootDir, relPath));
    if (!filePath.startsWith(rootDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      res.end(data);
    });
  });

  return new Promise((resolve, reject) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

function closeServer(server) {
  if (!server) return Promise.resolve();
  return new Promise((resolve) => server.close(() => resolve()));
}

async function waitForPageTarget(cdpPort, expectedUrl, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const targets = await fetchJson(`http://127.0.0.1:${cdpPort}/json/list`);
      const page = targets.find((target) => target.type === 'page' && target.url.startsWith(expectedUrl));
      if (page && page.webSocketDebuggerUrl) {
        return page;
      }
    } catch {}
    await sleep(250);
  }
  throw new Error('Timed out waiting for browser bench page target.');
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function createCdpClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    let nextId = 1;

    ws.onopen = () => {
      resolve({
        send(method, params = {}) {
          const id = nextId++;
          ws.send(JSON.stringify({ id, method, params }));
          return new Promise((resolveSend, rejectSend) => {
            pending.set(id, { resolve: resolveSend, reject: rejectSend });
          });
        },
        close() {
          ws.close();
        }
      });
    };

    ws.onerror = (err) => reject(err);
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const deferred = pending.get(message.id);
      if (!deferred) return;
      pending.delete(message.id);
      if (message.error) deferred.reject(new Error(message.error.message || 'CDP error'));
      else deferred.resolve(message.result);
    };
  });
}

async function waitForBenchReady(cdp) {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    const ready = await evalInPage(cdp, 'window.__OGULCAN_BENCH_READY__ === true');
    if (ready) return;
    await sleep(200);
  }
  throw new Error('Browser bench page did not become ready.');
}

async function waitForFlag(cdp, expression, timeoutMs = 15000, label = 'page flag') {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const ready = await evalInPage(cdp, expression);
    if (ready) return;
    await sleep(200);
  }
  throw new Error(`${label} did not become ready.`);
}

async function evalInPage(cdp, expression, awaitPromise = false) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed');
  }
  return result.result ? result.result.value : undefined;
}

async function setViewport(cdp, width, height, deviceScaleFactor = 1) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor,
    mobile: false
  });
}

async function captureScreenshot(cdp, clip) {
  const result = await cdp.send('Page.captureScreenshot', clip ? {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: true,
    clip
  } : {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: true
  });
  return Buffer.from(result.data, 'base64');
}

function safeRm(target) {
  if (!target || !fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
}

function waitForBrowserExit(browser) {
  return new Promise((resolve) => {
    if (!browser || browser.exitCode !== null) {
      resolve();
      return;
    }
    browser.once('exit', () => resolve());
    setTimeout(resolve, 5000);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function openBrowserBenchSession(browserPath, serverUrl, profileDir, extraArgs = [], options = {}) {
  const { startupDelayMs = 0, attempts = 3 } = options;
  if (startupDelayMs > 0) await sleep(startupDelayMs);

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const cdpPort = await getOpenPort();
    const browser = launchBrowser(browserPath, cdpPort, profileDir, serverUrl, extraArgs);
    try {
      const target = await waitForPageTarget(cdpPort, serverUrl, 20000);
      const cdp = await createCdpClient(target.webSocketDebuggerUrl);
      await cdp.send('Runtime.enable');
      await cdp.send('Page.enable');
      await cdp.send('HeapProfiler.enable');
      await waitForBenchReady(cdp);
      return { cdp, browser, cdpPort, profileDir };
    } catch (err) {
      lastError = err;
      if (!browser.killed) {
        const exited = waitForBrowserExit(browser);
        browser.kill();
        await exited;
      }
      safeRm(profileDir);
      fs.mkdirSync(profileDir, { recursive: true });
      if (attempt < attempts) await sleep(400 * attempt);
    }
  }

  throw lastError || new Error('Failed to open browser bench session.');
}

async function closeBrowserBenchSession(session) {
  if (!session) return;
  if (session.cdp) {
    try { await session.cdp.close(); } catch {}
  }
  if (session.browser && !session.browser.killed) {
    const exited = waitForBrowserExit(session.browser);
    session.browser.kill();
    await exited;
  }
  safeRm(session.profileDir);
}

function launchBrowser(browserPath, cdpPort, profileDir, url, extraArgs = []) {
  return spawn(browserPath, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
    '--disable-popup-blocking',
    ...extraArgs,
    url
  ], {
    stdio: 'ignore'
  });
}

module.exports = {
  resolveBrowserPath,
  getOpenPort,
  startStaticServer,
  closeServer,
  waitForPageTarget,
  createCdpClient,
  waitForBenchReady,
  waitForFlag,
  evalInPage,
  setViewport,
  captureScreenshot,
  safeRm,
  waitForBrowserExit,
  sleep,
  launchBrowser,
  openBrowserBenchSession,
  closeBrowserBenchSession
};
