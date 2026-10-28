import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LogIn,
  Mail,
  Eye,
  EyeOff,
  GraduationCap,
  Building2,
  ShieldCheck,
  UserPlus,
  Phone,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/components/AccountProvider";
import { SiteNav, SiteFooter } from "@/components/SiteNav";
import logoImg from "@/assets/logo-catech.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  registerCompanyFn,
  listPublicCompanies,
  associateStudentWithCompanyFn,
  DEFAULT_SEED_COMPANIES,
} from "@/lib/company.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Authentication — CATECH Learn" },
      { name: "description", content: "Sign in or register your CATECH Learn company or student account." },
      { property: "og:title", content: "CATECH Learn Portal Access" },
      { property: "og:description", content: "Commercial e-learning platform with M-Pesa payments and direct company-student workflows." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Auth,
});

function Auth() {
  const [mode, setMode] = useState<"signin" | "signup_student" | "signup_company" | "forgot">("signin");

  // Form Fields - Authentication
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Student Registration Fields
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(DEFAULT_SEED_COMPANIES[0].id);

  // Company Registration Fields
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [companyAdminName, setCompanyAdminName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const { user, loading } = useAccount();
  const navigate = useNavigate();

  // Fetch available companies for student enrollment
  const { data: companies = DEFAULT_SEED_COMPANIES } = useQuery({
    queryKey: ["public-companies"],
    queryFn: () => listPublicCompanies(),
  });

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
        setMessage("Password reset email sent. Please check your inbox.");
      } else if (mode === "signup_student") {
        // Register Student Account
        const chosen = companies.find((c) => c.id === selectedCompanyId) || companies[0];

        const result = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: studentName,
              account_type: "student",
              phone_number: studentPhone,
              institution_id: chosen?.id,
              institution_name: chosen?.name,
            },
          },
        });

        if (result.error) throw result.error;

        if (result.data.session) {
          if (chosen) {
            try {
              await associateStudentWithCompanyFn({
                data: { institution_id: chosen.id },
              });
            } catch (assocErr) {
              console.warn("Student company association notice:", assocErr);
            }

            if (typeof window !== "undefined") {
              localStorage.setItem("catech_active_role", "student");
              localStorage.setItem(
                "catech_selected_company",
                JSON.stringify({ id: chosen.id, name: chosen.name, code: chosen.code }),
              );
              localStorage.setItem("catech_selected_company_id", chosen.id);
            }
          }
          await navigate({ to: "/dashboard" });
        } else {
          setMessage("Account created. Please check your email to confirm your account, then sign in.");
        }
      } else if (mode === "signup_company") {
        // Register Company Account
        const formattedCode = companyCode.toUpperCase().replace(/\s+/g, "-");
        const adminEmail = companyEmail || email;

        const result = await supabase.auth.signUp({
          email: adminEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: companyAdminName || `${companyName} Admin`,
              account_type: "company",
              phone_number: companyPhone,
              company_name: companyName,
              company_code: formattedCode,
            },
          },
        });

        if (result.error) throw result.error;

        if (result.data.session) {
          try {
            await registerCompanyFn({
              data: {
                name: companyName,
                code: formattedCode,
                contact_email: adminEmail,
                phone_number: companyPhone,
              },
            });
          } catch (instErr) {
            console.warn("Company registration notice:", instErr);
          }

          if (typeof window !== "undefined") {
            localStorage.setItem("catech_active_role", "institution_admin");
          }
          await navigate({ to: "/dashboard" });
        } else {
          setMessage("Company account created. Please confirm your email, then sign in.");
        }
      } else {
        // Sign In
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;

        // Ensure default company selection for learners
        if (typeof window !== "undefined") {
          const defaultComp = companies[0] || DEFAULT_SEED_COMPANIES[0];
          if (!localStorage.getItem("catech_selected_company") && defaultComp) {
            localStorage.setItem(
              "catech_selected_company",
              JSON.stringify({ id: defaultComp.id, name: defaultComp.name, code: defaultComp.code }),
            );
            localStorage.setItem("catech_selected_company_id", defaultComp.id);
          }
        }

        await navigate({ to: "/dashboard" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed. Please verify credentials.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background">
      <SiteNav />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-card border border-border/80 rounded-3xl shadow-xl p-6 sm:p-8 max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-border/70">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-xs shrink-0">
              <img src={logoImg} alt="CATECH" className="h-7 w-7 object-contain" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-primary">
                CATECH LEARN · Commercial SaaS
              </p>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                {mode === "signin" && "Sign In to Your Portal"}
                {mode === "signup_student" && "Student Account Registration"}
                {mode === "signup_company" && "Register Organization / Academy"}
                {mode === "forgot" && "Reset Password"}
              </h1>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          {mode !== "forgot" && (
            <div className="mt-5 grid grid-cols-3 gap-1 p-1 bg-muted/60 rounded-xl border border-border/60 text-xs font-semibold">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={`py-2 px-1 rounded-lg transition-all text-center truncate ${
                  mode === "signin"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup_student")}
                className={`py-2 px-1 rounded-lg transition-all text-center truncate ${
                  mode === "signup_student"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🎓 Student
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup_company")}
                className={`py-2 px-1 rounded-lg transition-all text-center truncate ${
                  mode === "signup_company"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🏢 Company
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={submit} className="mt-5 space-y-4">
            {/* 1. Student Registration Fields */}
            {mode === "signup_student" && (
              <>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-foreground">Full Name</label>
                  <input
                    required
                    maxLength={100}
                    value={studentName}
                    placeholder="e.g. Dennis Kimani"
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-foreground">
                    Phone Number (for Lipa na M-Pesa & SMS)
                  </label>
                  <input
                    required
                    value={studentPhone}
                    placeholder="0712345678"
                    onChange={(e) => setStudentPhone(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Select Institution / Company to Join</span>
                    <Badge variant="outline" className="text-[10px] font-mono text-primary">Required</Badge>
                  </label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  >
                    {companies.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name} ({comp.code})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted-foreground">
                    You can browse other partner companies and enroll in their sessions anytime.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-foreground">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    placeholder="student@example.com"
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </>
            )}

            {/* 2. Company Registration Fields */}
            {mode === "signup_company" && (
              <>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-foreground">
                    Organization / Company Name
                  </label>
                  <input
                    required
                    maxLength={160}
                    value={companyName}
                    placeholder="e.g. Nairobi Software Academy, Apex Training Institute"
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-foreground">Company Code</label>
                    <input
                      required
                      maxLength={20}
                      value={companyCode}
                      placeholder="e.g. APEX-TECH"
                      onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                      className="w-full font-mono uppercase rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-foreground">
                      Official Phone / M-Pesa
                    </label>
                    <input
                      required
                      value={companyPhone}
                      placeholder="0712345678"
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      className="w-full font-mono rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-foreground">
                    Administrator Full Name
                  </label>
                  <input
                    required
                    maxLength={100}
                    value={companyAdminName}
                    placeholder="e.g. Dr. Catherine Njeri"
                    onChange={(e) => setCompanyAdminName(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-foreground">
                    Official Company Email
                  </label>
                  <input
                    type="email"
                    required
                    value={companyEmail}
                    placeholder="admin@academy.co.ke"
                    onChange={(e) => {
                      setCompanyEmail(e.target.value);
                      setEmail(e.target.value);
                    }}
                    className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </>
            )}

            {/* 3. Common Sign In / Forgot Email */}
            {(mode === "signin" || mode === "forgot") && (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-foreground">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  autoComplete="email"
                  placeholder="name@example.com"
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            {/* Password Field (for signin, signup_student, signup_company) */}
            {mode !== "forgot" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-foreground">Password</label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    placeholder="At least 8 characters"
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 pr-10 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Messages & Errors */}
            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                {error}
              </div>
            )}

            {message && (
              <div className="p-3 rounded-xl bg-emerald-600/10 border border-emerald-600/20 text-emerald-600 text-xs font-semibold">
                {message}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={busy}
              className="w-full bg-primary text-primary-foreground font-bold text-xs h-10 rounded-xl shadow-xs hover:bg-primary/95 transition-all"
            >
              {busy ? (
                "Processing…"
              ) : mode === "signin" ? (
                "Sign In to Account"
              ) : mode === "signup_student" ? (
                "Create Student Account"
              ) : mode === "signup_company" ? (
                "Register Organization"
              ) : (
                "Send Reset Email"
              )}
            </Button>
          </form>

          {/* Footer Navigation */}
          {mode === "forgot" ? (
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="text-xs font-semibold text-primary hover:underline"
              >
                ← Back to Sign In
              </button>
            </div>
          ) : (
            <div className="mt-5 text-center text-xs text-muted-foreground">
              {mode === "signin" ? (
                <p>
                  Need an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup_student")}
                    className="text-primary font-bold hover:underline"
                  >
                    Register as Student
                  </button>{" "}
                  or{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup_company")}
                    className="text-primary font-bold hover:underline"
                  >
                    Register Company
                  </button>
                </p>
              ) : (
                <p>
                  Already registered?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="text-primary font-bold hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
