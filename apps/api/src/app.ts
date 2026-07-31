import { isPierOperation } from "@pier/backend/builders";
import { createPierRuntime, type PierRuntimeOperation } from "@pier/backend/runtime";

import * as adminRoutes from "./routes/admin/admin.endpoints";
import * as authRoutes from "./routes/auth/auth.endpoints";
import * as briefRoutes from "./routes/briefs/briefs.endpoints";
import * as publicRoutes from "./routes/public/public.endpoints";
import * as staticRoutes from "./routes/static/static.endpoints";
import * as storageRoutes from "./routes/storage/storage.endpoints";
import * as systemRoutes from "./routes/system/system.endpoints";
import allowedOriginMiddleware from "./middleware/01.origin.middleware";
import { createServices, type CreateServicesOptions } from "./services";

export type CreateAppOptions = CreateServicesOptions;

const routeModules = {
  admin: adminRoutes,
  auth: authRoutes,
  briefs: briefRoutes,
  public: publicRoutes,
  static: staticRoutes,
  storage: storageRoutes,
  system: systemRoutes,
};

const operations: PierRuntimeOperation[] = Object.entries(routeModules).flatMap(
  ([prefix, module]) =>
    Object.entries(module).flatMap(([name, operation]) =>
      isPierOperation(operation) ? [{ name: `${prefix}.${name}`, operation }] : [],
    ),
);

/** Build an isolated Pier runtime for API tests and in-process consumers. */
export function createApp(options: CreateAppOptions = {}) {
  const services = createServices(options);
  const runtime = createPierRuntime({
    createContext: (request) => ({ request, services }),
    logger: false,
    middleware: [allowedOriginMiddleware],
    operations,
    serviceName: "brief-api-test",
  });

  return {
    request(input: Request | string | URL, init?: RequestInit) {
      const request =
        input instanceof Request
          ? input
          : new Request(new URL(String(input), "http://localhost"), init);
      return runtime.fetch(request, { NODE_ENV: "test" });
    },
  };
}
