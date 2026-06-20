export type SymbolCode = "H1" | "H2" | "H3" | "H4" | "H5" | "L1" | "L2" | "L3" | "L4" | "L5" | "W1";

export type SymbolDefinition = {
  code: SymbolCode;
  label: string;
  tier: "high" | "low" | "special";
  color: number;
  stroke: number;
  shape: "hex" | "diamond" | "circle" | "star" | "cross" | "square" | "triangle" | "pill" | "burst" | "rune" | "wheel";
  pay3: number;
  pay4: number;
  pay5: number;
};

export type WheelColor = "blue" | "red";
export type WheelOutcomeKind = "add" | "multiply" | "bonus";
export type WheelOutcome = {
  kind: WheelOutcomeKind;
  value?: number;
};

export type WheelEvent = {
  col: number;
  row: number;
  color: WheelColor;
  outcome: WheelOutcome;
  meterBefore: number;
  meterAfter: number;
  applied: boolean;
};

export type BonusTier = 0 | 1 | 2 | 3;

export type CellResult = {
  code: SymbolCode;
  shuriken?: boolean;
  wheelColor?: WheelColor;
  wheelOutcome?: WheelOutcome;
};

export type LineWin = {
  lineIndex: number;
  symbol: SymbolCode;
  count: number;
  amount: number;
  cells: Array<{ col: number; row: number }>;
};

export type SpinResult = {
  grid: CellResult[][];
  lineWins: LineWin[];
  baseWin: number;
  wheelMultiplier: number;
  multiplierMeter: number;
  wheelEvents: WheelEvent[];
  bonusTier: BonusTier;
  totalWin: number;
  bonusTriggered: boolean;
  bonusWin: number;
  freeSpins?: SpinResult[];
};

export const COLS = 5;
export const ROWS = 4;
export const DEFAULT_BET = 1;
export const FREE_SPINS = 10;
export const BUY_BONUS_PRICE_MULTIPLIER = 100;
export const SHURIKEN_REELS = [0, 2, 4];
export const BASE_SHURIKEN_CELL_CHANCE = 0.00625;
export const BONUS_TIER_1_BLUE_CELL_CHANCE = 0.011;
export const BONUS_TIER_1_RED_CELL_CHANCE = 0.006;
export const BONUS_TIER_2_RED_CELL_CHANCE = 0.018;
export const BONUS_TIER_3_RED_CELL_CHANCE = 1 / (SHURIKEN_REELS.length * ROWS);
export const BONUS_MODE_HIT_ASSIST_CHANCE = 0.414;
export const BONUS_FEATURE_PAY_SCALE = 0.215;
export const V1_PAY_SCALE = 5.4;

export const BLUE_WHEEL_ADD_VALUES = [5, 10, 15, 20, 25, 50, 75, 100];
const BLUE_WHEEL_ADD_WEIGHTS = [28, 24, 18, 13, 8, 4, 1.2, 0.45];
export const BLUE_WHEEL_MULTIPLY_VALUES = [2, 3, 5, 8, 10];
const BLUE_WHEEL_MULTIPLY_WEIGHTS = [38, 22, 8, 2, 0.7];
const BLUE_WHEEL_KIND_VALUES: WheelOutcomeKind[] = ["add", "multiply", "bonus"];
const BLUE_WHEEL_KIND_WEIGHTS = [74, 19, 7];

export const RED_WHEEL_ADD_VALUES = [10, 20, 50, 100, 250, 500, 1000];
const RED_WHEEL_ADD_WEIGHTS = [34, 26, 16, 7, 1.7, 0.32, 0.045];
export const RED_WHEEL_MULTIPLY_VALUES = [3, 5, 10, 15, 20];
const RED_WHEEL_MULTIPLY_WEIGHTS = [35, 16, 4, 0.8, 0.18];
const RED_WHEEL_KIND_VALUES: WheelOutcomeKind[] = ["add", "multiply"];
const RED_WHEEL_KIND_WEIGHTS = [78, 22];
export const BONUS_MULTIPLIERS = RED_WHEEL_ADD_VALUES;

