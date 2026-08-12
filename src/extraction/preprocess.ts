/**
 * Preprocess a raw chat transcript before summarization.
 * - Normalizes unicode
 * - Removes emojis and non‑informative symbols
 * - Collapses whitespace
 * - Normalizes punctuation
 * - Removes control characters
 *
//  * @param rawText - The concatenated chat transcript (all messages joined with roles)
//  * @returns cleaned string ready for summarization
 */


export function cleanTranscript(rawText: string): string {
  let cleaned = rawText;

  // 1. Unicode normalization (NFKC merges compatibility chars)
  cleaned = cleaned.normalize('NFKC');

  // 2. Remove zero‑width spaces, soft hyphens, etc.
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // 3. Remove control characters (ASCII 0-8, 11, 12, 14-31)
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  // 4. Remove emojis (most, using Unicode property escapes)
  //    This regex targets Emoji_Presentation and Emoji components.
  //    Adjust if you want to keep certain symbols (e.g., arrows).
  cleaned = cleaned.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '');

  // 5. Normalize smart quotes, dashes, ellipsis
  cleaned = cleaned
    .replace(/[\u2018\u2019]/g, "'")   // single quotes
    .replace(/[\u201C\u201D]/g, '"')   // double quotes
    .replace(/[\u2013\u2014]/g, '-')   // en/em dashes
    .replace(/\u2026/g, '...');        // ellipsis

  // 6. Collapse repeated punctuation (e.g., !!! → !, ??? → ?)
  cleaned = cleaned.replace(/([!?]){2,}/g, '$1');

  // 7. Replace multiple spaces/tabs with a single space, and multiple newlines with a single newline
  cleaned = cleaned
    .replace(/[ \t]+/g, ' ')
    .replace(/ \n/g, '\n')
    .replace(/\n /g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();

  return cleaned;
}