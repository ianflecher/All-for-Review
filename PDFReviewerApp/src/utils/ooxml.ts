import { unzipSync } from 'fflate';

/**
 * Text extraction for Office Open XML files (.docx / .pptx).
 *
 * Both formats are ZIP archives of XML. fflate unzips them in pure JS, so this
 * works offline on every platform with no native modules involved.
 */

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    // Ampersand last, so "&amp;lt;" does not become "<".
    .replace(/&amp;/g, '&');
}

/**
 * Converts a WordprocessingML/DrawingML fragment to plain text.
 *
 * Paragraph and break elements become newlines first, then all remaining tags
 * are stripped — what's left is exactly the run text (<w:t> / <a:t>).
 */
function xmlToText(xml: string, paragraphTag: string): string {
  return decodeXmlEntities(
    xml
      // Field instructions and tracked deletions are not document prose.
      .replace(/<w:instrText[\s\S]*?<\/w:instrText>/g, '')
      .replace(/<w:delText[\s\S]*?<\/w:delText>/g, '')
      .replace(/<(?:w|a):tab\s*\/>/g, '\t')
      .replace(/<(?:w|a):br\s*\/>/g, '\n')
      .replace(new RegExp(`</${paragraphTag}>`, 'g'), '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function readEntry(files: Record<string, Uint8Array>, name: string): string | null {
  const entry = files[name];
  if (!entry) return null;
  return new TextDecoder('utf-8').decode(entry);
}

export function extractDocxText(bytes: Uint8Array): string {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new Error(
      'This file is not a valid .docx. If it is an older .doc file, please re-save it as .docx first.'
    );
  }

  const parts: string[] = [];

  const body = readEntry(files, 'word/document.xml');
  if (body) parts.push(xmlToText(body, 'w:p'));

  // Headers/footers usually repeat page furniture, so they are skipped, but
  // footnotes and endnotes carry real content.
  for (const name of ['word/footnotes.xml', 'word/endnotes.xml']) {
    const extra = readEntry(files, name);
    if (extra) {
      const text = xmlToText(extra, 'w:p');
      if (text.length > 0) parts.push(text);
    }
  }

  const combined = parts.join('\n\n').trim();
  if (combined.length === 0) {
    throw new Error('No readable text was found in this Word document.');
  }
  return combined;
}

export function extractPptxText(bytes: Uint8Array): string {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new Error('This file is not a valid .pptx presentation.');
  }

  const slideNames = Object.keys(files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const num = (s: string) => parseInt(s.match(/slide(\d+)\.xml$/)![1], 10);
      return num(a) - num(b);
    });

  const parts: string[] = [];
  for (const name of slideNames) {
    const xml = readEntry(files, name);
    if (!xml) continue;
    const text = xmlToText(xml, 'a:p');
    if (text.length > 0) parts.push(text);
  }

  const combined = parts.join('\n\n').trim();
  if (combined.length === 0) {
    throw new Error('No readable text was found in this presentation.');
  }
  return combined;
}
