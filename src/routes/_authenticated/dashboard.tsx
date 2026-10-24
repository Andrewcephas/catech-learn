import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  UserRound,
  GraduationCap,
  Building2,
  Save,
  Shield,
  BookOpen,
  Copy,
  Check,
  Sparkles,
  KeyRound,
  Layers,
} from "lucide-react";
import { SiteNav, SiteFooter } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAccount, saveProfile } from "@/lib/account.functions";
import { bootstrapSuperAdminFn } from "@/lib/institution.functions";
import { SuperAdminConsole } from "@/components/dashboard/SuperAdminConsole";
import { InstitutionAdminConsole } from "@/components/dashboard/InstitutionAdminConsole";
import { TeacherWorkspace } from "@/components/dashboard/TeacherWorkspace";
import { StudentHub } from "@/components/dashboard/StudentHub";

const accountOptions = queryOptions({ queryKey: ["account"], queryFn: () => getAccount() });

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — CATECH Learn" },
      { name: "description", content: "Your CATECH Learn account and learning dashboard." },
      { property: "og:title", content: "Your CATECH Learn dashboard" },
      {
        property: "og:description",
        content: "Manage your learning account and multi-tenant portal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(accountOptions),
  component: Dashboard,
});

function Dashboard() {
  const { data } = useSuspenseQuery(accountOptions);
  const [name, setName] = useState(data.profile.display_name);
  const [copiedId, setCopiedId] = useState(false);
  const [bootstrapModalOpen, setBootstrapModalOpen] = useState(false);
  const [bootstrapMessage, setBootstrapMessage] = useState("");
  const [bootstrapError, setBootstrapError] = useState("");

  const queryClient = useQueryClient();

  const profileMutation = useMutation({
    mutationFn: () => saveProfile({ data: { display_name: name } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["account"] }),
  });

  const bootstrapMutation = useMutation({
    mutationFn: () => bootstrapSuperAdminFn(),
    onSuccess: (res) => {
      setBootstrapMessage(res.message);
      setBootstrapError("");
      void queryClient.invalidateQueries({ queryKey: ["account"] });
    },
    onError: (err: Error) => {
      setBootstrapError(err.message || "Bootstrap initialization failed.");
      setBootstrapMessage("");
    },
  });

  const copyUserId = () => {
    void navigator.clipboard.writeText(data.profile.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const rbacPerms = ((data as { rbacPermissions?: string[] }).rbacPermissions || []);
  const rbacRoleCodes = ((data as { rbacRoles?: Array<{ role_code: string }> }).rbacRoles || []).map((r) => r.role_code);

  const hasInstAdmin =
    data.memberships.some((m) => m.role === "institution_admin") ||
    rbacRoleCodes.some((code) => ["institution_admin", "institution_owner"].includes(code)) ||
    rbacPerms.some((p) => ["institutions.view", "institutions.settings.manage", "users.roles.assign"].includes(p));

  const hasTeacher =
    data.roles.includes("teacher") ||
    data.memberships.some((m) => m.role === "teacher") ||
    rbacRoleCodes.some((code) => ["teacher", "academic_admin", "department_head"].includes(code)) ||
    rbacPerms.some((p) => ["courses.create", "courses.update", "courses.content.edit", "assessments.grade"].includes(p));

  // Determine initial active tab respecting user login selection if allowed
  const getInitialTab = () => {
    if (typeof window !== "undefined") {
      const preferred = localStorage.getItem("catech_active_role");
      if (preferred === "student") return "learning";
      if (preferred === "teacher" && (hasTeacher || data.isPlatformAdmin)) return "teaching";
      if (preferred === "admin" && (data.isPlatformAdmin || hasInstAdmin)) {
        return data.isPlatformAdmin ? "platform" : "campus";
      }
    }
    return data.isPlatformAdmin
      ? "platform"
      : hasInstAdmin
        ? "campus"
        : hasTeacher
          ? "teaching"
          : "learning";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/70 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                CATECH SaaS Platform
              </span>
              {data.isPlatformAdmin && (
                <Badge className="bg-primary text-primary-foreground font-semibold text-xs">
                  <Shield className="h-3 w-3 mr-1" /> Super Admin
                </Badge>
              )}
            </div>
            <h1 className="mt-1.5 text-3xl font-extrabold tracking-tight">
              Welcome, {data.profile.display_name || "Learner"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your personalized multi-tenant educational environment.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!data.isPlatformAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBootstrapModalOpen(true)}
                className="text-xs border-dashed"
              >
                <KeyRound className="h-3.5 w-3.5 mr-1 text-amber-500" />
                Setup Platform Admin
              </Button>
            )}

            <div className="flex items-center rounded-lg border border-border/80 bg-muted/40 px-3 py-1.5 text-xs font-mono">
              <span className="text-muted-foreground mr-2">ID:</span>
              <span className="text-foreground">{data.profile.id.slice(0, 13)}…</span>
              <button
                type="button"
                onClick={copyUserId}
                className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Copy full UUID"
                aria-label="Copy full UUID"
              >
                {copiedId ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/60 p-1 rounded-lg">
              {data.isPlatformAdmin && (
                <TabsTrigger value="platform" className="gap-1.5 py-2 px-3.5 text-xs font-semibold">
                  <Shield className="h-4 w-4" /> Platform Admin
                </TabsTrigger>
              )}

              {(hasInstAdmin || data.isPlatformAdmin) && (
                <TabsTrigger value="campus" className="gap-1.5 py-2 px-3.5 text-xs font-semibold">
                  <Building2 className="h-4 w-4" /> Campus Admin
                </TabsTrigger>
              )}

              {(hasTeacher || data.isPlatformAdmin) && (
                <TabsTrigger value="teaching" className="gap-1.5 py-2 px-3.5 text-xs font-semibold">
                  <BookOpen className="h-4 w-4" /> Faculty Studio
                </TabsTrigger>
              )}

              <TabsTrigger value="learning" className="gap-1.5 py-2 px-3.5 text-xs font-semibold">
                <GraduationCap className="h-4 w-4" /> My Learning
              </TabsTrigger>

              <TabsTrigger value="profile" className="gap-1.5 py-2 px-3.5 text-xs font-semibold">
                <UserRound className="h-4 w-4" /> Profile & Account
              </TabsTrigger>
            </TabsList>

            {/* Platform Admin Console Tab */}
            {data.isPlatformAdmin && (
              <TabsContent value="platform" className="focus-visible:outline-none">
                <SuperAdminConsole />
              </TabsContent>
            )}

            {/* Campus Admin Console Tab */}
            {(hasInstAdmin || data.isPlatformAdmin) && (
              <TabsContent value="campus" className="focus-visible:outline-none">
                <InstitutionAdminConsole memberships={data.memberships} />
              </TabsContent>
            )}

            {/* Teacher Workspace Tab */}
            {(hasTeacher || data.isPlatformAdmin) && (
              <TabsContent value="teaching" className="focus-visible:outline-none">
                <TeacherWorkspace
                  displayName={data.profile.display_name}
                  institutionId={data.memberships[0]?.institution_id}
                />
              </TabsContent>
            )}

            {/* Student Learning Hub Tab */}
            <TabsContent value="learning" className="focus-visible:outline-none">
              <StudentHub displayName={data.profile.display_name} />
            </TabsContent>

            {/* User Profile Tab */}
            <TabsContent value="profile" className="focus-visible:outline-none">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border border-border/80 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <UserRound className="h-5 w-5 text-primary" />
                      Account Profile
                    </CardTitle>
                    <CardDescription>
                      Update your public profile display name and credentials.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        profileMutation.mutate();
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label
                          className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5"
                          htmlFor="display-name"
                        >
                          Display Name
                        </label>
                        <input
                          id="display-name"
                          required
                          maxLength={100}
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            profileMutation.reset();
                          }}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={profileMutation.isPending}
                        className="bg-primary text-primary-foreground"
                      >
                        <Save className="h-4 w-4 mr-1.5" />
                        {profileMutation.isPending ? "Saving…" : "Save Profile"}
                      </Button>

                      {profileMutation.isSuccess && (
                        <p role="status" className="text-sm text-emerald-600 font-medium">
                          Profile changes saved successfully.
                        </p>
                      )}
                      {profileMutation.error && (
                        <p role="alert" className="text-sm text-destructive font-medium">
                          {profileMutation.error.message}
                        </p>
                      )}
                    </form>
                  </CardContent>
                </Card>

                <Card className="border border-border/80 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Assigned Institution & Roles
                    </CardTitle>
                    <CardDescription>
                      Academic affiliations governed by Row Level Security.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                        Global System Roles
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {data.roles.map((r) => (
                          <Badge key={r} variant="secondary" className="capitalize text-xs">
                            {r.replace("_", " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-border pt-4">
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                        Institutional Affiliations
                      </h4>
                      {data.memberships.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Not assigned to an institution yet. An institution administrator or
                          platform administrator will assign your campus affiliation.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {data.memberships.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between rounded-md border border-border p-3"
                            >
                              <div>
                                <p className="font-semibold text-sm">
                                  {m.institution?.name || "Assigned Institution"}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {m.institution?.code}
                                </p>
                              </div>
                              <Badge variant="outline" className="capitalize text-xs font-medium">
                                {m.role.replace("_", " ")}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Bootstrap Super Admin Dialog */}
      <Dialog open={bootstrapModalOpen} onOpenChange={setBootstrapModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Initial Platform Bootstrap
            </DialogTitle>
            <DialogDescription>
              CATECH Learn enforces a secure bootstrap mechanism. The first verified operator can
              provision the initial Super Admin role using atomic advisory locking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm text-muted-foreground">
            <p>Your verified account UUID is:</p>
            <code className="block rounded bg-muted p-2 font-mono text-xs text-foreground select-all">
              {data.profile.id}
            </code>
            <p className="text-xs">
              To bootstrap via server function, ensure{" "}
              <strong className="text-foreground">SUPABASE_SERVICE_ROLE_KEY</strong> is set in your
              server environment.
            </p>

            {bootstrapMessage && (
              <div
                role="status"
                className="rounded-md bg-emerald-500/10 p-3 text-xs text-emerald-600 font-medium"
              >
                {bootstrapMessage}
              </div>
            )}
            {bootstrapError && (
              <div
                role="alert"
                className="rounded-md bg-destructive/10 p-3 text-xs text-destructive font-medium"
              >
                {bootstrapError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBootstrapModalOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => bootstrapMutation.mutate()}
              disabled={bootstrapMutation.isPending}
              className="bg-primary text-primary-foreground"
            >
              {bootstrapMutation.isPending ? "Provisioning…" : "Execute Bootstrap"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
}
