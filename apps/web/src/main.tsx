import "@fontsource-variable/inter";
import "@brief/ui/styles.css";
import { Button, Logo } from "@brief/ui";
import { ArrowRight, Check, Copy } from "lucide-react";
import { StrictMode, useState } from "react";
import { createRoot, type Root } from "react-dom/client";

declare global {
  var briefWebRoot: Root | undefined;
}

const adminUrl = import.meta.env.DEV ? "http://localhost:5174/admin/" : "/admin/";
const docsUrl = import.meta.env.DEV ? "http://localhost:5175" : "/docs/";
const createAccountUrl: string = `${adminUrl}?mode=register`;

const sdkExample = `const brief = await Brief.create({
  title: "Deployment Report"
})

brief.summary("Production is healthy.")
brief.metric("Availability", "99.99%")
brief.todo([
  "Warm cache",
  "Verify production",
])

await brief.publish()`;

function CodeExample() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(sdkExample);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="landing-code min-w-0 bg-[#171716] text-[#d8d7d2]">
      <div className="flex h-12 items-center justify-between border-b border-white/[0.08] px-5">
        <span className="text-[12px] text-white/40">deployment.ts</span>
        <button
          className="grid size-8 place-items-center rounded-md text-white/35 transition-colors hover:bg-white/[0.07] hover:text-white"
          onClick={copy}
          aria-label="Copy SDK example"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="overflow-x-auto p-6 text-[12px] leading-[1.8] sm:p-8 sm:text-[13px]">
        <code>
          <span className="text-[#c9a7e8]">const</span> brief ={" "}
          <span className="text-[#c9a7e8]">await</span>{" "}
          <span className="text-[#8fb7df]">Brief</span>.create({`({\n`}){"  "}title:{" "}
          <span className="text-[#b7cc9b]">&quot;Deployment Report&quot;</span>
          {`\n})\n\n`}
          brief.summary(<span className="text-[#b7cc9b]">&quot;Production is healthy.&quot;</span>)
          {`\n`}brief.metric(<span className="text-[#b7cc9b]">&quot;Availability&quot;</span>,{" "}
          <span className="text-[#b7cc9b]">&quot;99.99%&quot;</span>){`\n`}brief.todo({`([\n`})
          {"  "}
          <span className="text-[#b7cc9b]">&quot;Warm cache&quot;</span>,{`\n  `}
          <span className="text-[#b7cc9b]">&quot;Verify production&quot;</span>,{`\n])\n\n`}
          <span className="text-[#c9a7e8]">await</span> brief.publish()
        </code>
      </pre>
    </div>
  );
}

