import {
  appendBlock,
  applyOperations,
  createDocument,
  createId,
  createPageSlug,
  type BriefBlock,
  type BriefDocument,
  type BriefOperation,
  type BriefSection,
  type BriefVisibility,
  type CalloutTone,
  type Primitive,
  type SpacerSize,
} from "@brief/core";
import { streamingMarkdownExtension } from "@tanstack/markdown/extensions/streaming";
import { parseMarkdown } from "@tanstack/markdown/parser";

export interface BriefClientOptions {
  apiUrl?: string;
  fetch?: typeof globalThis.fetch;
  token?: string;
}

export interface CreateBriefOptions {
  description?: string;
  title: string;
  visibility?: BriefVisibility;
}

export interface CodeOptions {
  filename?: string;
  language?: string;
}

export interface MarkdownOptions {
  profile?: "streaming";
}

function markdownBlock(id: string, source: string, options: MarkdownOptions = {}): BriefBlock {
  const streaming = options.profile === "streaming";
  return {
    id,
    type: "markdown",
    source,
    document: parseMarkdown(source, {
      headingIds: true,
      ...(streaming ? { extensions: [streamingMarkdownExtension()] } : {}),
    }),
    ...(streaming ? { profile: "streaming" as const } : {}),
  };
}

export interface CalloutOptions {
  title?: string;
  tone?: CalloutTone;
}

export interface ImageOptions {
  alt: string;
  caption?: string;
}

export interface MetricOptions {
  detail?: string;
  trend?: "down" | "flat" | "up";
}

type SummaryCommand = ((content: string) => BlockHandle) & {
  replace(content: string): BlockHandle;
};

type TodoCommand = ((items: string[]) => ChecklistHandle) & {
  check(item: string): void;
  uncheck(item: string): void;
};

type LogsCommand = ((content: string) => LogsHandle) & {
  append(content: string): void;
  replace(content: string): BlockHandle;
};

interface ApiBriefResponse {
  data: BriefDocument;
}

function environment(name: "BRIEF_API_TOKEN" | "BRIEF_API_URL"): string | undefined {
  if (typeof process === "undefined") return undefined;
  return process.env[name];
}

class Transport {
  apiUrl: string;
  readonly fetcher: typeof globalThis.fetch;
  private readonly hasExplicitApiUrl: boolean;
  private loadedStoredCredentials = false;
  private token: string | undefined;

