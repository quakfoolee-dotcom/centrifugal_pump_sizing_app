import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const acceptanceRoot = path.join(repoRoot, "out", "acceptance");
const downloadRoot = path.join(acceptanceRoot, "installed-downloads");
const installedExe = process.env.PUMP_DESKTOP_EXE
  || path.join(process.env.LOCALAPPDATA || "", "centrifugal_pump_sizing", "app-0.11.1", "CentrifugalPumpSizing.exe");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function safeResetDirectory(directory) {
  const resolved = path.resolve(directory);
  assert(resolved.startsWith(`${acceptanceRoot}${path.sep}`), `Refusing to reset unsafe path: ${resolved}`);
  rmSync(resolved, { recursive: true, force: true });
  mkdirSync(resolved, { recursive: true });
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    socket.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result || {});
    });
  }

  static async connect(url) {
    assert(typeof WebSocket !== "undefined", "Node 24+ global WebSocket is required");
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    return new Cdp(socket);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function waitForPage(port) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
      const page = targets.find(target => target.type === "page" && target.webSocketDebuggerUrl);
      if (page) return page;
    } catch {}
    await delay(200);
  }
  throw new Error("Timed out waiting for installed Electron DevTools endpoint");
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Renderer evaluation failed");
  }
  return result.result?.value;
}

async function waitFor(cdp, expression, label, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate(cdp, expression)) return true;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function waitForDownload() {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    const file = readdirSync(downloadRoot).find(name => name.endsWith(".json") && !name.endsWith(".crdownload"));
    if (file) return path.join(downloadRoot, file);
    await delay(100);
  }
  throw new Error("Timed out waiting for installed-app JSON export");
}

async function createNativePdf(pdfPath) {
  rmSync(pdfPath, { force: true });
  rmSync(`${pdfPath}.error.json`, { force: true });
  const processRef = spawn(installedExe, [], {
    detached: false,
    stdio: "ignore",
    windowsHide: true,
    env: { ...process.env, PUMP_DESKTOP_ACCEPTANCE_PDF: pdfPath },
  });
  const exitCode = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      processRef.kill();
      reject(new Error("Timed out waiting for native installed-app PDF generation"));
    }, 30000);
    processRef.once("error", error => {
      clearTimeout(timer);
      reject(error);
    });
    processRef.once("exit", code => {
      clearTimeout(timer);
      resolve(code);
    });
  });
  assert(exitCode === 0, `Native installed-app PDF generation exited ${exitCode}`);
  assert(existsSync(pdfPath), "Native installed-app PDF was not created");
}

function setInputScript(selector, value) {
  return `(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.blur();
    return true;
  })()`;
}

