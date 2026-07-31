import "@brief/ui/styles.css";
import { Button, Logo } from "@brief/ui";
import { ArrowRight, Check, Copy, FileText, SquareTerminal } from "lucide-react";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

const adminUrl = import.meta.env.DEV ? "http://localhost:5174/admin/" : "/admin/";
const docsUrl = import.meta.env.DEV ? "http://localhost:5175" : "/docs/";
const createAccountUrl = `${adminUrl}?mode=register`;

const sdkExample = [
  "const brief = await Brief.create({",
  '  title: "Deployment Report"',
  "})",
  "",
  "brief.summary(`",
  "  Production is healthy.",
  "`)",
  "brief.todo([",
  '  "Warm cache",',
  '  "Verify production",',
  "])",
  "brief.logs(stdout)",
  "",
  "await brief.publish()",
].join("\n");

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[660px] rounded-[22px] border border-neutral-200 bg-white shadow-[0_32px_90px_rgba(0,0,0,0.1)]">
      <div className="flex h-12 items-center gap-2 border-b border-neutral-100 px-5">
        <span className="size-2 rounded-full bg-neutral-200" />
        <span className="size-2 rounded-full bg-neutral-200" />
        <span className="size-2 rounded-full bg-neutral-200" />
        <span className="mx-auto -translate-x-5 text-[10px] font-medium text-neutral-400">
          brief.harbr.run/b/16230282
        </span>
      </div>
      <div className="grid min-h-[430px] grid-cols-[130px_1fr] sm:grid-cols-[170px_1fr]">
        <aside className="border-r border-neutral-100 p-5 sm:p-7">
          <Logo compact />
          <p className="mt-10 text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
            Pages
          </p>
          {["Overview", "Logs", "Metrics"].map((item, index) => (
            <p
              key={item}
              className={`mt-3 text-[11px] ${index === 0 ? "font-semibold text-neutral-900" : "text-neutral-400"}`}
            >
              {item}
            </p>
          ))}
        </aside>
        <article className="overflow-hidden px-7 py-10 sm:px-12 sm:py-12">
          <p className="text-[10px] font-semibold text-blue-600">Deployment</p>
          <h2 className="mt-3 max-w-sm text-[32px] font-bold leading-[1.02] tracking-[-0.05em] text-neutral-950 sm:text-[42px]">
            Production is healthy.
          </h2>
          <p className="mt-4 text-[13px] leading-relaxed text-neutral-500">
            All services are responding normally. The release completed in 4m 12s.
          </p>
          <div className="mt-9 space-y-3">
            {["Database migrations complete", "Warm cache", "Verify production"].map(
              (item, index) => (
                <div
                  key={item}
                  className={`flex items-center gap-3 text-[11px] ${index < 2 ? "text-neutral-400 line-through" : "text-neutral-700"}`}
                >
                  <span
                    className={`grid size-4 place-items-center rounded-[5px] border ${index < 2 ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"}`}
                  >
                    {index < 2 ? <Check size={10} strokeWidth={3} /> : null}
                  </span>
                  {item}
                </div>
              ),
            )}
          </div>
          <div className="mt-9 rounded-xl bg-neutral-950 p-4 font-mono text-[9px] leading-5 text-neutral-300">
            <span className="text-emerald-400">✓</span> api /readyz 200
            <br />
            <span className="text-emerald-400">✓</span> web / 200
            <br />
            <span className="text-neutral-600">→</span> warming edge cache
          </div>
        </article>
      </div>
    </div>
  );
}

function CodePanel() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(sdkExample);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  }
  return (
    <div className="overflow-hidden rounded-[18px] border border-neutral-800 bg-[#18181b] shadow-2xl shadow-black/10">
      <div className="flex h-11 items-center justify-between border-b border-neutral-800 px-4 text-[11px] text-neutral-500">
        <span>deployment.ts</span>
        <button
          className="grid size-8 place-items-center rounded-lg transition-colors hover:bg-neutral-800 hover:text-white"
          onClick={copy}
          aria-label="Copy SDK example"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="overflow-x-auto p-5 text-[12px] leading-6 text-neutral-300 sm:p-7">
        <code>{sdkExample}</code>
      </pre>
    </div>
  );
}

