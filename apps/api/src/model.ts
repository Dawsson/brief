import type { AuthenticatorTransportFuture, Base64URLString } from "@simplewebauthn/server";

export type UserRole = "admin" | "user";

export interface UserRecord {
  /** @deprecated Legacy single-token storage. New tokens use ApiTokenRecord. */
  apiTokenHash?: string;
  createdAt: string;
  email: string;
  id: string;
  role: UserRole;
}

export interface ApiTokenRecord {
  createdAt: string;
  idHash: string;
  userId: string;
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

export interface DeviceAuthorizationRecord {
  approvedAt?: string;
  consumedAt?: string;
  createdAt: string;
  deniedAt?: string;
  deviceCodeHash: string;
  expiresAt: string;
  id: string;
  intervalSeconds: number;
  status: "approved" | "consumed" | "denied" | "pending";
  userCode: string;
  userId?: string;
}
