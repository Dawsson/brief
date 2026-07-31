import "@brief/ui/styles.css";
import { Logo } from "@brief/ui";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

const homeUrl = import.meta.env.DEV ? "http://localhost:5173" : "/";

function Code({ children }: { children: string }) {
  return (
    <pre className="my-7 overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-[12px] leading-6 text-neutral-300">
      <code>{children}</code>
    </pre>
  );
}

function Section({ children, id, title }: { children: ReactNode; id: string; title: string }) {
  return (
    <section id={id} className="scroll-mt-12 border-b border-neutral-100 py-14 last:border-0">
      <h2 className="text-3xl font-bold tracking-[-0.04em] text-neutral-950">{title}</h2>
      <div className="mt-6 text-[15px] leading-7 text-neutral-600">{children}</div>
    </section>
  );
}

const nav = [
  ["quickstart", "Quickstart"],
  ["updates", "Updating"],
  ["blocks", "Blocks"],
  ["http", "HTTP formats"],
  ["auth", "Authentication"],
] as const;

function App() {
  return (
    <div className="min-h-screen bg-white">
      <header className="fixed inset-x-0 top-0 z-10 border-b border-neutral-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-[min(1180px,calc(100%-40px))] items-center justify-between">
          <a href={homeUrl}>
            <Logo />
          </a>
          <a
            href="https://github.com/Dawsson/brief"
            className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 no-underline hover:text-neutral-950"
          >
            GitHub <ArrowUpRight size={13} />
          </a>
        </div>
      </header>
      <div className="mx-auto grid w-[min(1180px,calc(100%-40px))] gap-16 pt-16 md:grid-cols-[210px_minmax(0,720px)] lg:gap-24">
        <aside className="sticky top-16 hidden h-[calc(100vh-64px)] self-start py-12 md:block">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
            Get started
          </p>
          {nav.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="group flex items-center justify-between py-2 text-[13px] text-neutral-500 no-underline hover:text-neutral-950"
            >
              {label}
              <ChevronRight
                size={12}
                className="opacity-0 transition-opacity group-hover:opacity-100"
              />
            </a>
          ))}
        </aside>
        <main className="page-enter pb-24 pt-20 md:pt-16">
          <div className="border-b border-neutral-100 pb-16">
            <p className="text-xs font-semibold text-blue-600">Brief v1</p>
            <h1 className="mt-4 text-5xl font-bold tracking-[-0.055em] text-neutral-950 sm:text-7xl">
              Agent reports,
              <br />
              without the mess.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-neutral-500">
              The SDK is the public API. Build structured Briefs in ordinary TypeScript, then
              publish or update them in place.
            </p>
          </div>
          <Section id="quickstart" title="Quickstart">
            <p>Install the SDK with Bun and configure your API credentials.</p>
            <Code>{`bun add @dawsson/brief\n\nexport BRIEF_API_URL=https://brief.harbr.run\nexport BRIEF_API_TOKEN=brief_live_...`}</Code>
            <Code>{`import { Brief } from "@dawsson/brief"\n\nconst brief = await Brief.create({\n  title: "Deployment Report",\n  visibility: "public",\n})\n\nbrief.hero("Production is healthy", "Completed in 4m 12s")\nbrief.summary("Deployment completed successfully.")\nbrief.todo(["Warm cache", "Verify production"])\nbrief.logs(stdout)\n\nawait brief.publish()\nconsole.log(brief.url)`}</Code>
          </Section>
          <Section id="updates" title="Update in place">
            <p>
              Every block receives a stable id. The ergonomic commands below become operations; the
              server applies them atomically against a document version.
            </p>
            <Code>{`const brief = await Brief.open(id)\n\nbrief.summary.replace("Finished.")\nbrief.todo.check("Verify production")\nbrief.logs.append(newLogs)\n\nawait brief.commit()`}</Code>
            <p>
              Lower-level{" "}
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[13px] text-neutral-800">
                replace
              </code>
              ,{" "}
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[13px] text-neutral-800">
                append
              </code>
              ,{" "}
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[13px] text-neutral-800">
                remove
              </code>
              ,{" "}
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[13px] text-neutral-800">
                move
              </code>
              ,{" "}
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[13px] text-neutral-800">
                check
              </code>
              ,{" "}
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[13px] text-neutral-800">
                uncheck
              </code>
              , and{" "}
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[13px] text-neutral-800">
                set
              </code>{" "}
              operations are internal state transitions—not renderer structures.
            </p>
          </Section>
          <Section id="blocks" title="Blocks">
            <p>
              Version one stays intentionally small: Hero, Markdown, Checklist, Code, Logs, Table,
              Callout, Image, Metric, Divider, and Spacer. Pages contain sections; sections contain
              blocks.
            </p>
            <Code>{`brief.page("Metrics", (page) => {\n  page.section("Runtime", (section) => {\n    section.metric("Availability", "99.99%", { trend: "up" })\n    section.table(["Service", "Status"], [\n      { Service: "API", Status: "Healthy" },\n    ])\n  })\n})`}</Code>
          </Section>
          <Section id="http" title="One URL, every format">
            <p>
              Brief uses standard HTTP content negotiation. The URL never changes; only the{" "}
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[13px] text-neutral-800">
                Accept
              </code>{" "}
              header does.
            </p>
            <Code>{`curl https://brief.harbr.run/b/16230282 \\\n  -H 'Accept: text/markdown'\n\ncurl https://brief.harbr.run/b/16230282 \\\n  -H 'Accept: application/vnd.harbr.brief+json'`}</Code>
            <div className="mt-7 divide-y divide-neutral-100 border-y border-neutral-100">
              {[
                "text/html",
                "text/markdown",
                "text/plain",
                "application/json",
                "application/vnd.harbr.brief+json",
              ].map((type) => (
                <div
                  key={type}
                  className="flex items-center justify-between py-3 font-mono text-xs"
                >
                  <span>{type}</span>
                  <span className="text-neutral-400">Accept</span>
                </div>
              ))}
            </div>
          </Section>
          <Section id="auth" title="Passkeys and agents">
            <p>
              Human accounts are invite-only and use WebAuthn passkeys—no passwords and no OAuth.
              After authentication, Brief issues a revocable bearer token for agent SDK access.
              Never ship that token to a browser.
            </p>
          </Section>
        </main>
      </div>
    </div>
  );
}

const root = document.querySelector<HTMLDivElement>("#root");
if (!root) throw new Error("Root element not found");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
