// Builds escaped highlights and short excerpts from exact saved-text offsets.
// Shows the evidence behind each hit without rendering untrusted page HTML.
import type { Match } from './score.js';

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function highlightedHtml(text: string, matches: Match[]): string {
  let cursor = 0;
  const pieces: string[] = [];
  for (const match of matches) {
    pieces.push(escapeHtml(text.slice(cursor, match.start)));
    pieces.push(`<mark>${escapeHtml(text.slice(match.start, match.end))}</mark>`);
    cursor = match.end;
  }
  pieces.push(escapeHtml(text.slice(cursor)));
  return pieces.join('');
}

export function excerpt(text: string, matches: Match[], anchor: Match, maxWords = 12) {
  const tokens = [...text.matchAll(/\S+/gu)];
  const anchorToken = tokens.findIndex((token) => token.index + token[0].length > anchor.start);
  const startToken = Math.max(0, anchorToken - Math.floor(maxWords / 3));
  const endToken = Math.min(tokens.length, startToken + maxWords) - 1;
  const start = tokens[startToken]?.index ?? 0;
  const last = tokens[endToken];
  const end = last ? last.index + last[0].length : text.length;
  const value = text.slice(start, end);
  const local = matches.filter((match) => match.start >= start && match.end <= end)
    .map((match) => ({ ...match, start: match.start - start, end: match.end - start }));
  return { start, end, text: value, matches: local, html: highlightedHtml(value, local),
    prefix: start > 0 ? '… ' : '', suffix: end < text.length ? ' …' : '' };
}
