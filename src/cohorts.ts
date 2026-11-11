// Loads either a pinned comparison cohort or a YC batch and optional sample.
// Shares validated selection and opt-out handling across crawling and scoring.
import { join } from 'node:path';
import { cohortSchema, companiesSchema, exclusionsSchema, sampleSchema, slugSchema } from './data.js';
import { normalizeUrl } from './cache.js';
import { readJson } from './files.js';

export async function selectCohort(root: string, options: { cohort?: string; sample?: string }) {
  if (options.cohort && options.sample) throw new Error('Choose either --cohort or --sample.');
  let cohort;
  if (options.cohort) {
    const name = slugSchema.parse(options.cohort);
    cohort = await readJson(join(root, `data/cohorts/${name}.json`), cohortSchema);
    if (cohort.id !== name) throw new Error('The cohort ID does not match its filename.');
  } else {
    const dataset = await readJson(join(root, 'data/companies.json'), companiesSchema);
    let companies = dataset.companies;
    if (options.sample) {
      const name = slugSchema.parse(options.sample);
      const sample = await readJson(join(root, `data/samples/${name}.json`), sampleSchema);
      if (sample.batch !== dataset.selectedBatch || sample.sourceFetchedAt !== dataset.fetchedAt) {
        throw new Error('The pinned sample does not match the imported company snapshot.');
      }
      companies = sample.companies.map((entry) => {
        const company = dataset.companies.find((company) => company.id === entry.id && company.slug === entry.slug);
        if (!company) throw new Error('A sample company is missing from the source list.');
        return company;
      });
    }
    cohort = { id: options.sample ?? 'yc-current', label: dataset.selectedBatch, sourceFetchedAt: dataset.fetchedAt, companies };
  }
  if (new Set(cohort.companies.map((company) => company.id)).size !== cohort.companies.length
    || new Set(cohort.companies.map((company) => company.slug)).size !== cohort.companies.length) {
    throw new Error('Cohort contains duplicate company IDs or slugs.');
  }
  const exclusions = await readJson(join(root, 'data/exclusions.json'), exclusionsSchema);
  const blockedUrls = new Set(exclusions.normalizedUrls.map(normalizeUrl));
  return { ...cohort, companies: cohort.companies.filter((company) => !exclusions.companyIds.includes(company.id)
    && !blockedUrls.has(normalizeUrl(company.website))) };
}
