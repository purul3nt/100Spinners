export type BonusEntryState = {
  bonusCount: number;
  freeSpins: number;
  bonusActive: boolean;
};

export function canTriggerBonusEntry(state: BonusEntryState) {
  return state.bonusCount >= 4 && state.freeSpins === 0 && !state.bonusActive;
}

export function shouldPresentMultiplierImpact(displayBefore: number, displayAfter: number) {
  return Math.round(displayAfter * 100) > Math.round(displayBefore * 100);
}

export function multiplierPresentationValues(displayBefore: number, displayAfter: number) {
  const before = Math.round(displayBefore * 100) / 100;
  const after = Math.round(displayAfter * 100) / 100;
  return {
    before,
    after,
    shouldPresent: after > before,
    delta: Math.round(Math.max(0, after - before) * 100) / 100,
  };
}
