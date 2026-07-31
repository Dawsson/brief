import type { UserRecord } from "../../data/model";
import type { Repository } from "../../data/repository";
import { hashToken, randomToken } from "../../security/tokens";
import { expiresIn } from "./auth.types";

export const SESSION_COOKIE = "brief_session";

export class SessionService {
  constructor(private readonly repository: Repository) {}

  async create(user: UserRecord): Promise<string> {
    const token = randomToken("session");
    await this.repository.putSession({
      idHash: await hashToken(token),
      userId: user.id,
      expiresAt: expiresIn(60 * 24 * 30),
    });
    return token;
  }

  async resolve(request: Request): Promise<UserRecord | undefined> {
    const token = cookieValue(request.headers.get("cookie"), SESSION_COOKIE);
    if (!token) return undefined;
    const session = await this.repository.getSession(await hashToken(token));
    if (!session || session.expiresAt <= new Date().toISOString()) return undefined;
    return this.repository.getUser(session.userId);
  }

  async revoke(request: Request): Promise<void> {
    const token = cookieValue(request.headers.get("cookie"), SESSION_COOKIE);
    if (token) await this.repository.deleteSession(await hashToken(token));
  }
}

function cookieValue(header: string | null, name: string): string | undefined {
  for (const part of header?.split(";") ?? []) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return undefined;
}
