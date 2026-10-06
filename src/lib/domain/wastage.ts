export const calcWastagePct = (actualYds: number, stdYdsPerPiece: number, targetQty: number) => {
  const expected = stdYdsPerPiece * targetQty;
  if (expected <= 0) return 0;
  return Math.round(((actualYds - expected) / expected) * 10000) / 100; // 2 decimals
};