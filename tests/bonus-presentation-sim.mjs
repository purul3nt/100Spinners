import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buys = Number(process.argv[2] || 100);
const seedInput = Number(process.argv[3] || 0xBABA100);
const outPath = path.resolve(root, "test-results", `bonus-presentation-${buys}.json`);

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
  });
  vm.runInContext(output, context, { filename });
  return module.exports;
}

const { multiplierPresentationValues } = loadTsCommonJs("src/slotRules.ts");

const COLS = 6;
const ROWS = 5;
const CELLS = COLS * ROWS;
const BET = 1;
const SYMBOLS = [
  { key: "a", pay: 1.7976, weight: 18.6, tumbleWeight: 19.2 },
  { key: "k", pay: 1.284, weight: 15.4, tumbleWeight: 15.9 },
  { key: "q", pay: 0.8988, weight: 15.7, tumbleWeight: 16.2 },
  { key: "j", pay: 0.7704, weight: 9.1, tumbleWeight: 9.4 },
  { key: "ten", pay: 0.642, weight: 10.0, tumbleWeight: 10.3 },
  { key: "drummer", pay: 2.14, weight: 4.6, tumbleWeight: 4.9 },
  { key: "bass", pay: 2.996, weight: 7.4, tumbleWeight: 7.6 },
  { key: "guitar", pay: 5.35, weight: 7.4, tumbleWeight: 7.6 },
  { key: "vocal", pay: 3.852, weight: 7.4, tumbleWeight: 7.6 },
];
const COUNT_BOOST_10 = 2.2;
const COUNT_BOOST_12 = 4.5;
const TUMBLE_STICKY_CHANCE = 0.4;
const BONUS_MODE_BONUS_CHANCE = 0.107;
const MULTIPLIERS = [2, 3, 4, 5, 8, 10, 12, 15, 20, 25, 50, 100];
const MULTIPLIER_WEIGHTS = [32, 22, 14, 9, 6, 4, 2.2, 1.25, 0.8, 0.35, 0.1, 0.035];
const MAX_WIN_CAP = 10000;
const BONUS = "bonus";

let rngState = seedInput >>> 0 || 1;
function rnd() {
  rngState ^= rngState << 13;
  rngState ^= rngState >>> 17;
  rngState ^= rngState << 5;
  return (rngState >>> 0) / 4294967296;
}

function weightedPick(values, weights) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = rnd() * total;
  for (let i = 0; i < values.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return values[i];
  }
  return values[values.length - 1];
}

function randomMultiplier() {
  return weightedPick(MULTIPLIERS, MULTIPLIER_WEIGHTS);
}

function symbolByKey(key) {
  return SYMBOLS.find((symbol) => symbol.key === key);
}

function stickyWeight(key) {
  if (key === "a" || key === "k" || key === "q") return 1.25;
  if (key === "j" || key === "ten") return 1.15;
  return 1.25;
}

function randomCell(phase, boardIds = []) {
  if (rnd() < BONUS_MODE_BONUS_CHANCE) return { id: BONUS, multiplier: randomMultiplier() };
  if (phase === "tumble" && boardIds.length > 0 && rnd() < TUMBLE_STICKY_CHANCE) {
    return { id: weightedPick(boardIds, boardIds.map(stickyWeight)) };
  }
  const weights = SYMBOLS.map((symbol) => phase === "tumble" ? symbol.tumbleWeight : symbol.weight);
  return { id: weightedPick(SYMBOLS.map((symbol) => symbol.key), weights) };
}

function createGrid() {
  return Array.from({ length: COLS }, () => Array.from({ length: ROWS }, () => randomCell("base")));
}

function findWins(grid) {
  const counts = new Map();
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const id = grid[c][r]?.id;
      if (!id || id === BONUS) continue;
      if (!counts.has(id)) counts.set(id, []);
      counts.get(id).push({ c, r, id });
    }
  }
  const wins = [];
  for (const cells of counts.values()) if (cells.length >= 8) wins.push(...cells);
  return wins;
}

function scoreWins(wins) {
  const counts = new Map();
  for (const win of wins) counts.set(win.id, (counts.get(win.id) || 0) + 1);
  let score = 0;
  const groups = [];
  for (const [id, count] of counts.entries()) {
    const symbol = symbolByKey(id);
    const boost = count >= 12 ? COUNT_BOOST_12 : count >= 10 ? COUNT_BOOST_10 : 1;
    const amount = symbol.pay * boost * BET;
    score += amount;
    groups.push({ symbol: id, count, amount: Math.round(amount * 100) / 100 });
  }
  return { score, groups };
}

