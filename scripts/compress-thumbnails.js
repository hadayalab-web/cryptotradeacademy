/**
 * サムネイル画像を15%圧縮（ファイルサイズを元の85%に削減）
 *
 * 実行: node scripts/compress-thumbnails.js [画像パス...]
 * 例: node scripts/compress-thumbnails.js ./thumb_A.png ./thumb_B.png
 * 引数なし: output/thumbnails, assets/vsl-thumbnail 内の画像を処理
 *
 * 圧縮結果は元ファイルと同じフォルダに _compressed  suffixで保存
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ASSETS = path.join(ROOT, "assets");
const OUTPUT_DIR = path.join(ROOT, "output");

const CURSOR_ASSETS = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  ".cursor",
  "projects",
  "c-Users-chiba-hadayalab-automation-platform-cryptotradeacademy",
  "assets"
);

function findImages() {
  const args = process.argv.slice(2);
  if (args.length > 0) return args.map((p) => path.resolve(p));

  const found = [];
  const dirs = [
    path.join(OUTPUT_DIR, "thumbnails"),
    path.join(ASSETS, "vsl-thumbnail"),
    OUTPUT_DIR,
    ASSETS,
    CURSOR_ASSETS,
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      for (const f of files) {
        if (/\.(png|jpg|jpeg|webp)$/i.test(f) && !f.includes("_compressed")) {
          found.push(path.join(dir, f));
        }
      }
    } catch (_) {}
  }
  return [...new Set(found)];
}

async function compressToTarget(inputPath, targetRatio = 0.85) {
  if (!fs.existsSync(inputPath)) return null;
  const originalSize = fs.statSync(inputPath).size;
  const targetSize = Math.floor(originalSize * targetRatio);

  const ext = path.extname(inputPath).toLowerCase();
  const baseName = path.basename(inputPath, ext);
  const dir = path.dirname(inputPath);

  let best = { buffer: null, size: originalSize, ext };
  const img = sharp(inputPath);

  // WebP: 高効率で約15–25%削減
  for (const q of [88, 85, 82]) {
    const buf = await img.clone().webp({ quality: q }).toBuffer();
    if (buf.length < best.size) best = { buffer: buf, size: buf.length, ext: ".webp" };
  }

  // PNG最大圧縮
  const pngBuf = await img.clone().png({ compressionLevel: 9 }).toBuffer();
  if (pngBuf.length < best.size) best = { buffer: pngBuf, size: pngBuf.length, ext: ".png" };

  // JPEG
  for (const q of [90, 87, 85]) {
    const buf = await img.clone().jpeg({ quality: q }).toBuffer();
    if (buf.length < best.size) best = { buffer: buf, size: buf.length, ext: ".jpg" };
  }

  const finalPath = path.join(dir, `${baseName}_compressed${best.ext}`);
  const buffer = best.buffer || (await img.png({ compressionLevel: 9 }).toBuffer());
  fs.writeFileSync(finalPath, buffer);
  return { outPath: finalPath, originalSize, finalSize: buffer.length };
}

async function main() {
  const images = findImages();
  console.log("📦 サムネイル 15%圧縮（目標: 元の85%）\n");
  if (images.length === 0) {
    console.log("画像が見つかりません。パスを指定してください:");
    console.log("  node scripts/compress-thumbnails.js image1.png image2.png");
    return;
  }

  for (const imgPath of images) {
    if (!fs.existsSync(imgPath)) {
      console.log(`⚠️ スキップ（未存在）: ${path.basename(imgPath)}`);
      continue;
    }

    try {
      const result = await compressToTarget(imgPath, 0.85);
      if (result) {
        const saved = ((1 - result.finalSize / result.originalSize) * 100).toFixed(1);
        console.log(`✅ ${path.basename(imgPath)}`);
        console.log(`   ${(result.originalSize / 1024).toFixed(1)} KB → ${(result.finalSize / 1024).toFixed(1)} KB (${saved}%削減)`);
        console.log(`   → ${result.outPath}\n`);
      }
    } catch (err) {
      console.error(`❌ ${path.basename(imgPath)}: ${err.message}`);
    }
  }
}

main();
