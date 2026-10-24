import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LogIn,
  Mail,
  Eye,
  EyeOff,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import "@lovable.dev/cloud-auth-js/styles.css";
import { useAccount } from "@/components/AccountProvider";
import { SiteNav, SiteFooter } from "@/components/SiteNav";
import logoImg from "@/assets/logo-catech.png";
import { Button } from "@/components/ui/button";

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
  const [loginRole, setLoginRole] = useState<"student" | "teacher" | "admin">("student");
  const [signupRole, setSignupRole] = useState<"student" | "teacher">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
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
        const result = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name, requested_role: signupRole },
          },
        });
        if (result.error) throw result.error;
        if (result.data.session) {
          if (typeof window !== "undefined") {
            localStorage.setItem("catech_active_role", signupRole);
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
        }
        await navigate({ to: "/dashboard" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to continue. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function social(provider: "google" | "lovable") {
    setError("");
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: `${window.location.origin}/auth`,
      });
      if (result.error) throw result.error;
      if (!result.redirected) {
        if (typeof window !== "undefined") {
          localStorage.setItem("catech_active_role", loginRole);
        }
        await navigate({ to: "/dashboard" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-hero">
      <SiteNav />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-card/90 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="CATECH" className="h-10 w-auto object-contain" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">CATECH LEARN</p>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {mode === "signup"
                  ? "Create your account"
                  : mode === "forgot"
                    ? "Reset your password"
                    : "Welcome back"}
              </h1>
            </div>
          </div>

          {/* Role selector for Login */}
          {mode === "signin" && (
            <div className="mt-6">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Log in as:
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/70 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => setLoginRole("student")}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                    loginRole === "student"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                  }`}
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLoginRole("teacher")}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                    loginRole === "teacher"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Teacher</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLoginRole("admin")}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                    loginRole === "admin"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Admin</span>
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground text-center">
                {loginRole === "student" && "🎓 Student Portal — Access courses, notes & assignments"}
                {loginRole === "teacher" && "👨‍🏫 Teacher Portal — Manage curriculum, classes & grades"}
                {loginRole === "admin" && "🛡️ Admin Portal — Institutional management & controls"}
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
                  onClick={() => setSignupRole("student")}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    signupRole === "student"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                  }`}
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSignupRole("teacher")}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    signupRole === "teacher"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Teacher / Faculty</span>
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={submit} className="mt-5 space-y-4">
            {mode === "signup" && (
              <label className="block text-sm font-semibold text-foreground">
                Display name
                <input
                  required
                  maxLength={100}
                  value={name}
                  autoComplete="name"
                  placeholder="e.g. Jane Doe"
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-input bg-card px-4 py-2.5 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
              </label>
            )}

            <label className="block text-sm font-semibold text-foreground">
              Email address
              <input
                type="email"
                required
                value={email}
                autoComplete="email"
                placeholder="name@example.com"
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-input bg-card px-4 py-2.5 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </label>

            {mode !== "forgot" && (
              <label className="block text-sm font-semibold text-foreground">
                Password
                <div className="relative mt-1.5">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    placeholder="At least 8 characters"
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-input bg-card px-4 py-2.5 pr-11 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </label>
            )}

            {error && (
              <p role="alert" className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2.5">
                {error}
              </p>
            )}

            {message && (
              <p role="status" className="text-sm font-medium text-primary bg-primary/10 border border-primary/20 rounded-md p-2.5">
                {message}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {mode === "forgot" ? (
                <Mail className="h-4 w-4 mr-2" />
              ) : mode === "signup" ? (
                <UserPlus className="h-4 w-4 mr-2" />
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              {busy
                ? "Please wait…"
                : mode === "signup"
                  ? `Create ${signupRole === "teacher" ? "Teacher" : "Student"} Account`
                  : mode === "forgot"
                    ? "Send reset link"
                    : `Sign in as ${loginRole === "admin" ? "Admin" : loginRole === "teacher" ? "Teacher" : "Student"}`}
            </Button>
          </form>

          {/* Social login buttons ONLY shown on signin, REMOVED from signup as requested */}
          {mode === "signin" && (
            <div className="mt-6 pt-5 border-t border-border/60">
              <div className="grid gap-2.5">
                <Button variant="outline" size="sm" disabled={busy} onClick={() => social("google")}>
                  Continue with Google
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="lovable-auth-button w-full"
                  disabled={busy}
                  onClick={() => social("lovable")}
                >
                  Continue with Lovable
                </Button>
              </div>
            </div>
          )}

          {/* Navigation links */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-sm">
            <Button
              variant="link"
              className="p-0 h-auto text-xs font-semibold"
              onClick={() => switchMode(mode === "signup" || mode === "forgot" ? "signin" : "signup")}
            >
              {mode === "signin" ? "Don't have an account? Create one" : "Already have an account? Sign in"}
            </Button>
            {mode === "signin" && (
              <Button
                variant="link"
                className="p-0 h-auto text-xs text-muted-foreground hover:text-foreground"
                onClick={() => switchMode("forgot")}
              >
                Forgot password?
              </Button>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
