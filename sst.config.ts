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
    const productionOrigin = "https://brief.harbr.run";
    const appOrigin =
      process.env.BRIEF_APP_ORIGIN ??
      ($app.stage === "production" ? productionOrigin : "http://localhost:5174");

    const table = new sst.aws.Dynamo("Database", {
      fields: { pk: "string", sk: "string" },
      primaryIndex: { hashKey: "pk", rangeKey: "sk" },
    });
    const bucket = new sst.aws.Bucket("Storage");
    const api = new pier.PierBackend("Api", {
      path: "apps/api",
      link: [table, bucket],
      copyFiles: [
        { from: "apps/api/package.json", to: "package.json" },
        { from: "apps/web/dist", to: "static/web" },
        { from: "apps/admin/dist", to: "static/admin" },
        { from: "apps/docs/dist", to: "static/docs" },
      ],
      environment: {
        BRIEF_TABLE: table.name,
        BRIEF_BUCKET: bucket.name,
        BRIEF_ADMIN_EMAIL: "hello@dawson.gg",
        BRIEF_APP_ORIGIN: appOrigin,
        BRIEF_RP_ID: process.env.BRIEF_RP_ID ?? new URL(appOrigin).hostname,
      },
      build: {
        command: "bun run build:watch",
        title: "Brief API",
      },
    });

    const publicUrl = $app.stage === "production" ? `${productionOrigin}/` : api.url;
    return {
      api: publicUrl,
      web: publicUrl,
      admin: $interpolate`${publicUrl}admin/`,
      docs: $interpolate`${publicUrl}docs/`,
    };
  },
});
