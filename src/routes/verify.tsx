import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteNav, SiteFooter } from "@/components/SiteNav";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify a certificate — CATECH Learn" },
      { name: "description", content: "Check that a CATECH Learn certificate is genuine using its certificate ID." },
      { property: "og:title", content: "CATECH Certificate Verification" },
      { property: "og:description", content: "Enter a certificate ID to confirm it is verified." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Verify,
});

const certs: Record<string, { student: string; course: string; institution: string }> = {
  "CAT-KTI-2026-000152": { student: "John Doe", course: "Full Stack Web Development", institution: "Kisii Training Institute" },
};

function Verify() {
  const [id, setId] = useState("CAT-KTI-2026-000152");
  const [result, setResult] = useState<null | "none" | (typeof certs)[string]>(null);
  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-xl px-5 py-16">
        <h1 className="text-3xl font-bold">CATECH Certificate Verification</h1>
        <form className="mt-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); setResult(certs[id.trim().toUpperCase()] ?? "none"); }}>
          <input value={id} onChange={(e) => setId(e.target.value)} placeholder="Certificate ID"
            className="flex-1 rounded-lg border border-input bg-card px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
          <button className="rounded-lg bg-primary px-5 font-semibold text-primary-foreground">Verify</button>
        </form>
        {result === "none" && <p className="mt-6 rounded-lg bg-destructive/10 p-4 text-destructive">No certificate found with that ID.</p>}
        {result && result !== "none" && (
          <div className="mt-6 rounded-2xl border border-primary bg-card p-6 shadow-card">
            <p className="font-display text-lg font-bold text-primary">✓ VERIFIED</p>
            <dl className="mt-4 space-y-3 text-sm">
              {[["Certificate", id.toUpperCase()], ["Student", result.student], ["Course", result.course], ["Institution", result.institution]].map(([k, v]) => (
                <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>
              ))}
            </dl>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
