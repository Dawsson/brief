import type { BriefDocument } from "@brief/core";
import type {
  ApiTokenRecord,
  CredentialRecord,
  DeviceAuthorizationRecord,
  FlowRecord,
  InviteRecord,
  SessionRecord,
  UserRecord,
} from "./model";

export interface Repository {
  consumeDeviceAuthorization(
    hash: string,
    consumedAt: string,
  ): Promise<DeviceAuthorizationRecord | undefined>;
  countUsers(): Promise<number>;
  createInvite(invite: InviteRecord): Promise<void>;
  deleteApiToken(hash: string): Promise<void>;
  deleteBrief(id: string): Promise<void>;
  deleteFlow(id: string): Promise<void>;
  deleteSession(hash: string): Promise<void>;
  findDeviceAuthorizationByUserCode(code: string): Promise<DeviceAuthorizationRecord | undefined>;
  findUserByEmail(email: string): Promise<UserRecord | undefined>;
  getBrief(id: string): Promise<BriefDocument | undefined>;
  getApiToken(hash: string): Promise<ApiTokenRecord | undefined>;
  getCredential(id: string): Promise<CredentialRecord | undefined>;
  getDeviceAuthorizationByHash(hash: string): Promise<DeviceAuthorizationRecord | undefined>;
  getFlow(id: string): Promise<FlowRecord | undefined>;
  getInviteByHash(hash: string): Promise<InviteRecord | undefined>;
  getSession(hash: string): Promise<SessionRecord | undefined>;
  getUser(id: string): Promise<UserRecord | undefined>;
  listBriefs(ownerId?: string): Promise<BriefDocument[]>;
  listCredentials(userId: string): Promise<CredentialRecord[]>;
  listInvites(): Promise<InviteRecord[]>;
  listUsers(): Promise<UserRecord[]>;
  putBrief(document: BriefDocument): Promise<void>;
  putApiToken(token: ApiTokenRecord): Promise<void>;
  putCredential(credential: CredentialRecord): Promise<void>;
  putDeviceAuthorization(authorization: DeviceAuthorizationRecord): Promise<void>;
  putFlow(flow: FlowRecord): Promise<void>;
  putSession(session: SessionRecord): Promise<void>;
  putUser(user: UserRecord): Promise<void>;
  updateCredentialCounter(id: string, counter: number): Promise<void>;
  useInvite(id: string, acceptedAt: string): Promise<void>;
}

export class MemoryRepository implements Repository {
  private readonly apiTokens = new Map<string, ApiTokenRecord>();
  private readonly briefs = new Map<string, BriefDocument>();
  private readonly credentials = new Map<string, CredentialRecord>();
  private readonly deviceAuthorizations = new Map<string, DeviceAuthorizationRecord>();
  private readonly flows = new Map<string, FlowRecord>();
  private readonly invites = new Map<string, InviteRecord>();
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly users = new Map<string, UserRecord>();

  async consumeDeviceAuthorization(hash: string, consumedAt: string) {
    const authorization = this.deviceAuthorizations.get(hash);
    if (
      !authorization ||
      authorization.status !== "approved" ||
      authorization.expiresAt <= consumedAt
    ) {
      return undefined;
    }
    authorization.status = "consumed";
    authorization.consumedAt = consumedAt;
    return structuredClone(authorization);
  }
  async countUsers() {
    return this.users.size;
  }
  async createInvite(invite: InviteRecord) {
    this.invites.set(invite.id, structuredClone(invite));
  }
  async deleteApiToken(hash: string) {
    this.apiTokens.delete(hash);
  }
  async deleteBrief(id: string) {
    this.briefs.delete(id);
  }
  async deleteFlow(id: string) {
    this.flows.delete(id);
  }
  async deleteSession(hash: string) {
    this.sessions.delete(hash);
  }
  async findDeviceAuthorizationByUserCode(code: string) {
    return structuredClone(
      [...this.deviceAuthorizations.values()].find(
        (authorization) => authorization.userCode === code,
      ),
    );
  }
  async findUserByEmail(email: string) {
    return [...this.users.values()].find((user) => user.email === email);
  }
  async getBrief(id: string) {
    return structuredClone(this.briefs.get(id));
  }
  async getApiToken(hash: string) {
    return structuredClone(this.apiTokens.get(hash));
  }
  async getCredential(id: string) {
    return structuredClone(this.credentials.get(id));
  }
  async getDeviceAuthorizationByHash(hash: string) {
    return structuredClone(this.deviceAuthorizations.get(hash));
  }
  async getFlow(id: string) {
    return structuredClone(this.flows.get(id));
  }
  async getInviteByHash(hash: string) {
    return structuredClone([...this.invites.values()].find((invite) => invite.tokenHash === hash));
  }
  async getSession(hash: string) {
    return structuredClone(this.sessions.get(hash));
  }
  async getUser(id: string) {
    return structuredClone(this.users.get(id));
  }
  async listBriefs(ownerId?: string) {
    return [...this.briefs.values()]
      .filter((brief) => !ownerId || brief.ownerId === ownerId)
      .map((brief) => structuredClone(brief));
  }
  async listCredentials(userId: string) {
    return [...this.credentials.values()]
      .filter((credential) => credential.userId === userId)
      .map((credential) => structuredClone(credential));
  }
  async listInvites() {
    return [...this.invites.values()].map((invite) => structuredClone(invite));
  }
  async listUsers() {
    return [...this.users.values()].map((user) => structuredClone(user));
  }
  async putBrief(document: BriefDocument) {
    this.briefs.set(document.id, structuredClone(document));
  }
  async putApiToken(token: ApiTokenRecord) {
    this.apiTokens.set(token.idHash, structuredClone(token));
  }
  async putCredential(credential: CredentialRecord) {
    this.credentials.set(credential.credentialId, structuredClone(credential));
  }
  async putDeviceAuthorization(authorization: DeviceAuthorizationRecord) {
    this.deviceAuthorizations.set(authorization.deviceCodeHash, structuredClone(authorization));
  }
  async putFlow(flow: FlowRecord) {
    this.flows.set(flow.id, structuredClone(flow));
  }
  async putSession(session: SessionRecord) {
    this.sessions.set(session.idHash, structuredClone(session));
  }
  async putUser(user: UserRecord) {
    this.users.set(user.id, structuredClone(user));
  }
  async updateCredentialCounter(id: string, counter: number) {
    const credential = this.credentials.get(id);
    if (credential) credential.counter = counter;
  }
  async useInvite(id: string, acceptedAt: string) {
    const invite = this.invites.get(id);
    if (invite) invite.acceptedAt = acceptedAt;
  }
}
