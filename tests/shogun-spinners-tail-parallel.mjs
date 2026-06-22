import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { isMainThread, parentPort, workerData, Worker } from "node:worker_threads";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tailThresholds = [100, 200, 500, 1000, 2000, 5000, 10000];
const winBands = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [8, 9],
  [9, 10],
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

function createEmptyCounters() {
  return {
    totalWin: 0,
    baseWin: 0,
    featureWin: 0,
    hits: 0,
    baseHits: 0,
    bonusTriggers: 0,
    featureWins: 0,
    wheelSpinCount: 0,
    wheelEventCount: 0,
    wheelCashHitCount: 0,
    wheelCashWin: 0,
    maxWin: 0,
    maxBaseWin: 0,
    maxFeatureWin: 0,
    maxWinCount: 0,
    baseOverCapCount: 0,
    baseAtCapCount: 0,
    sumSquares: 0,
    tailCounts: Object.fromEntries(tailThresholds.map((threshold) => [threshold, 0])),
    baseTailCounts: Object.fromEntries(tailThresholds.map((threshold) => [threshold, 0])),
    featureTailCounts: Object.fromEntries(tailThresholds.map((threshold) => [threshold, 0])),
    winBandCounts: winBands.map(() => 0),
    winBandTotals: winBands.map(() => 0),
    baseWinBandCounts: winBands.map(() => 0),
    baseWinBandTotals: winBands.map(() => 0),
    bonusFeatureTotal: 0,
  };
}

function runChunk(spins, seedInput) {
  const math = loadTsCommonJs("src/shogunSpinnersMath.ts");
  const counters = createEmptyCounters();
  let rngState = seedInput >>> 0 || 1;
  function rnd() {
    rngState ^= rngState << 13;
    rngState ^= rngState >>> 17;
    rngState ^= rngState << 5;
    return (rngState >>> 0) / 4294967296;
  }

  for (let i = 0; i < spins; i++) {
    const result = math.playPaidSpin(rnd, 1);
    const paidBaseWin = math.roundMoney(result.totalWin - result.bonusWin);
    counters.totalWin += result.totalWin;
    counters.baseWin += paidBaseWin;
    counters.featureWin += result.bonusWin;
    counters.sumSquares += result.totalWin * result.totalWin;
    if (result.totalWin > 0) counters.hits++;
    if (paidBaseWin > 0) counters.baseHits++;
    if (result.bonusWin > 0) counters.featureWins++;
    if (result.bonusTriggered) {
      counters.bonusTriggers++;
      counters.bonusFeatureTotal += result.bonusWin;
    }
    if (result.wheelEvents.length > 0) {
      counters.wheelSpinCount++;
      counters.wheelEventCount += result.wheelEvents.length;
    }
    if (result.baseWheelCashWin > 0) {
      counters.wheelCashHitCount++;
      counters.wheelCashWin += result.baseWheelCashWin;
    }
    if (paidBaseWin > math.BASE_GAME_MAX_WIN_MULTIPLIER) counters.baseOverCapCount++;
    if (paidBaseWin === math.BASE_GAME_MAX_WIN_MULTIPLIER) counters.baseAtCapCount++;
    if (paidBaseWin > counters.maxBaseWin) counters.maxBaseWin = paidBaseWin;
    if (result.bonusWin > counters.maxFeatureWin) counters.maxFeatureWin = result.bonusWin;
    if (result.totalWin > counters.maxWin) {
      counters.maxWin = result.totalWin;
      counters.maxWinCount = 1;
    } else if (result.totalWin === counters.maxWin) {
      counters.maxWinCount++;
    }
    for (const threshold of tailThresholds) {
      if (result.totalWin > threshold) counters.tailCounts[threshold]++;
      if (paidBaseWin > threshold) counters.baseTailCounts[threshold]++;
      if (result.bonusWin > threshold) counters.featureTailCounts[threshold]++;
    }
    recordBand(counters.winBandCounts, counters.winBandTotals, result.totalWin);
    recordBand(counters.baseWinBandCounts, counters.baseWinBandTotals, paidBaseWin);
  }

  return {
    spins,
    seed: seedInput,
    counters,
    constants: {
      baseGameMaxWinMultiplier: math.BASE_GAME_MAX_WIN_MULTIPLIER,
      baseGameMaxWheelMeter: math.BASE_GAME_MAX_WHEEL_METER,
      baseLowSymbolStripExtensionLength: math.BASE_LOW_SYMBOL_STRIP_EXTENSION.length,
      bonusLowSymbolStripExtensionLength: math.BONUS_LOW_SYMBOL_STRIP_EXTENSION.length,
      v1PayScale: math.V1_PAY_SCALE,
    },
  };
}

