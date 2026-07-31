import type { UserRole } from "../../data/model";
import type { Repository } from "../../data/repository";
import { hashToken } from "../../security/tokens";
import type { RegistrationInput } from "./auth.types";

export interface RegistrationDecision {
  email: string;
  inviteId?: string;
  role: UserRole;
}

export class RegistrationPolicy {
  constructor(
    private readonly repository: Repository,
    private readonly adminEmail: string,
  ) {}

  async authorize(input: RegistrationInput): Promise<RegistrationDecision> {
    const email = input.email.trim().toLowerCase();
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
      if (await this.repository.findUserByEmail(email)) {
        throw new Error("This account already exists");
      }
      return { email, inviteId: invite.id, role: invite.role };
    }

    const canBootstrap = email === this.adminEmail && (await this.repository.countUsers()) === 0;
    if (!canBootstrap) throw new Error("A valid invite is required");
    if (await this.repository.findUserByEmail(email)) {
      throw new Error("This account already exists");
    }
    return { email, role: "admin" };
  }
}
