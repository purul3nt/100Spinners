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
const mathSource = fs.readFileSync(path.join(root, "src/shogunSpinnersMath.ts"), "utf8");
const par = JSON.parse(fs.readFileSync(path.join(root, "par/1000-shogun-spinners-par-latest.json"), "utf8"));
const slotSceneSource = fs.readFileSync(path.join(root, "src/scenes/SlotScene.ts"), "utf8");
const splashSceneSource = fs.readFileSync(path.join(root, "src/scenes/SplashScene.ts"), "utf8");

assert.equal(math.COLS, 5, "1000 Shogun Spinners should use five reels");
assert.equal(math.ROWS, 4, "1000 Shogun Spinners should use four visible rows");
assert.equal(math.PAYLINES.length, 14, "attached blueprint has 14 paylines");
assert.equal(math.BUY_BONUS_PRICE_MULTIPLIER, 100, "bonus buy should cost 100x bet");
assert.equal(Math.max(...math.BONUS_MULTIPLIERS), 1000, "wheel max multiplier should be 1000x");
assert.ok(math.BASE_SHURIKEN_CELL_CHANCE > 0, "base Shuriken landing chance should be configured");
assert.ok(math.BONUS_BLUE_SHURIKEN_CELL_CHANCE > 0, "bonus Blue Shuriken landing chance should be configured");
assert.ok(math.BONUS_RED_SHURIKEN_CELL_CHANCE > 0, "bonus Red Shuriken landing chance should be configured");
assert.ok(math.BASE_WHEEL_CASH_SCALE > 0, "base Shuriken cash scale should be configured");
assert.ok(!("BONUS_TIER_1_BLUE_CELL_CHANCE" in math), "live game should not name the single bonus mode as a tier");
assert.ok(!("BONUS_TIER_1_RED_CELL_CHANCE" in math), "live game should not name the single bonus mode as a tier");
assert.ok(!("BONUS_TIER_2_RED_CELL_CHANCE" in math), "live game should not expose a Tier 2 bonus mode");
assert.ok(!("BONUS_TIER_3_RED_CELL_CHANCE" in math), "live game should not expose a Tier 3 bonus mode");
assert.equal(math.BASE_LOW_SYMBOL_STRIP_EXTENSION.length, 35, "base low-pay lift should come from explicit reel strips");
assert.equal(math.BONUS_LOW_SYMBOL_STRIP_EXTENSION.length, 500, "bonus hit-rate lift should come from explicit bonus reel strips");
assert.equal(math.REEL_STRIPS[0].length, 111, "base reel 1 should include the low-symbol strip extension");
assert.equal(math.REEL_STRIPS[1].length, 110, "base reel 2 should include the low-symbol strip extension");
assert.equal(math.REEL_STRIPS[2].length, 111, "base reel 3 should include the low-symbol strip extension");
assert.equal(math.BONUS_REEL_STRIPS[0].length, 611, "bonus reel 1 should include the bonus low-symbol strip extension");
assert.equal(math.BONUS_REEL_STRIPS[1].length, 610, "bonus reel 2 should include the bonus low-symbol strip extension");
assert.equal(math.BONUS_REEL_STRIPS[2].length, 611, "bonus reel 3 should include the bonus low-symbol strip extension");
assert.ok(!("BASE_LOW_PAY_ASSIST_CHANCE" in math), "base low-pay lift should not use a losing-spin assist");
assert.ok(!("BONUS_MODE_HIT_ASSIST_CHANCE" in math), "bonus hit-rate lift should not use a losing-spin assist");
assert.ok(!("WHEEL_EVENT_CHANCE" in math), "wheel spins should not use a random wheel-event gate");
assert.ok(!("BONUS_FEATURE_PAY_SCALE" in math), "bonus symbols should not use a separate feature pay scale");
assert.equal(par.constants.v1PayScale, math.V1_PAY_SCALE, "PAR v1 pay scale should match live math");
assert.ok(!("bonusFeaturePayScale" in par.constants), "PAR should not document a separate bonus symbol pay scale");
assert.equal(par.constants.baseWheelCashScale, math.BASE_WHEEL_CASH_SCALE, "PAR base wheel cash scale should match live math");
assert.equal(par.constants.bonusBlueShurikenCellChance, math.BONUS_BLUE_SHURIKEN_CELL_CHANCE, "PAR bonus Blue Shuriken chance should match live math");
assert.equal(par.constants.bonusRedShurikenCellChance, math.BONUS_RED_SHURIKEN_CELL_CHANCE, "PAR bonus Red Shuriken chance should match live math");
assert.ok(!("bonusTier1BlueCellChance" in par.constants), "PAR should not document the single bonus mode as a tier");
assert.ok(!("bonusTier1RedCellChance" in par.constants), "PAR should not document the single bonus mode as a tier");
assert.equal(par.constants.baseLowSymbolStripExtensionLength, math.BASE_LOW_SYMBOL_STRIP_EXTENSION.length, "PAR base strip extension length should match live math");
assert.equal(par.constants.bonusLowSymbolStripExtensionLength, math.BONUS_LOW_SYMBOL_STRIP_EXTENSION.length, "PAR bonus strip extension length should match live math");
assert.equal(JSON.stringify(par.constants.blueWheelKindWeights), JSON.stringify(math.BLUE_WHEEL_KIND_WEIGHTS), "PAR blue wheel kind weights should match live math");
assert.equal(JSON.stringify(par.constants.blueWheelAddWeights), JSON.stringify(math.BLUE_WHEEL_ADD_WEIGHTS), "PAR blue wheel add weights should match live math");
assert.equal(JSON.stringify(par.constants.blueWheelMultiplyWeights), JSON.stringify(math.BLUE_WHEEL_MULTIPLY_WEIGHTS), "PAR blue wheel multiply weights should match live math");
assert.equal(JSON.stringify(par.constants.redWheelKindWeights), JSON.stringify(math.RED_WHEEL_KIND_WEIGHTS), "PAR red wheel kind weights should match live math");
assert.equal(JSON.stringify(par.constants.redWheelAddWeights), JSON.stringify(math.RED_WHEEL_ADD_WEIGHTS), "PAR red wheel add weights should match live math");
assert.equal(JSON.stringify(par.constants.redWheelMultiplyWeights), JSON.stringify(math.RED_WHEEL_MULTIPLY_WEIGHTS), "PAR red wheel multiply weights should match live math");
assert.equal(par.summary.baseCapAudit.maxBasePart, math.BASE_GAME_MAX_WIN_MULTIPLIER, "PAR base cap audit should match live base max win cap");
assert.ok(!("bonusModeHitAssistChance" in par.constants), "PAR should not document a removed bonus hit assist");
assert.ok(
  par.certReadiness.baseGameStatus.includes("No base losing-spin assist") &&
    par.certReadiness.bonusGameStatus.includes("No bonus losing-spin assist"),
  "PAR cert readiness notes should document assist-free base and bonus math",
);

