export const briefContentTypes = [
  "text/html",
  "text/markdown",
  "text/plain",
  "application/json",
  "application/vnd.harbr.brief+json",
] as const;

export type BriefContentType = (typeof briefContentTypes)[number];

interface MediaRange {
  mime: string;
  quality: number;
  specificity: number;
}

function parseRange(value: string): MediaRange | undefined {
  const [rawMime, ...parameters] = value.split(";");
  const mime = rawMime?.trim().toLowerCase();
  if (!mime) return undefined;
  const qParameter = parameters.find((parameter) => parameter.trim().startsWith("q="));
  const quality = qParameter ? Number(qParameter.trim().slice(2)) : 1;
  if (!Number.isFinite(quality) || quality <= 0) return undefined;
  const specificity = mime === "*/*" ? 0 : mime.endsWith("/*") ? 1 : 2;
  return { mime, quality: Math.min(1, quality), specificity };
}

function matches(range: string, candidate: BriefContentType): boolean {
  if (range === "*/*") return true;
  if (range.endsWith("/*")) return candidate.startsWith(range.slice(0, -1));
  return range === candidate;
}

export function negotiateContentType(accept: string | null): BriefContentType | undefined {
  if (!accept?.trim()) return "text/html";
  const ranges = accept
    .split(",")
    .map(parseRange)
    .filter((range): range is MediaRange => range !== undefined)
    .sort((left, right) => right.quality - left.quality || right.specificity - left.specificity);

  for (const range of ranges) {
    const match = briefContentTypes.find((candidate) => matches(range.mime, candidate));
    if (match) return match;
  }
  return undefined;
}
