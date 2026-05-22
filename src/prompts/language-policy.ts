import { getEnvVar } from "../config.js";

export function memoryLanguagePolicy(): string {
  const mode = (getEnvVar("AGENTMEMORY_MEMORY_LANGUAGE") || "auto")
    .trim()
    .toLowerCase();

  if (mode === "ja") {
    return "Write natural-language titles, facts, narratives, decisions, and concepts in Japanese. Preserve file paths, code symbols, library names, API names, command names, and exact quoted text in their original language.";
  }

  if (mode === "en") {
    return "Write natural-language titles, facts, narratives, decisions, and concepts in English. Preserve file paths, code symbols, library names, API names, command names, and exact quoted text in their original language.";
  }

  return "Preserve the primary language of the input. If the observation is mainly Japanese, write natural-language titles, facts, narratives, decisions, and concepts in Japanese; if it is mainly English, use English. Preserve file paths, code symbols, library names, API names, command names, and exact quoted text in their original language.";
}
