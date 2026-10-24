import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogIn, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import "@lovable.dev/cloud-auth-js/styles.css";
import { useAccount } from "@/components/AccountProvider";
import { SiteNav, SiteFooter } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — CATECH Learn" },
      { name: "description", content: "Sign in or create your CATECH Learn account." },
      { property: "og:title", content: "Sign in to CATECH Learn" },
      { property: "og:description", content: "Access your learning account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Auth,
});
function Auth() {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { user, loading } = useAccount();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) void navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);
  function switchMode(next: typeof mode) {
    setMode(next);
    setError("");
    setMessage("");
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "forgot") {
        const result = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (result.error) throw result.error;
        setMessage("Check your email for a password reset link.");
      } else if (mode === "signup") {
        const result = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name } },
        });
        if (result.error) throw result.error;
        if (result.data.session) await navigate({ to: "/dashboard" });
        else setMessage("Check your email to confirm your account, then sign in.");
      } else {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        await navigate({ to: "/dashboard" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to continue. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function social(provider: "google" | "lovable") {
    setError("");
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: `${window.location.origin}/auth`,
      });
      if (result.error) throw result.error;
      if (!result.redirected) await navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-md px-5 py-14">
        <p className="text-sm font-semibold text-primary">CATECH LEARN</p>
        <h1 className="mt-2 text-3xl font-bold">
          {mode === "signup"
            ? "Create your account"
            : mode === "forgot"
              ? "Reset your password"
              : "Welcome back"}
        </h1>
        {mode !== "forgot" && (
          <div className="mt-7 grid gap-3">
            <Button variant="outline" disabled={busy} onClick={() => social("google")}>
              Continue with Google
            </Button>
            <Button
              className="lovable-auth-button w-full"
              disabled={busy}
              onClick={() => social("lovable")}
            >
              Continue with Lovable
            </Button>
            <p className="my-2 text-center text-xs text-muted-foreground">or use your email</p>
          </div>
        )}
        <form onSubmit={submit} className="mt-5 space-y-4">
          {mode === "signup" && (
            <label className="block text-sm font-semibold">
              Display name
              <input
                required
                maxLength={100}
                value={name}
                autoComplete="name"
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-md border border-input bg-card px-4 py-3"
              />
            </label>
          )}
          <label className="block text-sm font-semibold">
            Email
            <input
              type="email"
              required
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-md border border-input bg-card px-4 py-3"
            />
          </label>
          {mode !== "forgot" && (
            <label className="block text-sm font-semibold">
              Password
              <input
                type="password"
                required
                minLength={8}
                value={password}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-md border border-input bg-card px-4 py-3"
              />
            </label>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="text-sm text-primary">
              {message}
            </p>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {mode === "forgot" ? <Mail /> : <LogIn />}
            {busy
              ? "Please wait…"
              : mode === "signup"
                ? "Create account"
                : mode === "forgot"
                  ? "Send reset link"
                  : "Sign in"}
          </Button>
        </form>
        <div className="mt-5 flex flex-wrap justify-between gap-2">
          <Button
            variant="link"
            onClick={() => switchMode(mode === "signup" || mode === "forgot" ? "signin" : "signup")}
          >
            {mode === "signin" ? "Create an account" : "Back to sign in"}
          </Button>
          {mode === "signin" && (
            <Button variant="link" onClick={() => switchMode("forgot")}>
              Forgot password?
            </Button>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
