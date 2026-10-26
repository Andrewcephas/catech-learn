import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Search,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Mail,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  Phone,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listPublicCompanies, type CompanySummary } from "@/lib/company.functions";

interface CompanyDirectoryProps {
  selectedCompanyId: string | null;
  onSelectCompany: (company: CompanySummary) => void;
  onExploreCourses: () => void;
}

export function CompanyDirectory({
  selectedCompanyId,
  onSelectCompany,
  onExploreCourses,
}: CompanyDirectoryProps) {
  const [search, setSearch] = useState("");

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["public-companies"],
    queryFn: () => listPublicCompanies(),
  });

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.contact_email.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-background border border-border/80 p-6 sm:p-8">
        <div className="max-w-2xl">
          <Badge className="bg-primary/20 text-primary border-primary/30 mb-2 font-semibold">
            <Building2 className="h-3 w-3 mr-1" /> Partner Institutions & Academies
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Select Your Learning Institution
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Browse verified corporate trainers, universities, and technical companies offering accredited
            sessions. Select an institution to view their courses, enroll via M-Pesa, and start learning.
          </p>
        </div>

        {/* Search Bar & Quick Company Shortcuts */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search companies by name, code or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-input bg-card/80 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all backdrop-blur"
            />
          </div>
        </div>

        {/* Quick Company Filter Badges */}
        <div className="mt-4 flex flex-wrap gap-2 items-center text-xs">
          <span className="text-muted-foreground font-semibold text-[11px]">Featured:</span>
          {[
            { label: "All Companies", query: "" },
            { label: "🏢 Altocom", query: "Altocom" },
            { label: "⚡ Midian", query: "Midian" },
            { label: "💻 iTech", query: "iTech" },
            { label: "🎓 Catech", query: "Catech" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => setSearch(item.query)}
              className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-all border ${
                (item.query === "" && search === "") || (item.query !== "" && search.toLowerCase().includes(item.query.toLowerCase()))
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-card/70 hover:bg-muted text-muted-foreground hover:text-foreground border-border/80"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse h-56 border border-border/60 bg-muted/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-border/80 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/60 mb-3" />
          <h3 className="text-base font-bold text-foreground">No companies found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            {search
              ? `No registered institutions match "${search}". Try searching with a different term.`
              : "No companies have registered sessions yet. Check back soon or register a new company account."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
          {filtered.map((company) => {
            const isSelected = selectedCompanyId === company.id;

            return (
              <Card
                key={company.id}
                className={`transition-all duration-200 border rounded-2xl flex flex-col justify-between ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                    : "border-border/80 hover:border-primary/50 hover:shadow-md bg-card"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary font-bold flex items-center justify-center border border-primary/20 text-base shrink-0">
                        {company.avatar_url ? (
                          <img src={company.avatar_url} alt={company.name} className="h-full w-full rounded-2xl object-cover" />
                        ) : (
                          company.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold line-clamp-1">
                          {company.name}
                        </CardTitle>
                        <CardDescription className="text-xs font-mono font-semibold text-primary">
                          Code: {company.code}
                        </CardDescription>
                      </div>
                    </div>
                    {isSelected && (
                      <Badge className="bg-primary text-primary-foreground font-semibold text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-xs py-2">
                  {company.description && (
                    <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">
                      {company.description}
                    </p>
                  )}

                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                      <span className="truncate">{company.contact_email || "contact@institution.ke"}</span>
                    </div>

                    {company.phone_number && (
                      <div className="flex items-center gap-2 text-muted-foreground font-mono">
                        <Phone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{company.phone_number}</span>
                      </div>
                    )}

                    {company.address && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">{company.address}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-muted-foreground pt-1">
                      <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-semibold text-foreground">
                        {company.course_count ?? 1} Published Session{company.course_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Verified Partner
                    </span>
                    <span className="text-emerald-600 font-bold">Lipa na M-Pesa Ready</span>
                  </div>
                </CardContent>

                <CardFooter className="pt-3 border-t border-border/70 flex gap-2">
                  {isSelected ? (
                    <Button
                      onClick={onExploreCourses}
                      className="w-full bg-primary text-primary-foreground text-xs font-semibold"
                    >
                      <span>Explore Sessions</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => onSelectCompany(company)}
                      className="w-full border-primary/40 hover:bg-primary hover:text-primary-foreground text-xs font-semibold"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-primary" />
                      Select Company
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
