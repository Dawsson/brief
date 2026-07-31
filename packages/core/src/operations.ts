import { cloneDocument } from "./document";
import type {
  BriefBlock,
  BriefDocument,
  BriefOperation,
  BriefPage,
  BriefSection,
  ChecklistBlock,
} from "./types";

export class OperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OperationError";
  }
}

interface BlockLocation {
  block: BriefBlock;
  blockIndex: number;
  section: BriefSection;
}

function findBlock(document: BriefDocument, id: string): BlockLocation | undefined {
  for (const page of document.pages) {
    for (const section of page.sections) {
      const blockIndex = section.blocks.findIndex((block) => block.id === id);
      const block = section.blocks[blockIndex];
      if (blockIndex >= 0 && block) return { block, blockIndex, section };
    }
  }
  return undefined;
}

function findPage(document: BriefDocument, id: string): BriefPage | undefined {
  return document.pages.find((page) => page.id === id);
}

function findSection(document: BriefDocument, id: string): BriefSection | undefined {
  for (const page of document.pages) {
    const section = page.sections.find((candidate) => candidate.id === id);
    if (section) return section;
  }
  return undefined;
}

function updateChecklist(block: ChecklistBlock, item: string, checked: boolean): void {
  const match = block.items.find((candidate) => candidate.id === item || candidate.text === item);
  if (!match) throw new OperationError(`Checklist item not found: ${item}`);
  match.checked = checked;
}

function applyOperation(document: BriefDocument, operation: BriefOperation): void {
  if (operation.kind === "set") {
    if (operation.targetId !== document.id) {
      throw new OperationError(`Set target must be the brief: ${operation.targetId}`);
    }
    if (operation.value === null) {
      if (operation.field === "description") delete document.description;
      if (operation.field === "expiresAt") delete document.expiresAt;
      return;
    }
    if (operation.field === "visibility") {
      if (!(["private", "public", "secret"] as string[]).includes(operation.value)) {
        throw new OperationError(`Invalid visibility: ${operation.value}`);
      }
      document.visibility = operation.value as BriefDocument["visibility"];
      return;
    }
    document[operation.field] = operation.value;
    return;
  }

  if (operation.kind === "append" && typeof operation.value !== "string") {
    const section = findSection(document, operation.targetId);
    if (!section) throw new OperationError(`Section not found: ${operation.targetId}`);
    if (findBlock(document, operation.value.id)) {
      throw new OperationError(`Block already exists: ${operation.value.id}`);
    }
    section.blocks.push(operation.value);
    return;
  }

  const location = findBlock(document, operation.targetId);
  if (!location) throw new OperationError(`Block not found: ${operation.targetId}`);

  if (operation.kind === "replace") {
    if (operation.value.id !== operation.targetId) {
      throw new OperationError("A replacement must preserve the block id");
    }
    location.section.blocks[location.blockIndex] = operation.value;
    return;
  }
  if (operation.kind === "append") {
    if (typeof operation.value !== "string") {
      throw new OperationError("Block appends must target a section");
    }
    if (location.block.type !== "logs" && location.block.type !== "markdown") {
      throw new OperationError(`Cannot append to ${location.block.type}`);
    }
    location.block.content += operation.value;
    return;
  }
  if (operation.kind === "remove") {
    location.section.blocks.splice(location.blockIndex, 1);
    return;
  }
  if (operation.kind === "check" || operation.kind === "uncheck") {
    if (location.block.type !== "checklist") {
      throw new OperationError(`Cannot ${operation.kind} an item in ${location.block.type}`);
    }
    updateChecklist(location.block, operation.item, operation.kind === "check");
    return;
  }
  if (operation.kind === "move") {
    const target = findSection(document, operation.parentId);
    if (!target) throw new OperationError(`Section not found: ${operation.parentId}`);
    const [block] = location.section.blocks.splice(location.blockIndex, 1);
    if (!block) throw new OperationError(`Block not found: ${operation.targetId}`);
    const index = Math.max(0, Math.min(operation.index, target.blocks.length));
    target.blocks.splice(index, 0, block);
  }
}

export function applyOperations(
  source: BriefDocument,
  operations: readonly BriefOperation[],
): BriefDocument {
  const document = cloneDocument(source);
  for (const operation of operations) applyOperation(document, operation);
  document.updatedAt = new Date().toISOString();
  document.version += 1;
  return document;
}

export function appendBlock(document: BriefDocument, block: BriefBlock, sectionId?: string): void {
  const section = sectionId ? findSection(document, sectionId) : document.pages[0]?.sections[0];
  if (!section) throw new OperationError("The brief needs at least one section");
  section.blocks.push(block);
}

export function pageById(document: BriefDocument, id: string): BriefPage | undefined {
  return findPage(document, id);
}