const grid = [
  [{ code: "H1" }, { code: "L1" }, { code: "L2" }, { code: "L3" }],
  [{ code: "H1" }, { code: "L2" }, { code: "L3" }, { code: "L4" }],
  [{ code: "H1" }, { code: "L3" }, { code: "L4" }, { code: "L5" }],
  [{ code: "L5" }, { code: "L4" }, { code: "L3" }, { code: "L2" }],
  [{ code: "L4" }, { code: "L5" }, { code: "L2" }, { code: "L1" }],
];
const scored = math.scoreGrid(grid, 1);
const topLine = scored.lineWins.find((win) => win.lineIndex === 0);
assert.ok(topLine, "top row should score an H1 3OAK line");
assert.equal(topLine.symbol, "H1", "top line should pay H1");
const h1 = math.SYMBOL_BY_CODE.H1;
const expectedH1Pay3 = math.roundMoney(h1.pay3 * math.V1_PAY_SCALE);
const expectedH1Pay4 = math.roundMoney(h1.pay4 * math.V1_PAY_SCALE);
const expectedH1Pay5 = math.roundMoney(h1.pay5 * math.V1_PAY_SCALE);
assert.equal(topLine.amount, expectedH1Pay3, "H1 3OAK uses the scaled v1 pay");
assert.equal(math.scaledSymbolPay(h1, 3), expectedH1Pay3, "paytable helper should expose scaled H1 3OAK");
assert.equal(math.scaledSymbolPay(h1, 4), expectedH1Pay4, "paytable helper should expose scaled H1 4OAK");
assert.equal(math.scaledSymbolPay(h1, 5), expectedH1Pay5, "paytable helper should expose scaled H1 5OAK");

