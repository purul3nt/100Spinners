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

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function scoreGridIndependently(grid, bet = 1) {
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
      const symbol = math.SYMBOLS.find((item) => item.code === first);
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

function resolveWheelEventsIndependently(grid, startingMeter = 0, maxMeter = Infinity) {
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
    events.push({
      col,
      row,
      color: cell.wheelColor,
      outcome,
      meterBefore,
      meterAfter: meter,
      applied,
    });
  }
  return { meter, events, bonusShurikens };
}

function baseWheelCashIndependently(events, bet = 1) {
  const rawCash = events.reduce((sum, event) => {
    if (event.outcome.kind === "bonus") return sum;
    return sum + (event.outcome.value || 0);
  }, 0);
  return roundMoney(rawCash * math.BASE_WHEEL_CASH_SCALE * bet);
}

function reconstructBonusFeatureIndependently(freeSpins, bet = 1, tier = 1) {
  let totalWin = 0;
  const reconstructedFreeSpins = [];
  for (const freeSpin of freeSpins) {
    const scored = scoreGridIndependently(freeSpin.grid, bet);
    const resolved = resolveWheelEventsIndependently(freeSpin.grid, 0);
    const scaledLineWins = scored.lineWins.map((win) => ({ ...win, amount: roundMoney(win.amount * math.BONUS_FEATURE_PAY_SCALE) }));
    const bonusBaseWin = roundMoney(scaledLineWins.reduce((sum, win) => sum + win.amount, 0));
    const shurikenWin = bonusBaseWin > 0 && resolved.meter > 0 ? roundMoney(bonusBaseWin * resolved.meter) : 0;
    const spinTotal = roundMoney(bonusBaseWin + shurikenWin);
    totalWin = roundMoney(totalWin + spinTotal);
    reconstructedFreeSpins.push({
      baseWin: bonusBaseWin,
      shurikenWin,
      totalWin: spinTotal,
      multiplierMeter: resolved.meter,
      wheelEvents: resolved.events,
      bonusTier: tier,
    });
  }
  return { totalWin, freeSpins: reconstructedFreeSpins };
}

function reconstructPaidSpinIndependently(result, bet = 1) {
  const scored = scoreGridIndependently(result.grid, bet);
  const resolved = resolveWheelEventsIndependently(result.grid, 0, math.BASE_GAME_MAX_WHEEL_METER);
  const baseWheelCashWin = baseWheelCashIndependently(resolved.events, bet);
  const bonusTier = Math.min(3, resolved.bonusShurikens);
  const lineShurikenWin = scored.baseWin > 0 && resolved.meter > 0 ? roundMoney(scored.baseWin * resolved.meter) : 0;
  const uncappedPaidSpinWin = roundMoney(scored.baseWin + lineShurikenWin + baseWheelCashWin);
  const paidSpinWin = roundMoney(Math.min(uncappedPaidSpinWin, bet * math.BASE_GAME_MAX_WIN_MULTIPLIER));
  const shurikenWin = roundMoney(Math.max(0, paidSpinWin - scored.baseWin));
  const bonus = bonusTier > 0
    ? reconstructBonusFeatureIndependently(result.freeSpins || [], bet, bonusTier)
    : { totalWin: 0, freeSpins: [] };
  return {
    lineWins: scored.lineWins,
    baseWin: scored.baseWin,
    baseWheelCashWin,
    shurikenWin,
    wheelMultiplier: resolved.meter,
    multiplierMeter: resolved.meter,
    wheelEvents: resolved.events,
    bonusTier,
    totalWin: roundMoney(paidSpinWin + bonus.totalWin),
    bonusTriggered: bonusTier > 0,
    bonusWin: roundMoney(bonus.totalWin),
    freeSpins: bonus.freeSpins,
  };
}

function assertScoreParity(grid, bet = 1) {
  assert.equal(JSON.stringify(math.scoreGrid(grid, bet)), JSON.stringify(scoreGridIndependently(grid, bet)));
}

