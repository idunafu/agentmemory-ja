import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockModules } = vi.hoisted(() => ({
  mockModules: new Map<string, unknown>(),
}));

vi.mock("node:module", () => ({
  createRequire: () => (id: string) => {
    if (mockModules.has(id)) return mockModules.get(id);
    throw new Error(`Cannot find module '${id}'`);
  },
}));

async function loadSegmenter() {
  vi.resetModules();
  return import("../src/state/cjk-segmenter.js");
}

describe("CJK segmenter", () => {
  beforeEach(() => {
    mockModules.clear();
  });

  it("segments Japanese text with wakachigaki tokenize()", async () => {
    const tokenize = vi.fn(() => ["日本語", "を", "検索"]);
    mockModules.set("wakachigaki", { tokenize });

    const { segmentCjk } = await loadSegmenter();

    expect(segmentCjk("日本語を検索")).toEqual(["日本語", "を", "検索"]);
    expect(tokenize).toHaveBeenCalledWith("日本語を検索");
  });

  it("falls back to the whole Japanese run when wakachigaki is unavailable", async () => {
    const { segmentCjk } = await loadSegmenter();

    expect(segmentCjk("日本語を検索")).toEqual(["日本語を検索"]);
  });

  it("continues to segment Han-only text with @node-rs/jieba", async () => {
    const cut = vi.fn(() => ["项目", "记忆"]);
    mockModules.set("@node-rs/jieba", {
      Jieba: {
        withDict: vi.fn(() => ({ cut })),
        new: vi.fn(() => ({ cut })),
      },
    });
    mockModules.set("@node-rs/jieba/dict", { dict: new Uint8Array() });

    const { segmentCjk } = await loadSegmenter();

    expect(segmentCjk("项目记忆")).toEqual(["项目记忆", "项目", "记忆"]);
    expect(cut).toHaveBeenCalledWith("项目记忆", true);
  });

  it("preserves source order across mixed CJK and non-CJK runs", async () => {
    mockModules.set("wakachigaki", {
      tokenize: vi.fn(() => ["日本語", "を", "検索"]),
    });
    mockModules.set("@node-rs/jieba", {
      Jieba: {
        withDict: vi.fn(() => ({ cut: () => ["项目"] })),
        new: vi.fn(() => ({ cut: () => ["项目"] })),
      },
    });
    mockModules.set("@node-rs/jieba/dict", { dict: new Uint8Array() });

    const { segmentCjk } = await loadSegmenter();

    expect(segmentCjk("abc 日本語を検索 def 项目 ghi")).toEqual([
      "abc",
      "日本語",
      "を",
      "検索",
      "def",
      "项目",
      "ghi",
    ]);
  });
});
