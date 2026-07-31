import type { UserRecord } from "../../data/model";

export interface AuthConfiguration {
  adminEmail: string;
  origin: string;
  rpId: string;
  rpName: string;
}

export interface RegistrationInput {
  email: string;
  inviteToken?: string | null | undefined;
}

export type DeviceTokenResult =
  | { intervalSeconds: number; status: "pending" }
  | { status: "approved"; token: string; user: UserRecord }
  | { status: "consumed" }
  | { status: "denied" }
  | { status: "expired" };

export function expiresIn(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}
