import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const manifest = JSON.parse(readFileSync(path.join(repoRoot, "release-manifest.json"), "utf8"));
const version = manifest.version;
const outputRoot = path.join(repoRoot, "dist", "release", `v${version}`);
const normalizeText = text => text.replace(/\r\n?/g, "\n");

const packageVersion = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8")).version;
const appVersionMatch = readFileSync(path.join(repoRoot, "lib", "caseLibrary.js"), "utf8")
  .match(/APP_VERSION\s*=\s*"([^"]+)"/);
const appVersion = appVersionMatch?.[1];

if (!version || version !== packageVersion || version !== appVersion) {
  throw new Error(`Release version mismatch: manifest=${version}, package=${packageVersion}, app=${appVersion}`);
}
if (!manifest.packageArtifact?.includes(`v${version}`)) {
  throw new Error(`Package artifact name must include v${version}`);
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(outputRoot, { recursive: true });

const appName = manifest.packageArtifact;
const files = [
  ["Pump_Calculator_standalone.html", appName],
  [manifest.releaseNotes, `RELEASE_NOTES_v${version}.md`],
  ["release-manifest.json", "release-manifest.json"],
  ["LICENSE", "LICENSE"],
  ["NOTICE.md", "NOTICE.md"],
];

for (const [source, target] of files) {
  const content = normalizeText(readFileSync(path.join(repoRoot, source), "utf8"));
  writeFileSync(path.join(outputRoot, target), content, "utf8");
}

const checksums = files
  .map(([, target]) => `${sha256(path.join(outputRoot, target))}  ${target}`)
  .join("\n");
writeFileSync(path.join(outputRoot, "SHA256SUMS.txt"), `${checksums}\n`, "utf8");

console.log(`package-release: created v${version} package at ${outputRoot}`);
console.log(`package-release: ${appName} sha256 ${sha256(path.join(outputRoot, appName))}`);
