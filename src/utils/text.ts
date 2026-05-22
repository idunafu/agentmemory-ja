const CJK_CHAR_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;

export function normalizeSearchText(text: string): string {
  return text.normalize("NFKC");
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  const normalized = normalizeSearchText(text);
  const cjkCount = Array.from(normalized.matchAll(CJK_CHAR_RE)).length;
  const otherCount = normalized.length - cjkCount;
  return Math.max(1, Math.ceil(cjkCount / 1.5 + otherCount / 3));
}

export function estimateJsonTokens(value: unknown): number {
  return estimateTokens(JSON.stringify(value));
}