function mergeCounters(target, source) {
  for (const key of [
    "totalWin",
    "baseWin",
    "featureWin",
    "hits",
    "baseHits",
    "bonusTriggers",
    "featureWins",
    "wheelSpinCount",
    "wheelEventCount",
    "wheelCashHitCount",
    "wheelCashWin",
    "baseOverCapCount",
    "baseAtCapCount",
    "sumSquares",
    "bonusFeatureTotal",
  ]) {
    target[key] += source[key];
  }
  if (source.maxWin > target.maxWin) {
    target.maxWin = source.maxWin;
    target.maxWinCount = source.maxWinCount;
  } else if (source.maxWin === target.maxWin) {
    target.maxWinCount += source.maxWinCount;
  }
  target.maxBaseWin = Math.max(target.maxBaseWin, source.maxBaseWin);
  target.maxFeatureWin = Math.max(target.maxFeatureWin, source.maxFeatureWin);
  for (const threshold of tailThresholds) {
    target.tailCounts[threshold] += source.tailCounts[threshold];
    target.baseTailCounts[threshold] += source.baseTailCounts[threshold];
    target.featureTailCounts[threshold] += source.featureTailCounts[threshold];
  }
  for (let index = 0; index < winBands.length; index++) {
    target.winBandCounts[index] += source.winBandCounts[index];
    target.winBandTotals[index] += source.winBandTotals[index];
    target.baseWinBandCounts[index] += source.baseWinBandCounts[index];
    target.baseWinBandTotals[index] += source.baseWinBandTotals[index];
  }
}

function summarize(spins, seedInput, workers, workerResults, counters, constants) {
  const mean = counters.totalWin / spins;
  const variance = counters.sumSquares / spins - mean * mean;
  return {
    spins,
    seed: seedInput,
    workers,
    workerSeeds: workerResults.map((result) => result.seed),
    rtp: round(counters.totalWin / spins),
    baseRtp: round(counters.baseWin / spins),
    featureRtp: round(counters.featureWin / spins),
    hitRate: round(counters.hits / spins),
    hitFrequency: frequency(spins, counters.hits),
    baseHitRate: round(counters.baseHits / spins),
    baseHitFrequency: frequency(spins, counters.baseHits),
    bonusTriggerRate: round(counters.bonusTriggers / spins),
    bonusTriggerFrequency: frequency(spins, counters.bonusTriggers),
    featureWinRate: round(counters.featureWins / spins),
    featureWinFrequency: frequency(spins, counters.featureWins),
    wheelSpinRate: round(counters.wheelSpinCount / spins),
    wheelSpinFrequency: frequency(spins, counters.wheelSpinCount),
    wheelEventRate: round(counters.wheelEventCount / spins),
    wheelEventFrequency: frequency(spins, counters.wheelEventCount),
    wheelCashHitRate: round(counters.wheelCashHitCount / spins),
    wheelCashFrequency: frequency(spins, counters.wheelCashHitCount),
    wheelCashRtp: round(counters.wheelCashWin / spins),
    maxWin: round(counters.maxWin),
    maxWinCount: counters.maxWinCount,
    maxWinFrequency: frequency(spins, counters.maxWinCount),
    maxBaseWin: round(counters.maxBaseWin),
    maxFeatureWin: round(counters.maxFeatureWin),
    baseAtCapCount: counters.baseAtCapCount,
    baseAtCapFrequency: frequency(spins, counters.baseAtCapCount),
    baseOverCapCount: counters.baseOverCapCount,
    variance: round(variance),
    stdDev: round(Math.sqrt(Math.max(0, variance))),
    tails: tailThresholds.map((threshold) => ({
      threshold: `>${threshold}x`,
      totalCount: counters.tailCounts[threshold],
      totalFrequency: frequency(spins, counters.tailCounts[threshold]),
      baseCount: counters.baseTailCounts[threshold],
      baseFrequency: frequency(spins, counters.baseTailCounts[threshold]),
      featureCount: counters.featureTailCounts[threshold],
      featureFrequency: frequency(spins, counters.featureTailCounts[threshold]),
    })),
    winDistribution: describeBands(spins, counters.winBandCounts, counters.winBandTotals, counters.totalWin, "rtpContribution"),
    baseWinDistribution: describeBands(spins, counters.baseWinBandCounts, counters.baseWinBandTotals, counters.baseWin, "baseRtpContribution"),
    bonusFeature: {
      count: counters.bonusTriggers,
      frequency: frequency(spins, counters.bonusTriggers),
      averageFeatureWin: counters.bonusTriggers ? round(counters.bonusFeatureTotal / counters.bonusTriggers) : 0,
    },
    constants,
  };
}

