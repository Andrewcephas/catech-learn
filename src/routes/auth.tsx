import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/components/AccountProvider";
import { SiteNav, SiteFooter } from "@/components/SiteNav";
import logoImg from "@/assets/logo-catech.png";
import { Button } from "@/components/ui/button";
import { registerCompanyFn, DEFAULT_SEED_COMPANIES } from "@/lib/company.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — CATECH Learn" },
      { name: "description", content: "Sign in or create your CATECH Learn account." },
      { property: "og:title", content: "Sign in to CATECH Learn" },
      { property: "og:description", content: "Access your learning account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Auth,
});

function Auth() {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [loginRole, setLoginRole] = useState<"student" | "company">("student");
  const [signupType, setSignupType] = useState<"student" | "company">("student");

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedStudentCompanyCode, setSelectedStudentCompanyCode] = useState("CATECH");

  // Company Specific Fields
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { user, loading } = useAccount();
  const navigate = useNavigate();

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
        setMessage("Check your email for a password reset link.");
      } else if (mode === "signup") {
        const userDisplayName = signupType === "company" ? (name || `${companyName} Admin`) : name;
        const registrationEmail = signupType === "company" ? (companyEmail || email) : email;

        const result = await supabase.auth.signUp({
          email: registrationEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: userDisplayName,
              account_type: signupType,
              phone_number: phoneNumber,
              company_name: signupType === "company" ? companyName : undefined,
              company_code: signupType === "company" ? companyCode : undefined,
            },
          },
        });

        if (result.error) throw result.error;

        if (result.data.session) {
          // If signed up as company, provision the institution record
          if (signupType === "company") {
            try {
              await registerCompanyFn({
                data: {
                  name: companyName,
                  code: companyCode.toUpperCase().replace(/\s+/g, "-"),
                  contact_email: registrationEmail,
                  phone_number: phoneNumber,
                },
              });
            } catch (instErr) {
              console.warn("Company institution creation warning:", instErr);
            }
          }

          if (typeof window !== "undefined") {
            localStorage.setItem("catech_active_role", signupType === "company" ? "company" : "student");
          }
          await navigate({ to: "/dashboard" });
        } else {
          setMessage("Check your email to confirm your account, then sign in.");
        }
      } else {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        if (typeof window !== "undefined") {
          localStorage.setItem("catech_active_role", loginRole);
          if (loginRole === "student") {
            const chosen =
              DEFAULT_SEED_COMPANIES.find((c) => c.code === selectedStudentCompanyCode) ||
              DEFAULT_SEED_COMPANIES[0];
            localStorage.setItem(
              "catech_selected_company",
              JSON.stringify({ id: chosen.id, name: chosen.name, code: chosen.code }),
            );
            localStorage.setItem("catech_selected_company_id", chosen.id);
          }
        }
        await navigate({ to: "/dashboard" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to continue. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-hero">
      <SiteNav />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-card/95 backdrop-blur-2xl border border-border/80 rounded-3xl shadow-2xl p-6 sm:p-8 max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="CATECH" className="h-10 w-auto object-contain" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">CATECH LEARN</p>
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                {mode === "signup"
                  ? signupType === "company"
                    ? "Register Company / Academy"
                    : "Create Student Account"
                  : mode === "forgot"
                    ? "Reset your password"
                    : "Sign In to Your Portal"}
              </h1>
            </div>
          </div>

          {/* Role selector for Login */}
          {mode === "signin" && (
            <div className="mt-6">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Log in as:
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted/70 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => setLoginRole("student")}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    loginRole === "student"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                  }`}
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>Student Portal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLoginRole("company")}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    loginRole === "company"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  <span>Company / Admin</span>
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground text-center">
                {loginRole === "student"
                  ? "🎓 Browse institutions, enroll in sessions & pay via M-Pesa"
                  : "🏢 Manage your company sessions, view student contacts & send 1-on-1 messages"}
              </p>
            </div>
          )}

          {/* Account type selector for Sign Up */}
          {mode === "signup" && (
            <div className="mt-5">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Register account as:
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted/70 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => setSignupType("student")}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    signupType === "student"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                  }`}
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>Student / Learner</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSignupType("company")}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    signupType === "company"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  <span>Company / Institution</span>
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={submit} className="mt-5 space-y-4">
            {/* Company Specific Registration Fields */}
            {mode === "signup" && signupType === "company" && (
              <>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-foreground">
                    Company / Institution Name
                  </label>
                  <input
                    required
                    maxLength={160}
                    value={companyName}
                    placeholder="e.g. Acme Tech Academy, Safaricom Institute"
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-foreground">
                      Company Code
                    </label>
                    <input
                      required
                      maxLength={20}
                      value={companyCode}
                      placeholder="e.g. ACME-TECH"
                      onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                      className="w-full font-mono uppercase rounded-xl border border-input bg-card px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-foreground">
                      Official Phone / M-Pesa
                    </label>
                    <input
                      required
                      value={phoneNumber}
                      placeholder="0712345678"
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-foreground">
                    Admin / Representative Name
                  </label>
                  <input
                    required
                    maxLength={100}
                    value={name}
                    placeholder="e.g. Dr. Jane Doe"
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-foreground">
                    Company Official Email
                  </label>
                  <input
                    type="email"
                    required
                    value={companyEmail}
                    placeholder="contact@company.co.ke"
                    onChange={(e) => {
                      setCompanyEmail(e.target.value);
                      setEmail(e.target.value);
                    }}
                    className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>
              </>
            )}

            {/* Student Specific Registration Fields */}
            {mode === "signup" && signupType === "student" && (
              <>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-foreground">
                    Full Name
                  </label>
                  <input
                    required
                    maxLength={100}
                    value={name}
                    autoComplete="name"
                    placeholder="e.g. Kelvin Mutua"
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-foreground">
                    Phone Number (for Lipa na M-Pesa & WhatsApp alerts)
                  </label>
                  <input
                    required
                    value={phoneNumber}
                    placeholder="0712345678"
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-foreground">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    autoComplete="email"
                    placeholder="student@example.com"
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>
              </>
            )}

            {/* Common Sign In Email Input & Student Company Choice */}
            {mode !== "signup" && (
              <>
                {loginRole === "student" && (
                  <div className="space-y-1.5 p-3 rounded-2xl bg-muted/40 border border-border/70">
                    <label className="block text-xs font-semibold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                        Choose Learning Institution / Company
                      </span>
                    </label>
                    <select
                      value={selectedStudentCompanyCode}
                      onChange={(e) => setSelectedStudentCompanyCode(e.target.value)}
                      className="w-full rounded-xl border border-input bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-semibold"
                    >
                      {DEFAULT_SEED_COMPANIES.map((comp) => (
                        <option key={comp.code} value={comp.code}>
                          {comp.name} ({comp.code})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground">
                      Access sessions, assignments and learning progress for this company.
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-foreground">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    autoComplete="email"
                    placeholder="name@example.com"
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>
              </>
            )}

            {/* Password */}
            {mode !== "forgot" && (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-foreground">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    placeholder="At least 8 characters"
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-4 py-2.5 pr-11 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="text-xs text-destructive bg-destructive/10 p-3 rounded-xl font-medium">
                {error}
              </p>
            )}

            {message && (
              <p role="status" className="text-xs text-emerald-600 bg-emerald-500/10 p-3 rounded-xl font-semibold">
                {message}
              </p>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="w-full bg-primary text-primary-foreground font-bold text-xs h-10 rounded-xl shadow-md"
            >
              {busy ? (
                "Please wait…"
              ) : mode === "signup" ? (
                <>
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  {signupType === "company" ? "Register Company Account" : "Register Student Account"}
                </>
              ) : mode === "forgot" ? (
                "Send Reset Link"
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-1.5" />
                  Sign In to {loginRole === "company" ? "Company Portal" : "Student Portal"}
                </>
              )}
            </Button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center text-xs text-muted-foreground">
            {mode === "signin" ? (
              <p>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="font-bold text-primary hover:underline ml-1"
                >
                  Create one now
                </button>
              </p>
            ) : (
              <p>
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="font-bold text-primary hover:underline ml-1"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
