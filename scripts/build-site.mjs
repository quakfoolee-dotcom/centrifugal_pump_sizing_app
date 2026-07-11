import { copyFileSync, cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outputRoot = path.join(repoRoot, "dist", "site");

rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(outputRoot, { recursive: true });

for (const file of [
  "index.html",
  "Pump_Calculator.html",
  "Pump_Calculator_standalone.html",
  "styles.css",
  "LICENSE",
  "NOTICE.md",
]) {
  copyFileSync(path.join(repoRoot, file), path.join(outputRoot, file));
}

for (const directory of ["components", "lib"]) {
  cpSync(path.join(repoRoot, directory), path.join(outputRoot, directory), { recursive: true });
}

writeFileSync(path.join(outputRoot, ".nojekyll"), "", "utf8");
console.log(`build-site: staged GitHub Pages site at ${outputRoot}`);
