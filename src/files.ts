// Reads validated JSON and replaces files atomically.
// Preserves cache and credit reservations if a crawl is interrupted.
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { z } from 'zod';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));

export async function readJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const value: unknown = JSON.parse(await readFile(path, 'utf8'));
  return schema.parse(value);
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
  await rename(temporary, path);
}

export function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

export async function jsonFiles(directory: string): Promise<string[]> {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (isMissing(error)) return []; throw error; }
  const paths: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await jsonFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.json')) paths.push(path);
  }
  return paths.sort();
}
