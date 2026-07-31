export type BriefIdPrefix = "blk" | "brf" | "itm" | "pag" | "sec";

export function createId(prefix: BriefIdPrefix): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

function createEightDigitId(): string {
  let value: number | undefined;
  do {
    value = crypto.getRandomValues(new Uint32Array(1))[0];
  } while (value !== undefined && value >= 4_200_000_000);
  if (value === undefined) throw new Error("Could not create a public ID");
  return String(value % 100_000_000).padStart(8, "0");
}

export function createBriefId(): string {
  return createEightDigitId();
}

export function createPageSlug(): string {
  return createEightDigitId();
}

export function toSlug(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "page";
}
