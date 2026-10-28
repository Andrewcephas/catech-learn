import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import { useAccount } from "@/components/AccountProvider";
import logoImg from "@/assets/logo-catech.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CATECH Learn — Learning system" },
      {
        name: "description",
        content: "Access your CATECH Learn account and private learning dashboard.",
      },
      { property: "og:title", content: "CATECH Learn" },
      { property: "og:description", content: "Your learning account and campus workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SystemEntry,
});

function SystemEntry() {
  const { user, loading } = useAccount();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading) void navigate({ to: user ? "/dashboard" : "/auth", replace: true });
  }, [user, loading, navigate]);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="flex flex-col items-center gap-3 p-8 rounded-3xl bg-card border border-border/70 shadow-sm max-w-xs w-full text-center">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-xs">
          <img
            src={logoImg}
            alt="CATECH"
            className="h-10 w-10 object-contain"
          />
        </div>
        <div>
          <h1 className="text-lg font-black tracking-tight text-foreground">
            CATECH <span className="text-primary font-black">Learn</span>
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">Authenticating session…</p>
        </div>
        <LoaderCircle
          aria-label="Opening your account"
          className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none mt-1"
        />
      </div>
    </main>
  );
}
