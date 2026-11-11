// Calls the installed Context.dev SDK for rendered homepage markdown.
// Uses only .env credentials, disables retries, and preserves real usage receipts.
import ContextDev from 'context.dev';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { z } from 'zod';
import type { Content, Credits, Scrape } from './data.js';
import { extractText } from './extract.js';

export type Outcome = {
  result: Exclude<Scrape['result'], { status: 'pending' }>;
  credits: Credits; requestId: string | null; halt: boolean;
};
export type ScrapeHomepage = (url: string) => Promise<Outcome>;
const receiptSchema = z.object({ credits_consumed: z.number().nonnegative(), credits_remaining: z.number().nonnegative() });
const responseSchema = z.object({
  url: z.string(), request_id: z.string(),
  markdown: z.object({ data: z.string().nullable(), success: z.boolean().nullable(), error_code: z.string().optional() }),
  metadata: z.object({ title: z.string().optional(), description: z.string().optional() }),
  key_metadata: receiptSchema.optional(), isPartial: z.boolean().optional(),
});
export const estimatedCredit: Credits = { source: 'estimated', consumed: 1, remaining: null };
export const emptyContent: Content = { finalUrl: null, title: null, metaDescription: null, markdown: '', text: '', wordCount: 0 };

export async function createScraper(root: string): Promise<ScrapeHomepage> {
  let key: string | undefined;
  try { key = parseEnv(await readFile(join(root, '.env'), 'utf8')).CONTEXT_DEV_API_KEY?.trim(); }
  catch { throw new Error('Cannot read the root .env file. No request sent.'); }
  if (!key) throw new Error('CONTEXT_DEV_API_KEY is missing or empty in .env. No request sent.');
  const client = new ContextDev({ apiKey: key, baseURL: 'https://api.context.dev/v1',
    maxRetries: 0, timeout: 60000, logLevel: 'off' });

  return async (url) => {
    try {
      const page = responseSchema.parse(await client.web.scrape({
        url, formats: { markdown: true }, maxAgeMs: 0,
        markdownParams: { includeImages: false, includeLinks: true, sourcePreference: ['html-conversion'] },
        sharedParams: { mainContentOnly: true, includeFrames: false, waitFor: 1000,
          excludeSelectors: ['nav', 'footer', '[role="navigation"]', '[role="contentinfo"]', 'script', 'style', 'noscript'] },
        timeoutOpts: { milliseconds: 45000, behavior: 'fail' }, tags: ['buzzword-bingo'],
      }));
      const credits: Credits = page.key_metadata
        ? { source: 'reported', consumed: page.key_metadata.credits_consumed, remaining: page.key_metadata.credits_remaining }
        : estimatedCredit;
      const markdown = page.markdown.data ?? '';
      const content: Content = { ...extractText(markdown), markdown, finalUrl: page.url,
        title: page.metadata.title ?? null, metaDescription: page.metadata.description ?? null };
      let reason: string | undefined;
      if (page.markdown.success !== true) {
        reason = /block|denied|captcha/i.test(page.markdown.error_code ?? '') ? 'blocked' : 'markdown_failed';
      } else if (page.isPartial) reason = 'partial_page';
      else if (content.wordCount === 0) reason = 'empty_page';
      else if (content.wordCount < 100 && /^(just a moment|access denied|attention required|verify you are human)/i.test(content.title ?? '')) reason = 'blocked';
      else if (content.wordCount < 50) reason = 'insufficient_text';
      return { result: reason ? { ...content, status: 'unscored', reason } : { ...content, status: 'scraped' },
        credits, requestId: page.request_id, halt: credits.remaining === 0 };
    } catch (error) {
      let reason = 'unexpected_response';
      let halt = true;
      if (error instanceof ContextDev.APIConnectionTimeoutError) { reason = 'timeout'; halt = false; }
      else if (error instanceof ContextDev.APIError) {
        reason = error.status ? `context_http_${error.status}` : 'connection_failed';
        halt = error.status !== undefined && [400, 401, 402, 403, 404, 422, 429].includes(error.status);
      }
      return { result: { ...emptyContent, status: 'unscored', reason },
        credits: estimatedCredit, requestId: null, halt };
    }
  };
}
