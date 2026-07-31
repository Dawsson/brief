import { middleware } from "@pier/backend/builders";
import env from "#pier/env";

import { seedLocalDemo } from "../demo";
import { createServices, type BriefServices } from "../services";

let services: BriefServices | undefined;
let demoSeed: Promise<void> | undefined;

export default middleware<unknown, { readonly services: BriefServices }>(
  async ({ next }) => {
    services ??= createServices({
      adminEmail: env.BRIEF_ADMIN_EMAIL,
      appOrigin: env.BRIEF_APP_ORIGIN,
      ...(env.BRIEF_BUCKET ? { bucketName: env.BRIEF_BUCKET } : {}),
      rpId: env.BRIEF_RP_ID,
      ...(env.BRIEF_TABLE ? { tableName: env.BRIEF_TABLE } : {}),
    });
    if (!env.BRIEF_TABLE) {
      demoSeed ??= seedLocalDemo(services.repository);
      await demoSeed;
    }
    await next({ ctx: { services } });
  },
  { name: "brief.services" },
);
