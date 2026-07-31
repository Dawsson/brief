export const BRIEF_SCHEMA_VERSION = 1 as const;

export type BriefVisibility = "private" | "public" | "secret";
export type CalloutTone = "info" | "success" | "warning" | "danger";
export type SpacerSize = "small" | "medium" | "large";
export type Primitive = boolean | number | string | null;

export interface BaseBlock {
  id: string;
}

export interface HeroBlock extends BaseBlock {
  type: "hero";
  eyebrow?: string;
  title: string;
  subtitle?: string;
}

export interface MarkdownBlock extends BaseBlock {
  type: "markdown";
  content: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface ChecklistBlock extends BaseBlock {
  type: "checklist";
  items: ChecklistItem[];
}

export interface CodeBlock extends BaseBlock {
  type: "code";
  code: string;
  filename?: string;
  language?: string;
}

export interface LogsBlock extends BaseBlock {
  type: "logs";
  content: string;
}

export interface TableBlock extends BaseBlock {
  type: "table";
  columns: string[];
  rows: Record<string, Primitive>[];
}

export interface CalloutBlock extends BaseBlock {
  type: "callout";
  content: string;
  title?: string;
  tone: CalloutTone;
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  alt: string;
  caption?: string;
  url: string;
}

export interface MetricBlock extends BaseBlock {
  type: "metric";
  detail?: string;
  label: string;
  trend?: "down" | "flat" | "up";
  value: string;
}

export interface DividerBlock extends BaseBlock {
  type: "divider";
}

export interface SpacerBlock extends BaseBlock {
  type: "spacer";
  size: SpacerSize;
}

export type BriefBlock =
  | HeroBlock
  | MarkdownBlock
  | ChecklistBlock
  | CodeBlock
  | LogsBlock
  | TableBlock
  | CalloutBlock
  | ImageBlock
  | MetricBlock
  | DividerBlock
  | SpacerBlock;

export interface BriefSection {
  blocks: BriefBlock[];
  id: string;
  title?: string;
}

export interface BriefPage {
  id: string;
  sections: BriefSection[];
  slug: string;
  title: string;
}

export interface BriefDocument {
  createdAt: string;
  description?: string;
  expiresAt?: string;
  id: string;
  ownerId?: string;
  pages: BriefPage[];
  schemaVersion: typeof BRIEF_SCHEMA_VERSION;
  secret?: string;
  title: string;
  updatedAt: string;
  version: number;
  visibility: BriefVisibility;
}

export type BriefOperation =
  | { kind: "replace"; targetId: string; value: BriefBlock }
  | { kind: "append"; targetId: string; value: BriefBlock | string }
  | { kind: "remove"; targetId: string }
  | { kind: "move"; targetId: string; parentId: string; index: number }
  | { kind: "check"; targetId: string; item: string }
  | { kind: "uncheck"; targetId: string; item: string }
  | {
      kind: "set";
      targetId: string;
      field: "description" | "expiresAt" | "title" | "visibility";
      value: string | null;
    };

export interface StoredBrief {
  document: BriefDocument;
  ownerId: string;
}
