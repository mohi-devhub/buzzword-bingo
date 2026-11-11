// Reuses homepage attempts across weeks and enforces monthly refresh dates.
// Prevents repeated paid calls, including after failures or interruptions.
import { join } from "node:path";
import { homepageSchema, scrapeSchema, type Scrape } from "./data.js";
import { jsonFiles, readJson } from "./files.js";

export function normalizeUrl(value: string): string {
  const url = new URL(homepageSchema.parse(value));
  url.hash = "";
  return url.href;
}

export function isoWeek(date: Date): string {
  const thursday = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((thursday.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function isFirstMonday(date: Date): boolean {
  return date.getUTCDay() === 1 && date.getUTCDate() <= 7;
}

export function cachedAttempt<
  T extends Pick<Scrape, "normalizedUrl" | "attemptedAt" | "week">,
>(records: T[], url: string, date: Date, refresh: boolean): T | undefined {
  const normalized = normalizeUrl(url);
  const matches = records
    .filter((record) => record.normalizedUrl === normalized)
    .sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt));
  const sameWeek = matches.find((record) => record.week === isoWeek(date));
  if (sameWeek) return sameWeek;
  const latest = matches[0];
  if (!latest || !refresh) return latest;
  const month = date.toISOString().slice(0, 7);
  if (!isFirstMonday(date) || latest.attemptedAt.slice(0, 7) >= month)
    return latest;
  return undefined;
}

export async function readScrapes(root: string): Promise<Scrape[]> {
  const result: Scrape[] = [];
  for (const path of await jsonFiles(join(root, ".local/cache")))
    result.push(await readJson(path, scrapeSchema));
  return result;
}
