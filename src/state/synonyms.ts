import { stem } from "./stemmer.js";

const SYNONYM_GROUPS: string[][] = [
  ["auth", "authentication", "authn", "authenticating"],
  ["authz", "authorization", "authorizing"],
  ["db", "database", "datastore"],
  ["perf", "performance", "latency", "throughput", "slow", "bottleneck"],
  ["optim", "optimization", "optimizing", "optimise", "query-optimization"],
  ["k8s", "kubernetes", "kube"],
  ["config", "configuration", "configuring", "setup"],
  ["deps", "dependencies", "dependency"],
  ["env", "environment"],
  ["fn", "function"],
  ["impl", "implementation", "implementing"],
  ["msg", "message", "messaging"],
  ["repo", "repository"],
  ["req", "request"],
  ["res", "response"],
  ["ts", "typescript"],
  ["js", "javascript"],
  ["pg", "postgres", "postgresql"],
  ["err", "error", "errors"],
  ["api", "endpoint", "endpoints"],
  ["ci", "continuous-integration"],
  ["cd", "continuous-deployment"],
  ["test", "testing", "tests"],
  ["doc", "documentation", "docs"],
  ["infra", "infrastructure"],
  ["deploy", "deployment", "deploying"],
  ["cache", "caching", "cached"],
  ["log", "logging", "logs"],
  ["monitor", "monitoring"],
  ["observe", "observability"],
  ["sec", "security", "secure"],
  ["validate", "validation", "validating"],
  ["migrate", "migration", "migrations"],
  ["debug", "debugging"],
  ["container", "containerization", "docker"],
  ["crash", "crashloop", "crashloopbackoff"],
  ["webhook", "webhooks", "callback"],
  ["middleware", "mw"],
  ["paginate", "pagination"],
  ["serialize", "serialization"],
  ["encrypt", "encryption"],
  ["hash", "hashing"],
  ["認証", "auth", "authentication", "authn", "ログイン", "login"],
  ["認可", "authz", "authorization", "権限", "permission", "permissions"],
  ["設定", "config", "configuration", "setup", "環境設定"],
  ["依存", "deps", "dependencies", "dependency", "依存関係"],
  ["エラー", "err", "error", "errors", "例外", "exception"],
  ["api", "endpoint", "endpoints", "エンドポイント"],
  ["テスト", "test", "testing", "tests", "spec", "仕様"],
  ["検索", "search", "retrieval", "recall", "取得"],
  ["保存", "永続化", "persistence", "persist", "storage"],
  ["キャッシュ", "cache", "caching", "cached"],
  ["ログ", "log", "logging", "logs"],
  ["監視", "monitor", "monitoring", "observability", "observe"],
  ["検証", "validate", "validation", "validating"],
  ["移行", "migrate", "migration", "migrations"],
  ["デプロイ", "deploy", "deployment", "deploying"],
  ["性能", "perf", "performance", "latency", "throughput", "遅延"],
  ["最適化", "optim", "optimization", "optimizing", "optimise"],
  ["ドキュメント", "doc", "documentation", "docs"],
];

const synonymMap = new Map<string, Set<string>>();

function normalizeTerm(term: string): string {
  const lower = term.normalize("NFKC").toLowerCase();
  return /[a-z]/.test(lower) ? stem(lower) : lower;
}

for (const group of SYNONYM_GROUPS) {
  const stemmed = group.map(normalizeTerm);
  for (const s of stemmed) {
    if (!synonymMap.has(s)) synonymMap.set(s, new Set());
    for (const other of stemmed) {
      if (other !== s) synonymMap.get(s)!.add(other);
    }
  }
}

export function getSynonyms(stemmedTerm: string): string[] {
  const syns = synonymMap.get(stemmedTerm);
  return syns ? [...syns] : [];
}
