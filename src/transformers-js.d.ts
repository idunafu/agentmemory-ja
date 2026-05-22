declare module "@huggingface/transformers" {
  export function pipeline(
    task: string,
    model: string,
    options?: Record<string, unknown>,
  ): Promise<any>;

  export const AutoTokenizer: {
    from_pretrained(
      model: string,
      options?: Record<string, unknown>,
    ): Promise<any>;
  };

  export const AutoModelForSequenceClassification: {
    from_pretrained(
      model: string,
      options?: Record<string, unknown>,
    ): Promise<any>;
  };
}
