import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  Search,
  Award,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteNav, SiteFooter } from "@/components/SiteNav";
import { verifyCertificateFn } from "@/lib/assessment.functions";
import logo from "@/assets/catech-logo.png.asset.json";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Accredited Certificate Verification — CATECH Learn" },
      {
        name: "description",
        content:
          "Verify authentic educational credentials and graduation certificates issued on CATECH Learn.",
      },
      { property: "og:title", content: "CATECH Certificate Registry" },
      {
        property: "og:description",
        content: "Verify authentic institutional certificates with tamper-proof security hashes.",
      },
    ],
  }),
  component: CertificateVerificationPage,
});

function CertificateVerificationPage() {
  const [certInput, setCertInput] = useState("");
  const [searchedCert, setSearchedCert] = useState<string | null>(null);

  // Check URL query parameters (e.g. ?cert=CAT-...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const certParam = params.get("cert");
    if (certParam) {
      setCertInput(certParam);
      setSearchedCert(certParam);
    }
  }, []);

  const {
    data: certResult,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["verify-certificate", searchedCert],
    queryFn: () =>
      searchedCert ? verifyCertificateFn({ data: { cert_number: searchedCert } }) : null,
    enabled: !!searchedCert,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (certInput.trim()) {
      setSearchedCert(certInput.trim().toUpperCase());
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav />

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-12">
        {/* Verification Header */}
        <div className="text-center max-w-xl mx-auto space-y-3">
          <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-3 text-primary mb-1">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Accredited Certificate Verification
          </h1>
          <p className="text-sm text-muted-foreground">
            Authenticate official academic certificates and digital credentials issued by CATECH
            Graphics & Solutions partner institutions.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="mt-6 flex gap-2 max-w-md mx-auto">
            <input
              type="text"
              placeholder="e.g. CAT-ABCD-2026-123456"
              value={certInput}
              onChange={(e) => setCertInput(e.target.value.toUpperCase())}
              className="flex-1 rounded-md border border-input bg-card px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button
              type="submit"
              disabled={!certInput.trim() || isLoading}
              className="bg-primary text-primary-foreground"
            >
              <Search className="h-4 w-4 mr-1.5" /> Verify
            </Button>
          </form>
        </div>

        {/* Verification Result Card */}
        <div className="mt-12">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              Searching cryptographic certificate registry…
            </div>
          ) : searchedCert && !certResult ? (
            <Card className="border border-destructive/30 bg-destructive/5 p-8 text-center max-w-lg mx-auto">
              <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-3" />
              <h3 className="text-lg font-bold text-foreground">Certificate Record Not Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                No active certificate matching credential number{" "}
                <strong className="font-mono text-foreground">{searchedCert}</strong> was found in
                the authoritative registry.
              </p>
            </Card>
          ) : certResult ? (
            <div className="space-y-6">
              {/* Official Credential Certificate Document */}
              <div className="rounded-2xl border-4 border-double border-primary/40 bg-card p-8 sm:p-12 shadow-xl print:border-none print:shadow-none relative overflow-hidden">
                {/* Background Seal Watermark */}
                <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none">
                  <Award className="h-96 w-96 text-primary" />
                </div>

                <div className="flex items-center justify-between border-b border-border/80 pb-6">
                  <div className="flex items-center gap-3">
                    <img src={logo.url} alt="CATECH" className="h-12 w-auto object-contain" />
                    <div>
                      <h3 className="font-bold text-sm tracking-wide text-foreground">
                        CATECH LEARN
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Accredited Credential Authority
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-600 text-white font-bold text-xs py-1 px-3">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> VERIFIED AUTHENTIC
                  </Badge>
                </div>

                <div className="text-center py-10 space-y-4">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                    Certificate of Competency & Completion
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This is to officially certify that
                  </p>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight underline decoration-primary/40 underline-offset-8">
                    {certResult.student_name}
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto pt-2">
                    has successfully fulfilled all curriculum requirements, continuous assessments,
                    and mastery examinations for
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold text-primary">
                    {certResult.course_title}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-border/80 pt-6 text-xs text-muted-foreground">
                  <div>
                    <span className="block font-semibold uppercase text-foreground">
                      Issuing Campus
                    </span>
                    <span className="flex items-center gap-1.5 mt-1 text-foreground font-medium">
                      <Building2 className="h-3.5 w-3.5 text-primary" />{" "}
                      {certResult.institution_name}
                    </span>
                  </div>
                  <div>
                    <span className="block font-semibold uppercase text-foreground">
                      Issue Date
                    </span>
                    <span className="flex items-center gap-1.5 mt-1 text-foreground font-medium">
                      <Calendar className="h-3.5 w-3.5 text-primary" /> {certResult.issue_date}
                    </span>
                  </div>
                  <div>
                    <span className="block font-semibold uppercase text-foreground">
                      Certificate Serial
                    </span>
                    <span className="block font-mono font-bold text-foreground mt-1">
                      {certResult.certificate_number}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-center print:hidden">
                <Button
                  onClick={handlePrint}
                  className="bg-primary text-primary-foreground font-medium"
                >
                  <Printer className="h-4 w-4 mr-1.5" /> Print / Save Accredited PDF
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
