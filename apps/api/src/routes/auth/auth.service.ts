import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import type { DeviceAuthorizationRecord, FlowRecord, UserRecord, UserRole } from "../../data/model";
import type { Repository } from "../../data/repository";
import {
  base64ToBytes,
  bytesToBase64,
  hashToken,
  randomToken,
  randomUserCode,
} from "../../security/tokens";

const SESSION_COOKIE = "brief_session";

export interface AuthConfiguration {
  adminEmail: string;
  origin: string;
  rpId: string;
  rpName: string;
}

interface RegistrationInput {
  email: string;
  inviteToken?: string | null | undefined;
}

export type DeviceTokenResult =
  | { intervalSeconds: number; status: "pending" }
  | { status: "approved"; token: string; user: UserRecord }
  | { status: "consumed" }
  | { status: "denied" }
  | { status: "expired" };

function expiresIn(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export class AuthService {
  constructor(
    private readonly repository: Repository,
    private readonly configuration: AuthConfiguration,
  ) {}

  async registrationOptions(input: RegistrationInput) {
    const email = input.email.trim().toLowerCase();
    let role: UserRole;
    let inviteId: string | undefined;

    if (input.inviteToken) {
      const invite = await this.repository.getInviteByHash(await hashToken(input.inviteToken));
      if (
        !invite ||
        invite.acceptedAt ||
        invite.email !== email ||
        invite.expiresAt <= new Date().toISOString()
      ) {
        throw new Error("This invite is invalid or has expired");
      }
      role = invite.role;
      inviteId = invite.id;
    } else {
      const canBootstrap =
        email === this.configuration.adminEmail && (await this.repository.countUsers()) === 0;
      if (!canBootstrap) throw new Error("A valid invite is required");
      role = "admin";
    }

    if (await this.repository.findUserByEmail(email))
      throw new Error("This account already exists");
    const options = await generateRegistrationOptions({
      rpName: this.configuration.rpName,
      rpID: this.configuration.rpId,
      userName: email,
      userDisplayName: email,
      userID: new TextEncoder().encode(email),
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
      excludeCredentials: [],
    });
    const flow: FlowRecord = {
      id: randomToken("flow"),
      kind: "registration",
      challenge: options.challenge,
      email,
      role,
      ...(inviteId ? { inviteId } : {}),
      expiresAt: expiresIn(10),
    };
    await this.repository.putFlow(flow);
    return { flowId: flow.id, options };
  }

  async verifyRegistration(flowId: string, response: RegistrationResponseJSON) {
    const flow = await this.validFlow(flowId, "registration");
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: flow.challenge,
      expectedOrigin: this.configuration.origin,
      expectedRPID: this.configuration.rpId,
      requireUserVerification: true,
    });
    if (!verification.verified) throw new Error("Passkey verification failed");
    const now = new Date().toISOString();
    const userId = `usr_${crypto.randomUUID().replaceAll("-", "")}`;
    const user: UserRecord = {
      id: userId,
      email: flow.email,
      role: flow.role,
      createdAt: now,
    };
    const credential = verification.registrationInfo.credential;
    await this.repository.putUser(user);
    await this.repository.putCredential({
      userId,
      credentialId: credential.id,
      publicKey: bytesToBase64(credential.publicKey),
      counter: credential.counter,
      ...(credential.transports ? { transports: credential.transports } : {}),
    });
    if (flow.inviteId) await this.repository.useInvite(flow.inviteId, now);
    await this.repository.deleteFlow(flow.id);
    return { user };
  }

  async authenticationOptions(emailInput: string) {
    const email = emailInput.trim().toLowerCase();
    const user = await this.repository.findUserByEmail(email);
    if (!user) throw new Error("No account exists for this email");
    const credentials = await this.repository.listCredentials(user.id);
    const options = await generateAuthenticationOptions({
      rpID: this.configuration.rpId,
      userVerification: "required",
      allowCredentials: credentials.map((credential) => ({
        id: credential.credentialId,
        ...(credential.transports ? { transports: credential.transports } : {}),
      })),
    });
    const flow: FlowRecord = {
      id: randomToken("flow"),
      kind: "authentication",
      challenge: options.challenge,
      email,
      role: user.role,
      userId: user.id,
      expiresAt: expiresIn(10),
    };
    await this.repository.putFlow(flow);
    return { flowId: flow.id, options };
  }

  async verifyAuthentication(flowId: string, response: AuthenticationResponseJSON) {
    const flow = await this.validFlow(flowId, "authentication");
    const credential = await this.repository.getCredential(response.id);
    if (!credential || credential.userId !== flow.userId) throw new Error("Credential not found");
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: flow.challenge,
      expectedOrigin: this.configuration.origin,
      expectedRPID: this.configuration.rpId,
      credential: {
        id: credential.credentialId,
        publicKey: base64ToBytes(credential.publicKey),
        counter: credential.counter,
        ...(credential.transports ? { transports: credential.transports } : {}),
      },
      requireUserVerification: true,
    });
    if (!verification.verified) throw new Error("Passkey verification failed");
    await this.repository.updateCredentialCounter(
      credential.credentialId,
      verification.authenticationInfo.newCounter,
    );
    await this.repository.deleteFlow(flow.id);
    const user = flow.userId ? await this.repository.getUser(flow.userId) : undefined;
    if (!user) throw new Error("User not found");
    return user;
  }

  async createSession(user: UserRecord): Promise<string> {
    const token = randomToken("session");
    await this.repository.putSession({
      idHash: await hashToken(token),
      userId: user.id,
      expiresAt: expiresIn(60 * 24 * 30),
    });
    return token;
  }

  async createDeviceAuthorization() {
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
      verificationUri: `${this.configuration.origin}/admin/?device=${encodeURIComponent(userCode)}`,
      expiresIn: 600,
      interval: intervalSeconds,
    };
  }

  async getDeviceAuthorization(userCode: string): Promise<DeviceAuthorizationRecord | undefined> {
    return this.repository.findDeviceAuthorizationByUserCode(normalizeUserCode(userCode));
  }

  async decideDeviceAuthorization(
    userCode: string,
    user: UserRecord,
    decision: "approve" | "deny",
  ): Promise<DeviceAuthorizationRecord | undefined> {
    const authorization = await this.getDeviceAuthorization(userCode);
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

  async exchangeDeviceCode(deviceCode: string): Promise<DeviceTokenResult> {
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
    const token = randomToken("brief_live");
    await this.repository.putApiToken({
      idHash: await hashToken(token),
      userId: user.id,
      createdAt: now,
    });
    return { status: "approved", token, user };
  }

  async resolveUser(request: Request): Promise<UserRecord | undefined> {
    const authorization = request.headers.get("authorization");
    if (authorization?.startsWith("Bearer ")) {
      const tokenHash = await hashToken(authorization.slice(7));
      const token = await this.repository.getApiToken(tokenHash);
      if (token) return this.repository.getUser(token.userId);
      return this.repository.findUserByApiTokenHash(tokenHash);
    }
    const sessionToken = cookieValue(request.headers.get("cookie"), SESSION_COOKIE);
    if (!sessionToken) return undefined;
    const session = await this.repository.getSession(await hashToken(sessionToken));
    if (!session || session.expiresAt <= new Date().toISOString()) return undefined;
    return this.repository.getUser(session.userId);
  }

  private async validFlow(id: string, kind: FlowRecord["kind"]): Promise<FlowRecord> {
    const flow = await this.repository.getFlow(id);
    if (!flow || flow.kind !== kind || flow.expiresAt <= new Date().toISOString()) {
      throw new Error("Authentication flow expired. Try again.");
    }
    return flow;
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

function normalizeUserCode(value: string): string {
  const compact = value
    .trim()
    .toUpperCase()
    .replaceAll(/[^A-Z0-9]/g, "");
  return compact.length === 8 ? `${compact.slice(0, 4)}-${compact.slice(4)}` : value;
}
