import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const mainSource = readFileSync("desktop/main.cjs", "utf8");
const forgeConfig = require(path.resolve("forge.config.cjs"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function filesBelow(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const item = path.join(root, entry.name);
    return entry.isDirectory() ? filesBelow(item) : [item];
  });
}

assert(packageJson.main === "desktop/main.cjs", "package main should point to the Electron shell");
assert(packageJson.productName === "Centrifugal Pump Sizing", "desktop product name should be stable");
assert(packageJson.devDependencies?.electron, "Electron should be a pinned development dependency");
assert(packageJson.dependencies?.["electron-squirrel-startup"], "Squirrel startup helper should ship with the app");
assert(existsSync("Pump_Calculator_standalone.html"), "desktop package requires the offline standalone app");
assert(existsSync("desktop/assets/icon.ico") && existsSync("desktop/assets/icon.png"), "desktop icons should be generated");
assert(mainSource.includes("contextIsolation: true"), "desktop renderer must use context isolation");
assert(mainSource.includes("nodeIntegration: false"), "desktop renderer must not expose Node.js");
assert(mainSource.includes("sandbox: true"), "desktop renderer must use Chromium sandboxing");
assert(mainSource.includes('action: "deny"'), "desktop shell must deny new renderer windows");
assert(mainSource.includes("printToPDF"), "desktop shell should support native PDF export");
assert(mainSource.includes("PUMP_DESKTOP_SMOKE_RESULT"), "desktop shell should expose deterministic packaged-app smoke verification");
assert(forgeConfig.packagerConfig?.asar === true, "desktop resources should be packaged in ASAR");
assert(forgeConfig.makers?.some(maker => maker.name === "@electron-forge/maker-squirrel"), "Squirrel installer maker should be configured");
assert(forgeConfig.makers?.some(maker => maker.name === "@electron-forge/maker-zip"), "portable ZIP maker should be configured");

const verifyArtifacts = process.argv.includes("--artifacts");
if (verifyArtifacts) {
  const artifacts = filesBelow(path.join("out", "make"));
  const setup = artifacts.find(file => /Setup-v[\d.]+\.exe$/i.test(file));
  const portableZip = artifacts.find(file => /win32.*x64.*\.zip$/i.test(file.replaceAll("\\", "/")))
    || artifacts.find(file => file.toLowerCase().endsWith(".zip"));
  assert(setup && statSync(setup).size > 1_000_000, "Windows setup executable should be present");
  assert(portableZip && statSync(portableZip).size > 1_000_000, "portable Windows ZIP should be present");
  const setupHash = sha256(setup);
  const zipHash = sha256(portableZip);
  const checksumPath = path.join("out", "make", `SHA256SUMS-desktop-v${packageJson.version}.txt`);
  writeFileSync(checksumPath, `${setupHash}  ${path.basename(setup)}\n${zipHash}  ${path.basename(portableZip)}\n`, "utf8");
  console.log(`desktop-artifact: ${setup} sha256 ${setupHash}`);
  console.log(`desktop-artifact: ${portableZip} sha256 ${zipHash}`);
  console.log(`desktop-artifact: checksums written to ${checksumPath}`);
  console.log("verify-desktop: secure shell, Forge makers, and desktop artifacts passed");
} else {
  console.log("verify-desktop: secure shell and Forge makers passed");
}
