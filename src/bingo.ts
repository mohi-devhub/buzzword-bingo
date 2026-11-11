// Evaluates the same approved 5-by-5 bingo card for every company.
// Separates phrase presence and completed lines from the density score.
export const bingoCard: readonly (string | null)[] = [
  'ai-powered', 'seamless', '10x', 'best-in-class', 'unlock',
  'paradigm-shift', 'unprecedented', 'world-class', 'empower', 'next-generation',
  'the-future-of', 'leverage', null, 'supercharge', 'ai-native',
  'game-changing', 'superintelligence', 'revolutionize', 'unparalleled', 'industry-leading',
  'frictionless', 'first-ever', 'cutting-edge', 'all-in-one', 'ai-driven',
];

export const bingoLines = [
  ...Array.from({ length: 5 }, (_, row) => ({ id: `row-${row + 1}`, cells: Array.from({ length: 5 }, (_, column) => row * 5 + column) })),
  ...Array.from({ length: 5 }, (_, column) => ({ id: `column-${column + 1}`, cells: Array.from({ length: 5 }, (_, row) => row * 5 + column) })),
  { id: 'diagonal-main', cells: [0, 6, 12, 18, 24] },
  { id: 'diagonal-anti', cells: [4, 8, 12, 16, 20] },
];

export function evaluateBingo(phraseIds: Iterable<string>) {
  const total: 5 = 5;
  const hits = new Set(phraseIds);
  const cells = bingoCard.map((phraseId, index) => ({ index, phraseId, hit: phraseId === null || hits.has(phraseId) }));
  const lineProgress = bingoLines.map((line) => ({ lineId: line.id, hits: line.cells.filter((index) => cells[index]?.hit).length, total }));
  const best = Math.max(...lineProgress.map((line) => line.hits));
  const completedLines = lineProgress.filter((line) => line.hits === 5).map((line) => line.lineId);
  return { cells, completedLines, hasBingo: completedLines.length > 0, lineProgress,
    bestLine: { hits: best, total, lineIds: lineProgress.filter((line) => line.hits === best).map((line) => line.lineId) } };
}

export function cohortBingo(companies: { phraseCounts: { id: string; count: number }[] }[]) {
  const companyCounts = new Map<string, number>();
  for (const company of companies) {
    const present = new Set(company.phraseCounts.filter((phrase) => phrase.count > 0).map((phrase) => phrase.id));
    for (const id of present) companyCounts.set(id, (companyCounts.get(id) ?? 0) + 1);
  }
  const aggregate = evaluateBingo(companyCounts.keys());
  return { ...aggregate, scoredCompanies: companies.length, cells: aggregate.cells.map((cell) => ({ ...cell,
    companiesHit: cell.phraseId === null ? null : companyCounts.get(cell.phraseId) ?? 0 })) };
}