export const SYMBOLS: SymbolDefinition[] = [
  { code: "H1", label: "Crown", tier: "high", color: 0xfacc15, stroke: 0x7c2d12, shape: "hex", pay3: 5.5, pay4: 16, pay5: 50 },
  { code: "H2", label: "Blade", tier: "high", color: 0x38bdf8, stroke: 0x0f172a, shape: "diamond", pay3: 2.2, pay4: 5.5, pay5: 20 },
  { code: "H3", label: "Eye", tier: "high", color: 0xf472b6, stroke: 0x4c0519, shape: "circle", pay3: 2.2, pay4: 5.5, pay5: 20 },
  { code: "H4", label: "Star", tier: "high", color: 0xa78bfa, stroke: 0x312e81, shape: "star", pay3: 1.2, pay4: 3.5, pay5: 10 },
  { code: "H5", label: "Cross", tier: "high", color: 0xfb7185, stroke: 0x7f1d1d, shape: "cross", pay3: 1.2, pay4: 3.5, pay5: 10 },
  { code: "L1", label: "Tile", tier: "low", color: 0x34d399, stroke: 0x064e3b, shape: "square", pay3: 0.3, pay4: 1.2, pay5: 3.2 },
  { code: "L2", label: "Peak", tier: "low", color: 0x60a5fa, stroke: 0x1e3a8a, shape: "triangle", pay3: 0.3, pay4: 1.2, pay5: 3.2 },
  { code: "L3", label: "Capsule", tier: "low", color: 0xfbbf24, stroke: 0x78350f, shape: "pill", pay3: 0.3, pay4: 1.2, pay5: 3.2 },
  { code: "L4", label: "Burst", tier: "low", color: 0x22d3ee, stroke: 0x164e63, shape: "burst", pay3: 0.3, pay4: 1.2, pay5: 3.2 },
  { code: "L5", label: "Rune", tier: "low", color: 0xf97316, stroke: 0x7c2d12, shape: "rune", pay3: 0.3, pay4: 1.2, pay5: 3.2 },
  { code: "W1", label: "Shuriken", tier: "special", color: 0xffffff, stroke: 0x111827, shape: "wheel", pay3: 0, pay4: 0, pay5: 0 },
];

export const SYMBOL_BY_CODE = SYMBOLS.reduce((map, symbol) => {
  map[symbol.code] = symbol;
  return map;
}, {} as Record<SymbolCode, SymbolDefinition>);

export function scaledSymbolPay(symbol: SymbolDefinition, count: 3 | 4 | 5) {
  const rawPay = count === 5 ? symbol.pay5 : count === 4 ? symbol.pay4 : symbol.pay3;
  return roundMoney(rawPay * V1_PAY_SCALE);
}

export const PAYLINES: number[][] = [
  [0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2],
  [3, 3, 3, 3, 3],
  [0, 1, 0, 1, 0],
  [0, 1, 2, 1, 0],
  [1, 0, 1, 0, 1],
  [1, 2, 1, 2, 1],
  [1, 2, 3, 2, 1],
  [2, 1, 0, 1, 2],
  [2, 1, 2, 1, 2],
  [2, 3, 2, 3, 2],
  [3, 2, 1, 2, 3],
  [3, 2, 3, 2, 3],
];

