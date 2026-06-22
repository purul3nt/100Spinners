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
const slotSceneSource = fs.readFileSync(path.join(root, "src/scenes/SlotScene.ts"), "utf8");

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function bonusPaytableAmount(win, bet = 1) {
  const symbol = math.SYMBOL_BY_CODE[win.symbol];
  const paytablePay = math.scaledSymbolPay(symbol, win.count);
  return math.roundMoney(paytablePay * bet);
}

function assertBonusDisplayParity(spin, bet = 1, label = "bonus free spin") {
  let paylineTotal = 0;
  let paytableTotal = 0;
  for (const win of spin.lineWins) {
    const expectedFromPaytable = bonusPaytableAmount(win, bet);
    assert.equal(
      win.amount,
      expectedFromPaytable,
      `${label}: line ${win.lineIndex} ${win.symbol} ${win.count}OAK should equal the same paytable win used in base spins`,
    );
    paylineTotal += win.amount;
    paytableTotal += expectedFromPaytable;
  }
  paylineTotal = math.roundMoney(paylineTotal);
  paytableTotal = math.roundMoney(paytableTotal);

  assert.equal(spin.baseWin, paylineTotal, `${label}: baseWin should equal summed payline wins`);
  assert.equal(spin.baseWin, paytableTotal, `${label}: baseWin should equal summed paytable wins`);

  const displayedWin = spin.totalWin;
  const expectedShurikenWin = spin.baseWin > 0 && spin.multiplierMeter > 0
    ? math.roundMoney(spin.baseWin * spin.multiplierMeter)
    : 0;
  const expectedDisplayedWin = math.roundMoney(spin.baseWin + expectedShurikenWin + (spin.baseWheelCashWin || 0));
  assert.equal(
    spin.shurikenWin,
    expectedShurikenWin,
    `${label}: shuriken win should be separate from base line win`,
  );
  assert.equal(
    displayedWin,
    expectedDisplayedWin,
    `${label}: displayed WIN should equal base line win plus separate shuriken win plus wheel cash`,
  );

  const animatedWinTotal = spin.lineWins.reduce(
    (sum, win) => math.roundMoney(sum + win.amount),
    0,
  );
  assert.equal(
    animatedWinTotal,
    spin.baseWin,
    `${label}: line-winning animation callouts should not include shuriken win`,
  );
}

assert.ok(
  slotSceneSource.includes("this.lastWin = spin.baseWin;") &&
    slotSceneSource.includes("this.winText.setText(`WIN ${this.lastWin.toFixed(2)}`);"),
  "SlotScene should display each bonus spin's base line win before shuriken presentation",
);

assert.ok(
  slotSceneSource.includes("await this.presentWins(spin.lineWins);") &&
    slotSceneSource.includes("await this.showWheelSequence(spin.wheelEvents, spin.shurikenWin);"),
  "SlotScene should present line wins separately from shuriken wins",
);

const bonusCollectBeforeIndex = slotSceneSource.indexOf("this.updateBonusCollectDisplay(collected, index + 1, freeSpins.length);");
const bonusPresentIndex = slotSceneSource.indexOf("await this.presentWins(spin.lineWins);", bonusCollectBeforeIndex);
const bonusWheelIndex = slotSceneSource.indexOf("await this.showWheelSequence(spin.wheelEvents, spin.shurikenWin);", bonusPresentIndex);
const bonusCollectAfterIndex = slotSceneSource.indexOf("collected += spin.totalWin;", bonusWheelIndex);
assert.ok(
  bonusCollectBeforeIndex > 0 && bonusPresentIndex > bonusCollectBeforeIndex && bonusWheelIndex > bonusPresentIndex && bonusCollectAfterIndex > bonusWheelIndex,
  "bonus total win should increment after line and shuriken presentation",
);

const noMeterGrid = [
  [{ code: "H1" }, { code: "L1" }, { code: "L2" }, { code: "L3" }],
  [{ code: "H1" }, { code: "L2" }, { code: "L3" }, { code: "L4" }],
  [{ code: "H1" }, { code: "L3" }, { code: "L4" }, { code: "L5" }],
  [{ code: "L5" }, { code: "L4" }, { code: "L3" }, { code: "L2" }],
  [{ code: "L4" }, { code: "L5" }, { code: "L2" }, { code: "L1" }],
];
const noMeterScore = math.scoreGrid(noMeterGrid, 1);
const noMeterLineWins = noMeterScore.lineWins;
const noMeterBaseWin = math.roundMoney(noMeterLineWins.reduce((sum, win) => sum + win.amount, 0));
assertBonusDisplayParity({
  lineWins: noMeterLineWins,
  baseWin: noMeterBaseWin,
  shurikenWin: 0,
  multiplierMeter: 0,
  totalWin: noMeterBaseWin,
}, 1, "hand-authored no-meter bonus spin");

const sampledFeatures = 250;
let sampledFreeSpins = 0;
let sampledPayingFreeSpins = 0;
let sampledMeteredPayingFreeSpins = 0;

for (let featureIndex = 0; featureIndex < sampledFeatures; featureIndex++) {
  const feature = math.buyBonus(seededRandom(0xb050000 + featureIndex), 1);
  for (let spinIndex = 0; spinIndex < feature.freeSpins.length; spinIndex++) {
    const spin = feature.freeSpins[spinIndex];
    sampledFreeSpins++;
    if (spin.baseWin > 0) sampledPayingFreeSpins++;
    if (spin.baseWin > 0 && spin.multiplierMeter > 0) sampledMeteredPayingFreeSpins++;
    assert.equal(
      spin.multiplierMeter,
      math.resolveWheelEvents(spin.grid, 0).meter,
      `feature ${featureIndex} spin ${spinIndex}: shuriken meter should reset at the start of each free spin`,
    );
    assertBonusDisplayParity(spin, 1, `feature ${featureIndex} spin ${spinIndex}`);
  }
  const summedDisplayed = feature.freeSpins.reduce((sum, spin) => math.roundMoney(sum + spin.totalWin), 0);
  assert.equal(feature.totalWin, summedDisplayed, `feature ${featureIndex}: TOTAL WIN should equal summed displayed free-spin wins`);
}

assert.ok(sampledPayingFreeSpins > 0, "sample should include paying free spins");
assert.ok(sampledMeteredPayingFreeSpins > 0, "sample should include metered paying free spins");

console.log(JSON.stringify({
  status: "bonus win display parity passed",
  sampledFeatures,
  sampledFreeSpins,
  sampledPayingFreeSpins,
  sampledMeteredPayingFreeSpins,
  checks: [
    "bonus payline win equals the same paytable win used in base spins",
    "bonus baseWin equals summed paylines",
    "displayed WIN equals base line win plus separate shuriken win",
    "line-winning animation callouts exclude shuriken win",
    "free-spin shuriken meters reset per spin",
    "TOTAL WIN increments after line and shuriken presentation",
    "TOTAL WIN equals summed displayed free-spin wins",
  ],
}, null, 2));
