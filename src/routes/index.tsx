import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import { useAccount } from "@/components/AccountProvider";
import logo from "@/assets/catech-logo.png.asset.json";

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
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <img
        src={logo.url}
        alt="CATECH Graphics and Solutions"
        className="h-32 w-64 object-contain"
      />
      <h1 className="text-2xl font-bold">CATECH Learn</h1>
      <LoaderCircle
        aria-label="Opening your account"
        className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none"
      />
    </main>
  );
}