export const REEL_STRIPS: SymbolCode[][] = [
  ["H1", "H2", "H5", "L2", "H5", "L5", "H5", "L1", "H3", "H1", "L2", "L2", "H3", "L3", "L3", "L4", "L4", "L4", "H3", "L3", "L5", "L3", "H5", "L5", "H3", "L2", "L4", "H5", "L4", "H4", "H2", "L5", "L2", "H5", "L2", "H3", "L4", "L3", "L3", "H5", "L1", "H5", "L4", "L5", "L3", "H3", "L4", "H5", "L1", "L5", "L3", "H5", "L3", "H5", "L5", "L5", "L3", "H1", "L5", "L5", "H4", "L5", "L4", "L4", "H5", "L3", "H4", "L1", "L1", "L1", "L3", "L3", "H1", "H1", "H2", "H5"],
  ["H1", "H4", "L2", "H4", "L4", "L3", "H2", "L4", "L3", "H3", "L3", "L4", "H4", "L5", "L4", "L4", "H5", "H4", "L2", "L2", "L3", "L5", "H5", "L5", "H4", "L1", "L1", "L5", "L1", "H1", "H4", "H2", "L4", "L4", "L1", "L1", "L4", "L5", "H5", "L2", "L1", "L4", "H4", "L4", "L4", "L4", "L4", "H2", "L4", "L4", "H2", "L4", "H4", "L5", "H1", "L4", "H2", "L2", "L3", "L3", "H2", "L3", "L1", "H5", "L5", "L5", "H4", "L3", "L1", "L3", "L3", "H3", "H1", "H4", "L2"],
  ["H1", "L5", "L2", "L3", "L4", "H3", "L3", "L5", "L1", "L2", "L2", "H3", "L3", "H3", "L4", "H4", "L5", "L5", "L1", "L1", "L1", "L1", "H3", "L4", "L4", "H4", "L5", "L5", "L2", "H4", "L2", "H4", "L5", "L3", "L5", "H5", "L5", "L5", "H1", "L5", "H4", "L1", "L3", "L2", "H2", "L4", "L3", "H1", "L2", "L1", "H4", "H4", "L5", "H5", "L4", "L3", "H5", "L2", "L5", "H5", "L1", "L2", "L3", "H2", "L4", "H5", "L5", "L5", "H3", "L1", "L3", "L3", "H2", "H1", "L5", "L2"],
  ["H1", "H3", "L2", "L3", "H3", "H3", "H5", "L5", "H3", "L2", "L2", "H3", "H4", "L5", "H5", "H3", "L4", "H3", "L2", "L4", "H1", "L4", "L2", "L3", "H2", "L5", "H4", "H4", "H4", "H4", "L5", "H3", "L4", "H5", "L1", "L1", "L4", "H2", "H2", "L1", "L1", "H3", "H4", "L1", "H3", "L3", "H1", "L1", "H5", "L3", "H4", "L2", "L3", "H5", "L4", "L1", "H2", "L3", "H2", "H3", "L5", "L4", "L1", "H1", "H1", "H1", "H5", "H5", "L3", "L1", "L3", "L3", "H1", "H3", "L2"],
  ["H1", "H3", "L3", "L4", "H3", "L2", "L2", "H3", "L2", "L2", "H4", "H2", "L4", "L5", "L1", "H4", "H4", "L4", "L3", "L1", "L2", "H5", "L3", "L5", "L1", "H2", "L1", "H5", "H5", "L2", "L1", "L2", "H3", "H1", "L4", "L5", "H4", "L1", "H1", "L1", "L1", "L1", "H1", "L5", "H2", "L2", "L3", "H3", "L3", "L3", "L5", "L4", "H3", "H3", "H5", "H5", "L5", "H2", "L2", "L2", "H3", "L1", "L2", "L1", "H1", "H1", "H4", "H4", "H3", "H2", "L2", "L1", "L3", "L3", "H1", "H3", "L3"],
];

