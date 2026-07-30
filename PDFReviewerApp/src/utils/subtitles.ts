/**
 * Parses .srt and .vtt caption files into plain prose.
 *
 * This is the reliable way to turn video content into study material: YouTube,
 * Coursera and most course platforms let you download captions, and the parsed
 * text works offline like any other document.
 */

const TIMECODE = /^\s*(?:\d+:)?\d{1,2}:\d{2}[.,]\d{1,3}\s*-->\s*(?:\d+:)?\d{1,2}:\d{2}[.,]\d{1,3}/;

export function parseSubtitles(raw: string): string {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.length === 0) continue;
    if (TIMECODE.test(trimmed)) continue;
    // WEBVTT header, NOTE/STYLE/REGION blocks, and bare cue numbers.
    if (/^WEBVTT/i.test(trimmed)) continue;
    if (/^(NOTE|STYLE|REGION)\b/i.test(trimmed)) continue;
    if (/^\d+$/.test(trimmed)) continue;

    // Strip cue tags (<v Speaker>, <i>, <00:00:01.000>) and speaker labels.
    const cleaned = trimmed
      .replace(/<[^>]+>/g, '')
      .replace(/\{[^}]*\}/g, '')
      .trim();

    if (cleaned.length === 0) continue;

    // Auto-generated captions repeat the previous line as a rolling window.
    if (out.length > 0 && out[out.length - 1] === cleaned) continue;

    out.push(cleaned);
  }

  if (out.length === 0) {
    throw new Error('No caption text was found in this subtitle file.');
  }

  // Captions break mid-sentence, so join into flowing prose and let the
  // analyser re-split on real sentence boundaries.
  return out
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim();
}