let calls = 0;
const deterministic = () => {
  calls++;
  return (calls % 97) / 97;
};
const spin = math.playPaidSpin(deterministic, 1);
assert.equal(spin.grid.length, 5, "spin should return five columns");
assert.equal(spin.grid[0].length, 4, "spin should return four rows per column");

const buy = math.buyBonus(deterministic, 1);
assert.equal(buy.cost, 100, "bonus buy cost should be 100x bet");
assert.equal(buy.freeSpins.length, 10, "bonus buy should resolve 10 free spins");
assert.ok(!("bonusTier" in buy), "bonus buy should not expose a tier field");

let bonusSampleSeed = 0x1000b0;
const bonusSampleRandom = () => {
  bonusSampleSeed ^= bonusSampleSeed << 13;
  bonusSampleSeed ^= bonusSampleSeed >>> 17;
  bonusSampleSeed ^= bonusSampleSeed << 5;
  return (bonusSampleSeed >>> 0) / 4294967296;
};
const bonusSampleRounds = 20000;
let bonusSampleTotal = 0;
for (let i = 0; i < bonusSampleRounds; i++) {
  bonusSampleTotal += math.buyBonus(bonusSampleRandom, 1).totalWin;
}
const bonusSampleAverage = bonusSampleTotal / bonusSampleRounds;
assert.ok(
  bonusSampleAverage >= 90 && bonusSampleAverage <= 105,
  `bonus average should land in the tuned range; got ${bonusSampleAverage.toFixed(4)}x`,
);

