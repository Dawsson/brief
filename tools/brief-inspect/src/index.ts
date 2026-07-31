import { readFileSync } from "node:fs";

interface InspectableBrief {
  id: string;
  pages: { sections: { blocks: { id: string; type: string }[] }[]; title: string }[];
  schemaVersion: number;
  title: string;
  version: number;
  visibility: string;
}

function usage(): never {
  console.log("Usage: brief-inspect <brief.json>");
  process.exit(0);
}

if (process.argv.includes("--help") || process.argv.length < 3) usage();

const path = process.argv[2] ?? "";
let value: unknown;
try {
  value = JSON.parse(readFileSync(path, "utf8")) as unknown;
} catch (cause) {
  console.error(`Invalid JSON: ${cause instanceof Error ? cause.message : "unknown error"}`);
  process.exit(1);
}

if (!value || typeof value !== "object") {
  console.error("Invalid Brief: expected an object");
  process.exit(1);
}

const brief = value as Partial<InspectableBrief>;
if (
  brief.schemaVersion !== 1 ||
  typeof brief.id !== "string" ||
  typeof brief.title !== "string" ||
  !Array.isArray(brief.pages)
) {
  console.error("Invalid Brief: missing schemaVersion, id, title, or pages");
  process.exit(1);
}

const blocks = brief.pages.flatMap((page) => page.sections.flatMap((section) => section.blocks));
const stableIds = new Set(blocks.map((block) => block.id));
if (stableIds.size !== blocks.length) {
  console.error("Invalid Brief: duplicate block ids");
  process.exit(1);
}

console.log(`${brief.title} (${brief.id})`);
console.log(
  `${brief.pages.length} pages · ${blocks.length} blocks · ${brief.visibility ?? "private"} · v${brief.version ?? 0}`,
);