function assertWheelParity(grid, startingMeter = 0, maxMeter = Infinity) {
  const actual = math.resolveWheelEvents(grid, startingMeter, maxMeter);
  const expected = resolveWheelEventsIndependently(grid, startingMeter, maxMeter);
  assert.equal(JSON.stringify(actual), JSON.stringify(expected));
  assert.equal(math.calculateBaseWheelCashWin(actual.events, 1), baseWheelCashIndependently(expected.events, 1));
}

const fixedGrid = [
  [{ code: "L1" }, { code: "H1" }, { code: "L2" }, { code: "L3" }],
  [{ code: "L1" }, { code: "H1" }, { code: "L3" }, { code: "L4" }],
  [{ code: "L1" }, { code: "H1" }, { code: "L4" }, { code: "L5" }],
  [{ code: "L2" }, { code: "H2" }, { code: "L5" }, { code: "L1" }],
  [{ code: "L3" }, { code: "H3" }, { code: "L1" }, { code: "L2" }],
];
assertScoreParity(fixedGrid);

const wheelGrid = [
  [{ code: "W1", shuriken: true, wheelColor: "blue", wheelOutcome: { kind: "add", value: 100 } }, { code: "L1" }, { code: "L2" }, { code: "L3" }],
  [{ code: "L1" }, { code: "L2" }, { code: "L3" }, { code: "L4" }],
  [{ code: "W1", shuriken: true, wheelColor: "blue", wheelOutcome: { kind: "multiply", value: 10 } }, { code: "L3" }, { code: "L4" }, { code: "L5" }],
  [{ code: "L5" }, { code: "L4" }, { code: "L3" }, { code: "L2" }],
  [{ code: "W1", shuriken: true, wheelColor: "blue", wheelOutcome: { kind: "bonus" } }, { code: "L5" }, { code: "L2" }, { code: "L1" }],
];
assertWheelParity(wheelGrid, 0, math.BASE_GAME_MAX_WHEEL_METER);

let seed = 0x51a7c0de;
function rnd() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 4294967296;
}

const randomGridChecks = 5000;
for (let i = 0; i < randomGridChecks; i++) {
  const tier = i % 11 === 0 ? 1 : 0;
  const grid = math.createGrid(rnd, tier);
  assertScoreParity(grid);
  assertWheelParity(grid, 0, tier === 0 ? math.BASE_GAME_MAX_WHEEL_METER : Infinity);
}

const fullPaidSpinChecks = 2500;
let triggeredFeatureChecks = 0;
for (let i = 0; i < fullPaidSpinChecks; i++) {
  const result = math.playPaidSpin(rnd, 1);
  const reconstructed = reconstructPaidSpinIndependently(result, 1);
  assert.equal(JSON.stringify(result.lineWins), JSON.stringify(reconstructed.lineWins), "paid-spin line wins must reconstruct from grid");
  assert.equal(result.baseWin, reconstructed.baseWin, "paid-spin base win must reconstruct from grid");
  assert.equal(result.baseWheelCashWin, reconstructed.baseWheelCashWin, "paid-spin base cash must reconstruct from wheel events");
  assert.equal(result.wheelMultiplier, reconstructed.wheelMultiplier, "paid-spin wheel meter must reconstruct from wheel events");
  assert.equal(result.multiplierMeter, reconstructed.multiplierMeter, "paid-spin multiplier meter must reconstruct from wheel events");
  assert.equal(JSON.stringify(result.wheelEvents), JSON.stringify(reconstructed.wheelEvents), "paid-spin wheel events must reconstruct from grid");
  assert.equal(result.bonusTier, reconstructed.bonusTier, "paid-spin bonus tier must reconstruct from bonus shuriken outcomes");
  assert.equal(result.bonusTriggered, reconstructed.bonusTriggered, "paid-spin bonus trigger must reconstruct from bonus shuriken outcomes");
  assert.equal(result.bonusWin, reconstructed.bonusWin, "paid-spin bonus win must reconstruct from emitted free-spin grids");
  assert.equal(result.totalWin, reconstructed.totalWin, "paid-spin total win must reconstruct from base and feature components");
  if (result.bonusTriggered) {
    triggeredFeatureChecks++;
    assert.equal(result.freeSpins.length, math.FREE_SPINS, "triggered feature must emit the configured free-spin count");
    for (let freeSpinIndex = 0; freeSpinIndex < result.freeSpins.length; freeSpinIndex++) {
      const actualFreeSpin = result.freeSpins[freeSpinIndex];
      const expectedFreeSpin = reconstructed.freeSpins[freeSpinIndex];
      assert.equal(actualFreeSpin.baseWin, expectedFreeSpin.baseWin, "free-spin base win must reconstruct from grid");
      assert.equal(actualFreeSpin.shurikenWin, expectedFreeSpin.shurikenWin, "free-spin Shuriken win must reconstruct separately from base win");
      assert.equal(actualFreeSpin.totalWin, expectedFreeSpin.totalWin, "free-spin total must reconstruct from grid and meter");
      assert.equal(actualFreeSpin.multiplierMeter, expectedFreeSpin.multiplierMeter, "free-spin meter must reconstruct per spin");
      assert.equal(JSON.stringify(actualFreeSpin.wheelEvents), JSON.stringify(expectedFreeSpin.wheelEvents), "free-spin wheel events must reconstruct from grid");
    }
  }
}

