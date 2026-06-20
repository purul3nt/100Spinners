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

const math = loadTsCommonJs("src/sixsixsixMath.ts");
const mathSource = fs.readFileSync(path.join(root, "src/sixsixsixMath.ts"), "utf8");
const slotSceneSource = fs.readFileSync(path.join(root, "src/scenes/SlotScene.ts"), "utf8");
const splashSceneSource = fs.readFileSync(path.join(root, "src/scenes/SplashScene.ts"), "utf8");

assert.equal(math.COLS, 5, "1000 Shogun Spinners should use five reels");
assert.equal(math.ROWS, 4, "1000 Shogun Spinners should use four visible rows");
assert.equal(math.PAYLINES.length, 14, "attached blueprint has 14 paylines");
assert.equal(math.BUY_BONUS_PRICE_MULTIPLIER, 100, "bonus buy should cost 100x bet");
assert.equal(Math.max(...math.BONUS_MULTIPLIERS), 1000, "wheel max multiplier should be 1000x");
assert.ok(math.BONUS_TRIGGER_CELL_CHANCE > 0, "visible bonus trigger cell chance should be configured");

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
assert.equal(topLine.amount, 29.7, "H1 3OAK uses the scaled v1 pay");
const h1 = math.SYMBOL_BY_CODE.H1;
assert.equal(math.scaledSymbolPay(h1, 3), 29.7, "paytable helper should expose scaled H1 3OAK");
assert.equal(math.scaledSymbolPay(h1, 4), 86.4, "paytable helper should expose scaled H1 4OAK");
assert.equal(math.scaledSymbolPay(h1, 5), 270, "paytable helper should expose scaled H1 5OAK");

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

const visibleBonusSpin = math.playPaidSpin(() => 0, 1);
assert.equal(visibleBonusSpin.bonusTriggered, true, "visible BONUS spinner should trigger free spins");
assert.ok(visibleBonusSpin.freeSpins, "visible BONUS spinner trigger should resolve free spins");
assert.ok(
  math.countBonusTriggerSymbols(visibleBonusSpin.grid) > 0,
  "bonus trigger should be tied to visible BONUS spinner symbols",
);
assert.ok(!mathSource.includes("random() < BASE_BONUS_CHANCE"), "bonus trigger should not use an invisible random gate");
assert.ok(
  slotSceneSource.includes("BONUS Shuriken Spinner"),
  "rules should describe visible BONUS spinner trigger symbols",
);

assert.ok(!slotSceneSource.includes("this.balance += spin.totalWin"), "bonus wins should not credit balance per free spin");
const bonusSummaryIndex = slotSceneSource.indexOf('await this.showBonusSummary(totalWin, freeSpins.length, "TOTAL WIN");');
const bonusBalanceCreditIndex = slotSceneSource.indexOf("this.balance += totalWin;", bonusSummaryIndex);
assert.ok(bonusSummaryIndex > 0, "bonus sequence should show TOTAL WIN summary");
assert.ok(bonusBalanceCreditIndex > bonusSummaryIndex, "bonus balance credit should happen after TOTAL WIN reveal");
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