const wheelGrid = [
  [{ code: "W1", shuriken: true, wheelColor: "blue", wheelOutcome: { kind: "add", value: 10 } }, { code: "L1" }, { code: "L2" }, { code: "L3" }],
  [{ code: "H1" }, { code: "L2" }, { code: "L3" }, { code: "L4" }],
  [{ code: "W1", shuriken: true, wheelColor: "blue", wheelOutcome: { kind: "multiply", value: 5 } }, { code: "L3" }, { code: "L4" }, { code: "L5" }],
  [{ code: "L5" }, { code: "L4" }, { code: "L3" }, { code: "L2" }],
  [{ code: "W1", shuriken: true, wheelColor: "blue", wheelOutcome: { kind: "bonus" } }, { code: "L5" }, { code: "L2" }, { code: "L1" }],
];
const wheelResolved = math.resolveWheelEvents(wheelGrid, 0);
assert.equal(wheelResolved.meter, 50, "wheel outcomes should collect left-to-right into a running multiplier meter");
assert.equal(wheelResolved.bonusShurikens, 1, "Blue Wheel bonus outcome should count toward bonus tier");
assert.equal(
  JSON.stringify(wheelResolved.events.map((event) => event.col)),
  JSON.stringify([0, 2, 4]),
  "multiple activated wheels should resolve left to right",
);
assert.equal(
  math.calculateBaseWheelCashWin(wheelResolved.events, 1),
  math.roundMoney((10 + 5) * math.BASE_WHEEL_CASH_SCALE),
  "base non-bonus Shuriken outcomes should award standalone cash",
);
const loneMultiplyGrid = [
  [{ code: "W1", shuriken: true, wheelColor: "blue", wheelOutcome: { kind: "multiply", value: 2 } }, { code: "L1" }, { code: "L2" }, { code: "L3" }],
  [{ code: "L1" }, { code: "L2" }, { code: "L3" }, { code: "L4" }],
  [{ code: "L2" }, { code: "L3" }, { code: "L4" }, { code: "L5" }],
  [{ code: "L3" }, { code: "L4" }, { code: "L5" }, { code: "L1" }],
  [{ code: "L4" }, { code: "L5" }, { code: "L2" }, { code: "L1" }],
];
const loneMultiplyResolved = math.resolveWheelEvents(loneMultiplyGrid, 0);
assert.equal(loneMultiplyResolved.meter, 0, "lone x-bet Shuriken should not seed the multiplier meter");
assert.equal(
  math.calculateBaseWheelCashWin(loneMultiplyResolved.events, 1),
  2,
  "lone blue x2 Shuriken should pay 2x bet as standalone cash",
);
const payingShurikenGrid = [
  [{ code: "H1" }, { code: "W1", shuriken: true, wheelColor: "blue", wheelOutcome: { kind: "add", value: 10 } }, { code: "L2" }, { code: "L3" }],
  [{ code: "H1" }, { code: "L2" }, { code: "L3" }, { code: "L4" }],
  [{ code: "H1" }, { code: "W1", shuriken: true, wheelColor: "blue", wheelOutcome: { kind: "multiply", value: 5 } }, { code: "L4" }, { code: "L5" }],
  [{ code: "L5" }, { code: "L4" }, { code: "L3" }, { code: "L2" }],
  [{ code: "L4" }, { code: "L5" }, { code: "L2" }, { code: "L1" }],
];
const payingShurikenScore = math.scoreGrid(payingShurikenGrid, 1);
const payingShurikenResolved = math.resolveWheelEvents(payingShurikenGrid, 0);
assert.equal(payingShurikenResolved.meter, 50, "multiple Shurikens in one spin should add/multiply into one local spin meter");
assert.equal(
  payingShurikenScore.lineWins.reduce((sum, win) => math.roundMoney(sum + win.amount), 0),
  payingShurikenScore.baseWin,
  "Shuriken outcomes should not change line win amounts",
);
assert.equal(
  math.roundMoney(payingShurikenScore.baseWin + math.roundMoney(payingShurikenScore.baseWin * payingShurikenResolved.meter)),
  math.roundMoney(payingShurikenScore.baseWin * 51),
  "total paid spin model should keep line win and Shuriken win separate",
);
const cappedBaseWheel = math.resolveWheelEvents([
  [{ code: "W1", shuriken: true, wheelColor: "blue", wheelOutcome: { kind: "add", value: 100 } }, { code: "L1" }, { code: "L2" }, { code: "L3" }],
  [{ code: "L1" }, { code: "L2" }, { code: "L3" }, { code: "L4" }],
  [{ code: "W1", shuriken: true, wheelColor: "blue", wheelOutcome: { kind: "multiply", value: 10 } }, { code: "L3" }, { code: "L4" }, { code: "L5" }],
  [{ code: "L5" }, { code: "L4" }, { code: "L3" }, { code: "L2" }],
  [{ code: "W1", shuriken: true, wheelColor: "blue", wheelOutcome: { kind: "add", value: 100 } }, { code: "L5" }, { code: "L2" }, { code: "L1" }],
], 0, math.BASE_GAME_MAX_WHEEL_METER);
assert.equal(cappedBaseWheel.meter, 100, "base wheel meter should cap at 100x");
assert.ok(!mathSource.includes("WHEEL_EVENT_CHANCE"), "wheel spins should not use the removed random gate");
assert.ok(
    slotSceneSource.includes("Blue Shurikens appear in the base game and free spins") &&
    slotSceneSource.includes("Red Shurikens appear in free spins") &&
    slotSceneSource.includes("Blue x-bet Shurikens award cash") &&
    slotSceneSource.includes("Free spins use a separate reel set") &&
    slotSceneSource.includes("symbol pay values remain the same as the base game") &&
    slotSceneSource.includes("base-game Shuriken meter is capped at 100x") &&
    slotSceneSource.includes("paid-spin win before any triggered free spins is capped at 500x bet"),
  "rules should describe Shuriken behavior, free-spin reel differences, same symbol pays, and caps",
);
assert.ok(
  mathSource.includes("bonusBaseWin + shurikenWin + wheelCashWin") &&
    mathSource.includes("baseWheelCashWin: wheelCashWin"),
  "bonus free-spin totals should include wheel cash",
);
assert.ok(
  slotSceneSource.includes('resultText.setText("SHURIKEN WIN");'),
  "wheel sequence should present standalone Shuriken wins",
);
const wheelSymbolPulseIndex = slotSceneSource.indexOf("await this.pulseWheelSymbols(events);");
const wheelOverlayIndex = slotSceneSource.indexOf("this.wheelOverlay = this.add.container", wheelSymbolPulseIndex);
const wheelSpinDurationIndex = slotSceneSource.indexOf("duration: 1550", wheelOverlayIndex);
const wheelResultIndex = slotSceneSource.indexOf("WINNING MULTIPLIER", wheelSpinDurationIndex);
const paidSpinWheelCallIndex = slotSceneSource.indexOf("await this.showWheelSequence(result.wheelEvents");
const paidSpinBalanceCreditIndex = slotSceneSource.indexOf("this.balance += paidSpinWin;");
assert.ok(wheelSymbolPulseIndex > 0, "wheel flow should pulse landed wheel symbols first");
assert.ok(wheelOverlayIndex > wheelSymbolPulseIndex, "wheel overlay should appear after symbol pulse");
assert.ok(wheelSpinDurationIndex > wheelOverlayIndex, "wheel spin should happen after enlarged wheel appears");
assert.ok(wheelResultIndex > wheelSpinDurationIndex, "wheel result should show after the wheel spin");
assert.ok(paidSpinBalanceCreditIndex > paidSpinWheelCallIndex, "paid spin balance credit should happen after wheel presentation");
assert.ok(
  slotSceneSource.indexOf("this.lastWin = paidSpinWin;") > paidSpinWheelCallIndex,
  "paid spin WIN total should update after wheel presentation",
);
assert.ok(
  !slotSceneSource.includes("BASE WIN") &&
    !slotSceneSource.includes("animateWheelMultiplierApplication") &&
    !slotSceneSource.includes("=> METER"),
  "wheel overlay should not show old before/after multiplied-value math",
);

