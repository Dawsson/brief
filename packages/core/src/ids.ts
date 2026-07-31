export type BriefIdPrefix = "blk" | "brf" | "itm" | "pag" | "sec";

export function createId(prefix: BriefIdPrefix): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
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
