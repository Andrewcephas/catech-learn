import { Link } from "@tanstack/react-router";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">C</span>
          CATECH <span className="text-primary">Learn</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium">
          <a href="/#pricing" className="hidden text-muted-foreground hover:text-foreground sm:inline">Pricing</a>
          <Link to="/demo" className="text-muted-foreground hover:text-foreground">Demo</Link>
          <Link to="/verify" className="text-muted-foreground hover:text-foreground">Verify certificate</Link>
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
