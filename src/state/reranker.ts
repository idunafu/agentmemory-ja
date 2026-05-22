import type { HybridSearchResult } from "../types.js";

const DEFAULT_RERANKER_MODEL = "hotchpotch/japanese-reranker-xsmall-v2";
const DEFAULT_RERANKER_MODEL_FILE = "model_qint8_avx2";

type TransformersReranker = {
  tokenizer: any;
  model: any;
};

let reranker: TransformersReranker | null = null;
let rerankerLoading: Promise<TransformersReranker | null> | null = null;
let rerankerUnavailable = false;

function getRerankerModel(): string {
  return process.env["AGENTMEMORY_RERANKER_MODEL"] || DEFAULT_RERANKER_MODEL;
}

function getRerankerModelFile(): string {
  const raw =
    process.env["AGENTMEMORY_RERANKER_MODEL_FILE"] ||
    DEFAULT_RERANKER_MODEL_FILE;
  return raw
    .trim()
    .replace(/^onnx[\\/]/, "")
    .replace(/\.onnx$/i, "");
}

function getRerankerOptions(): Record<string, string> {
  const options: Record<string, string> = {
    model_file_name: getRerankerModelFile(),
  };
  const dtype = process.env["AGENTMEMORY_RERANKER_DTYPE"]?.trim();
  if (dtype) options.dtype = dtype;
  return options;
}

async function loadReranker(): Promise<TransformersReranker | null> {
  if (rerankerUnavailable) return null;
  if (reranker) return reranker;
  if (rerankerLoading) return rerankerLoading;

  rerankerLoading = (async () => {
    try {
      const { AutoTokenizer, AutoModelForSequenceClassification } =
        await import("@huggingface/transformers");
      const modelId = getRerankerModel();
      const [tokenizer, model] = await Promise.all([
        AutoTokenizer.from_pretrained(modelId),
        AutoModelForSequenceClassification.from_pretrained(
          modelId,
          getRerankerOptions(),
        ),
      ]);
      reranker = { tokenizer, model };
      return reranker;
    } catch {
      reranker = null;
      rerankerUnavailable = true;
      return null;
    } finally {
      rerankerLoading = null;
    }
  })();
  return rerankerLoading;
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

function softmaxLast(values: number[]): number {
  const max = Math.max(...values);
  const exps = values.map((value) => Math.exp(value - max));
  const sum = exps.reduce((acc, value) => acc + value, 0);
  return sum === 0 ? 0 : exps[exps.length - 1] / sum;
}

function scoreLogitRow(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return sigmoid(values[0] ?? 0);
  return softmaxLast(values);
}

function extractRerankScores(logits: any, expectedCount: number): number[] {
  const data = Array.from(logits?.data ?? [], Number);
  const dims = Array.isArray(logits?.dims) ? logits.dims : [];
  if (data.length === 0) return [];

  if (dims.length === 1) {
    if (expectedCount > 1 && data.length === expectedCount) {
      return data.map((value) => sigmoid(value));
    }
    return [scoreLogitRow(data)];
  }

  const classCount = dims.length > 1 ? dims[dims.length - 1] : 1;
  if (!classCount || classCount <= 0) return [];

  const scores: number[] = [];
  for (let offset = 0; offset < data.length; offset += classCount) {
    scores.push(scoreLogitRow(data.slice(offset, offset + classCount)));
  }
  return scores.slice(0, expectedCount);
}

function passageText(result: HybridSearchResult): string {
  const obs = result.observation;
  const facts = Array.isArray(obs.facts) ? obs.facts : [];
  const concepts = Array.isArray(obs.concepts) ? obs.concepts : [];
  const files = Array.isArray(obs.files) ? obs.files : [];
  return [
    obs.title,
    obs.subtitle,
    ...facts,
    obs.narrative,
    ...concepts,
    ...files,
    obs.type,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function rerank(
  query: string,
  results: HybridSearchResult[],
  topK = 20,
): Promise<HybridSearchResult[]> {
  if (results.length <= 1) return results;

  const loaded = await loadReranker();
  if (!loaded) return results;

  const candidates = results.slice(0, Math.min(results.length, topK));
  const queries = candidates.map(() => query);
  const passages = candidates.map(passageText);

  const scores = candidates.map((result) => ({
    result,
    rerankScore: result.combinedScore,
  }));

  try {
    const inputs = loaded.tokenizer(queries, {
      text_pair: passages,
      padding: true,
      truncation: true,
    });
    const output = await loaded.model(inputs);
    const rerankScores = extractRerankScores(output.logits, candidates.length);
    rerankScores.forEach((score, index) => {
      if (Number.isFinite(score) && scores[index]) {
        scores[index].rerankScore = score;
      }
    });
  } catch {
    return results;
  }

  scores.sort((a, b) => b.rerankScore - a.rerankScore);

  return scores.map((s, i) => ({
    ...s.result,
    combinedScore: s.rerankScore,
    rerankPosition: i + 1,
  }));
}

export function isRerankerAvailable(): boolean {
  return reranker !== null;
}

export function __resetRerankerForTests(): void {
  reranker = null;
  rerankerLoading = null;
  rerankerUnavailable = false;
}
