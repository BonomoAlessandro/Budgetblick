// Kopiert Tesseract-Worker, WASM-Core (nur LSTM-Varianten) und deutsche Sprachdaten
// nach public/tesseract/, damit die Texterkennung ohne CDN und offline funktioniert.
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'public', 'tesseract');

const pkgDir = (name) => dirname(require.resolve(`${name}/package.json`));
const tesseract = pkgDir('tesseract.js');
const core = pkgDir('tesseract.js-core');
const deu = pkgDir('@tesseract.js-data/deu');

const files = [
  [join(tesseract, 'dist', 'worker.min.js'), join(target, 'worker.min.js')],
  ...['lstm', 'simd-lstm', 'relaxedsimd-lstm'].map((variant) => [
    join(core, `tesseract-core-${variant}.wasm.js`),
    join(target, 'core', `tesseract-core-${variant}.wasm.js`),
  ]),
  [join(deu, '4.0.0_best_int', 'deu.traineddata.gz'), join(target, 'lang', 'deu.traineddata.gz')],
];

let copied = 0;
for (const [from, to] of files) {
  if (existsSync(to) && statSync(to).size === statSync(from).size) continue;
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  copied += 1;
}
console.log(`Tesseract-Dateien: ${copied} kopiert, ${files.length - copied} aktuell.`);
