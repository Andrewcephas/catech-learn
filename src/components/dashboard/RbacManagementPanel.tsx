import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Users,
  Key,
  Trash2,
  Plus,
  Activity,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  listRoles,
  listPermissions,
  getUserRoles,
  assignRoleFn,
  revokeRoleFn,
  overridePermissionFn,
  listRbacAuditLogs,
  type RbacRole,
  type RbacAuditEntry,
} from "@/lib/rbac.functions";

// ─── Prop Types ───────────────────────────────────────────────────────────────

interface RbacManagementPanelProps {
  /** Restrict to institution scope. Undefined = platform-level (super admin only). */
  institutionId?: string | undefined;
  /** ID of the user being managed. If undefined, shows the roles/permissions overview. */
  targetUserId?: string;
  /** Display name of the user being managed (for labels). */
  targetUserName?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_ICON_MAP: Record<string, React.ReactNode> = {
  super_admin: <Shield className="h-4 w-4 text-red-400" />,
  institution_owner: <ShieldCheck className="h-4 w-4 text-orange-400" />,
  institution_admin: <ShieldCheck className="h-4 w-4 text-amber-400" />,
  academic_admin: <ShieldCheck className="h-4 w-4 text-yellow-400" />,
  department_head: <ShieldCheck className="h-4 w-4 text-lime-400" />,
  teacher: <Users className="h-4 w-4 text-emerald-400" />,
  examination_officer: <Key className="h-4 w-4 text-teal-400" />,
  accountant: <Key className="h-4 w-4 text-cyan-400" />,
  student: <Users className="h-4 w-4 text-blue-400" />,
  parent: <Users className="h-4 w-4 text-indigo-400" />,
  librarian: <Users className="h-4 w-4 text-violet-400" />,
  support_agent: <Users className="h-4 w-4 text-purple-400" />,
};

function roleBadgeVariant(code: string): "default" | "secondary" | "destructive" | "outline" {
  if (code === "super_admin") return "destructive";
  if (["institution_owner", "institution_admin"].includes(code)) return "default";
  return "secondary";
}

function auditActionColor(action: string): string {
  if (action.includes("revoked") || action.includes("denied")) return "text-red-500";
  if (action.includes("granted") || action.includes("assigned")) return "text-emerald-500";
  return "text-muted-foreground";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RbacManagementPanel({
  institutionId,
  targetUserId,
  targetUserName,
}: RbacManagementPanelProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("roles");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState("");
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState("");
  const [permGrant, setPermGrant] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [opError, setOpError] = useState("");
  const [opSuccess, setOpSuccess] = useState("");

  // Data
  const { data: allRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["rbac-roles"],
    queryFn: () => listRoles(),
  });

  const { data: allPermissions = [] } = useQuery({
    queryKey: ["rbac-permissions"],
    queryFn: () => listPermissions(),
  });

  const { data: userRoles = [], refetch: refetchUserRoles } = useQuery({
    queryKey: ["user-roles", targetUserId],
    queryFn: () =>
      targetUserId
        ? getUserRoles({ data: { user_id: targetUserId } })
        : Promise.resolve([]),
    enabled: !!targetUserId,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["rbac-audit", institutionId],
    queryFn: () =>
      listRbacAuditLogs({ data: { institution_id: institutionId, limit: 40 } }),
  });

  // Mutations
  const assignMutation = useMutation({
    mutationFn: () =>
      assignRoleFn({
        data: {
          target_user_id: targetUserId!,
          role_code: selectedRoleToAssign,
          institution_id: institutionId,
        },
      }),
    onSuccess: () => {
      setOpSuccess(`Role "${selectedRoleToAssign}" assigned successfully.`);
      setOpError("");
      setAssignDialogOpen(false);
      setSelectedRoleToAssign("");
      void refetchUserRoles();
      void queryClient.invalidateQueries({ queryKey: ["rbac-audit"] });
    },
    onError: (err: Error) => {
      setOpError(err.message);
      setOpSuccess("");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (roleCode: string) =>
      revokeRoleFn({
        data: {
          target_user_id: targetUserId!,
          role_code: roleCode,
          institution_id: institutionId,
        },
      }),
    onSuccess: () => {
      setOpSuccess("Role revoked successfully.");
      setOpError("");
      void refetchUserRoles();
      void queryClient.invalidateQueries({ queryKey: ["rbac-audit"] });
    },
    onError: (err: Error) => {
      setOpError(err.message);
      setOpSuccess("");
    },
  });

  const permOverrideMutation = useMutation({
    mutationFn: () =>
      overridePermissionFn({
        data: {
          target_user_id: targetUserId!,
          permission_code: selectedPermission,
          granted: permGrant,
          institution_id: institutionId,
        },
      }),
    onSuccess: () => {
      setOpSuccess(
        `Permission "${selectedPermission}" ${permGrant ? "granted" : "revoked"} successfully.`,
      );
      setOpError("");
      setPermDialogOpen(false);
      setSelectedPermission("");
      void queryClient.invalidateQueries({ queryKey: ["rbac-audit"] });
    },
    onError: (err: Error) => {
      setOpError(err.message);
      setOpSuccess("");
    },
  });

  // Permission categories
  const permissionsByCategory = allPermissions.reduce<Record<string, typeof allPermissions>>(
    (acc, p) => {
      if (!acc[p.category]) acc[p.category] = [];
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      acc[p.category]!.push(p);
      return acc;
    },
    {},
  );

  // Roles assignable in this context (filter super_admin if institution-scoped)
  const assignableRoles = allRoles.filter(
    (r: RbacRole) =>
      !institutionId || r.code !== "super_admin",
  );

  // User's current role codes
  const userRoleCodes = new Set(userRoles.map((r) => r.role_code));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 ring-1 ring-primary/20">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold">
            RBAC — {targetUserName ?? "Permission Management"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {institutionId
              ? "Institution-scoped role and permission management"
              : "Platform-level role and permission control"}
          </p>
        </div>
      </div>

      {/* Feedback */}
      {opSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {opSuccess}
        </div>
      )}
      {opError && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          {opError}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full bg-muted/60">
          <TabsTrigger value="roles" className="flex-1 gap-1.5 text-xs">
            <Shield className="h-3.5 w-3.5" /> Roles
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex-1 gap-1.5 text-xs">
            <Key className="h-3.5 w-3.5" /> Permissions
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex-1 gap-1.5 text-xs">
            <Activity className="h-3.5 w-3.5" /> Audit Log
          </TabsTrigger>
        </TabsList>

        {/* ROLES TAB */}
        <TabsContent value="roles" className="mt-4 space-y-4">
          {targetUserId ? (
            <>
              {/* User's current roles */}
              <Card className="border border-border/70">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold">
                      Assigned Roles
                    </CardTitle>
                    <Dialog
                      open={assignDialogOpen}
                      onOpenChange={setAssignDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" className="h-7 gap-1 text-xs">
                          <Plus className="h-3 w-3" /> Assign Role
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Assign Role</DialogTitle>
                          <DialogDescription>
                            Assign a role to{" "}
                            <strong>{targetUserName ?? "this user"}</strong>.
                            All permission rules and access restrictions for that
                            role will take effect immediately.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-2 my-2 max-h-72 overflow-y-auto">
                          {assignableRoles.map((role: RbacRole) => (
                            <button
                              key={role.id}
                              type="button"
                              onClick={() =>
                                setSelectedRoleToAssign(role.code)
                              }
                              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                                selectedRoleToAssign === role.code
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/40 hover:bg-muted/50"
                              }`}
                            >
                              {ROLE_ICON_MAP[role.code] ?? (
                                <Shield className="h-4 w-4 text-muted-foreground" />
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">
                                  {role.name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {role.description}
                                </p>
                              </div>
                              {userRoleCodes.has(role.code) && (
                                <Badge
                                  variant="secondary"
                                  className="ml-auto flex-shrink-0 text-xs"
                                >
                                  Assigned
                                </Badge>
                              )}
                            </button>
                          ))}
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setAssignDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            disabled={
                              !selectedRoleToAssign ||
                              assignMutation.isPending
                            }
                            onClick={() => assignMutation.mutate()}
                          >
                            {assignMutation.isPending
                              ? "Assigning…"
                              : "Assign Role"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {userRoles.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2 text-center">
                      No roles assigned yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {userRoles.map((ur) => (
                        <div
                          key={ur.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/30"
                        >
                          {ROLE_ICON_MAP[ur.role_code] ?? (
                            <Shield className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">{ur.role_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {ur.role_code}
                              {ur.institution_id ? " (institution)" : " (global)"}
                            </p>
                          </div>
                          <Badge variant={roleBadgeVariant(ur.role_code)}>
                            {ur.role_code}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                            disabled={revokeMutation.isPending}
                            onClick={() => revokeMutation.mutate(ur.role_code)}
                            aria-label={`Revoke ${ur.role_name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            /* Overview: list all system roles */
            <Card className="border border-border/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">System Roles</CardTitle>
                <CardDescription className="text-xs">
                  All predefined roles and their access scopes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rolesLoading ? (
                  <p className="text-sm text-muted-foreground animate-pulse">
                    Loading roles…
                  </p>
                ) : (
                  <div className="space-y-2">
                    {allRoles.map((role: RbacRole) => (
                      <div
                        key={role.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/20"
                      >
                        {ROLE_ICON_MAP[role.code] ?? (
                          <Shield className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{role.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {role.description}
                          </p>
                        </div>
                        <Badge
                          variant={role.is_system ? "default" : "secondary"}
                          className="flex-shrink-0 text-xs"
                        >
                          {role.is_system ? "system" : "custom"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* PERMISSIONS TAB */}
        <TabsContent value="permissions" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {Object.keys(permissionsByCategory).length} categories ·{" "}
              {allPermissions.length} permissions
            </p>
            {targetUserId && (
              <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-7 gap-1 text-xs">
                    <Plus className="h-3 w-3" /> Override Permission
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Override User Permission</DialogTitle>
                    <DialogDescription>
                      Grant or deny a specific permission for{" "}
                      <strong>{targetUserName ?? "this user"}</strong>. This
                      overrides any role-based defaults. Use sparingly.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 my-2">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        Action
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPermGrant(true)}
                          className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-semibold transition-all ${
                            permGrant
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "border-border hover:border-emerald-400"
                          }`}
                        >
                          <ShieldCheck className="h-4 w-4" /> Grant
                        </button>
                        <button
                          type="button"
                          onClick={() => setPermGrant(false)}
                          className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-semibold transition-all ${
                            !permGrant
                              ? "border-destructive bg-destructive/10 text-destructive"
                              : "border-border hover:border-destructive/50"
                          }`}
                        >
                          <ShieldX className="h-4 w-4" /> Deny
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        Permission
                      </label>
                      <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                        {allPermissions.map((p) => (
                          <button
                            key={p.code}
                            type="button"
                            onClick={() => setSelectedPermission(p.code)}
                            className={`w-full flex items-start gap-2 p-2 rounded-md border text-left transition-all ${
                              selectedPermission === p.code
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/40 hover:bg-muted/40"
                            }`}
                          >
                            <Key className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold font-mono truncate">
                                {p.code}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {p.name}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setPermDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      disabled={
                        !selectedPermission || permOverrideMutation.isPending
                      }
                      onClick={() => permOverrideMutation.mutate()}
                      className={
                        permGrant
                          ? ""
                          : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      }
                    >
                      {permOverrideMutation.isPending
                        ? "Saving…"
                        : permGrant
                          ? "Grant Permission"
                          : "Deny Permission"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Permission categories accordion */}
          <div className="space-y-2">
            {Object.entries(permissionsByCategory).map(([category, perms]) => (
              <Card key={category} className="border border-border/60 overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
                  onClick={() =>
                    setExpandedCategory(
                      expandedCategory === category ? null : category,
                    )
                  }
                >
                  <div className="flex items-center gap-2">
                    <Key className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-semibold capitalize">{category}</span>
                    <Badge variant="secondary" className="text-xs">
                      {perms.length}
                    </Badge>
                  </div>
                  {expandedCategory === category ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {expandedCategory === category && (
                  <div className="border-t border-border/50 divide-y divide-border/40">
                    {perms.map((perm) => (
                      <div
                        key={perm.code}
                        className="flex items-start gap-3 px-4 py-2.5"
                      >
                        <Key className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono font-semibold text-foreground">
                            {perm.code}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {perm.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* AUDIT LOG TAB */}
        <TabsContent value="audit" className="mt-4">
          <Card className="border border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                RBAC Audit Trail
              </CardTitle>
              <CardDescription className="text-xs">
                All role assignments, revocations, and permission overrides —
                newest first.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No audit events recorded yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {(auditLogs as RbacAuditEntry[]).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/20"
                    >
                      <Activity className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs font-semibold font-mono ${auditActionColor(log.action)}`}
                        >
                          {log.action}
                        </p>
                        {log.role_code && (
                          <p className="text-xs text-muted-foreground">
                            Role: <span className="font-mono">{log.role_code}</span>
                          </p>
                        )}
                        {log.permission_code && (
                          <p className="text-xs text-muted-foreground">
                            Permission:{" "}
                            <span className="font-mono">{log.permission_code}</span>
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Actor:{" "}
                          <span className="font-mono">
                            {log.actor_id?.slice(0, 8) ?? "system"}…
                          </span>{" "}
                          ·{" "}
                          {new Date(log.created_at).toLocaleString("en-KE", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