async function main() {
  assert(existsSync(installedExe), `Installed executable not found: ${installedExe}`);
  mkdirSync(acceptanceRoot, { recursive: true });
  safeResetDirectory(downloadRoot);

  const port = await reservePort();
  const processRef = spawn(installedExe, [
    `--remote-debugging-port=${port}`,
    "--remote-allow-origins=*",
  ], {
    detached: false,
    stdio: "ignore",
    windowsHide: true,
  });

  let cdp;
  let storageSnapshot;
  const report = {
    installedExe,
    installedVersion: "0.11.1",
    tests: {},
  };

  try {
    const page = await waitForPage(port);
    cdp = await Cdp.connect(page.webSocketDebuggerUrl);
    await cdp.send("Runtime.enable");
    await cdp.send("Page.enable");
    await cdp.send("DOM.enable");
    await cdp.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: downloadRoot });
    await waitFor(cdp, `Boolean(window.PumpCases && document.querySelector('.print-report'))`, "installed app bootstrap");

    storageSnapshot = await evaluate(cdp, `JSON.stringify(Object.fromEntries(Array.from({ length: localStorage.length }, (_, i) => {
      const key = localStorage.key(i); return [key, localStorage.getItem(key)];
    })))`);

    const caseName = `Desktop Acceptance ${Date.now()}`;
    assert(await evaluate(cdp, setInputScript(".case-name", caseName)), "case-name input should exist");
    assert(await evaluate(cdp, `(() => { [...document.querySelectorAll('.cases button')].find(button => button.textContent.trim() === 'Save')?.click(); return true; })()`), "Save button should be clickable");
    await waitFor(cdp, `Boolean(JSON.parse(localStorage.getItem('pumpcalc:cases') || '{}')[${JSON.stringify(caseName)}])`, "saved installed case");
    report.tests.caseSave = true;

    assert(await evaluate(cdp, `(() => { document.querySelector('.theme-picker').open = true; [...document.querySelectorAll('.theme-option')].find(button => button.textContent.includes('Control Room Dark'))?.click(); return true; })()`), "dark theme option should be clickable");
    assert(await evaluate(cdp, `(() => { [...document.querySelectorAll('.unit-seg button')].find(button => button.textContent.trim() === 'US')?.click(); return true; })()`), "US unit button should be clickable");
    await waitFor(cdp, `document.documentElement.dataset.theme === 'dark' && JSON.parse(localStorage.getItem('pumpcalc:v4')).unitSystem === 'US'`, "theme and unit persistence state");

    assert(await evaluate(cdp, `(() => { [...document.querySelectorAll('.cases button')].find(button => button.textContent.trim() === 'Export')?.click(); return true; })()`), "Export button should be clickable");
    const exportedPath = await waitForDownload();
    const exported = JSON.parse(readFileSync(exportedPath, "utf8"));
    assert(exported.schema === "pumpcalc.case.v1", "installed export should use case schema");
    report.tests.jsonExport = true;

    await cdp.send("Page.reload", { ignoreCache: true });
    await waitFor(cdp, `Boolean(window.PumpCases && document.querySelector('.print-report'))`, "installed app reload");
    await waitFor(cdp, `document.documentElement.dataset.theme === 'dark'
      && document.querySelector('.unit-seg button.on')?.textContent.trim() === 'US'
      && [...document.querySelectorAll('.case-sel option')].some(option => option.value === ${JSON.stringify(caseName)})`, "restart persistence");
    report.tests.restartPersistence = true;
    report.tests.themePersistence = true;
    report.tests.unitPersistence = true;

    exported.name = "Desktop Acceptance Imported";
    if (exported.state?.meta) exported.state.meta.tag = "P-DESKTOP-IMPORTED";
    const importPath = path.join(acceptanceRoot, "desktop-acceptance-import.json");
    writeFileSync(importPath, `${JSON.stringify(exported, null, 2)}\n`, "utf8");
    const { root } = await cdp.send("DOM.getDocument", { depth: 1 });
    const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: "input[type=file]" });
    assert(nodeId, "installed import file input should exist");
    await cdp.send("DOM.setFileInputFiles", { nodeId, files: [importPath] });
    await evaluate(cdp, `(() => { const input = document.querySelector('input[type=file]'); input.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await waitFor(cdp, `JSON.parse(localStorage.getItem('pumpcalc:cases') || '{}')['Desktop Acceptance Imported']?.meta?.tag === 'P-DESKTOP-IMPORTED'`, "installed JSON import");
    report.tests.jsonImport = true;

    report.tests.appVersion = await evaluate(cdp, `window.PumpCases.APP_VERSION === '0.11.1'`);
    assert(report.tests.appVersion, "installed app version should be v0.11.1");

    await cdp.send("Emulation.setEmulatedMedia", { media: "print" });
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 703,
      height: 1100,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await evaluate(cdp, `(() => { document.getElementById('tab-report')?.click(); return true; })()`);
    await waitFor(cdp, `document.getElementById('panel-report')?.classList.contains('active')`, "print-layout report view");
    const printLayout = await evaluate(cdp, `(() => {
      const sheet = document.querySelector('.sheet');
      if (!sheet) return null;
      const sheetRect = sheet.getBoundingClientRect();
      const overflow = [...sheet.querySelectorAll('.titleblock, .two-col, table, td, .mini-chart, .mini-chart svg')]
        .map(node => ({ node, rect: node.getBoundingClientRect() }))
        .filter(({ rect }) => rect.right > sheetRect.right + 1 || rect.left < sheetRect.left - 1)
        .map(({ node, rect }) => ({
          selector: node.className?.baseVal || node.className || node.tagName,
          left: Math.round(rect.left * 10) / 10,
          right: Math.round(rect.right * 10) / 10,
        }));
      return {
        clientWidth: sheet.clientWidth,
        scrollWidth: sheet.scrollWidth,
        overflow,
      };
    })()`);
    assert(printLayout, "installed print sheet should exist");
    assert(printLayout.scrollWidth <= printLayout.clientWidth + 1, `Print sheet horizontally overflows: ${JSON.stringify(printLayout)}`);
    assert(printLayout.overflow.length === 0, `Print report contains out-of-bounds elements: ${JSON.stringify(printLayout.overflow)}`);
    report.tests.printLayout = true;
    report.printLayout = printLayout;
  } finally {
    if (cdp && storageSnapshot !== undefined) {
      try {
        await evaluate(cdp, `(() => {
          const saved = JSON.parse(${JSON.stringify(storageSnapshot)});
          localStorage.clear();
          Object.entries(saved).forEach(([key, value]) => localStorage.setItem(key, value));
          return true;
        })()`);
      } catch {}
    }
    cdp?.close();
    if (!processRef.killed) processRef.kill();
    await delay(800);
  }

  const pdfPath = path.join(acceptanceRoot, "installed-desktop-report.pdf");
  await createNativePdf(pdfPath);
  assert(statSync(pdfPath).size > 20000 && readFileSync(pdfPath).subarray(0, 4).toString() === "%PDF", "installed report PDF should be valid");
  report.tests.reportPdf = true;
  report.reportPdf = pdfPath;
  report.reportPdfSha256 = sha256(pdfPath);

  report.storageRestored = true;
  const reportPath = path.join(acceptanceRoot, "installed-desktop-acceptance.json");
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`desktop-installed-acceptance: case, persistence, JSON, theme, units, and PDF passed`);
  console.log(`desktop-installed-acceptance: report ${reportPath}`);
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
