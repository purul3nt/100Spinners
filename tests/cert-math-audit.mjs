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
const source = fs.readFileSync(path.join(root, "src/shogunSpinnersMath.ts"), "utf8");
const par = JSON.parse(fs.readFileSync(path.join(root, "par/1000-shogun-spinners-par-latest.json"), "utf8"));

const bannedPatterns = [
  "BASE_LOW_PAY_ASSIST_CHANCE",
  "BONUS_MODE_HIT_ASSIST_CHANCE",
  "forceBaseLowPayWin",
  "forceSmallBonusWin",
];
for (const pattern of bannedPatterns) {
  assert.ok(!source.includes(pattern), `removed assist pattern should not appear in math source: ${pattern}`);
}

assert.equal(par.constants.v1PayScale, math.V1_PAY_SCALE, "PAR v1 scale must match live math");
assert.ok(!("BONUS_FEATURE_PAY_SCALE" in math), "live math must not expose a separate bonus symbol pay scale");
assert.ok(!("bonusFeaturePayScale" in par.constants), "PAR constants must not include a separate bonus symbol pay scale");
assert.equal(par.constants.baseWheelCashScale, math.BASE_WHEEL_CASH_SCALE, "PAR base wheel cash scale must match live math");
assert.equal(par.constants.bonusBlueShurikenCellChance, math.BONUS_BLUE_SHURIKEN_CELL_CHANCE, "PAR bonus Blue Shuriken chance must match live math");
assert.equal(par.constants.bonusRedShurikenCellChance, math.BONUS_RED_SHURIKEN_CELL_CHANCE, "PAR bonus Red Shuriken chance must match live math");
assert.ok(!("BONUS_TIER_1_BLUE_CELL_CHANCE" in math), "live math must not name the single bonus mode as a tier");
assert.ok(!("BONUS_TIER_1_RED_CELL_CHANCE" in math), "live math must not name the single bonus mode as a tier");
assert.ok(!("bonusTier1BlueCellChance" in par.constants), "PAR constants must not name the single bonus mode as a tier");
assert.ok(!("bonusTier1RedCellChance" in par.constants), "PAR constants must not name the single bonus mode as a tier");
assert.equal(par.constants.baseLowSymbolStripExtensionLength, math.BASE_LOW_SYMBOL_STRIP_EXTENSION.length, "PAR base strip extension length must match live math");
assert.equal(par.constants.bonusLowSymbolStripExtensionLength, math.BONUS_LOW_SYMBOL_STRIP_EXTENSION.length, "PAR bonus strip extension length must match live math");
assert.equal(par.constants.baseGameMaxWheelMeter, math.BASE_GAME_MAX_WHEEL_METER, "PAR base meter cap must match live math");
assert.equal(par.constants.baseGameMaxWinMultiplier, math.BASE_GAME_MAX_WIN_MULTIPLIER, "PAR base win cap must match live math");
assert.ok(!("bonusModeHitAssistChance" in par.constants), "PAR constants must not include removed bonus assist");
assert.ok(par.summary.totalRtp > 0.94 && par.summary.totalRtp < 0.98, "PAR total RTP should remain in the tuned range");
assert.ok(par.summary.baseRtp > 0.63 && par.summary.baseRtp < 0.67, "PAR base RTP should remain near target");
assert.ok(par.summary.totalHitRate > 0.21 && par.summary.totalHitRate < 0.23, "PAR hit rate should remain near 22%");
assert.ok(par.buyBonus.rtpVsBuyPrice > 0.94 && par.buyBonus.rtpVsBuyPrice < 0.99, "buy bonus return should remain near price");

const report = {
  status: "cert math audit passed",
  assistHooksRemoved: true,
  parConstantsMatchLiveMath: true,
  paidSpinSample: {
    spins: par.meta.paidSpins,
    totalRtp: par.summary.totalRtp,
    baseRtp: par.summary.baseRtp,
    featureRtp: par.summary.featureRtp,
    hitFrequency: par.summary.totalHitFrequency,
    bonusTriggerFrequency: par.summary.bonusTriggerFrequency,
    maxWin: par.summary.maxWin,
  },
  buyBonusSample: {
    rounds: par.buyBonus.rounds,
    avgWinXBet: par.buyBonus.avgWinXBet,
    rtpVsBuyPrice: par.buyBonus.rtpVsBuyPrice,
    hitFrequency: par.buyBonus.hitFrequency,
  },
  residualCertGaps: par.certReadiness.remainingBlockers,
};

console.log(JSON.stringify(report, null, 2));
