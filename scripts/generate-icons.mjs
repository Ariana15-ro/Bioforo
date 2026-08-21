import sharp from "sharp";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const logoPath = join(root, "public", "logo.png");

await Promise.all([
  sharp(logoPath)
    .resize(192, 192)
    .png()
    .toFile(join(root, "public", "icon-192.png")),
  sharp(logoPath)
    .resize(512, 512)
    .png()
    .toFile(join(root, "public", "icon-512.png")),
]);

console.log("Icons generated from logo.png: icon-192.png, icon-512.png");