  constructor(options: BriefClientOptions) {
    const configuredApiUrl = options.apiUrl ?? environment("BRIEF_API_URL");
    this.hasExplicitApiUrl = configuredApiUrl !== undefined;
    this.apiUrl = (configuredApiUrl ?? "http://localhost:4000").replace(/\/$/, "");
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.token = options.token ?? environment("BRIEF_API_TOKEN");
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    await this.loadStoredCredentials();
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");
    if (init.body) headers.set("content-type", "application/json");
    if (this.token) headers.set("authorization", `Bearer ${this.token}`);
    const response = await this.fetcher(`${this.apiUrl}${path}`, { ...init, headers });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Brief API ${response.status}: ${detail || response.statusText}`);
    }
    return response.json() as Promise<T>;
  }

  private async loadStoredCredentials(): Promise<void> {
    if (this.loadedStoredCredentials || this.token || typeof process === "undefined") return;
    this.loadedStoredCredentials = true;
    const { readStoredCredentials } = await import("./credentials");
    const stored = await readStoredCredentials();
    if (!stored) return;
    if (!this.hasExplicitApiUrl) this.apiUrl = stored.apiUrl.replace(/\/$/, "");
    if (stored.apiUrl.replace(/\/$/, "") === this.apiUrl) this.token = stored.token;
  }
}

export class BlockHandle {
  constructor(
    protected readonly brief: Brief,
    readonly id: string,
  ) {}

  remove(): void {
    this.brief.queue({ kind: "remove", targetId: this.id });
  }

  move(sectionId: string, index: number): void {
    this.brief.queue({ kind: "move", targetId: this.id, parentId: sectionId, index });
  }
}

export class ChecklistHandle extends BlockHandle {
  check(item: string): this {
    this.brief.queue({ kind: "check", targetId: this.id, item });
    return this;
  }

  uncheck(item: string): this {
    this.brief.queue({ kind: "uncheck", targetId: this.id, item });
    return this;
  }
}

export class LogsHandle extends BlockHandle {
  append(content: string): this {
    this.brief.queue({ kind: "append", targetId: this.id, value: content });
    return this;
  }
}

export class Brief {
  readonly summary: SummaryCommand;
  readonly todo: TodoCommand;
  readonly logs: LogsCommand;
  private readonly transport: Transport;
  private operations: BriefOperation[] = [];
  private activeSectionId: string;
  private baseVersion: number;
  private summaryId: string | undefined;
  private todoId: string | undefined;
  private logsId: string | undefined;

  private constructor(
    private document: BriefDocument,
    options: BriefClientOptions,
    private persisted: boolean,
  ) {
    this.transport = new Transport(options);
    this.baseVersion = document.version;
    const section = document.pages[0]?.sections[0];
    if (!section) throw new Error("A Brief requires a page and section");
    this.activeSectionId = section.id;
    this.indexKnownBlocks();

    this.summary = Object.assign((content: string) => this.addSummary(content), {
      replace: (content: string) => this.replaceKnown("markdown", content),
    });
    this.todo = Object.assign((items: string[]) => this.addTodo(items), {
      check: (item: string) => this.toggleKnown("check", item),
      uncheck: (item: string) => this.toggleKnown("uncheck", item),
    });
    this.logs = Object.assign((content: string) => this.addLogs(content), {
      append: (content: string) => this.appendKnownLogs(content),
      replace: (content: string) => this.replaceKnown("logs", content),
    });
  }

  static async create(input: CreateBriefOptions, options: BriefClientOptions = {}): Promise<Brief> {
    return new Brief(createDocument(input), options, false);
  }

  static async open(id: string, options: BriefClientOptions = {}): Promise<Brief> {
    const transport = new Transport(options);
    const response = await transport.request<ApiBriefResponse>(
      `/v1/briefs/${encodeURIComponent(id)}`,
    );
    return new Brief(response.data, options, true);
  }

  get id(): string {
    return this.document.id;
  }

  get state(): Readonly<BriefDocument> {
    return this.document;
  }

  get url(): string {
    return `${this.transport.apiUrl}/b/${this.document.id}${this.document.secret ? `/${this.document.secret}` : ""}`;
  }

  queue(operation: BriefOperation): void {
    this.operations.push(operation);
    this.document = applyOperations(this.document, [operation]);
  }

  page(title: string, build?: (brief: Brief) => void): this {
    if (this.persisted) throw new Error("Add pages before the first publish in Brief v1");
    const section: BriefSection = { id: createId("sec"), blocks: [] };
    this.document.pages.push({
      id: createId("pag"),
      title,
      slug: createPageSlug(),
      sections: [section],
    });
    const previous = this.activeSectionId;
    this.activeSectionId = section.id;
    if (build) {
      build(this);
      this.activeSectionId = previous;
    }
    return this;
  }

  section(title: string, build?: (brief: Brief) => void): this {
    if (this.persisted) throw new Error("Add sections before the first publish in Brief v1");
    const page = this.document.pages.find((candidate) =>
      candidate.sections.some((section) => section.id === this.activeSectionId),
    );
    if (!page) throw new Error("Active page not found");
    const section: BriefSection = { id: createId("sec"), title, blocks: [] };
    page.sections.push(section);
    const previous = this.activeSectionId;
    this.activeSectionId = section.id;
    if (build) {
      build(this);
      this.activeSectionId = previous;
    }
    return this;
  }

  hero(title: string, subtitle?: string, eyebrow?: string): BlockHandle {
    return this.add({
      id: createId("blk"),
      type: "hero",
      title,
      ...(subtitle ? { subtitle } : {}),
      ...(eyebrow ? { eyebrow } : {}),
    });
  }

  markdown(content: string, options: MarkdownOptions = {}): BlockHandle {
    return this.add(markdownBlock(createId("blk"), content, options));
  }

  code(code: string, options: CodeOptions = {}): BlockHandle {
    return this.add({ id: createId("blk"), type: "code", code, ...options });
  }

  table(columns: string[], rows: Record<string, Primitive>[]): BlockHandle {
    return this.add({ id: createId("blk"), type: "table", columns, rows });
  }

  callout(content: string, options: CalloutOptions = {}): BlockHandle {
    return this.add({
      id: createId("blk"),
      type: "callout",
      content,
      tone: options.tone ?? "info",
      ...(options.title ? { title: options.title } : {}),
    });
  }

  image(url: string, options: ImageOptions): BlockHandle {
    return this.add({ id: createId("blk"), type: "image", url, ...options });
  }

  metric(label: string, value: string, options: MetricOptions = {}): BlockHandle {
    return this.add({ id: createId("blk"), type: "metric", label, value, ...options });
  }

  divider(): BlockHandle {
    return this.add({ id: createId("blk"), type: "divider" });
  }

  spacer(size: SpacerSize = "medium"): BlockHandle {
    return this.add({ id: createId("blk"), type: "spacer", size });
  }

  setTitle(title: string): this {
    this.queue({ kind: "set", targetId: this.id, field: "title", value: title });
    return this;
  }

  setVisibility(visibility: BriefVisibility, expiresAt?: Date): this {
    this.queue({ kind: "set", targetId: this.id, field: "visibility", value: visibility });
    if (expiresAt)
      this.queue({
        kind: "set",
        targetId: this.id,
        field: "expiresAt",
        value: expiresAt.toISOString(),
      });
    return this;
  }

  async publish(): Promise<Brief> {
    if (this.persisted) return this.commit();
    const response = await this.transport.request<ApiBriefResponse>("/v1/briefs", {
      method: "POST",
      body: JSON.stringify({ document: this.document }),
    });
    this.document = response.data;
    this.persisted = true;
    this.baseVersion = response.data.version;
    this.operations = [];
    this.indexKnownBlocks();
    return this;
  }

  async commit(): Promise<Brief> {
    if (!this.persisted) return this.publish();
    if (this.operations.length === 0) return this;
    const response = await this.transport.request<ApiBriefResponse>(
      `/v1/briefs/${encodeURIComponent(this.id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ operations: this.operations, expectedVersion: this.baseVersion }),
      },
    );
    this.document = response.data;
    this.baseVersion = response.data.version;
    this.operations = [];
    this.indexKnownBlocks();
    return this;
  }

  private add(block: BriefBlock): BlockHandle {
    if (this.persisted) {
      this.queue({ kind: "append", targetId: this.activeSectionId, value: block });
    } else {
      appendBlock(this.document, block, this.activeSectionId);
    }
    return new BlockHandle(this, block.id);
  }

  private addSummary(content: string): BlockHandle {
    const block = markdownBlock(createId("blk"), content);
    this.summaryId = block.id;
    this.add(block);
    return new BlockHandle(this, block.id);
  }

  private addTodo(items: string[]): ChecklistHandle {
    const block = {
      id: createId("blk"),
      type: "checklist" as const,
      items: items.map((text) => ({ id: createId("itm"), text, checked: false })),
    };
    this.todoId = block.id;
    this.add(block);
    return new ChecklistHandle(this, block.id);
  }

  private addLogs(content: string): LogsHandle {
    const block = { id: createId("blk"), type: "logs" as const, content };
    this.logsId = block.id;
    this.add(block);
    return new LogsHandle(this, block.id);
  }

  private replaceKnown(type: "logs" | "markdown", content: string): BlockHandle {
    const id = type === "logs" ? this.logsId : this.summaryId;
    if (!id) throw new Error(`This brief has no ${type} block yet`);
    this.queue({
      kind: "replace",
      targetId: id,
      value: type === "markdown" ? markdownBlock(id, content) : { id, type, content },
    });
    return new BlockHandle(this, id);
  }

  private toggleKnown(kind: "check" | "uncheck", item: string): void {
    if (!this.todoId) throw new Error("This brief has no checklist yet");
    this.queue({ kind, targetId: this.todoId, item });
  }

  private appendKnownLogs(content: string): void {
    if (!this.logsId) throw new Error("This brief has no logs block yet");
    this.queue({ kind: "append", targetId: this.logsId, value: content });
  }

  private indexKnownBlocks(): void {
    const blocks = this.document.pages.flatMap((page) =>
      page.sections.flatMap((section) => section.blocks),
    );
    this.summaryId = blocks.find((block) => block.type === "markdown")?.id;
    this.todoId = blocks.find((block) => block.type === "checklist")?.id;
    this.logsId = blocks.find((block) => block.type === "logs")?.id;
  }
}
