import { describe, expect, it } from "vitest";
import {
  estimateJsonTokens,
  estimateTokens,
  normalizeSearchText,
} from "../src/utils/text.js";
import { COMPRESSION_SYSTEM } from "../src/prompts/compression.js";
import { SUMMARY_SYSTEM } from "../src/prompts/summary.js";

describe("text utilities", () => {
  it("normalizes text with NFKC", () => {
    expect(normalizeSearchText("ＡＰＩ ガード")).toBe("API ガード");
  });

  it("estimates CJK-heavy text more conservatively than ASCII text", () => {
    expect(estimateTokens("認証設定検索")).toBeGreaterThan(
      estimateTokens("auth"),
    );
    expect(estimateJsonTokens({ text: "認証設定検索" })).toBeGreaterThan(0);
  });

  it("adds language preservation policy to memory prompts", () => {
    expect(COMPRESSION_SYSTEM).toContain("file paths");
    expect(SUMMARY_SYSTEM).toContain("file paths");
  });
});