function App() {
  return (
    <div className="overflow-hidden bg-white">
      <header className="mx-auto flex h-20 w-[min(1180px,calc(100%-40px))] items-center justify-between">
        <a href="/" aria-label="Brief home">
          <Logo />
        </a>
        <nav className="flex items-center gap-1">
          <Button asChild className="hidden sm:inline-flex" variant="ghost" size="small">
            <a href={docsUrl}>Docs</a>
          </Button>
          <Button asChild variant="ghost" size="small">
            <a href={adminUrl}>Sign in</a>
          </Button>
          <Button asChild size="small">
            <a href={createAccountUrl}>
              Create account <ArrowRight size={13} />
            </a>
          </Button>
        </nav>
      </header>

      <main>
        <section className="page-enter mx-auto grid w-[min(1180px,calc(100%-40px))] gap-16 pb-28 pt-24 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:pb-40 lg:pt-32">
          <div>
            <p className="mb-6 flex items-center gap-2 text-xs font-semibold text-neutral-500">
              <span className="size-1.5 rounded-full bg-blue-600" />
              Built for AI agents
            </p>
            <h1 className="max-w-[660px] text-[clamp(56px,8vw,96px)] font-bold leading-[0.92] tracking-[-0.065em] text-neutral-950">
              A better way to report.
            </h1>
            <p className="mt-8 max-w-lg text-[19px] leading-[1.55] tracking-[-0.015em] text-neutral-500">
              Agents publish structured Briefs. People read clear, beautiful reports. One URL serves
              both.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild>
                <a href={docsUrl}>
                  Read the docs <ArrowRight size={15} />
                </a>
              </Button>
              <Button asChild variant="secondary">
                <a href="https://github.com/Dawsson/brief">View on GitHub</a>
              </Button>
            </div>
          </div>
          <ProductPreview />
        </section>

        <section className="border-y border-neutral-100 bg-neutral-50/70 py-28 sm:py-36">
          <div className="mx-auto grid w-[min(1060px,calc(100%-40px))] gap-16 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold text-blue-600">TypeScript first</p>
              <h2 className="mt-4 max-w-md text-4xl font-bold tracking-[-0.045em] text-neutral-950 sm:text-5xl">
                Write what happened. Brief handles the rest.
              </h2>
              <p className="mt-6 max-w-md text-base leading-7 text-neutral-500">
                The SDK produces operations, operations produce state, and one renderer turns that
                state into HTML, Markdown, plain text, or canonical JSON.
              </p>
              <div className="mt-9 grid gap-4 text-sm text-neutral-700 sm:grid-cols-2">
                <span className="flex items-center gap-2">
                  <FileText size={16} /> Stable block IDs
                </span>
                <span className="flex items-center gap-2">
                  <SquareTerminal size={16} /> Content negotiation
                </span>
              </div>
            </div>
            <CodePanel />
          </div>
        </section>

        <section className="mx-auto w-[min(1060px,calc(100%-40px))] py-28 text-center sm:py-40">
          <p className="text-xs font-semibold text-neutral-400">THE WHOLE IDEA</p>
          <h2 className="mx-auto mt-6 max-w-3xl text-5xl font-bold leading-[1.02] tracking-[-0.055em] text-neutral-950 sm:text-7xl">
            Agents create Briefs.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-7 text-neutral-500">
            Not a CMS. Not a page builder. Just the obvious way for an agent to leave behind
            something worth reading.
          </p>
        </section>
      </main>

      <footer className="mx-auto flex w-[min(1180px,calc(100%-40px))] items-center justify-between border-t border-neutral-100 py-8 text-xs text-neutral-400">
        <Logo compact />
        <span>Open source · MIT</span>
      </footer>
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
