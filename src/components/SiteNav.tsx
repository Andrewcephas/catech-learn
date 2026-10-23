import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAccount } from '@/components/AccountProvider';
import { supabase } from '@/integrations/supabase/client';

export function SiteNav() {
  const { user, loading } = useAccount();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function signOut() {
    setBusy(true); setError('');
    await queryClient.cancelQueries(); queryClient.clear();
    const result = await supabase.auth.signOut();
    setBusy(false);
    if (result.error) { setError('Sign-out failed. Please try again.'); return; }
    await navigate({ to: '/auth', replace: true });
  }
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">C</span>
          CATECH <span className="text-primary">Learn</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm font-medium sm:gap-5">
          <a href="/#pricing" className="hidden text-muted-foreground hover:text-foreground sm:inline">Pricing</a>
          <Link to="/demo" className="text-muted-foreground hover:text-foreground">Demo</Link>
          <Link to="/verify" className="text-muted-foreground hover:text-foreground">Verify certificate</Link>
          {!loading && (user ? <><Button asChild variant="secondary"><Link to="/dashboard">My dashboard</Link></Button><Button size="icon" variant="ghost" title="Sign out" aria-label="Sign out" onClick={signOut} disabled={busy}><LogOut /></Button></> : <Button asChild><Link to="/auth">Sign in</Link></Button>)}
          {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
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
