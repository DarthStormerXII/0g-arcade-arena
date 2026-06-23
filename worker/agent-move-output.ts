export type ParsedAgentMove = {
  move: { column: number };
  confidence: number;
  reasoningSummary: string;
};

export function parseAgentMoveContent(content: string): ParsedAgentMove {
  const jsonText = extractJson(content);
  const parsed = JSON.parse(jsonText) as {
    move?: { column?: unknown };
    confidence?: unknown;
    reasoningSummary?: unknown;
  };
  const column = Number(parsed.move?.column);
  if (!Number.isInteger(column)) {
    throw new Error("0G Compute response did not include an integer move.column.");
  }
  return {
    move: { column },
    confidence: normalizeConfidence(typeof parsed.confidence === "number" ? parsed.confidence : 0.5),
    reasoningSummary: typeof parsed.reasoningSummary === "string" ? parsed.reasoningSummary.slice(0, 240) : "",
  };
}

export function extractJson(content: string) {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  throw new Error("0G Compute response did not contain JSON.");
}

export function normalizeConfidence(value: number) {
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}
