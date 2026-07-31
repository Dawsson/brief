import type { UserRecord } from "../../data/model";
import { ApiKeyService } from "./api-keys.service";
import { SessionService } from "./sessions.service";

export class PrincipalService {
  constructor(
    private readonly apiKeys: ApiKeyService,
    private readonly sessions: SessionService,
  ) {}

  async resolve(request: Request): Promise<UserRecord | undefined> {
    if (request.headers.has("authorization")) return this.apiKeys.resolve(request);
    return this.sessions.resolve(request);
  }

  async revoke(request: Request): Promise<void> {
    if (request.headers.has("authorization")) return this.apiKeys.revoke(request);
    return this.sessions.revoke(request);
  }
}
