/**
 * Copies the OCR engine out of node_modules and into assets/ocr.
 *
 * These five files are ~11 MB of binaries. Committing them would bloat the
 * repository permanently for something npm already hosts, so they are fetched
 * as a dev dependency and staged here on install instead — the APK still ships
 * them, the repository stays lean.
 *
 * The target extension is deliberately ".ocrasset": Metro would try to bundle
 * anything ending in .js as a module, and would not include .wasm or .gz at
 * all. One opaque extension keeps every file an asset, and the real filenames
 * are restored on the device, where tesseract fetches them by name.
 */
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'ocr');

const FILES = [
  ['tesseract.js/dist/tesseract.min.js', 'tesseract.min.js.ocrasset'],
  ['tesseract.js/dist/worker.min.js', 'worker.min.js.ocrasset'],
  ['tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'core.wasm.js.ocrasset'],
  ['tesseract.js-core/tesseract-core-simd-lstm.wasm', 'core.wasm.ocrasset'],
  ['@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'eng.traineddata.gz.ocrasset'],
  ['@tesseract.js-data/fil/4.0.0_best_int/fil.traineddata.gz', 'fil.traineddata.gz.ocrasset'],
];

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let copied = 0;
  let bytes = 0;

  for (const [from, to] of FILES) {
    const source = path.join(__dirname, '..', 'node_modules', from);
    if (!fs.existsSync(source)) {
      // A missing engine is not fatal: the app checks at runtime and tells the
      // user OCR is unavailable rather than failing to build.
      console.warn(`[ocr] missing ${from} — OCR assets not staged`);
      return;
    }
    const target = path.join(OUT_DIR, to);
    fs.copyFileSync(source, target);
    bytes += fs.statSync(target).size;
    copied += 1;
  }

  console.log(`[ocr] staged ${copied} files, ${(bytes / 1048576).toFixed(1)} MB`);
}

main();
