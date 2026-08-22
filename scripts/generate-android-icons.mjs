import sharp from "sharp";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { copyFileSync, mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const logoPath = join(root, "public", "logo.png");

const sizes = [
  { folder: "mipmap-mdpi", launcher: 48, foreground: 108 },
  { folder: "mipmap-hdpi", launcher: 72, foreground: 162 },
  { folder: "mipmap-xhdpi", launcher: 96, foreground: 216 },
  { folder: "mipmap-xxhdpi", launcher: 144, foreground: 324 },
  { folder: "mipmap-xxxhdpi", launcher: 192, foreground: 432 },
];

const outDir = join(root, "android", "app", "src", "main", "res");

for (const size of sizes) {
  const folder = join(outDir, size.folder);
  mkdirSync(folder, { recursive: true });

  const launcherPath = join(folder, "ic_launcher.png");
  const foregroundPath = join(folder, "ic_launcher_foreground.png");

  await sharp(logoPath)
    .resize(size.launcher, size.launcher)
    .png()
    .toFile(launcherPath);

  await sharp(logoPath)
    .resize(size.foreground, size.foreground)
    .png()
    .toFile(foregroundPath);
}

console.log("Android icons generated in android/app/src/main/res/mipmap-*");
