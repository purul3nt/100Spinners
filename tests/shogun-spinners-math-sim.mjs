import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const spins = Number(process.argv[2] || 100000);
const seedInput = Number(process.argv[3] || 0x6662026);

function loadTsCommonJs(relativePath) {
  const filename = path.join(root, relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2018,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  const module = { exports: {} };
  const context = vm.createContext({
    exports: module.exports,
    module,
    require,
    __filename: filename,
    __dirname: path.dirname(filename),
    Math,
  });
  vm.runInContext(output, context, { filename });
  return module.exports;
}

let rngState = seedInput >>> 0 || 1;
function rnd() {
  rngState ^= rngState << 13;
  rngState ^= rngState >>> 17;
  rngState ^= rngState << 5;
  return (rngState >>> 0) / 4294967296;
}

const math = loadTsCommonJs("src/shogunSpinnersMath.ts");
const bands = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 5],
  [5, 10],
  [10, 20],
  [20, 50],
  [50, 100],
  [100, 200],
  [200, 500],
  [500, 1000],
  [1000, Infinity],
];
const bandCounts = bands.map(() => 0);
let baseWin = 0;
let featureWin = 0;
let totalWin = 0;
let hits = 0;
let bonusTriggers = 0;
let maxWin = 0;
let sumSquares = 0;

for (let i = 0; i < spins; i++) {
  const result = math.playPaidSpin(rnd, 1);
  baseWin += result.totalWin - result.bonusWin;
  featureWin += result.bonusWin;
  totalWin += result.totalWin;
  sumSquares += result.totalWin * result.totalWin;
  if (result.totalWin > 0) hits++;
  if (result.bonusTriggered) bonusTriggers++;
  if (result.totalWin > maxWin) maxWin = result.totalWin;
  for (let j = 0; j < bands.length; j++) {
    const [low, high] = bands[j];
    if (result.totalWin > low && result.totalWin <= high) {
      bandCounts[j]++;
      break;
    }
  }
}

const mean = totalWin / spins;
const variance = sumSquares / spins - mean * mean;
const summary = {
  spins,
  seed: seedInput,
  rtp: round(totalWin / spins),
  baseRtp: round(baseWin / spins),
  featureRtp: round(featureWin / spins),
  hitRate: round(hits / spins),
  hitFrequency: hits ? `1 in ${round(spins / hits)}` : "not observed",
  bonusTriggerRate: round(bonusTriggers / spins),
  bonusTriggerFrequency: bonusTriggers ? `1 in ${round(spins / bonusTriggers)}` : "not observed",
  maxWin: round(maxWin),
  variance: round(variance),
  stdDev: round(Math.sqrt(Math.max(0, variance))),
  roundLevelBands: bands.map(([low, high], index) => ({
    band: high === Infinity ? `>${low}x` : `${low}-${high}x`,
    count: bandCounts[index],
    frequency: bandCounts[index] ? `1 in ${round(spins / bandCounts[index])}` : "not observed",
  })),
};

const outDir = path.join(root, "test-results");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `shogun-spinners-math-${spins}.json`);
fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
console.log(`Wrote ${outPath}`);

function round(value) {
  return Math.round(value * 10000) / 10000;
}
