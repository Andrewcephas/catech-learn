import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/components/AccountProvider";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/logo-catech.png";

export function SiteNav() {
  const { user, loading } = useAccount();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setBusy(true);
    setError("");
    await queryClient.cancelQueries();
    queryClient.clear();
    const result = await supabase.auth.signOut();
    setBusy(false);
    if (result.error) {
      setError("Sign-out failed. Please try again.");
      return;
    }
    await navigate({ to: "/auth", replace: true });
  }
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
        <Link
          to="/"
          aria-label="CATECH Learn home"
          className="flex items-center gap-3 font-display text-lg font-bold"
        >
          <span className="relative block h-14 w-28 overflow-hidden">
            <img
              src={logoImg}
              alt="CATECH"
              className="h-8 w-8 object-contain"
            />
          </span>
          <span className="border-l border-border pl-3 text-primary">Learn</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm font-medium sm:gap-5">
          {!loading &&
            (user ? (
              <>
                <Button asChild variant="secondary">
                  <Link to="/dashboard">My dashboard</Link>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  title="Sign out"
                  aria-label="Sign out"
                  onClick={signOut}
                  disabled={busy}
                >
                  <LogOut />
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link to="/auth">Sign in</Link>
              </Button>
            ))}
          {error && (
            <span role="alert" className="text-xs text-destructive">
              {error}
            </span>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
      © 2026 CATECH Graphics and Solutions · Your Tech Partner For Success.
    </footer>
  );
}
