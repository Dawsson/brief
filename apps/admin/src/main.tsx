import "@brief/ui/styles.css";
import type { BriefDocument } from "@brief/core";
import type { InviteSummary, UserSummary } from "@brief/shared";
import { Button, Logo } from "@brief/ui";
import {
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { Database, FileText, HardDrive, KeyRound, Plus, Users } from "lucide-react";
import { StrictMode, useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

interface Overview {
  briefs: BriefDocument[];
  invites: InviteSummary[];
  storageBytes: number;
  users: UserSummary[];
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json");
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });
  if (!response.ok) throw new Error((await response.text()) || response.statusText);
  return response.json() as Promise<T>;
}

function SignIn({ onDone }: { onDone: () => void }) {
  const query = new URLSearchParams(location.search);
  const [email, setEmail] = useState(query.get("email") ?? "hello@dawson.gg");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function authenticate() {
    setBusy(true);
    setError(undefined);
    try {
      const flow = await api<{ flowId: string; options: PublicKeyCredentialRequestOptionsJSON }>(
        "/v1/auth/authenticate/options",
        {
          method: "POST",
          body: JSON.stringify({ email }),
        },
      );
      const response = await startAuthentication({ optionsJSON: flow.options });
      await api("/v1/auth/authenticate/verify", {
        method: "POST",
        body: JSON.stringify({ flowId: flow.flowId, response }),
      });
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  async function register() {
    setBusy(true);
    setError(undefined);
    try {
      const flow = await api<{ flowId: string; options: PublicKeyCredentialCreationOptionsJSON }>(
        "/v1/auth/register/options",
        {
          method: "POST",
          body: JSON.stringify({ email, inviteToken: query.get("invite") }),
        },
      );
      const response = await startRegistration({ optionsJSON: flow.options });
      await api("/v1/auth/register/verify", {
        method: "POST",
        body: JSON.stringify({ flowId: flow.flowId, response }),
      });
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create passkey");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-neutral-50 px-5">
      <section className="page-enter w-full max-w-[420px] rounded-[22px] border border-neutral-200 bg-white p-8 shadow-[0_24px_80px_rgba(0,0,0,.07)] sm:p-10">
        <Logo />
        <h1 className="mt-14 text-3xl font-bold tracking-[-0.04em] text-neutral-950">
          Use your passkey.
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-500">
          Brief has no passwords and no recovery codes. Your device is the key.
        </p>
        <label className="mt-9 block text-xs font-semibold text-neutral-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          className="mt-2 h-12 w-full rounded-xl border border-neutral-200 px-4 text-sm outline-none transition-shadow focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100"
        />
        {error ? <p className="mt-3 text-xs leading-5 text-red-600">{error}</p> : null}
        <Button className="mt-6 w-full" disabled={busy} onClick={authenticate}>
          <KeyRound size={15} />
          {busy ? "Waiting for passkey…" : "Continue with passkey"}
        </Button>
        <button
          className="mt-5 w-full text-center text-xs text-neutral-400 hover:text-neutral-700"
          disabled={busy}
          onClick={register}
        >
          {query.has("invite")
            ? "Accept invite and create passkey"
            : "First time? Create the admin passkey"}
        </button>
      </section>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="py-6">
      <div className="flex items-center gap-2 text-xs text-neutral-400">
        {icon}
        {label}
      </div>
      <strong className="mt-3 block text-3xl tracking-[-0.04em] text-neutral-950">{value}</strong>
    </div>
  );
}

function Dashboard({ data, refresh }: { data: Overview; refresh: () => void }) {
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string>();
  async function invite(event: FormEvent) {
    event.preventDefault();
    const response = await api<{ data: InviteSummary; token: string }>("/v1/invites", {
      method: "POST",
      body: JSON.stringify({ email, role: "user" }),
    });
    setInviteUrl(
      `${location.origin}?invite=${encodeURIComponent(response.token)}&email=${encodeURIComponent(email)}`,
    );
    setEmail("");
    refresh();
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex h-20 w-[min(1120px,calc(100%-40px))] items-center justify-between border-b border-neutral-100">
        <Logo />
        <span className="text-xs text-neutral-400">Admin</span>
      </header>
      <main className="mx-auto w-[min(1120px,calc(100%-40px))] py-14">
        <div className="page-enter flex items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold text-blue-600">Workspace</p>
            <h1 className="mt-3 text-4xl font-bold tracking-[-0.045em] text-neutral-950">
              Everything, at a glance.
            </h1>
          </div>
        </div>
        <section className="mt-14 grid grid-cols-2 divide-x divide-neutral-100 border-y border-neutral-100 sm:grid-cols-4">
          <Stat icon={<Users size={13} />} label="Users" value={String(data.users.length)} />
          <Stat icon={<FileText size={13} />} label="Briefs" value={String(data.briefs.length)} />
          <Stat icon={<Database size={13} />} label="Invites" value={String(data.invites.length)} />
          <Stat
            icon={<HardDrive size={13} />}
            label="Storage"
            value={`${(data.storageBytes / 1_000_000).toFixed(1)} MB`}
          />
        </section>
        <div className="mt-16 grid gap-16 lg:grid-cols-[1fr_340px]">
          <section>
            <h2 className="text-sm font-semibold text-neutral-950">Recent Briefs</h2>
            <div className="mt-5 divide-y divide-neutral-100 border-t border-neutral-100">
              {data.briefs.length ? (
                data.briefs.map((brief) => (
                  <a
                    key={brief.id}
                    href={`${API_URL}/b/${brief.id}`}
                    className="flex items-center justify-between py-5 text-sm no-underline"
                  >
                    <span className="font-medium text-neutral-800">{brief.title}</span>
                    <span className="text-xs text-neutral-400">
                      v{brief.version} · {brief.visibility}
                    </span>
                  </a>
                ))
              ) : (
                <p className="py-8 text-sm text-neutral-400">
                  No Briefs yet. The SDK will put them here.
                </p>
              )}
            </div>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-neutral-950">Invite someone</h2>
            <form className="mt-5" onSubmit={invite}>
              <input
                required
                type="email"
                placeholder="person@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 w-full rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-neutral-400"
              />
              <Button className="mt-3 w-full" type="submit">
                <Plus size={15} />
                Create invite
              </Button>
            </form>
            {inviteUrl ? (
              <div className="mt-4 rounded-xl bg-neutral-50 p-4">
                <p className="break-all text-[11px] leading-5 text-neutral-500">{inviteUrl}</p>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}

function App() {
  const [data, setData] = useState<Overview>();
  const [unauthorized, setUnauthorized] = useState(false);
  async function refresh() {
    try {
      setData(await api<Overview>("/v1/admin/overview"));
      setUnauthorized(false);
    } catch {
      setUnauthorized(true);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  if (unauthorized) return <SignIn onDone={refresh} />;
  if (!data)
    return (
      <main className="grid min-h-screen place-items-center text-sm text-neutral-400">
        Opening Brief…
      </main>
    );
  return <Dashboard data={data} refresh={refresh} />;
}

const root = document.querySelector<HTMLDivElement>("#root");
if (!root) throw new Error("Root element not found");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