assert.ok(!slotSceneSource.includes("this.balance += spin.totalWin"), "bonus wins should not credit balance per free spin");
const bonusSummaryIndex = slotSceneSource.indexOf('await this.showBonusSummary(totalWin, "TOTAL WIN");');
const bonusBalanceCreditIndex = slotSceneSource.indexOf("this.balance += totalWin;", bonusSummaryIndex);
assert.ok(bonusSummaryIndex > 0, "bonus sequence should show TOTAL WIN summary");
assert.ok(bonusBalanceCreditIndex > bonusSummaryIndex, "bonus balance credit should happen after TOTAL WIN reveal");
assert.ok(
  !slotSceneSource.includes("free spins resolved"),
  "bonus summary should not show a free-spins-resolved subtitle",
);
assert.ok(
  !slotSceneSource.includes("10 free spins resolve"),
  "bonus transition should not include the requested removed line",
);
assert.ok(
  slotSceneSource.includes("after the TOTAL WIN reveal"),
  "rules should describe post-summary bonus balance credit timing",
);
assert.ok(
  !/prototype/i.test(`${slotSceneSource}\n${splashSceneSource}`),
  "user-facing scene UI should not mention prototype",
);
assert.ok(
  splashSceneSource.includes('"shogun_logo"'),
  "splash screen should use the game logo",
);
assert.ok(
  splashSceneSource.includes('"MULTIPLIER WHEEL"') && splashSceneSource.includes("MAX_WHEEL_MULTIPLIER"),
  "splash screen should showcase the multiplier wheel feature",
);
assert.ok(
  splashSceneSource.includes("`${MAX_WHEEL_MULTIPLIER}x`"),
  "splash wheel preview should show the max multiplier on the wheel",
);
assert.ok(
  splashSceneSource.includes('"BUY BONUS"') && splashSceneSource.includes("BUY_BONUS_PRICE_MULTIPLIER"),
  "splash screen should showcase buy bonus as the second feature",
);
assert.ok(
  !slotSceneSource.includes("LINE ${win.lineIndex + 1} WIN"),
  "line win callout should show amount only",
);
assert.ok(
  slotSceneSource.includes("machineBottom + 18 * this.scaleFactor"),
  "line win callout should sit under the machine",
);
assert.ok(
  slotSceneSource.includes("this.add.rectangle(-width / 2, -height / 2, width, height"),
  "buy bonus blocker should anchor to the viewport while inside the centered modal container",
);
assert.ok(
  slotSceneSource.includes("Cost: \\u20AC${this.formatMoney(cost)}"),
  "buy bonus popup cost should display in euros",
);
assert.ok(!slotSceneSource.includes("BONUS WIN"), "bonus collect display should not use BONUS WIN label");
assert.ok(
  slotSceneSource.includes("`TOTAL WIN\\n\\u20AC${this.formatMoney(collected)}`"),
  "bonus collect display should use TOTAL WIN label",
);
assert.ok(
  slotSceneSource.includes('fontFamily: BODY_FONT') && slotSceneSource.includes('color: "#ffffff"') && slotSceneSource.includes('setShadow(2, 2, "rgba(0,0,0,0.85)"'),
  "bonus collect display should match the balance HUD text style",
);

console.log("1000 Shogun Spinners regression tests passed");
