import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const standalonePath = "Pump_Calculator_standalone.html";
const appPath = "Pump_Calculator.html";

if (!existsSync(standalonePath)) {
  throw new Error(`Missing ${standalonePath}; cannot preserve offline wrapper assets`);
}

const ids = {
  react: "0772a1d2-9ab1-4e71-9bb3-bab1b4cbec96",
  reactDom: "e8a2074f-25f1-4a2c-b872-c932ac8991e7",
  babel: "c0febb60-0d41-47cc-aaf9-a3b5942f97de",
  pumpMath: "b404ecd9-b288-4427-815e-e4b13247fcd0",
  units: "8f456e12-d559-4e87-a2f2-56f72905b01d",
  caseLibrary: "c681b12b-54c8-4315-835c-f368d94d0c90",
  duty: "a1735c67-70b2-457f-b8d3-2f872f88a31b",
  pumpChart: "4d3fa8c6-bbc4-472f-a2ec-bc343b2e09c0",
  calculator: "ff9a3d7f-de94-4265-bebe-7c2682515e54",
  report: "a10e6278-d3ae-4061-ab70-a70a99004e18",
  compare: "7795ca0b-fcc4-4732-88e2-1c76b460a099",
};

const manifestRe = /<script type="__bundler\/manifest">\s*([\s\S]*?)\s*<\/script>/;
const templateRe = /<script type="__bundler\/template">\s*([\s\S]*?)\s*<\/script>/;

const wrapper = readFileSync(standalonePath, "utf8");
const manifestMatch = wrapper.match(manifestRe);
const templateMatch = wrapper.match(templateRe);
if (!manifestMatch || !templateMatch) {
  throw new Error("Standalone wrapper is missing bundler manifest/template blocks");
}

const manifest = JSON.parse(manifestMatch[1]);
const oldTemplate = JSON.parse(templateMatch[1]);
const oldStyle = oldTemplate.match(/<style>([\s\S]*?)<\/style>/i)?.[1] || "";
const fontFaceCss = Array.from(oldStyle.matchAll(/@font-face\s*\{[\s\S]*?\}/g), match => match[0])
  .join("\n\n");
const appCss = readFileSync("styles.css", "utf8")
  .replace(/@import\s+url\([^)]+\);\s*/g, "")
  .trimStart();
const css = [fontFaceCss, appCss].filter(Boolean).join("\n\n");

let templateHtml = readFileSync(appPath, "utf8");
templateHtml = templateHtml.replace(
  /<link rel="stylesheet" href="styles\.css(?:\?[^\"]*)?" \/>/,
  `<style>${css}</style>`
);

const srcReplacements = [
  ["https://unpkg.com/react@18.3.1/umd/react.development.js", ids.react],
  ["https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js", ids.reactDom],
  ["https://unpkg.com/@babel/standalone@7.29.0/babel.min.js", ids.babel],
  ["lib/pumpMath.js", ids.pumpMath],
  ["lib/units.js", ids.units],
  ["lib/caseLibrary.js", ids.caseLibrary],
  ["lib/duty.js", ids.duty],
  ["components/PumpChart.jsx", ids.pumpChart],
  ["components/Calculator.jsx", ids.calculator],
  ["components/Report.jsx", ids.report],
  ["components/Compare.jsx", ids.compare],
];

for (const [from, to] of srcReplacements) {
  templateHtml = templateHtml.split(`src="${from}"`).join(`src="${to}"`);
}

function upsertTextAsset(id, file) {
  manifest[id] = {
    ...(manifest[id] || {}),
    mime: "text/javascript",
    compressed: true,
    data: gzipSync(Buffer.from(readFileSync(file, "utf8"), "utf8")).toString("base64"),
  };
}

upsertTextAsset(ids.pumpMath, "lib/pumpMath.js");
upsertTextAsset(ids.units, "lib/units.js");
upsertTextAsset(ids.caseLibrary, "lib/caseLibrary.js");
upsertTextAsset(ids.duty, "lib/duty.js");
upsertTextAsset(ids.pumpChart, "components/PumpChart.jsx");
upsertTextAsset(ids.calculator, "components/Calculator.jsx");
upsertTextAsset(ids.report, "components/Report.jsx");
upsertTextAsset(ids.compare, "components/Compare.jsx");

const manifestJson = JSON.stringify(manifest);
const templateJson = JSON.stringify(templateHtml).replace(/<\/script>/gi, "<\\/script>");
const nextWrapper = wrapper
  .replace(manifestRe, `<script type="__bundler/manifest">\n${manifestJson}\n</script>`)
  .replace(templateRe, `<script type="__bundler/template">\n${templateJson}\n</script>`);

writeFileSync(standalonePath, nextWrapper, "utf8");
console.log(`Updated ${standalonePath}`);
