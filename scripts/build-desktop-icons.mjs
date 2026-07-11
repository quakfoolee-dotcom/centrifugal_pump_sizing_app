import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import pngToIco from "png-to-ico";
import sharp from "sharp";

const source = readFileSync("desktop/assets/icon.svg");
const outputRoot = path.resolve("desktop", "assets");
const sizes = [16, 24, 32, 48, 64, 128, 256];

mkdirSync(outputRoot, { recursive: true });
const pngs = await Promise.all(sizes.map(size => sharp(source)
  .resize(size, size)
  .png()
  .toBuffer()));

writeFileSync(path.join(outputRoot, "icon.png"), pngs.at(-1));
writeFileSync(path.join(outputRoot, "icon.ico"), await pngToIco(pngs));
console.log("build-desktop-icons: generated Windows ICO and application PNG");
