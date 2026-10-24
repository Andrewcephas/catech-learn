import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/components/AccountProvider";
import { SiteNav, SiteFooter } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — CATECH Learn" },
      { name: "description", content: "Set a new password for your CATECH Learn account." },
      { property: "og:title", content: "Reset your CATECH Learn password" },
      { property: "og:description", content: "Securely recover your learning account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});
function ResetPassword() {
  const { user, loading, recovery } = useAccount();
  const [linkRecovery, setLinkRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setLinkRecovery(new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery");
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await supabase.auth.updateUser({ password });
      if (result.error) throw result.error;
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-md px-5 py-14">
        <h1 className="text-3xl font-bold">Set a new password</h1>
        {done ? (
          <div className="mt-6">
            <p role="status">Your password has been updated.</p>
            <Button asChild className="mt-5">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        ) : loading ? (
          <p className="mt-6">Checking your reset link…</p>
        ) : !user || !(recovery || linkRecovery) ? (
          <div className="mt-6">
            <p>This reset link is missing or expired.</p>
            <Button asChild variant="link">
              <Link to="/auth">Request a new reset link</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold">
              New password
              <div className="relative mt-2">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-input bg-card px-4 py-3 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </label>
            <label className="block text-sm font-semibold">
              Confirm password
              <div className="relative mt-2">
                <input
                  required
                  type={showConfirmPassword ? "text" : "password"}
                  minLength={8}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-md border border-input bg-card px-4 py-3 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </label>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
