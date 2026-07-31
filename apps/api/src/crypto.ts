export function randomToken(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `${prefix}_${Buffer.from(bytes).toString("base64url")}`;
}

export function randomUserCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const code = [...bytes].map((byte) => alphabet[byte & 31]).join("");
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export async function hashToken(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Buffer.from(digest).toString("base64url");
}

export function bytesToBase64(value: Uint8Array): string {
  return Buffer.from(value).toString("base64url");
}

export function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(Buffer.from(value, "base64url"));
}