export function weightedPick<T>(items: T[], weights: number[], random = Math.random): T {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = random() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function createGrid(random = Math.random, bonusTier: BonusTier = 0): CellResult[][] {
  const grid: CellResult[][] = [];
  for (let col = 0; col < COLS; col++) {
    const strip = REEL_STRIPS[col];
    const stop = Math.floor(random() * strip.length);
    const column: CellResult[] = [];
    for (let row = 0; row < ROWS; row++) {
      const cell: CellResult = { code: strip[(stop + row) % strip.length] };
      if (SHURIKEN_REELS.includes(col)) maybePlaceShuriken(cell, col, random, bonusTier);
      column.push(cell);
    }
    grid.push(column);
  }
  if (bonusTier === 3 && !grid.some((column) => column.some((cell) => cell.shuriken && cell.wheelColor === "red"))) {
    const col = SHURIKEN_REELS[Math.floor(random() * SHURIKEN_REELS.length)];
    const row = Math.floor(random() * ROWS);
    grid[col][row] = makeWheelCell("red", random, false);
  }
  return grid;
}

function maybePlaceShuriken(cell: CellResult, _col: number, random: () => number, bonusTier: BonusTier) {
  if (bonusTier === 0) {
    if (random() < BASE_SHURIKEN_CELL_CHANCE) Object.assign(cell, makeWheelCell("blue", random, true));
    return;
  }
  if (bonusTier === 1) {
    const roll = random();
    if (roll < BONUS_TIER_1_RED_CELL_CHANCE) Object.assign(cell, makeWheelCell("red", random, false));
    else if (roll < BONUS_TIER_1_RED_CELL_CHANCE + BONUS_TIER_1_BLUE_CELL_CHANCE) Object.assign(cell, makeWheelCell("blue", random, false));
    return;
  }
  if (bonusTier === 2) {
    if (random() < BONUS_TIER_2_RED_CELL_CHANCE) Object.assign(cell, makeWheelCell("red", random, false));
    return;
  }
  if (random() < BONUS_TIER_3_RED_CELL_CHANCE) Object.assign(cell, makeWheelCell("red", random, false));
}

function makeWheelCell(color: WheelColor, random: () => number, allowBonus: boolean): CellResult {
  return {
    code: "W1",
    shuriken: true,
    wheelColor: color,
    wheelOutcome: color === "blue" ? pickBlueWheelOutcome(random, allowBonus) : pickRedWheelOutcome(random),
  };
}

export function pickBlueWheelOutcome(random = Math.random, allowBonus = true): WheelOutcome {
  const kind = allowBonus
    ? weightedPick(BLUE_WHEEL_KIND_VALUES, BLUE_WHEEL_KIND_WEIGHTS, random)
    : weightedPick(BLUE_WHEEL_KIND_VALUES.slice(0, 2), BLUE_WHEEL_KIND_WEIGHTS.slice(0, 2), random);
  if (kind === "bonus") return { kind };
  if (kind === "multiply") return { kind, value: weightedPick(BLUE_WHEEL_MULTIPLY_VALUES, BLUE_WHEEL_MULTIPLY_WEIGHTS, random) };
  return { kind, value: weightedPick(BLUE_WHEEL_ADD_VALUES, BLUE_WHEEL_ADD_WEIGHTS, random) };
}

export function pickRedWheelOutcome(random = Math.random): WheelOutcome {
  const kind = weightedPick(RED_WHEEL_KIND_VALUES, RED_WHEEL_KIND_WEIGHTS, random);
  if (kind === "multiply") return { kind, value: weightedPick(RED_WHEEL_MULTIPLY_VALUES, RED_WHEEL_MULTIPLY_WEIGHTS, random) };
  return { kind, value: weightedPick(RED_WHEEL_ADD_VALUES, RED_WHEEL_ADD_WEIGHTS, random) };
}

export function scoreGrid(grid: CellResult[][], bet = DEFAULT_BET): { lineWins: LineWin[]; baseWin: number } {
  const lineWins: LineWin[] = [];
  for (let lineIndex = 0; lineIndex < PAYLINES.length; lineIndex++) {
    const rows = PAYLINES[lineIndex];
    const first = grid[0][rows[0]].code;
    if (first === "W1") continue;
    let count = 1;
    const cells = [{ col: 0, row: rows[0] }];
    for (let col = 1; col < COLS; col++) {
      const row = rows[col];
      if (grid[col][row].code !== first) break;
      count++;
      cells.push({ col, row });
    }
    if (count >= 3) {
      const symbol = SYMBOL_BY_CODE[first];
      const pay = scaledSymbolPay(symbol, count as 3 | 4 | 5);
      lineWins.push({ lineIndex, symbol: first, count, amount: roundMoney(pay * bet), cells });
    }
  }
  const baseWin = roundMoney(lineWins.reduce((sum, win) => sum + win.amount, 0));
  return { lineWins, baseWin };
}

export function resolveWheelEvents(grid: CellResult[][], startingMeter = 0): { meter: number; events: WheelEvent[]; bonusShurikens: number } {
  let meter = startingMeter;
  let bonusShurikens = 0;
  const events: WheelEvent[] = [];
  const wheelCells: Array<{ col: number; row: number; cell: CellResult }> = [];
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const cell = grid[col][row];
      if (cell.shuriken && cell.wheelColor && cell.wheelOutcome) wheelCells.push({ col, row, cell });
    }
  }
  wheelCells.sort((a, b) => a.col - b.col || a.row - b.row);
  for (const { col, row, cell } of wheelCells) {
    const meterBefore = meter;
    let applied = false;
    const outcome = cell.wheelOutcome as WheelOutcome;
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
    meter = Math.max(0, Math.round(meter * 10000) / 10000);
    events.push({
      col,
      row,
      color: cell.wheelColor as WheelColor,
      outcome,
      meterBefore,
      meterAfter: meter,
      applied,
    });
  }
  return { meter, events, bonusShurikens };
}

