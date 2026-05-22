import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const {
  mockTokenizer,
  mockTokenizerFromPretrained,
  mockModel,
  mockModelFromPretrained,
  setLogits,
} = vi.hoisted(() => {
  let logits = {
    data: Float32Array.from([0.5, 2]),
    dims: [2, 1],
  };
  const tokenizer = vi.fn(() => ({ input_ids: "ids", attention_mask: "mask" }));
  const model = vi.fn(async () => ({ logits }));
  return {
    mockTokenizer: tokenizer,
    mockTokenizerFromPretrained: vi.fn(async () => tokenizer),
    mockModel: model,
    mockModelFromPretrained: vi.fn(async () => model),
    setLogits: (data: number[], dims: number[]) => {
      logits = { data: Float32Array.from(data), dims };
      model.mockResolvedValue({ logits });
    },
  };
});

vi.mock("@huggingface/transformers", () => ({
  AutoTokenizer: {
    from_pretrained: mockTokenizerFromPretrained,
  },
  AutoModelForSequenceClassification: {
    from_pretrained: mockModelFromPretrained,
  },
}));

import {
  rerank,
  isRerankerAvailable,
  __resetRerankerForTests,
} from "../src/state/reranker.js";

describe("reranker", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env["AGENTMEMORY_RERANKER_MODEL"];
    delete process.env["AGENTMEMORY_RERANKER_DTYPE"];
    delete process.env["AGENTMEMORY_RERANKER_MODEL_FILE"];
    __resetRerankerForTests();
    mockTokenizer.mockClear();
    mockTokenizerFromPretrained.mockClear();
    mockModel.mockClear();
    mockModelFromPretrained.mockClear();
    mockTokenizer.mockReturnValue({ input_ids: "ids", attention_mask: "mask" });
    mockModel.mockResolvedValue({
      logits: { data: Float32Array.from([0.5, 2]), dims: [2, 1] },
    });
    setLogits([0.5, 2], [2, 1]);
  });

  afterEach(() => {
    process.env = originalEnv;
    __resetRerankerForTests();
  });

  it("returns results unchanged when @huggingface/transformers is unavailable", async () => {
    mockModelFromPretrained.mockRejectedValueOnce(new Error("not installed"));
    const results = [
      {
        observation: {
          id: "o1",
          title: "First",
          narrative: "First result",
        },
        bm25Score: 0.5,
        vectorScore: 0.6,
        graphScore: 0,
        combinedScore: 0.8,
        sessionId: "s1",
      },
      {
        observation: {
          id: "o2",
          title: "Second",
          narrative: "Second result",
        },
        bm25Score: 0.3,
        vectorScore: 0.4,
        graphScore: 0,
        combinedScore: 0.5,
        sessionId: "s1",
      },
    ] as any;

    const reranked = await rerank("test query", results);
    expect(reranked).toEqual(results);
  });

  it("isRerankerAvailable returns false when not loaded", () => {
    expect(isRerankerAvailable()).toBe(false);
  });

  it("loads the Japanese reranker model and default ONNX file by default", async () => {
    const results = [
      {
        observation: { id: "o1", title: "認証", narrative: "JWTを検証する" },
        combinedScore: 0.3,
      },
      {
        observation: { id: "o2", title: "検索", narrative: "BM25を調整する" },
        combinedScore: 0.2,
      },
    ] as any;

    await rerank("認証の実装", results);

    expect(mockTokenizerFromPretrained).toHaveBeenCalledWith(
      "hotchpotch/japanese-reranker-xsmall-v2",
    );
    expect(mockModelFromPretrained).toHaveBeenCalledWith(
      "hotchpotch/japanese-reranker-xsmall-v2",
      {
        model_file_name: "model_qint8_avx2",
      },
    );
    expect(isRerankerAvailable()).toBe(true);
  });

  it("allows reranker model, dtype, and model file overrides", async () => {
    process.env["AGENTMEMORY_RERANKER_MODEL"] = "custom/reranker";
    process.env["AGENTMEMORY_RERANKER_DTYPE"] = "q8";
    process.env["AGENTMEMORY_RERANKER_MODEL_FILE"] =
      "onnx/model_qint8_arm64.onnx";
    const results = [
      { observation: { id: "o1", title: "A" }, combinedScore: 0.3 },
      { observation: { id: "o2", title: "B" }, combinedScore: 0.2 },
    ] as any;

    await rerank("query", results);

    expect(mockTokenizerFromPretrained).toHaveBeenCalledWith("custom/reranker");
    expect(mockModelFromPretrained).toHaveBeenCalledWith("custom/reranker", {
      dtype: "q8",
      model_file_name: "model_qint8_arm64",
    });
  });

  it("tokenizes query and passages as text pairs", async () => {
    const results = [
      {
        observation: { id: "o1", title: "認証", narrative: "JWTを検証する" },
        combinedScore: 0.3,
      },
      {
        observation: { id: "o2", title: "検索", narrative: "BM25を調整する" },
        combinedScore: 0.2,
      },
    ] as any;

    await rerank("認証の実装", results);

    expect(mockTokenizer).toHaveBeenCalledWith(
      ["認証の実装", "認証の実装"],
      {
        text_pair: ["認証\nJWTを検証する", "検索\nBM25を調整する"],
        padding: true,
        truncation: true,
      },
    );
    expect(mockTokenizer.mock.calls[0]?.[0]).not.toContain("[SEP]");
    expect(mockTokenizer.mock.calls[0]?.[1].text_pair.join(" ")).not.toContain(
      "[SEP]",
    );
  });

  it("reranks single-logit outputs with sigmoid scores", async () => {
    setLogits([-2, 2], [2, 1]);
    const results = [
      {
        observation: { id: "low", title: "低い" },
        combinedScore: 0.9,
      },
      {
        observation: { id: "high", title: "高い" },
        combinedScore: 0.1,
      },
    ] as any;

    const reranked = await rerank("query", results);

    expect(reranked.map((result: any) => result.observation.id)).toEqual([
      "high",
      "low",
    ]);
    expect(reranked[0].combinedScore).toBeCloseTo(0.880797, 5);
    expect(reranked[1].combinedScore).toBeCloseTo(0.119203, 5);
  });

  it("reranks two-logit outputs with the last softmax class", async () => {
    setLogits([3, 1, 1, 3], [2, 2]);
    const results = [
      {
        observation: { id: "negative", title: "低い" },
        combinedScore: 0.9,
      },
      {
        observation: { id: "positive", title: "高い" },
        combinedScore: 0.1,
      },
    ] as any;

    const reranked = await rerank("query", results);

    expect(reranked.map((result: any) => result.observation.id)).toEqual([
      "positive",
      "negative",
    ]);
    expect(reranked[0].combinedScore).toBeCloseTo(0.880797, 5);
    expect(reranked[1].combinedScore).toBeCloseTo(0.119203, 5);
  });

  it("keeps original results when model inference fails", async () => {
    mockModel.mockRejectedValueOnce(new Error("inference failed"));
    const results = [
      {
        observation: { id: "o1", title: "First" },
        combinedScore: 0.8,
      },
      {
        observation: { id: "o2", title: "Second" },
        combinedScore: 0.5,
      },
    ] as any;

    const reranked = await rerank("query", results);

    expect(reranked).toEqual(results);
  });

  it("handles single result gracefully", async () => {
    const results = [
      {
        observation: { id: "o1", title: "Only" },
        combinedScore: 1.0,
      },
    ] as any;

    const reranked = await rerank("query", results);
    expect(reranked).toHaveLength(1);
  });

  it("handles empty results", async () => {
    const reranked = await rerank("query", []);
    expect(reranked).toHaveLength(0);
  });
});
