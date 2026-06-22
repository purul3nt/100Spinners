import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

const math = loadTsCommonJs("src/shogunSpinnersMath.ts");

function makeRng(seedInput) {
  let state = seedInput >>> 0 || 1;
  return function rnd() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function weightedPick(items, weights, random) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = random() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

function pickBlueWheelOutcome(random, allowBonus = true) {
  const values = ["add", "multiply", "bonus"];
  const kind = allowBonus
    ? weightedPick(values, math.BLUE_WHEEL_KIND_WEIGHTS, random)
    : weightedPick(values.slice(0, 2), math.BLUE_WHEEL_KIND_WEIGHTS.slice(0, 2), random);
  if (kind === "bonus") return { kind };
  if (kind === "multiply") return { kind, value: weightedPick(math.BLUE_WHEEL_MULTIPLY_VALUES, math.BLUE_WHEEL_MULTIPLY_WEIGHTS, random) };
  return { kind, value: weightedPick(math.BLUE_WHEEL_ADD_VALUES, math.BLUE_WHEEL_ADD_WEIGHTS, random) };
}

function pickRedWheelOutcome(random) {
  const kind = weightedPick(["add", "multiply"], math.RED_WHEEL_KIND_WEIGHTS, random);
  if (kind === "multiply") return { kind, value: weightedPick(math.RED_WHEEL_MULTIPLY_VALUES, math.RED_WHEEL_MULTIPLY_WEIGHTS, random) };
  return { kind, value: weightedPick(math.RED_WHEEL_ADD_VALUES, math.RED_WHEEL_ADD_WEIGHTS, random) };
}

function makeWheelCell(color, random, allowBonus) {
  return {
    code: "W1",
    shuriken: true,
    wheelColor: color,
    wheelOutcome: color === "blue" ? pickBlueWheelOutcome(random, allowBonus) : pickRedWheelOutcome(random),
  };
}

function maybePlaceShuriken(cell, col, random, mode) {
  if (!math.SHURIKEN_REELS.includes(col)) return cell;
  if (mode === "base") {
    if (random() < math.BASE_SHURIKEN_CELL_CHANCE) Object.assign(cell, makeWheelCell("blue", random, true));
    return cell;
  }
  const roll = random();
  if (roll < math.BONUS_RED_SHURIKEN_CELL_CHANCE) Object.assign(cell, makeWheelCell("red", random, false));
  else if (roll < math.BONUS_RED_SHURIKEN_CELL_CHANCE + math.BONUS_BLUE_SHURIKEN_CELL_CHANCE) Object.assign(cell, makeWheelCell("blue", random, false));
  return cell;
}

function createGrid(random, mode = "base") {
  const grid = [];
  for (let col = 0; col < math.COLS; col++) {
    const strip = mode === "bonus" ? math.BONUS_REEL_STRIPS[col] : math.REEL_STRIPS[col];
    const stop = Math.floor(random() * strip.length);
    const column = [];
    for (let row = 0; row < math.ROWS; row++) {
      column.push(maybePlaceShuriken({ code: strip[(stop + row) % strip.length] }, col, random, mode));
    }
    grid.push(column);
  }
  return grid;
}

function scoreGrid(grid, bet = 1) {
  const lineWins = [];
  for (let lineIndex = 0; lineIndex < math.PAYLINES.length; lineIndex++) {
    const rows = math.PAYLINES[lineIndex];
    const first = grid[0][rows[0]].code;
    if (first === "W1") continue;
    let count = 1;
    const cells = [{ col: 0, row: rows[0] }];
    for (let col = 1; col < math.COLS; col++) {
      const row = rows[col];
      if (grid[col][row].code !== first) break;
      count++;
      cells.push({ col, row });
    }
    if (count >= 3) {
      const symbol = math.SYMBOL_BY_CODE[first];
      const rawPay = count === 5 ? symbol.pay5 : count === 4 ? symbol.pay4 : symbol.pay3;
      lineWins.push({
        lineIndex,
        symbol: first,
        count,
        amount: roundMoney(rawPay * math.V1_PAY_SCALE * bet),
        cells,
      });
    }
  }
  return {
    lineWins,
    baseWin: roundMoney(lineWins.reduce((sum, win) => sum + win.amount, 0)),
  };
}

function resolveWheelEvents(grid, startingMeter = 0, maxMeter = Infinity) {
  let meter = startingMeter;
  let bonusShurikens = 0;
  const events = [];
  const wheelCells = [];
  for (let col = 0; col < math.COLS; col++) {
    for (let row = 0; row < math.ROWS; row++) {
      const cell = grid[col][row];
      if (cell.shuriken && cell.wheelColor && cell.wheelOutcome) wheelCells.push({ col, row, cell });
    }
  }
  wheelCells.sort((a, b) => a.col - b.col || a.row - b.row);
  for (const { col, row, cell } of wheelCells) {
    const outcome = cell.wheelOutcome;
    const meterBefore = meter;
    let applied = false;
    if (outcome.kind === "add" && outcome.value) {
      meter += outcome.value;
      applied = true;
    } else if (outcome.kind === "multiply" && outcome.value && meter > 0) {
      meter *= outcome.value;
      applied = true;
    } else if (outcome.kind === "bonus") {
      bonusShurikens++;
      applied = true;
    }
    meter = Math.min(maxMeter, Math.max(0, Math.round(meter * 10000) / 10000));
    events.push({ col, row, color: cell.wheelColor, outcome, meterBefore, meterAfter: meter, applied });
  }
  return { meter, events, bonusShurikens };
}

function calculateBaseWheelCashWin(events, bet = 1) {
  const cashWin = events.reduce((sum, event) => {
    if (event.outcome.kind === "bonus") return sum;
    const value = event.outcome.value || 0;
    if (event.color === "blue" && event.outcome.kind === "multiply" && event.meterBefore <= 0) return sum + value * bet;
    return sum + value * math.BASE_WHEEL_CASH_SCALE * bet;
  }, 0);
  return roundMoney(cashWin);
}

function playBonusFeature(random, bet = 1) {
  const freeSpins = [];
  let totalWin = 0;
  for (let i = 0; i < math.FREE_SPINS; i++) {
    const grid = createGrid(random, "bonus");
    const scored = scoreGrid(grid, bet);
    const resolved = resolveWheelEvents(grid, 0);
    const wheelCashWin = calculateBaseWheelCashWin(resolved.events, bet);
    const bonusBaseWin = scored.baseWin;
    const shurikenWin = bonusBaseWin > 0 && resolved.meter > 0 ? roundMoney(bonusBaseWin * resolved.meter) : 0;
    const spinTotal = roundMoney(bonusBaseWin + shurikenWin + wheelCashWin);
    totalWin = roundMoney(totalWin + spinTotal);
    freeSpins.push({
      grid,
      lineWins: scored.lineWins,
      baseWin: bonusBaseWin,
      baseWheelCashWin: wheelCashWin,
      shurikenWin,
      wheelMultiplier: resolved.meter,
      multiplierMeter: resolved.meter,
      wheelEvents: resolved.events,
      totalWin: spinTotal,
      bonusTriggered: false,
      bonusWin: 0,
    });
  }
  return { totalWin, freeSpins };
}

function playPaidSpin(random, bet = 1) {
  const grid = createGrid(random, "base");
  const scored = scoreGrid(grid, bet);
  const resolved = resolveWheelEvents(grid, 0, math.BASE_GAME_MAX_WHEEL_METER);
  const baseWheelCashWin = calculateBaseWheelCashWin(resolved.events, bet);
  const bonusTriggered = resolved.bonusShurikens > 0;
  const lineShurikenWin = scored.baseWin > 0 && resolved.meter > 0 ? roundMoney(scored.baseWin * resolved.meter) : 0;
  const uncappedPaidSpinWin = roundMoney(scored.baseWin + lineShurikenWin + baseWheelCashWin);
  const paidSpinWin = roundMoney(Math.min(uncappedPaidSpinWin, bet * math.BASE_GAME_MAX_WIN_MULTIPLIER));
  const shurikenWin = roundMoney(Math.max(0, paidSpinWin - scored.baseWin));
  let bonusWin = 0;
  let freeSpins;
  if (bonusTriggered) {
    const feature = playBonusFeature(random, bet);
    bonusWin = feature.totalWin;
    freeSpins = feature.freeSpins;
  }
  return {
    grid,
    lineWins: scored.lineWins,
    baseWin: scored.baseWin,
    baseWheelCashWin,
    shurikenWin,
    wheelMultiplier: resolved.meter,
    multiplierMeter: resolved.meter,
    wheelEvents: resolved.events,
    totalWin: roundMoney(paidSpinWin + bonusWin),
    bonusTriggered,
    bonusWin: roundMoney(bonusWin),
    freeSpins,
  };
}

function normalize(result) {
  return JSON.parse(JSON.stringify(result));
}

function frequency(sampleSize, count) {
  return count ? `1 in ${round4(sampleSize / count)}` : "not observed";
}

function round4(value) {
  return Math.round(value * 10000) / 10000;
}

function runIndependentTail(spins, seed) {
  const random = makeRng(seed);
  const thresholds = [100, 200, 500, 1000, 2000, 5000, 10000];
  const tailCounts = Object.fromEntries(thresholds.map((threshold) => [threshold, 0]));
  const baseTailCounts = Object.fromEntries(thresholds.map((threshold) => [threshold, 0]));
  const featureTailCounts = Object.fromEntries(thresholds.map((threshold) => [threshold, 0]));
  let totalWin = 0;
  let baseWin = 0;
  let featureWin = 0;
  let hits = 0;
  let baseHits = 0;
  let bonusTriggers = 0;
  let wheelEventCount = 0;
  let maxWin = 0;
  let maxBaseWin = 0;
  let maxFeatureWin = 0;
  let baseOverCapCount = 0;
  let sumSquares = 0;
  for (let i = 0; i < spins; i++) {
    const result = playPaidSpin(random, 1);
    const basePart = roundMoney(result.totalWin - result.bonusWin);
    totalWin += result.totalWin;
    baseWin += basePart;
    featureWin += result.bonusWin;
    sumSquares += result.totalWin * result.totalWin;
    if (result.totalWin > 0) hits++;
    if (basePart > 0) baseHits++;
    if (result.bonusTriggered) bonusTriggers++;
    wheelEventCount += result.wheelEvents.length;
    if (result.totalWin > maxWin) maxWin = result.totalWin;
    if (basePart > maxBaseWin) maxBaseWin = basePart;
    if (result.bonusWin > maxFeatureWin) maxFeatureWin = result.bonusWin;
    if (basePart > math.BASE_GAME_MAX_WIN_MULTIPLIER) baseOverCapCount++;
    for (const threshold of thresholds) {
      if (result.totalWin > threshold) tailCounts[threshold]++;
      if (basePart > threshold) baseTailCounts[threshold]++;
      if (result.bonusWin > threshold) featureTailCounts[threshold]++;
    }
  }
  const mean = totalWin / spins;
  const variance = sumSquares / spins - mean * mean;
  return {
    status: "independent simulator tail complete",
    spins,
    seed,
    rtp: round4(totalWin / spins),
    baseRtp: round4(baseWin / spins),
    featureRtp: round4(featureWin / spins),
    hitRate: round4(hits / spins),
    hitFrequency: frequency(spins, hits),
    baseHitRate: round4(baseHits / spins),
    baseHitFrequency: frequency(spins, baseHits),
    bonusTriggerRate: round4(bonusTriggers / spins),
    bonusTriggerFrequency: frequency(spins, bonusTriggers),
    wheelEventRate: round4(wheelEventCount / spins),
    wheelEventFrequency: frequency(spins, wheelEventCount),
    maxWin: round4(maxWin),
    maxBaseWin: round4(maxBaseWin),
    maxFeatureWin: round4(maxFeatureWin),
    baseOverCapCount,
    variance: round4(variance),
    stdDev: round4(Math.sqrt(Math.max(0, variance))),
    tails: thresholds.map((threshold) => ({
      threshold: `>${threshold}x`,
      totalCount: tailCounts[threshold],
      totalFrequency: frequency(spins, tailCounts[threshold]),
      baseCount: baseTailCounts[threshold],
      baseFrequency: frequency(spins, baseTailCounts[threshold]),
      featureCount: featureTailCounts[threshold],
      featureFrequency: frequency(spins, featureTailCounts[threshold]),
    })),
    constants: {
      baseGameMaxWinMultiplier: math.BASE_GAME_MAX_WIN_MULTIPLIER,
      baseGameMaxWheelMeter: math.BASE_GAME_MAX_WHEEL_METER,
      baseLowSymbolStripExtensionLength: math.BASE_LOW_SYMBOL_STRIP_EXTENSION.length,
      bonusLowSymbolStripExtensionLength: math.BONUS_LOW_SYMBOL_STRIP_EXTENSION.length,
      v1PayScale: math.V1_PAY_SCALE,
    },
  };
}

if (process.argv[2] === "simulate") {
  const spins = Number(process.argv[3] || 1000000);
  const seed = Number(process.argv[4] || 0x51515001);
  const summary = runIndependentTail(spins, seed);
  const outDir = path.join(root, "test-results");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `shogun-spinners-independent-tail-${spins}.json`);
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Wrote ${outPath}`);
} else {
  const paritySpins = Number(process.argv[2] || 5000);
  const seed = Number(process.argv[3] || 0x51515001);
  const liveRandom = makeRng(seed);
  const independentRandom = makeRng(seed);
  let triggers = 0;
  let totalWin = 0;
  let maxBasePart = 0;
  let baseOverCapCount = 0;

  for (let i = 0; i < paritySpins; i++) {
    const live = normalize(math.playPaidSpin(liveRandom, 1));
    const independent = normalize(playPaidSpin(independentRandom, 1));
    assert.deepEqual(independent, live, `independent simulator diverged on paid spin ${i}`);
    const basePart = roundMoney(live.totalWin - live.bonusWin);
    if (basePart > maxBasePart) maxBasePart = basePart;
    if (basePart > math.BASE_GAME_MAX_WIN_MULTIPLIER) baseOverCapCount++;
    if (live.bonusTriggered) triggers++;
    totalWin += live.totalWin;
  }

  const featureParityRounds = Number(process.argv[4] || 1000);
  const liveFeatureRandom = makeRng(seed ^ 0x7f4a7c15);
  const independentFeatureRandom = makeRng(seed ^ 0x7f4a7c15);
  let featureTotalWin = 0;
  for (let i = 0; i < featureParityRounds; i++) {
    const live = normalize(math.buyBonus(liveFeatureRandom, 1));
    const independentFeature = playBonusFeature(independentFeatureRandom, 1);
    const independent = normalize({
      cost: roundMoney(math.BUY_BONUS_PRICE_MULTIPLIER),
      totalWin: independentFeature.totalWin,
      freeSpins: independentFeature.freeSpins,
    });
    assert.deepEqual(independent, live, `independent simulator diverged on buy feature ${i}`);
    featureTotalWin += live.totalWin;
  }

  console.log(JSON.stringify({
    status: "independent simulator parity passed",
    paritySpins,
    seed,
    paidSpinRtpInParitySample: round4(totalWin / paritySpins),
    paidSpinBonusTriggers: triggers,
    maxBasePart,
    baseOverCapCount,
    featureParityRounds,
    featureAverageWin: round4(featureTotalWin / featureParityRounds),
    coverage: [
      "independent reel-stop sampling",
      "independent Shuriken placement and wheel outcome picks",
      "independent paid-spin scoring and cap logic",
      "independent bonus feature sequencing",
      "same-seed full-result parity against live math",
    ],
  }, null, 2));
}
