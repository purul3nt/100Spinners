import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rounds = Number(process.argv[2] || 100000);
const seedInput = Number(process.argv[3] || 0x1000b007);
const tier = Number(process.argv[4] || 1);

const buyBands = [
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
const bandCounts = buyBands.map(() => 0);
const bandTotals = buyBands.map(() => 0);
let totalWin = 0;
let hits = 0;
let maxWin = 0;
let sumSquares = 0;

for (let i = 0; i < rounds; i++) {
  const result = math.buyBonus(rnd, 1, tier);
  totalWin += result.totalWin;
  sumSquares += result.totalWin * result.totalWin;
  if (result.totalWin > 0) hits++;
  if (result.totalWin > maxWin) maxWin = result.totalWin;
  recordBand(result.totalWin);
}

const mean = totalWin / rounds;
const variance = sumSquares / rounds - mean * mean;
const summary = {
  rounds,
  seed: seedInput,
  tier,
  priceXBet: math.BUY_BONUS_PRICE_MULTIPLIER,
  avgWinXBet: round(totalWin / rounds),
  rtpVsBuyPrice: round(totalWin / rounds / math.BUY_BONUS_PRICE_MULTIPLIER),
  hitRate: round(hits / rounds),
  hitFrequency: frequency(rounds, hits),
  maxWin: round(maxWin),
  variance: round(variance),
  stdDev: round(Math.sqrt(Math.max(0, variance))),
  distribution: buyBands.map(([low, high], index) => ({
    band: high === Infinity ? `>${low}x` : `${low}-${high}x`,
    count: bandCounts[index],
    totalWin: round(bandTotals[index]),
    frequency: frequency(rounds, bandCounts[index]),
    avgContributionPerBuy: round(bandTotals[index] / rounds),
    shareOfBuyWin: totalWin ? round(bandTotals[index] / totalWin) : 0,
  })),
  constants: {
    buyBonusPriceMultiplier: math.BUY_BONUS_PRICE_MULTIPLIER,
    v1PayScale: math.V1_PAY_SCALE,
    bonusFeaturePayScale: math.BONUS_FEATURE_PAY_SCALE,
    bonusLowSymbolStripExtensionLength: math.BONUS_LOW_SYMBOL_STRIP_EXTENSION.length,
  },
};

const outDir = path.join(root, "test-results");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `shogun-spinners-buy-${rounds}.json`);
fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
console.log(`Wrote ${outPath}`);

function recordBand(win) {
  for (let index = 0; index < buyBands.length; index++) {
    const [low, high] = buyBands[index];
    if (win > low && win <= high) {
      bandCounts[index]++;
      bandTotals[index] += win;
      return;
    }
  }
}

function frequency(sampleSize, count) {
  return count ? `1 in ${round(sampleSize / count)}` : "not observed";
}

function round(value) {
  return Math.round(value * 10000) / 10000;
}
