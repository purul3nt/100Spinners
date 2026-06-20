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

export type CellResult = {
  code: SymbolCode;
  wheelMultiplier?: number;
  bonusTrigger?: boolean;
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
export const BASE_BONUS_CHANCE = 0.00365;
export const BONUS_TRIGGER_CELL_CHANCE = 1 - Math.pow(1 - BASE_BONUS_CHANCE, 1 / (3 * ROWS));
export const WHEEL_EVENT_CHANCE = 0.084587;
export const BONUS_MODE_HIT_ASSIST_CHANCE = 0.414;
export const BONUS_FEATURE_PAY_SCALE = 3.27;
export const V1_PAY_SCALE = 5.4;

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
  { code: "W1", label: "Wheel", tier: "special", color: 0xffffff, stroke: 0x111827, shape: "wheel", pay3: 0, pay4: 0, pay5: 0 },
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

export const BONUS_MULTIPLIERS = [2, 3, 4, 5, 8, 10, 15, 20, 50, 100, 1000];
const BONUS_MULTIPLIER_WEIGHTS = [42, 28, 18, 12, 7, 5, 2.5, 1.2, 0.18, 0.06, 0.001];

export function weightedPick<T>(items: T[], weights: number[], random = Math.random): T {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = random() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function createGrid(random = Math.random, bonusMode = false): CellResult[][] {
  const grid: CellResult[][] = [];
  for (let col = 0; col < COLS; col++) {
    const strip = REEL_STRIPS[col];
    const stop = Math.floor(random() * strip.length);
    const column: CellResult[] = [];
    for (let row = 0; row < ROWS; row++) {
      let code = strip[(stop + row) % strip.length];
      const specialReel = col === 0 || col === 2 || col === 4;
      const overlayChance = bonusMode ? 0.022 : 0.0068;
      let bonusTrigger = false;
      if (specialReel) {
        const specialRoll = random();
        if (!bonusMode && specialRoll < BONUS_TRIGGER_CELL_CHANCE) {
          code = "W1";
          bonusTrigger = true;
        } else if (specialRoll < (bonusMode ? overlayChance : BONUS_TRIGGER_CELL_CHANCE + overlayChance)) {
          code = "W1";
        }
      }
      const cell: CellResult = { code };
      if (bonusTrigger) {
        cell.bonusTrigger = true;
      } else if (code === "W1") {
        cell.wheelMultiplier = weightedPick(BONUS_MULTIPLIERS, BONUS_MULTIPLIER_WEIGHTS, random);
      }
      column.push(cell);
    }
    grid.push(column);
  }
  return grid;
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

export function collectWheelMultiplier(grid: CellResult[][], random = Math.random, bonusMode = false): number {
  const multipliers: number[] = [];
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const cell = grid[col][row];
      if (cell.code === "W1" && cell.wheelMultiplier) multipliers.push(cell.wheelMultiplier);
    }
  }
  if (multipliers.length === 0) return 0;
  if (bonusMode) return multipliers.reduce((sum, value) => sum + value, 0);
  if (random() > WHEEL_EVENT_CHANCE) return 0;
  return Math.max.apply(Math, multipliers);
}

export function countBonusTriggerSymbols(grid: CellResult[][]): number {
  let count = 0;
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      if (grid[col][row].code === "W1" && grid[col][row].bonusTrigger) count++;
    }
  }
  return count;
}

export function playPaidSpin(random = Math.random, bet = DEFAULT_BET): SpinResult {
  const grid = createGrid(random, false);
  const scored = scoreGrid(grid, bet);
  const wheelMultiplier = scored.baseWin > 0 ? collectWheelMultiplier(grid, random, false) : 0;
  const baseTotal = wheelMultiplier > 0 ? scored.baseWin * wheelMultiplier : scored.baseWin;
  const bonusTriggered = countBonusTriggerSymbols(grid) > 0;
  let bonusWin = 0;
  let freeSpins: SpinResult[] | undefined;
  if (bonusTriggered) {
    const feature = playBonusFeature(random, bet);
    bonusWin = feature.totalWin;
    freeSpins = feature.freeSpins;
  }
  return {
    grid,
    lineWins: scored.lineWins,
    baseWin: scored.baseWin,
    wheelMultiplier,
    totalWin: roundMoney(baseTotal + bonusWin),
    bonusTriggered,
    bonusWin: roundMoney(bonusWin),
    freeSpins,
  };
}

export function playBonusFeature(random = Math.random, bet = DEFAULT_BET): { totalWin: number; freeSpins: SpinResult[] } {
  const freeSpins: SpinResult[] = [];
  let totalWin = 0;
  for (let i = 0; i < FREE_SPINS; i++) {
    let grid = createGrid(random, true);
    let scored = scoreGrid(grid, bet);
    if (scored.baseWin <= 0 && random() < BONUS_MODE_HIT_ASSIST_CHANCE) {
      grid = forceSmallBonusWin(grid);
      scored = scoreGrid(grid, bet);
    }
    const scaledLineWins = scored.lineWins.map((win) => ({ ...win, amount: roundMoney(win.amount * BONUS_FEATURE_PAY_SCALE) }));
    const bonusBaseWin = roundMoney(scored.baseWin * BONUS_FEATURE_PAY_SCALE);
    const wheelMultiplier = bonusBaseWin > 0 ? collectWheelMultiplier(grid, random, true) : 0;
    const spinTotal = roundMoney(wheelMultiplier > 0 ? bonusBaseWin * wheelMultiplier : bonusBaseWin);
    totalWin = roundMoney(totalWin + spinTotal);
    freeSpins.push({
      grid,
      lineWins: scaledLineWins,
      baseWin: bonusBaseWin,
      wheelMultiplier,
      totalWin: spinTotal,
      bonusTriggered: false,
      bonusWin: 0,
    });
  }
  return { totalWin, freeSpins };
}

export function buyBonus(random = Math.random, bet = DEFAULT_BET): { cost: number; totalWin: number; freeSpins: SpinResult[] } {
  const feature = playBonusFeature(random, bet);
  return {
    cost: roundMoney(bet * BUY_BONUS_PRICE_MULTIPLIER),
    totalWin: feature.totalWin,
    freeSpins: feature.freeSpins,
  };
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function forceSmallBonusWin(grid: CellResult[][]): CellResult[][] {
  const next: CellResult[][] = grid.map((column) => column.map((cell) => ({
    code: cell.code,
    wheelMultiplier: cell.wheelMultiplier,
    bonusTrigger: cell.bonusTrigger,
  })));
  const symbol: SymbolCode = "L3";
  for (let col = 0; col < 3; col++) next[col][1] = { code: symbol };
  return next;
}
