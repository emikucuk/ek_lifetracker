import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const assetsDir = path.join(root, "assets");
const pngPath = path.join(assetsDir, "icon.png");
const icoPath = path.join(assetsDir, "icon.ico");
const faviconSource = path.join(root, "..", "client", "public", "favicon.png");

if (!fs.existsSync(pngPath)) {
  if (!fs.existsSync(faviconSource)) {
    console.error("Favicon bulunamadi:", faviconSource);
    process.exit(1);
  }
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.copyFileSync(faviconSource, pngPath);
}

const ico = await pngToIco(pngPath);
fs.writeFileSync(icoPath, ico);
console.log(`Icon hazir: ${icoPath} (${ico.length} byte)`);