function frequency(sampleSize, count) {
  return count ? `1 in ${round(sampleSize / count)}` : "not observed";
}

function round(value) {
  return Math.round(value * 10000) / 10000;
}

function recordBand(counts, totals, win) {
  for (let index = 0; index < winBands.length; index++) {
    const [low, high] = winBands[index];
    if (win > low && win <= high) {
      counts[index]++;
      totals[index] += win;
      return;
    }
  }
}

function describeBands(spins, counts, totals, totalWin, contributionKey) {
  return winBands.map(([low, high], index) => {
    const total = totals[index];
    return {
      band: high === Infinity ? `>${low}x` : `${low}-${high}x`,
      count: counts[index],
      totalWin: round(total),
      frequency: frequency(spins, counts[index]),
      [contributionKey]: round(total / spins),
      shareOfRtp: totalWin ? round(total / totalWin) : 0,
    };
  });
}

if (!isMainThread) {
  parentPort.postMessage(runChunk(workerData.spins, workerData.seed));
} else {
  const spins = Number(process.argv[2] || 1000000);
  const seedInput = Number(process.argv[3] || 0x10002026);
  const requestedWorkers = Number(process.argv[4] || Math.max(1, Math.min(os.cpus().length, 8)));
  const workers = Math.max(1, Math.min(requestedWorkers, spins));
  const baseChunk = Math.floor(spins / workers);
  const remainder = spins % workers;
  const workerJobs = [];

  for (let index = 0; index < workers; index++) {
    const chunkSpins = baseChunk + (index < remainder ? 1 : 0);
    const seed = (seedInput + index * 0x9e3779b9) >>> 0 || 1;
    workerJobs.push(new Promise((resolve, reject) => {
      const worker = new Worker(fileURLToPath(import.meta.url), {
        workerData: { spins: chunkSpins, seed },
      });
      worker.once("message", resolve);
      worker.once("error", reject);
      worker.once("exit", (code) => {
        if (code !== 0) reject(new Error(`worker exited with code ${code}`));
      });
    }));
  }

  const workerResults = await Promise.all(workerJobs);
  const counters = createEmptyCounters();
  for (const result of workerResults) mergeCounters(counters, result.counters);
  const summary = summarize(spins, seedInput, workers, workerResults, counters, workerResults[0].constants);
  const outDir = path.join(root, "test-results");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `shogun-spinners-tail-parallel-${spins}.json`);
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Wrote ${outPath}`);
}