const directFeatureChecks = 500;
for (let i = 0; i < directFeatureChecks; i++) {
  const tier = (i % 13 === 0 ? 2 : 1);
  const feature = math.buyBonus(rnd, 1, tier);
  const reconstructed = reconstructBonusFeatureIndependently(feature.freeSpins, 1, tier);
  assert.equal(feature.cost, math.BUY_BONUS_PRICE_MULTIPLIER, "buy bonus cost must match configured multiplier at 1x bet");
  assert.equal(feature.totalWin, reconstructed.totalWin, "buy-bonus feature total must reconstruct from emitted free-spin grids");
  assert.equal(feature.bonusTier, tier, "buy-bonus tier must preserve requested tier");
  for (let freeSpinIndex = 0; freeSpinIndex < feature.freeSpins.length; freeSpinIndex++) {
    const actualFreeSpin = feature.freeSpins[freeSpinIndex];
    const expectedFreeSpin = reconstructed.freeSpins[freeSpinIndex];
    assert.equal(actualFreeSpin.baseWin, expectedFreeSpin.baseWin, "buy-bonus free-spin base win must reconstruct from grid");
    assert.equal(actualFreeSpin.shurikenWin, expectedFreeSpin.shurikenWin, "buy-bonus free-spin Shuriken win must reconstruct separately from base win");
    assert.equal(actualFreeSpin.totalWin, expectedFreeSpin.totalWin, "buy-bonus free-spin total must reconstruct from grid and meter");
    assert.equal(actualFreeSpin.multiplierMeter, expectedFreeSpin.multiplierMeter, "buy-bonus free-spin meter must reconstruct per spin");
    assert.equal(JSON.stringify(actualFreeSpin.wheelEvents), JSON.stringify(expectedFreeSpin.wheelEvents), "buy-bonus free-spin wheel events must reconstruct from grid");
  }
}

const cappedGridScore = math.scoreGrid(wheelGrid, 1);
const cappedWheel = math.resolveWheelEvents(wheelGrid, 0, math.BASE_GAME_MAX_WHEEL_METER);
const uncappedShurikenPart = cappedGridScore.baseWin > 0 && cappedWheel.meter > 0
  ? roundMoney(cappedGridScore.baseWin * cappedWheel.meter)
  : 0;
const paidPart = roundMoney(Math.min(
  roundMoney(cappedGridScore.baseWin + uncappedShurikenPart + math.calculateBaseWheelCashWin(cappedWheel.events, 1)),
  math.BASE_GAME_MAX_WIN_MULTIPLIER,
));
assert.ok(paidPart <= math.BASE_GAME_MAX_WIN_MULTIPLIER, "independent cap audit should respect base max win");

console.log(JSON.stringify({
  status: "independent core parity passed",
  randomGridChecks,
  fullPaidSpinChecks,
  triggeredFeatureChecks,
  directFeatureChecks,
  covered: [
    "payline scoring",
    "scaled symbol pays",
    "wheel event ordering",
    "base meter cap",
    "base Shuriken cash",
    "base paid-win cap",
    "complete paid-spin reconstruction",
    "feature free-spin reconstruction from emitted grids",
  ],
}, null, 2));