export function countBonusShurikenOutcomes(grid: CellResult[][]): number {
  return resolveWheelEvents(grid, 0).bonusShurikens;
}

export function playPaidSpin(random = Math.random, bet = DEFAULT_BET): SpinResult {
  const grid = createGrid(random, 0);
  const scored = scoreGrid(grid, bet);
  const resolved = resolveWheelEvents(grid, 0);
  const paidSpinWin = scored.baseWin > 0 && resolved.meter > 0 ? roundMoney(scored.baseWin * resolved.meter) : scored.baseWin;
  const bonusTier = Math.min(3, resolved.bonusShurikens) as BonusTier;
  let bonusWin = 0;
  let freeSpins: SpinResult[] | undefined;
  if (bonusTier > 0) {
    const feature = playBonusFeature(random, bet, bonusTier);
    bonusWin = feature.totalWin;
    freeSpins = feature.freeSpins;
  }
  return {
    grid,
    lineWins: scored.lineWins,
    baseWin: scored.baseWin,
    wheelMultiplier: resolved.meter,
    multiplierMeter: resolved.meter,
    wheelEvents: resolved.events,
    bonusTier,
    totalWin: roundMoney(paidSpinWin + bonusWin),
    bonusTriggered: bonusTier > 0,
    bonusWin: roundMoney(bonusWin),
    freeSpins,
  };
}

export function playBonusFeature(random = Math.random, bet = DEFAULT_BET, tier: BonusTier = 1): { totalWin: number; freeSpins: SpinResult[]; bonusTier: BonusTier } {
  const freeSpins: SpinResult[] = [];
  let totalWin = 0;
  let meter = 0;
  for (let i = 0; i < FREE_SPINS; i++) {
    let grid = createGrid(random, tier);
    let scored = scoreGrid(grid, bet);
    if (scored.baseWin <= 0 && random() < BONUS_MODE_HIT_ASSIST_CHANCE) {
      grid = forceSmallBonusWin(grid);
      scored = scoreGrid(grid, bet);
    }
    const resolved = resolveWheelEvents(grid, meter);
    meter = resolved.meter;
    const scaledLineWins = scored.lineWins.map((win) => ({ ...win, amount: roundMoney(win.amount * BONUS_FEATURE_PAY_SCALE) }));
    const bonusBaseWin = roundMoney(scored.baseWin * BONUS_FEATURE_PAY_SCALE);
    const spinTotal = roundMoney(bonusBaseWin > 0 && meter > 0 ? bonusBaseWin * meter : bonusBaseWin);
    totalWin = roundMoney(totalWin + spinTotal);
    freeSpins.push({
      grid,
      lineWins: scaledLineWins,
      baseWin: bonusBaseWin,
      wheelMultiplier: meter,
      multiplierMeter: meter,
      wheelEvents: resolved.events,
      bonusTier: tier,
      totalWin: spinTotal,
      bonusTriggered: false,
      bonusWin: 0,
    });
  }
  return { totalWin, freeSpins, bonusTier: tier };
}

export function buyBonus(random = Math.random, bet = DEFAULT_BET, tier: BonusTier = 1): { cost: number; totalWin: number; freeSpins: SpinResult[]; bonusTier: BonusTier } {
  const feature = playBonusFeature(random, bet, tier);
  return {
    cost: roundMoney(bet * BUY_BONUS_PRICE_MULTIPLIER),
    totalWin: feature.totalWin,
    freeSpins: feature.freeSpins,
    bonusTier: feature.bonusTier,
  };
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function forceSmallBonusWin(grid: CellResult[][]): CellResult[][] {
  const next: CellResult[][] = grid.map((column) => column.map((cell) => ({
    code: cell.code,
    shuriken: cell.shuriken,
    wheelColor: cell.wheelColor,
    wheelOutcome: cell.wheelOutcome ? { ...cell.wheelOutcome } : undefined,
  })));
  const symbol: SymbolCode = "L3";
  for (let col = 0; col < 3; col++) next[col][1] = { code: symbol };
  return next;
}
