// Extracts visible text from rendered homepage markdown with fixed token rules.
// Excludes markup, URLs, image descriptions, and code from future scores.
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Nodes } from 'mdast';

const parser = unified().use(remarkParse).use(remarkGfm);

function visibleText(node: Nodes): string {
  switch (node.type) {
    case 'image': case 'imageReference': case 'code': case 'inlineCode':
    case 'html': case 'definition': case 'footnoteDefinition': case 'footnoteReference':
      return '';
    case 'text': return node.value;
    case 'break': return ' ';
    default: {
      if (!('children' in node)) return '';
      const inline = ['paragraph', 'heading', 'emphasis', 'strong', 'delete', 'link', 'linkReference', 'tableCell'].includes(node.type);
      return node.children.map(visibleText).join(inline ? '' : '\n\n');
    }
  }
}

export function wordCount(text: string): number {
  return text.match(/[\p{L}\p{N}]+(?:['’\-‐‑‒–—][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

export function extractText(markdown: string): { text: string; wordCount: number } {
  const text = visibleText(parser.parse(markdown)).normalize('NFKC')
    .replace(/[\t \u00a0]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return { text, wordCount: wordCount(text) };
}