function BriefExample() {
  return (
    <div className="landing-output min-w-0 bg-[#fbfbf9]">
      <div className="flex h-12 items-center justify-between border-b border-black/[0.07] px-5">
        <span className="text-[12px] text-neutral-400">brief.harbr.run/b/16230282</span>
        <span className="flex items-center gap-1.5 text-[11px] text-neutral-400">
          <span className="size-1.5 rounded-full bg-emerald-500" /> Published
        </span>
      </div>
      <div className="px-7 py-9 sm:px-12 sm:py-12">
        <p className="text-[11px] font-medium text-blue-600">Deployment · July 31, 2026</p>
        <h2 className="mt-3 max-w-md text-[34px] font-semibold leading-[1.02] tracking-[-0.045em] text-[#20201f] sm:text-[44px]">
          Production is healthy.
        </h2>
        <p className="mt-4 max-w-md text-[13px] leading-6 text-neutral-500">
          All systems are operating normally after a four-minute release.
        </p>

        <div className="mt-9 border-t border-black/[0.08] pt-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
            Availability
          </p>
          <p className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-[#20201f]">99.99%</p>
        </div>

        <div className="mt-7 space-y-3 border-t border-black/[0.08] pt-7">
          {["Warm cache", "Verify production"].map((item, index) => (
            <div key={item} className="flex items-center gap-3 text-[12px] text-neutral-600">
              <span
                className={`grid size-4 place-items-center rounded-[4px] border ${
                  index === 0
                    ? "border-[#20201f] bg-[#20201f] text-white"
                    : "border-neutral-300 bg-white"
                }`}
              >
                {index === 0 ? <Check size={10} strokeWidth={3} /> : null}
              </span>
              <span className={index === 0 ? "text-neutral-400 line-through" : undefined}>
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="landing min-h-screen bg-[#fbfbf9] text-[#20201f]">
      <header className="mx-auto flex h-[72px] w-[min(1120px,calc(100%-40px))] items-center justify-between border-b border-black/[0.07]">
        <a href="/" aria-label="Brief home">
          <Logo />
        </a>
        <nav className="flex items-center gap-1" aria-label="Primary navigation">
          <a className="landing-link hidden sm:inline-flex" href={docsUrl}>
            Docs
          </a>
          <a className="landing-link" href="https://github.com/Dawsson/brief">
            GitHub
          </a>
          <Button asChild className="ml-2" size="small">
            <a href={adminUrl}>Sign in</a>
          </Button>
        </nav>
      </header>

      <main>
        <section className="page-enter mx-auto w-[min(920px,calc(100%-40px))] pb-20 pt-24 text-center sm:pb-28 sm:pt-36">
          <p className="text-[12px] font-medium text-neutral-500">Reports, built for agents</p>
          <h1 className="mx-auto mt-6 max-w-[800px] text-[clamp(48px,7vw,82px)] font-semibold leading-[0.98] tracking-[-0.06em] text-[#20201f]">
            Publish work worth reading.
          </h1>
          <p className="mx-auto mt-7 max-w-[590px] text-[17px] leading-7 tracking-[-0.012em] text-neutral-500 sm:text-[19px] sm:leading-8">
            Brief gives AI agents a simple TypeScript SDK for creating clear, structured
            reports—beautiful for people and readable by machines.
          </p>
          <div className="mt-9 flex items-center justify-center gap-5">
            <Button asChild>
              <a href={createAccountUrl}>Create an account</a>
            </Button>
            <a
              className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-black"
              href={docsUrl}
            >
              Read the docs <ArrowRight size={14} />
            </a>
          </div>
        </section>

        <section className="mx-auto w-[min(1120px,calc(100%-24px))] sm:w-[min(1120px,calc(100%-40px))]">
          <div className="overflow-hidden rounded-[18px] border border-black/[0.1] shadow-[0_24px_80px_rgba(31,31,27,0.08)] lg:grid lg:grid-cols-2">
            <CodeExample />
            <BriefExample />
          </div>
          <div className="mt-5 flex items-center justify-center gap-3 text-[11px] text-neutral-400">
            <span>TypeScript in</span>
            <span className="h-px w-7 bg-neutral-300" />
            <span>HTML, Markdown, text, or JSON out</span>
          </div>
        </section>

        <section className="mx-auto grid w-[min(920px,calc(100%-40px))] gap-12 py-28 sm:grid-cols-3 sm:py-40">
          {[
            ["Create", "Use a small, expressive SDK. No document schemas or low-level JSON."],
            [
              "Update",
              "Every block has a stable ID, so agents can append, replace, or check off work.",
            ],
            [
              "Consume",
              "One URL responds in the right format through standard HTTP content negotiation.",
            ],
          ].map(([title, body], index) => (
            <article key={title}>
              <span className="text-[11px] font-medium tabular-nums text-neutral-400">
                0{index + 1}
              </span>
              <h2 className="mt-5 text-[16px] font-semibold tracking-[-0.02em]">{title}</h2>
              <p className="mt-3 text-[14px] leading-6 text-neutral-500">{body}</p>
            </article>
          ))}
        </section>

        <section className="mx-auto w-[min(1120px,calc(100%-40px))] border-t border-black/[0.08] py-24 text-center sm:py-32">
          <h2 className="text-[clamp(34px,5vw,54px)] font-semibold tracking-[-0.05em]">
            Agents create Briefs.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-6 text-neutral-500">
            Not a CMS. Not a page builder. Just a clear record of what happened.
          </p>
          <a
            className="mt-7 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            href={docsUrl}
          >
            Get started <ArrowRight size={14} />
          </a>
        </section>
      </main>

      <footer className="mx-auto flex w-[min(1120px,calc(100%-40px))] flex-col gap-5 border-t border-black/[0.08] py-8 text-[12px] text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
        <span>Brief · Open source under MIT</span>
        <div className="flex gap-5">
          <a className="hover:text-neutral-700" href={docsUrl}>
            Docs
          </a>
          <a className="hover:text-neutral-700" href="https://www.npmjs.com/package/@dawsson/brief">
            npm
          </a>
          <a className="hover:text-neutral-700" href="https://github.com/Dawsson/brief">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}

const root = document.querySelector<HTMLDivElement>("#root");
if (!root) throw new Error("Root element not found");
const appRoot = globalThis.briefWebRoot ?? createRoot(root);
globalThis.briefWebRoot = appRoot;
appRoot.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
