import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import type { FlowRecord, UserRecord } from "../../data/model";
import type { Repository } from "../../data/repository";
import { base64ToBytes, bytesToBase64, randomToken } from "../../security/tokens";
import type { AuthConfiguration, RegistrationInput } from "./auth.types";
import { expiresIn } from "./auth.types";
import { RegistrationPolicy } from "./registration.policy";

export class PasskeyService {
  private readonly registrationPolicy: RegistrationPolicy;

  constructor(
    private readonly repository: Repository,
    private readonly configuration: AuthConfiguration,
  ) {
    this.registrationPolicy = new RegistrationPolicy(repository, configuration.adminEmail);
  }

  async registrationOptions(input: RegistrationInput) {
    const decision = await this.registrationPolicy.authorize(input);
    const options = await generateRegistrationOptions({
      rpName: this.configuration.rpName,
      rpID: this.configuration.rpId,
      userName: decision.email,
      userDisplayName: decision.email,
      userID: new TextEncoder().encode(decision.email),
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
      email: decision.email,
      role: decision.role,
      ...(decision.inviteId ? { inviteId: decision.inviteId } : {}),
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
    const user: UserRecord = {
      id: `usr_${crypto.randomUUID().replaceAll("-", "")}`,
      email: flow.email,
      role: flow.role,
      createdAt: now,
    };
    const credential = verification.registrationInfo.credential;
    await this.repository.putUser(user);
    await this.repository.putCredential({
      userId: user.id,
      credentialId: credential.id,
      publicKey: bytesToBase64(credential.publicKey),
      counter: credential.counter,
      ...(credential.transports ? { transports: credential.transports } : {}),
    });
    if (flow.inviteId) await this.repository.useInvite(flow.inviteId, now);
    await this.repository.deleteFlow(flow.id);
    return user;
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

  private async validFlow(id: string, kind: FlowRecord["kind"]): Promise<FlowRecord> {
    const flow = await this.repository.getFlow(id);
    if (!flow || flow.kind !== kind || flow.expiresAt <= new Date().toISOString()) {
      throw new Error("Authentication flow expired. Try again.");
    }
    return flow;
  }
}
