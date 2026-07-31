import { BRIEF_SCHEMA_VERSION, type BriefDocument, type BriefVisibility } from "./types";
import { createId, toSlug } from "./ids";

export interface CreateBriefInput {
  description?: string;
  id?: string;
  title: string;
  visibility?: BriefVisibility;
}

export function createDocument(input: CreateBriefInput): BriefDocument {
  const now = new Date().toISOString();
  const pageTitle = "Overview";
  return {
    schemaVersion: BRIEF_SCHEMA_VERSION,
    id: input.id ?? createId("brf"),
    title: input.title,
    ...(input.description === undefined ? {} : { description: input.description }),
    visibility: input.visibility ?? "private",
    pages: [
      {
        id: createId("pag"),
        title: pageTitle,
        slug: toSlug(pageTitle),
        sections: [{ id: createId("sec"), blocks: [] }],
      },
    ],
    createdAt: now,
    updatedAt: now,
    version: 0,
  };
}

export function cloneDocument(document: BriefDocument): BriefDocument {
  return structuredClone(document);
}
