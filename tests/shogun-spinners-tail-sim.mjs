import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const spins = Number(process.argv[2] || 1000000);
const seedInput = Number(process.argv[3] || 0x10002026);

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

const tailThresholds = [100, 200, 500, 1000, 2000, 5000, 10000];
const tailCounts = Object.fromEntries(tailThresholds.map((threshold) => [threshold, 0]));
const baseTailCounts = Object.fromEntries(tailThresholds.map((threshold) => [threshold, 0]));
const featureTailCounts = Object.fromEntries(tailThresholds.map((threshold) => [threshold, 0]));
const bonusTierCounts = [0, 0, 0, 0];
const bonusTierTotals = [0, 0, 0, 0];

let totalWin = 0;
let baseWin = 0;
let featureWin = 0;
let hits = 0;
let baseHits = 0;
let bonusTriggers = 0;
let featureWins = 0;
let wheelSpinCount = 0;
let wheelEventCount = 0;
let wheelCashHitCount = 0;
let wheelCashWin = 0;
let maxWin = 0;
let maxBaseWin = 0;
let maxFeatureWin = 0;
let maxWinCount = 0;
let baseOverCapCount = 0;
let baseAtCapCount = 0;
let sumSquares = 0;

for (let i = 0; i < spins; i++) {
  const result = math.playPaidSpin(rnd, 1);
  const paidBaseWin = math.roundMoney(result.totalWin - result.bonusWin);
  totalWin += result.totalWin;
  baseWin += paidBaseWin;
  featureWin += result.bonusWin;
  sumSquares += result.totalWin * result.totalWin;
  if (result.totalWin > 0) hits++;
  if (paidBaseWin > 0) baseHits++;
  if (result.bonusWin > 0) featureWins++;
  if (result.bonusTriggered) {
    bonusTriggers++;
    bonusTierCounts[result.bonusTier]++;
    bonusTierTotals[result.bonusTier] += result.bonusWin;
  }
  if (result.wheelEvents.length > 0) {
    wheelSpinCount++;
    wheelEventCount += result.wheelEvents.length;
  }
  if (result.baseWheelCashWin > 0) {
    wheelCashHitCount++;
    wheelCashWin += result.baseWheelCashWin;
  }
  if (paidBaseWin > math.BASE_GAME_MAX_WIN_MULTIPLIER) baseOverCapCount++;
  if (paidBaseWin === math.BASE_GAME_MAX_WIN_MULTIPLIER) baseAtCapCount++;
  if (paidBaseWin > maxBaseWin) maxBaseWin = paidBaseWin;
  if (result.bonusWin > maxFeatureWin) maxFeatureWin = result.bonusWin;
  if (result.totalWin > maxWin) {
    maxWin = result.totalWin;
    maxWinCount = 1;
  } else if (result.totalWin === maxWin) {
    maxWinCount++;
  }
  for (const threshold of tailThresholds) {
    if (result.totalWin > threshold) tailCounts[threshold]++;
    if (paidBaseWin > threshold) baseTailCounts[threshold]++;
    if (result.bonusWin > threshold) featureTailCounts[threshold]++;
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
  hitFrequency: frequency(spins, hits),
  baseHitRate: round(baseHits / spins),
  baseHitFrequency: frequency(spins, baseHits),
  bonusTriggerRate: round(bonusTriggers / spins),
  bonusTriggerFrequency: frequency(spins, bonusTriggers),
  featureWinRate: round(featureWins / spins),
  featureWinFrequency: frequency(spins, featureWins),
  wheelSpinRate: round(wheelSpinCount / spins),
  wheelSpinFrequency: frequency(spins, wheelSpinCount),
  wheelEventRate: round(wheelEventCount / spins),
  wheelEventFrequency: frequency(spins, wheelEventCount),
  wheelCashHitRate: round(wheelCashHitCount / spins),
  wheelCashFrequency: frequency(spins, wheelCashHitCount),
  wheelCashRtp: round(wheelCashWin / spins),
  maxWin: round(maxWin),
  maxWinCount,
  maxWinFrequency: frequency(spins, maxWinCount),
  maxBaseWin: round(maxBaseWin),
  maxFeatureWin: round(maxFeatureWin),
  baseAtCapCount,
  baseAtCapFrequency: frequency(spins, baseAtCapCount),
  baseOverCapCount,
  variance: round(variance),
  stdDev: round(Math.sqrt(Math.max(0, variance))),
  tails: tailThresholds.map((threshold) => ({
    threshold: `>${threshold}x`,
    totalCount: tailCounts[threshold],
    totalFrequency: frequency(spins, tailCounts[threshold]),
    baseCount: baseTailCounts[threshold],
    baseFrequency: frequency(spins, baseTailCounts[threshold]),
    featureCount: featureTailCounts[threshold],
    featureFrequency: frequency(spins, featureTailCounts[threshold]),
  })),
  bonusTiers: [1, 2, 3].map((tier) => ({
    tier,
    count: bonusTierCounts[tier],
    frequency: frequency(spins, bonusTierCounts[tier]),
    averageFeatureWin: bonusTierCounts[tier] ? round(bonusTierTotals[tier] / bonusTierCounts[tier]) : 0,
  })),
  constants: {
    baseGameMaxWinMultiplier: math.BASE_GAME_MAX_WIN_MULTIPLIER,
    baseGameMaxWheelMeter: math.BASE_GAME_MAX_WHEEL_METER,
    baseLowSymbolStripExtensionLength: math.BASE_LOW_SYMBOL_STRIP_EXTENSION.length,
    bonusLowSymbolStripExtensionLength: math.BONUS_LOW_SYMBOL_STRIP_EXTENSION.length,
    v1PayScale: math.V1_PAY_SCALE,
    bonusFeaturePayScale: math.BONUS_FEATURE_PAY_SCALE,
  },
};

const outDir = path.join(root, "test-results");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `shogun-spinners-tail-${spins}.json`);
fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
console.log(`Wrote ${outPath}`);

function frequency(sampleSize, count) {
  return count ? `1 in ${round(sampleSize / count)}` : "not observed";
}

function round(value) {
  return Math.round(value * 10000) / 10000;
}
