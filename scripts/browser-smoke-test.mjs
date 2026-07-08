import { spawn } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_VERSION = "0.10.18";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeForStartsWith(value) {
  return process.platform === "win32" ? value.toLowerCase() : value;
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".jsx": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
  }[ext] || "application/octet-stream";
}

function startStaticServer(root) {
  const rootResolved = path.resolve(root);
  const rootCmp = normalizeForStartsWith(rootResolved);
  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      const decodedPath = decodeURIComponent(url.pathname);
      const route = decodedPath === "/" ? "/Pump_Calculator_standalone.html" : decodedPath;
      const filePath = path.resolve(rootResolved, `.${route}`);
      const fileCmp = normalizeForStartsWith(filePath);
      if (filePath !== rootResolved && !fileCmp.startsWith(`${rootCmp}${path.sep}`)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      if (!existsSync(filePath) || !statSync(filePath).isFile()) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type": contentType(filePath),
        "Cache-Control": "no-store",
      });
      res.end(readFileSync(filePath));
    } catch (err) {
      res.writeHead(500);
      res.end(String(err?.message || err));
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        port: address.port,
        close: () => new Promise(done => server.close(done)),
      });
    });
  });
}

function browserCandidates() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.EDGE_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge",
  ];
  return candidates.filter(Boolean);
}

function findBrowser() {
  const exe = browserCandidates().find(candidate => existsSync(candidate));
  if (!exe) {
    throw new Error("No Chrome or Edge executable found. Set CHROME_PATH or EDGE_PATH to run browser smoke tests.");
  }
  return exe;
}

function waitForDevtoolsUrl(browserProcess, timeoutMs = 15000) {
  let output = "";
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for DevTools websocket URL. Browser output:\n${output}`));
    }, timeoutMs);

    const onData = (chunk) => {
      const text = chunk.toString("utf8");
      output += text;
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        cleanup();
        resolve(match[1]);
      }
    };

    const onExit = (code, signal) => {
      cleanup();
      reject(new Error(`Browser exited before DevTools was ready (code ${code}, signal ${signal}). Output:\n${output}`));
    };

    const cleanup = () => {
      clearTimeout(timer);
      browserProcess.stdout?.off("data", onData);
      browserProcess.stderr?.off("data", onData);
      browserProcess.off("exit", onExit);
    };

    browserProcess.stdout?.on("data", onData);
    browserProcess.stderr?.on("data", onData);
    browserProcess.once("exit", onExit);
  });
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.exceptions = [];
    ws.addEventListener("message", event => this.onMessage(event));
    ws.addEventListener("close", () => {
      for (const { reject } of this.pending.values()) reject(new Error("CDP connection closed"));
      this.pending.clear();
    });
  }

  static connect(url) {
    assert(typeof WebSocket === "function", "Node global WebSocket is required for browser smoke tests.");
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const onOpen = () => resolve(new Cdp(ws));
      const onError = () => reject(new Error("Could not connect to Chrome DevTools Protocol websocket"));
      ws.addEventListener("open", onOpen, { once: true });
      ws.addEventListener("error", onError, { once: true });
    });
  }

  onMessage(event) {
    const raw = typeof event.data === "string" ? event.data : Buffer.from(event.data).toString("utf8");
    const msg = JSON.parse(raw);
    if (msg.id && this.pending.has(msg.id)) {
      const { resolve, reject } = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      if (msg.error) reject(new Error(`${msg.error.message}: ${msg.error.data || ""}`.trim()));
      else resolve(msg.result || {});
      return;
    }
    if (msg.method === "Runtime.exceptionThrown") {
      const details = msg.params?.exceptionDetails || {};
      this.exceptions.push(`${details.text || "Runtime exception"} at ${details.url || "unknown"}:${details.lineNumber || 0}`);
    }
  }

  send(method, params = {}, sessionId = undefined) {
    const id = this.nextId++;
    const message = sessionId ? { id, method, params, sessionId } : { id, method, params };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(message));
    });
  }
}

async function launchBrowser() {
  const exe = findBrowser();
  const userDataDir = mkdtempSync(path.join(os.tmpdir(), "pumpcalc-browser-profile-"));
  const browser = spawn(exe, [
    "--headless=new",
    "--remote-debugging-port=0",
    "--remote-allow-origins=*",
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--window-size=1440,1000",
    "about:blank",
  ], {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const wsUrl = await waitForDevtoolsUrl(browser);
  return { browser, userDataDir, wsUrl };
}

async function attachPage(cdp, url, downloadDir) {
  try {
    await cdp.send("Browser.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadDir,
      eventsEnabled: true,
    });
  } catch {}

  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("DOM.enable", {}, sessionId);
  try {
    await cdp.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: downloadDir }, sessionId);
  } catch {}
  await cdp.send("Page.navigate", { url }, sessionId);
  return sessionId;
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  }, sessionId);
  if (result.exceptionDetails) {
    const text = result.exceptionDetails.text || result.exceptionDetails.exception?.description || "evaluation failed";
    throw new Error(text);
  }
  return result.result?.value;
}

async function waitForEval(cdp, sessionId, expression, description, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const value = await evaluate(cdp, sessionId, expression);
      if (value) return value;
      lastError = JSON.stringify(value);
    } catch (err) {
      lastError = err.message;
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? ` (last: ${lastError})` : ""}`);
}

