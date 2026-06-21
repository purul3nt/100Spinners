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
  return math.roundMoney(paytablePay * bet * math.BONUS_FEATURE_PAY_SCALE);
}

function assertBonusDisplayParity(spin, bet = 1, label = "bonus free spin") {
  let paylineTotal = 0;
  let paytableTotal = 0;
  for (const win of spin.lineWins) {
    const expectedFromPaytable = bonusPaytableAmount(win, bet);
    assert.equal(
      win.amount,
      expectedFromPaytable,
      `${label}: line ${win.lineIndex} ${win.symbol} ${win.count}OAK should equal bonus-scaled paytable win`,
    );
    paylineTotal = math.roundMoney(paylineTotal + win.amount);
    paytableTotal = math.roundMoney(paytableTotal + expectedFromPaytable);
  }

  assert.equal(spin.baseWin, paylineTotal, `${label}: baseWin should equal summed payline wins`);
  assert.equal(spin.baseWin, paytableTotal, `${label}: baseWin should equal summed paytable wins`);

  const displayedWin = spin.totalWin;
  const expectedDisplayedWin = spin.baseWin > 0 && spin.multiplierMeter > 0
    ? math.roundMoney(spin.baseWin * spin.multiplierMeter)
    : spin.baseWin;
  assert.equal(
    displayedWin,
    expectedDisplayedWin,
    `${label}: displayed WIN should equal payline/paytable win after active bonus meter`,
  );

  const animationMultiplier = spin.multiplierMeter > 0 ? spin.multiplierMeter : 1;
  const animatedWinTotal = spin.lineWins.reduce(
    (sum, win) => math.roundMoney(sum + math.roundMoney(win.amount * animationMultiplier)),
    0,
  );
  assert.equal(
    animatedWinTotal,
    expectedDisplayedWin,
    `${label}: winning animation callouts should sum to displayed WIN after active bonus meter`,
  );
}

assert.ok(
  slotSceneSource.includes("this.lastWin = spin.totalWin;") &&
    slotSceneSource.includes("this.winText.setText(`WIN ${this.lastWin.toFixed(2)}`);"),
  "SlotScene should display each bonus spin's spin.totalWin through the WIN field",
);

assert.ok(
  slotSceneSource.includes("private async presentWins(wins: LineWin[], presentationMultiplier = 1)") &&
    slotSceneSource.includes("amount: this.roundMoney(win.amount * presentationMultiplier)") &&
    slotSceneSource.includes("await this.presentWins(spin.lineWins, spin.multiplierMeter > 0 ? spin.multiplierMeter : 1);"),
  "SlotScene should pass the active bonus meter into winning animation callouts",
);

const noMeterGrid = [
  [{ code: "H1" }, { code: "L1" }, { code: "L2" }, { code: "L3" }],
  [{ code: "H1" }, { code: "L2" }, { code: "L3" }, { code: "L4" }],
  [{ code: "H1" }, { code: "L3" }, { code: "L4" }, { code: "L5" }],
  [{ code: "L5" }, { code: "L4" }, { code: "L3" }, { code: "L2" }],
  [{ code: "L4" }, { code: "L5" }, { code: "L2" }, { code: "L1" }],
];
const noMeterScore = math.scoreGrid(noMeterGrid, 1);
assertBonusDisplayParity({
  lineWins: noMeterScore.lineWins.map((win) => ({ ...win, amount: math.roundMoney(win.amount * math.BONUS_FEATURE_PAY_SCALE) })),
  baseWin: math.roundMoney(noMeterScore.baseWin * math.BONUS_FEATURE_PAY_SCALE),
  multiplierMeter: 0,
  totalWin: math.roundMoney(noMeterScore.baseWin * math.BONUS_FEATURE_PAY_SCALE),
}, 1, "hand-authored no-meter bonus spin");

const sampledFeatures = 250;
let sampledFreeSpins = 0;
let sampledPayingFreeSpins = 0;
let sampledMeteredPayingFreeSpins = 0;

for (let featureIndex = 0; featureIndex < sampledFeatures; featureIndex++) {
  const tier = featureIndex % 17 === 0 ? 2 : 1;
  const feature = math.buyBonus(seededRandom(0xb050000 + featureIndex), 1, tier);
  for (let spinIndex = 0; spinIndex < feature.freeSpins.length; spinIndex++) {
    const spin = feature.freeSpins[spinIndex];
    sampledFreeSpins++;
    if (spin.baseWin > 0) sampledPayingFreeSpins++;
    if (spin.baseWin > 0 && spin.multiplierMeter > 0) sampledMeteredPayingFreeSpins++;
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
    "bonus payline win equals bonus-scaled paytable win",
    "bonus baseWin equals summed paylines",
    "displayed WIN equals bonus payline/paytable win after meter",
    "winning animation callouts sum to displayed WIN after meter",
    "TOTAL WIN equals summed displayed free-spin wins",
  ],
}, null, 2));