function collectMultipliers(grid) {
  const multipliers = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const cell = grid[c][r];
      if (cell?.id === BONUS && cell.multiplier) multipliers.push(cell.multiplier);
    }
  }
  return multipliers;
}

function collectBoardIds(grid) {
  const ids = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const id = grid[c][r]?.id;
      if (id && id !== BONUS) ids.push(id);
    }
  }
  return ids;
}

function removeWinsAndAppliedMultipliers(grid, wins, multiplierTotal) {
  for (const win of wins) grid[win.c][win.r] = null;
  if (multiplierTotal <= 0) return;
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (grid[c][r]?.id === BONUS) grid[c][r] = null;
    }
  }
}

function collapseGrid(grid) {
  const boardIds = collectBoardIds(grid);
  for (let c = 0; c < COLS; c++) {
    const survivors = [];
    for (let r = ROWS - 1; r >= 0; r--) if (grid[c][r]) survivors.push(grid[c][r]);
    let index = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      grid[c][r] = index < survivors.length ? survivors[index++] : randomCell("tumble", boardIds);
    }
  }
}

function playFreeSpin(featureTotal, buyNumber, freeSpinNumber, events) {
  const grid = createGrid();
  let spinPresentationWin = 0;
  let tumble = 0;
  while (true) {
    const wins = findWins(grid);
    if (wins.length === 0) break;
    tumble++;
    const { score: baseWin, groups } = scoreWins(wins);
    const multipliers = collectMultipliers(grid);
    const multiplierTotal = multipliers.reduce((sum, value) => sum + value, 0);
    const previous = featureTotal;
    const baseTotal = Math.min(BET * MAX_WIN_CAP, previous + baseWin);
    const presentationBaseTotal = spinPresentationWin + baseWin;
    const spinWin = baseWin * Math.max(1, multiplierTotal);
    const finalTotal = Math.min(BET * MAX_WIN_CAP, previous + spinWin);
    const presentationFinalTotal = spinPresentationWin + Math.max(0, finalTotal - previous);
    const presentation = multiplierPresentationValues(presentationBaseTotal, presentationFinalTotal);

    if (multiplierTotal > 0) {
      events.push({
        buyNumber,
        freeSpinNumber,
        tumble,
        groups,
        baseWin: Math.round(baseWin * 100) / 100,
        multipliers,
        multiplierTotal,
        frontendBeforeMultiplier: presentation.before,
        frontendAfterMultiplier: presentation.after,
        frontendDelta: presentation.delta,
        shouldPresent: presentation.shouldPresent,
        baseTotal: Math.round(baseTotal * 100) / 100,
        finalTotal: Math.round(finalTotal * 100) / 100,
      });
    }

    spinPresentationWin += Math.max(0, finalTotal - previous);
    featureTotal = finalTotal;
    removeWinsAndAppliedMultipliers(grid, wins, multiplierTotal);
    collapseGrid(grid);
  }
  return featureTotal;
}

const events = [];
const featureWins = [];
for (let buyNumber = 1; buyNumber <= buys; buyNumber++) {
  let featureTotal = 0;
  for (let freeSpinNumber = 1; freeSpinNumber <= 10; freeSpinNumber++) {
    featureTotal = playFreeSpin(featureTotal, buyNumber, freeSpinNumber, events);
  }
  featureWins.push(featureTotal);
}

const presented = events.filter((event) => event.shouldPresent);
const suppressed = events.filter((event) => !event.shouldPresent);
const badPresented = presented.filter((event) => event.frontendAfterMultiplier <= event.frontendBeforeMultiplier);
const badSuppressed = suppressed.filter((event) => event.frontendAfterMultiplier > event.frontendBeforeMultiplier);

const summary = {
  buys,
  seed: seedInput >>> 0,
  totalMultiplierEvents: events.length,
  presentedMultiplierEvents: presented.length,
  suppressedMultiplierEvents: suppressed.length,
  badPresentedCount: badPresented.length,
  badSuppressedCount: badSuppressed.length,
  maxFeatureWin: Math.round(Math.max(...featureWins, 0) * 100) / 100,
  averageFeatureWin: Math.round((featureWins.reduce((sum, win) => sum + win, 0) / Math.max(1, featureWins.length)) * 100) / 100,
  sampleSuppressed: suppressed.slice(0, 5),
  samplePresented: presented.slice(0, 5),
};

assert.equal(badPresented.length, 0, "frontend must not present multiplier when after <= before");
assert.equal(badSuppressed.length, 0, "frontend must not suppress multiplier when after > before");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify({ summary, events, featureWins }, null, 2));
console.log(JSON.stringify(summary, null, 2));