function setupPageHarnessScript() {
  return `(() => {
    window.__alerts = [];
    window.__printCalls = [];
    window.alert = (message) => window.__alerts.push(String(message));
    window.print = () => {
      window.__printCalls.push(document.querySelector('.view.active')?.dataset.screenLabel || '');
    };
    return true;
  })()`;
}

function clickTextScript(text) {
  return `(() => {
    const needle = ${JSON.stringify(text)};
    const el = [...document.querySelectorAll('button, .tab')]
      .find(node => (node.textContent || '').trim().includes(needle));
    if (!el) return false;
    el.click();
    return true;
  })()`;
}

function setInputScript(selector, value, index = 0) {
  return `(() => {
    const input = [...document.querySelectorAll(${JSON.stringify(selector)})][${index}];
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`;
}

async function setMetadata(cdp, sessionId, index, value) {
  const ok = await evaluate(cdp, sessionId, setInputScript(".text-field input", value, index));
  assert(ok, `metadata input ${index} should exist`);
  await delay(120);
}

async function uploadJsonFile(cdp, sessionId, filePath) {
  const { root } = await cdp.send("DOM.getDocument", { depth: 1 }, sessionId);
  const { nodeId } = await cdp.send("DOM.querySelector", {
    nodeId: root.nodeId,
    selector: "input[type=file]",
  }, sessionId);
  assert(nodeId, "case import file input should exist");
  await cdp.send("DOM.setFileInputFiles", { nodeId, files: [filePath] }, sessionId);
  await evaluate(cdp, sessionId, `(() => {
    const input = document.querySelector('input[type=file]');
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
}

async function waitForDownloadedJson(downloadDir) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    const files = readdirSync(downloadDir)
      .filter(name => name.endsWith(".json") && !name.endsWith(".crdownload"));
    if (files.length) {
      const filePath = path.join(downloadDir, files[0]);
      return {
        filePath,
        payload: JSON.parse(readFileSync(filePath, "utf8")),
      };
    }
    await delay(100);
  }
  throw new Error("Timed out waiting for exported JSON download");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function main() {
  const serverRef = await startStaticServer(repoRoot);
  const downloadDir = mkdtempSync(path.join(os.tmpdir(), "pumpcalc-browser-downloads-"));
  const uploadDir = mkdtempSync(path.join(os.tmpdir(), "pumpcalc-browser-uploads-"));
  let browserRef;
  let cdp;

  try {
    browserRef = await launchBrowser();
    cdp = await Cdp.connect(browserRef.wsUrl);
    const appUrl = `http://127.0.0.1:${serverRef.port}/Pump_Calculator_standalone.html`;
    const sessionId = await attachPage(cdp, appUrl, downloadDir);

    await waitForEval(cdp, sessionId, `document.readyState === 'complete'`, "page load");
    await waitForEval(cdp, sessionId, `Boolean(window.PumpCases && window.computeDuty && document.querySelector('.case-name'))`, "app bootstrap");
    await evaluate(cdp, sessionId, `localStorage.clear(); location.reload(); true`);
    await waitForEval(cdp, sessionId, `document.readyState === 'complete'`, "reload");
    await waitForEval(cdp, sessionId, `Boolean(window.PumpCases && window.computeDuty && document.querySelector('.case-name'))`, "app bootstrap after reload");
    await evaluate(cdp, sessionId, setupPageHarnessScript());

    assert(await waitForEval(cdp, sessionId, `window.PumpCases.APP_VERSION === ${JSON.stringify(APP_VERSION)}`, "app version"), "app version should match release");
    assert(await evaluate(cdp, sessionId, clickTextScript("03 Compare")), "Compare tab should be clickable");
    assert(await waitForEval(cdp, sessionId, `document.querySelector('.view.active')?.dataset.screenLabel === '03 Compare'`, "compare view"), "Compare view should become active");
    assert(await evaluate(cdp, sessionId, clickTextScript("02 Report")), "Report tab should be clickable");
    assert(await waitForEval(cdp, sessionId, `document.querySelector('.view.active')?.dataset.screenLabel === '02 Report'`, "report view"), "Report view should become active");
    assert(await evaluate(cdp, sessionId, clickTextScript("01 Calculator")), "Calculator tab should be clickable");

    const metadataValues = [
      "Browser Smoke Project",
      "P-BROWSER",
      "CAL-BROWSER-001",
      "T0",
      "QC Bot",
      "Mechanical",
    ];
    for (let i = 0; i < metadataValues.length; i += 1) {
      await setMetadata(cdp, sessionId, i, metadataValues[i]);
    }
    assert(await evaluate(cdp, sessionId, clickTextScript("02 Report")), "Report tab should be clickable after metadata edit");
    assert(await waitForEval(cdp, sessionId, `document.querySelector('.titleblock')?.textContent.includes('CAL-BROWSER-001')`, "report metadata"), "report should show edited metadata");

    assert(await evaluate(cdp, sessionId, clickTextScript("01 Calculator")), "Calculator tab should be clickable before saving");
    assert(await evaluate(cdp, sessionId, setInputScript(".case-name", "Browser Smoke Case")), "case name input should be editable");
    await delay(120);
    assert(await evaluate(cdp, sessionId, clickTextScript("Save")), "Save button should be clickable");
    assert(await waitForEval(cdp, sessionId, `(() => {
      const cases = JSON.parse(localStorage.getItem('pumpcalc:cases') || '{}');
      return cases['Browser Smoke Case']?.meta?.tag === 'P-BROWSER';
    })()`, "saved case in localStorage"), "saved case should persist in localStorage");

    await setMetadata(cdp, sessionId, 1, "P-BROWSER-EDIT");
    assert(await evaluate(cdp, sessionId, clickTextScript("Export")), "Export button should be clickable");
    const exported = await waitForDownloadedJson(downloadDir);
    assert(exported.payload.schema === "pumpcalc.case.v1", "downloaded export should use the case schema");
    assert(exported.payload.state?.meta?.tag === "P-BROWSER-EDIT", "downloaded export should contain current live metadata");

    const invalidPath = path.join(uploadDir, "invalid-library.json");
    writeFileSync(invalidPath, JSON.stringify({ foo: { bar: 1 } }), "utf8");
    await uploadJsonFile(cdp, sessionId, invalidPath);
    assert(await waitForEval(cdp, sessionId, `window.__alerts.some(message => message.includes('Could not import case JSON'))`, "invalid import alert"), "invalid import should show a clear error");

    const singlePayload = clone(exported.payload);
    singlePayload.name = "Browser Imported";
    singlePayload.state.meta.tag = "P-IMPORTED";
    const singlePath = path.join(uploadDir, "browser-imported.pumpcase.json");
    writeFileSync(singlePath, JSON.stringify(singlePayload), "utf8");
    await uploadJsonFile(cdp, sessionId, singlePath);
    assert(await waitForEval(cdp, sessionId, `(() => {
      const cases = JSON.parse(localStorage.getItem('pumpcalc:cases') || '{}');
      return cases['Browser Imported']?.meta?.tag === 'P-IMPORTED'
        && [...document.querySelectorAll('.text-field input')][1]?.value === 'P-IMPORTED';
    })()`, "single case import"), "single case import should save and activate the imported case");

    const libraryState = clone(exported.payload.state);
    libraryState.meta.tag = "P-LIBRARY";
    const libraryPath = path.join(uploadDir, "browser-library.json");
    writeFileSync(libraryPath, JSON.stringify({
      schema: "pumpcalc.cases.v1",
      version: 1,
      appVersion: APP_VERSION,
      cases: { "Browser Library A": libraryState },
    }), "utf8");
    await uploadJsonFile(cdp, sessionId, libraryPath);
    assert(await waitForEval(cdp, sessionId, `(() => {
      const cases = JSON.parse(localStorage.getItem('pumpcalc:cases') || '{}');
      return cases['Browser Library A']?.meta?.tag === 'P-LIBRARY'
        && [...document.querySelectorAll('.text-field input')][1]?.value === 'P-IMPORTED';
    })()`, "case library import"), "case library import should add cases without replacing active state");

    const stateNamedPath = path.join(uploadDir, "state-named-library.json");
    const stateNamed = clone(exported.payload.state);
    stateNamed.meta.tag = "P-STATE";
    const sibling = clone(exported.payload.state);
    sibling.meta.tag = "P-OTHER";
    writeFileSync(stateNamedPath, JSON.stringify({ state: stateNamed, Other: sibling }), "utf8");
    await uploadJsonFile(cdp, sessionId, stateNamedPath);
    assert(await waitForEval(cdp, sessionId, `(() => {
      const cases = JSON.parse(localStorage.getItem('pumpcalc:cases') || '{}');
      return cases.state?.meta?.tag === 'P-STATE' && cases.Other?.meta?.tag === 'P-OTHER';
    })()`, "state-named library import"), "library with a case named state should keep sibling cases");

    assert(await evaluate(cdp, sessionId, clickTextScript("US")), "US unit toggle should be clickable");
    assert(await waitForEval(cdp, sessionId, `document.querySelector('.brand-sub')?.textContent.includes('US')`, "US unit label"), "unit toggle should update the app shell");

    assert(await evaluate(cdp, sessionId, clickTextScript("03 Compare")), "Compare tab should be clickable before print");
    assert(await waitForEval(cdp, sessionId, `document.querySelector('.view.active')?.dataset.screenLabel === '03 Compare'`, "compare view before print"), "Compare view should be active before print test");
    assert(await evaluate(cdp, sessionId, clickTextScript("Print Report / PDF")), "Print Report / PDF button should be clickable");
    assert(await waitForEval(cdp, sessionId, `window.__printCalls.at(-1) === '02 Report'`, "report print routing"), "print should route through Report view");

    assert(cdp.exceptions.length === 0, `browser runtime exceptions:\n${cdp.exceptions.join("\n")}`);
    console.log("browser-smoke-test: tabs, metadata, case import/export, localStorage, units, and report print passed");
  } finally {
    try { await cdp?.send("Browser.close"); } catch {}
    if (browserRef?.browser && !browserRef.browser.killed) browserRef.browser.kill();
    await serverRef.close();
    for (const dir of [downloadDir, uploadDir, browserRef?.userDataDir]) {
      if (!dir) continue;
      try { rmSync(dir, { recursive: true, force: true }); } catch {}
    }
  }
}

main().catch(err => {
  console.error(err.stack || err.message || err);
  process.exit(1);
});
