import type { DeviceAuthorizationRecord, UserRecord } from "../../data/model";
import type { Repository } from "../../data/repository";
import { hashToken, randomToken, randomUserCode } from "../../security/tokens";
import { ApiKeyService } from "./api-keys.service";
import type { DeviceTokenResult } from "./auth.types";

export class DeviceAuthorizationService {
  constructor(
    private readonly repository: Repository,
    private readonly apiKeys: ApiKeyService,
    private readonly origin: string,
  ) {}

  async create() {
    let userCode = randomUserCode();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (!(await this.repository.findDeviceAuthorizationByUserCode(userCode))) break;
      userCode = randomUserCode();
    }
    if (await this.repository.findDeviceAuthorizationByUserCode(userCode)) {
      throw new Error("Could not create a unique device code. Try again.");
    }

    const deviceCode = randomToken("device");
    const now = new Date();
    const intervalSeconds = 2;
    const authorization: DeviceAuthorizationRecord = {
      id: `dvc_${crypto.randomUUID().replaceAll("-", "")}`,
      createdAt: now.toISOString(),
      deviceCodeHash: await hashToken(deviceCode),
      expiresAt: new Date(now.getTime() + 10 * 60_000).toISOString(),
      intervalSeconds,
      status: "pending",
      userCode,
    };
    await this.repository.putDeviceAuthorization(authorization);
    return {
      deviceCode,
      userCode,
      verificationUri: `${this.origin}/admin/?device=${encodeURIComponent(userCode)}`,
      expiresIn: 600,
      interval: intervalSeconds,
    };
  }

  get(userCode: string): Promise<DeviceAuthorizationRecord | undefined> {
    return this.repository.findDeviceAuthorizationByUserCode(normalizeUserCode(userCode));
  }

  async decide(
    userCode: string,
    user: UserRecord,
    decision: "approve" | "deny",
  ): Promise<DeviceAuthorizationRecord | undefined> {
    const authorization = await this.get(userCode);
    const now = new Date().toISOString();
    if (!authorization || authorization.expiresAt <= now || authorization.status !== "pending") {
      return authorization;
    }
    const updated: DeviceAuthorizationRecord = {
      ...authorization,
      status: decision === "approve" ? "approved" : "denied",
      ...(decision === "approve"
        ? { approvedAt: now, userId: user.id }
        : { deniedAt: now, userId: user.id }),
    };
    await this.repository.putDeviceAuthorization(updated);
    return updated;
  }

  async exchange(deviceCode: string): Promise<DeviceTokenResult> {
    const hash = await hashToken(deviceCode);
    const authorization = await this.repository.getDeviceAuthorizationByHash(hash);
    const now = new Date().toISOString();
    if (!authorization || authorization.expiresAt <= now) return { status: "expired" };
    if (authorization.status === "pending") {
      return { status: "pending", intervalSeconds: authorization.intervalSeconds };
    }
    if (authorization.status === "denied") return { status: "denied" };
    if (authorization.status === "consumed") return { status: "consumed" };

    const consumed = await this.repository.consumeDeviceAuthorization(hash, now);
    if (!consumed?.userId) return { status: "consumed" };
    const user = await this.repository.getUser(consumed.userId);
    if (!user) return { status: "expired" };
    return { status: "approved", token: await this.apiKeys.issue(user), user };
  }
}

function normalizeUserCode(value: string): string {
  const compact = value
    .trim()
    .toUpperCase()
    .replaceAll(/[^A-Z0-9]/g, "");
  return compact.length === 8 ? `${compact.slice(0, 4)}-${compact.slice(4)}` : value;
}
