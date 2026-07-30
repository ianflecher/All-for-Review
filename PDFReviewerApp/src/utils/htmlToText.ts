/**
 * Minimal readability-style extraction: pulls the main prose out of an HTML
 * page and drops chrome (nav, ads, scripts, comments). Pure string work, no
 * DOM required, so it runs identically on web, native and desktop.
 */

const BLOCK_TAGS = 'p|div|br|section|article|h[1-6]|li|tr|blockquote|pre';

function decodeEntities(text: string): string {
  const named: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    ndash: '–',
    mdash: '—',
    lsquo: '‘',
    rsquo: '’',
    ldquo: '“',
    rdquo: '”',
    hellip: '…',
    eacute: 'é',
    egrave: 'è',
  };

  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (whole, name) => named[name.toLowerCase()] ?? whole);
}

/** Strip elements that never contain article prose, including their contents. */
function stripNoise(html: string): string {
  const kill = [
    'script',
    'style',
    'noscript',
    'svg',
    'canvas',
    'iframe',
    'nav',
    'header',
    'footer',
    'aside',
    'form',
    'button',
    'select',
    'template',
  ];
  let out = html;
  for (const tag of kill) {
    out = out.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), ' ');
    // Unclosed variants (common with <script src> and malformed markup).
    out = out.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi'), ' ');
  }
  return out.replace(/<!--[\s\S]*?-->/g, ' ');
}

function tagsToText(fragment: string): string {
  return decodeEntities(
    fragment
      .replace(new RegExp(`<(?:${BLOCK_TAGS})\\b[^>]*>`, 'gi'), '\n')
      .replace(new RegExp(`<\\/(?:${BLOCK_TAGS})>`, 'gi'), '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractPageTitle(html: string): string | null {
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (ogTitle) return decodeEntities(ogTitle[1]).trim();

  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    const text = tagsToText(h1[1]);
    if (text) return text;
  }

  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (title) return decodeEntities(title[1]).replace(/\s+/g, ' ').trim();

  return null;
}

/**
 * Picks the densest prose container. Real articles concentrate their text in
 * one <article>/<main>/<div>; page chrome is spread thin across many small
 * elements, so the candidate with the most paragraph text usually wins.
 */
export function htmlToArticleText(html: string): string {
  const cleaned = stripNoise(html);

  const candidates: string[] = [];
  const containerRe = /<(article|main)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = containerRe.exec(cleaned)) !== null) {
    candidates.push(match[2]);
  }

  // Densest single <div>, scored by how much <p> text it holds.
  const divRe = /<div\b[^>]*>([\s\S]*?)<\/div>/gi;
  let bestDiv = '';
  let bestScore = 0;
  while ((match = divRe.exec(cleaned)) !== null) {
    const block = match[1];
    const paragraphs = block.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [];
    const score = paragraphs.join(' ').replace(/<[^>]+>/g, '').length;
    if (score > bestScore) {
      bestScore = score;
      bestDiv = block;
    }
  }
  if (bestDiv) candidates.push(bestDiv);

  // Every <p> on the page. Pages that split prose across many sibling
  // containers (multi-chapter books, paginated stories) only surface fully
  // here, and the longest-candidate rule below picks it when it wins.
  const allParagraphs = cleaned.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi);
  if (allParagraphs && allParagraphs.length > 0) {
    candidates.push(allParagraphs.join('\n'));
  }

  // Last resort only: the raw body, which still carries some page chrome.
  if (candidates.length === 0) {
    const body = cleaned.match(/<body\b[^>]*>([\s\S]*)<\/body>/i);
    candidates.push(body ? body[1] : cleaned);
  }

  const best = candidates
    .map(tagsToText)
    .sort((a, b) => b.length - a.length)[0] || '';

  // Drop leftover one-word menu lines that survived extraction.
  return best
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return true;
      return trimmed.length > 2;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
