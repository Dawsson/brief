/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "brief",
      home: "aws",
      protect: input.stage === "production",
      removal: input.stage === "production" ? "retain" : "remove",
      providers: {
        aws: { region: "us-east-1" },
        pier: {
          package: "@buildwithharbor/pier-sst",
          version: "0.1.1",
        },
      },
    };
  },
  async run() {
    const table = new sst.aws.Dynamo("Database", {
      fields: { pk: "string", sk: "string" },
      primaryIndex: { hashKey: "pk", rangeKey: "sk" },
    });
    const bucket = new sst.aws.Bucket("Storage");
    const api = new pier.PierBackend("Api", {
      path: "apps/api",
      link: [table, bucket],
      environment: {
        BRIEF_TABLE: table.name,
        BRIEF_BUCKET: bucket.name,
        BRIEF_ADMIN_EMAIL: "hello@dawson.gg",
        BRIEF_APP_ORIGIN: process.env.BRIEF_APP_ORIGIN ?? "http://localhost:5174",
        BRIEF_RP_ID: process.env.BRIEF_RP_ID ?? "localhost",
      },
      build: {
        command: "bun run build:watch",
        title: "Brief API",
      },
    });
    const web = new sst.aws.StaticSite("Web", {
      path: "apps/web",
      build: { command: "bun run build", output: "dist" },
      environment: { VITE_API_URL: api.url },
      dev: { command: "bun run dev", url: "http://localhost:5173" },
    });
    const admin = new sst.aws.StaticSite("Admin", {
      path: "apps/admin",
      build: { command: "bun run build", output: "dist" },
      environment: { VITE_API_URL: api.url },
      dev: { command: "bun run dev", url: "http://localhost:5174" },
    });
    const docs = new sst.aws.StaticSite("Docs", {
      path: "apps/docs",
      build: { command: "bun run build", output: "dist" },
      dev: { command: "bun run dev", url: "http://localhost:5175" },
    });

    return { api: api.url, web: web.url, admin: admin.url, docs: docs.url };
  },
});
