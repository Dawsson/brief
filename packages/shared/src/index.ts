import type { BriefDocument, BriefOperation } from "@brief/core";

export interface ApiError {
  error: { code: string; message: string };
}

export interface BriefResponse {
  data: BriefDocument;
}

export interface BriefListResponse {
  data: BriefDocument[];
}

export interface CreateBriefRequest {
  document: BriefDocument;
}

export interface UpdateBriefRequest {
  expectedVersion: number;
  operations: BriefOperation[];
}

export interface UserSummary {
  createdAt: string;
  email: string;
  id: string;
  role: "admin" | "user";
}

export interface InviteSummary {
  acceptedAt?: string;
  email: string;
  expiresAt: string;
  id: string;
  role: "admin" | "user";
}
