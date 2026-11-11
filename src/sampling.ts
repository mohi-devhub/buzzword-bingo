// Pins an alphabet-spanning sample while preserving the original ten companies.
// Selects twenty additions from the every-eighth grid without exceeding approval.
import { metadata, sampleSchema, type CompanyDataset, type Sample } from './data.js';

export function tuningSample(dataset: CompanyDataset, originalSlugs: string[]): Sample {
  const originals = new Set(originalSlugs);
  if (originals.size !== 10) throw new Error('The tuning sample requires the original ten unique slugs.');
  const indexed = dataset.companies.map((company, index) => ({
    id: company.id, slug: company.slug, position: index + 1,
  }));
  const kept = indexed.filter((company) => originals.has(company.slug));
  if (kept.length !== 10) throw new Error('An original company is missing from the pinned source list.');
  const candidates = indexed.filter((company, index) => index % 8 === 0 && !originals.has(company.slug));
  if (candidates.length < 20) throw new Error('The batch has fewer than twenty uncached grid positions.');
  const positions = new Set(Array.from({ length: 20 }, (_, index) => Math.round(index * (candidates.length - 1) / 19)));
  return sampleSchema.parse({
    _meta: metadata('Pins the approved thirty-company Fall 2026 tuning sample.',
      'Preserves ten existing captures and adds twenty companies across the alphabet.'),
    batch: dataset.selectedBatch, sourceFetchedAt: dataset.fetchedAt, population: indexed.length,
    strategy: 'Keep the original ten. From zero-based indices 0,8,16,..., exclude originals; choose twenty evenly spaced candidate indices using round(i*(candidateCount-1)/19).',
    companies: [
      ...kept.map((company) => ({ ...company, cohort: 'original' })),
      ...candidates.filter((_, index) => positions.has(index)).map((company) => ({ ...company, cohort: 'expansion' })),
    ].sort((a, b) => a.position - b.position),
  });
}
