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
const slotSceneSource = fs.readFileSync(path.join(root, "src/scenes/SlotScene.ts"), "utf8");

assert.equal(math.COLS, 5, "1000 Shogun Spinners should use five reels");
assert.equal(math.ROWS, 4, "1000 Shogun Spinners should use four visible rows");
assert.equal(math.PAYLINES.length, 14, "attached blueprint has 14 paylines");
assert.equal(math.BUY_BONUS_PRICE_MULTIPLIER, 100, "bonus buy should cost 100x bet");

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

assert.ok(!slotSceneSource.includes("this.balance += spin.totalWin"), "bonus wins should not credit balance per free spin");
const bonusSummaryIndex = slotSceneSource.indexOf('await this.showBonusSummary(totalWin, freeSpins.length, "TOTAL WIN");');
const bonusBalanceCreditIndex = slotSceneSource.indexOf("this.balance += totalWin;", bonusSummaryIndex);
assert.ok(bonusSummaryIndex > 0, "bonus sequence should show TOTAL WIN summary");
assert.ok(bonusBalanceCreditIndex > bonusSummaryIndex, "bonus balance credit should happen after TOTAL WIN reveal");
assert.ok(
  slotSceneSource.includes("after the TOTAL WIN reveal"),
  "rules should describe post-summary bonus balance credit timing",
);

console.log("1000 Shogun Spinners regression tests passed");
