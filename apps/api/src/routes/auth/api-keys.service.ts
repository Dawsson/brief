import type { UserRecord } from "../../data/model";
import type { Repository } from "../../data/repository";
import { hashToken, randomToken } from "../../security/tokens";

function bearerToken(request: Request): string | undefined {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
}

export class ApiKeyService {
  constructor(private readonly repository: Repository) {}

  async issue(user: UserRecord): Promise<string> {
    const token = randomToken("brief_live");
    await this.repository.putApiToken({
      idHash: await hashToken(token),
      userId: user.id,
      createdAt: new Date().toISOString(),
    });
    return token;
  }

  async resolve(request: Request): Promise<UserRecord | undefined> {
    const token = bearerToken(request);
    if (!token) return undefined;
    const record = await this.repository.getApiToken(await hashToken(token));
    return record ? this.repository.getUser(record.userId) : undefined;
  }

  async revoke(request: Request): Promise<void> {
    const token = bearerToken(request);
    if (token) await this.repository.deleteApiToken(await hashToken(token));
  }
}
