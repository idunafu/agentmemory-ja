import type { EmbeddingProvider } from "../../types.js";
import { getEnvVar } from "../../config.js";

type Pipeline = (
  task: string,
  model: string,
) => Promise<
  (
    texts: string[],
    options: { pooling: string; normalize: boolean },
  ) => Promise<{ tolist: () => number[][] }>
>;

const DEFAULT_MODEL = "Xenova/all-MiniLM-L6-v2";
const DEFAULT_DIMENSIONS = 384;

function resolveDimensions(value: string | undefined): number {
  if (!value) return DEFAULT_DIMENSIONS;
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `AGENTMEMORY_LOCAL_EMBEDDING_DIMENSIONS must be a positive integer, got: ${value}`,
    );
  }
  return parsed;
}

export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly name = "local";
  readonly dimensions: number;
  private readonly model: string;
  private extractor: Awaited<ReturnType<Pipeline>> | null = null;

  constructor() {
    this.model = getEnvVar("AGENTMEMORY_LOCAL_EMBEDDING_MODEL") || DEFAULT_MODEL;
    this.dimensions = resolveDimensions(
      getEnvVar("AGENTMEMORY_LOCAL_EMBEDDING_DIMENSIONS"),
    );
  }

  async embed(text: string): Promise<Float32Array> {
    const [result] = await this.embedBatch([text]);
    return result;
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    const extractor = await this.getExtractor();
    const output = await extractor(texts, {
      pooling: "mean",
      normalize: true,
    });
    const vectors = output.tolist();
    return vectors.map((v: number[]) => new Float32Array(v));
  }

  private async getExtractor() {
    if (this.extractor) return this.extractor;

    let transformers: { pipeline: Pipeline };
    try {
      // @ts-ignore - optional peer dependency
      transformers = await import("@huggingface/transformers");
    } catch {
      throw new Error(
        "Install @huggingface/transformers for local embeddings: npm install @huggingface/transformers",
      );
    }

    this.extractor = await transformers.pipeline(
      "feature-extraction",
      this.model,
    );
    return this.extractor;
  }
}
