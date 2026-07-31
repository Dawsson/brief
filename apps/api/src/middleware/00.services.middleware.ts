import { middleware } from "@pier/backend/builders";
import env from "#pier/env";

import { createRuntimeServices, type BriefServices } from "../runtime/services";

let services: BriefServices | undefined;

export default middleware<unknown, { readonly services: BriefServices }>(
  async ({ next }) => {
    services ??= createRuntimeServices(env);
    await next({ ctx: { services } });
  },
  { name: "brief.services" },
);
