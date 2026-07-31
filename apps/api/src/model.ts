import type { AuthenticatorTransportFuture, Base64URLString } from "@simplewebauthn/server";

export type UserRole = "admin" | "user";

export interface UserRecord {
  apiTokenHash?: string;
  createdAt: string;
  email: string;
  id: string;
  role: UserRole;
}

export interface CredentialRecord {
  counter: number;
  credentialId: Base64URLString;
  publicKey: string;
  transports?: AuthenticatorTransportFuture[];
  userId: string;
}

export interface InviteRecord {
  acceptedAt?: string;
  createdAt: string;
  email: string;
  expiresAt: string;
  id: string;
  role: UserRole;
  tokenHash: string;
}

export interface FlowRecord {
  challenge: string;
  credentialId?: string;
  email: string;
  expiresAt: string;
  id: string;
  inviteId?: string;
  kind: "authentication" | "registration";
  role: UserRole;
  userId?: string;
}

export interface SessionRecord {
  expiresAt: string;
  idHash: string;
  userId: string;
}
