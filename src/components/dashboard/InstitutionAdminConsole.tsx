import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Users,
  UserPlus,
  ShieldCheck,
  GraduationCap,
  Briefcase,
  Search,
  RotateCw,
  Mail,
  CheckCircle2,
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
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getInstitutionMembers,
  assignInstitutionMemberFn,
  listAuditLogs,
} from "@/lib/institution.functions";
import { CampusAcademicManager } from "@/components/dashboard/CampusAcademicManager";

interface InstitutionAdminConsoleProps {
  memberships: Array<{
    id: string;
    institution_id: string;
    role: string;
    active: boolean;
    institution: { id: string; name: string; code: string; status: string } | null;
  }>;
}

export function InstitutionAdminConsole({ memberships }: InstitutionAdminConsoleProps) {
  const queryClient = useQueryClient();

  // Filter for institutions where user has institution_admin role
  const managedInstitutions = memberships
    .filter((m) => m.role === "institution_admin" && m.institution)
    .map((m) => m.institution!);

  const [selectedInstId, setSelectedInstId] = useState<string>(
    managedInstitutions[0]?.id || memberships[0]?.institution_id || "",
  );

  const selectedInst =
    managedInstitutions.find((i) => i.id === selectedInstId) ||
    memberships.find((m) => m.institution_id === selectedInstId)?.institution;

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "teacher" | "student" | "institution_admin">(
    "all",
  );
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Assign member form state
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState<"teacher" | "student" | "institution_admin">(
    "student",
  );
  const [assignError, setAssignError] = useState("");

  const {
    data: members = [],
    isLoading: loadingMembers,
    refetch: refetchMembers,
  } = useQuery({
    queryKey: ["institution-members", selectedInstId],
    queryFn: () => getInstitutionMembers({ data: { institution_id: selectedInstId } }),
    enabled: !!selectedInstId,
  });

  const { data: instAuditLogs = [] } = useQuery({
    queryKey: ["audit-logs", selectedInstId],
    queryFn: () => listAuditLogs({ data: { institution_id: selectedInstId, limit: 10 } }),
    enabled: !!selectedInstId,
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      assignInstitutionMemberFn({
        data: {
          institution_id: selectedInstId,
          user_id: memberUserId.trim(),
          role: memberRole,
          active: true,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["institution-members", selectedInstId] });
      void queryClient.invalidateQueries({ queryKey: ["audit-logs", selectedInstId] });
      setAssignModalOpen(false);
      setMemberUserId("");
      setAssignError("");
    },
    onError: (err: Error) => {
      setAssignError(err.message || "Failed to assign member");
    },
  });

  if (!selectedInst) {
    return (
      <Card className="border border-border/80 p-8 text-center">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
        <h3 className="text-lg font-bold">No Managed Institutions</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          You are not currently designated as an administrator for any institution.
        </p>
      </Card>
    );
  }

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.display_name.toLowerCase().includes(search.toLowerCase()) ||
      m.user_id.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const teacherCount = members.filter((m) => m.role === "teacher").length;
  const studentCount = members.filter((m) => m.role === "student").length;
  const adminCount = members.filter((m) => m.role === "institution_admin").length;

  return (
    <div className="space-y-8">
      {/* Institution Switcher & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 p-1.5 text-primary">
              <Building2 className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight">{selectedInst.name}</h2>
            <Badge variant="outline" className="font-mono text-xs">
              {selectedInst.code}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Campus Administration Portal — Manage educators, learners, and academic cohorts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {managedInstitutions.length > 1 && (
            <select
              value={selectedInstId}
              onChange={(e) => setSelectedInstId(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {managedInstitutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.code})
                </option>
              ))}
            </select>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetchMembers()}
            disabled={loadingMembers}
          >
            <RotateCw className={`h-4 w-4 mr-1.5 ${loadingMembers ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            onClick={() => setAssignModalOpen(true)}
            className="bg-primary text-primary-foreground"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            Assign Member
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Enrolled
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active campus accounts</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{studentCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Enrolled learners</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Teaching Faculty
            </CardTitle>
            <Briefcase className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{teacherCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Instructors and lecturers</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Administrators
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Campus managers</p>
          </CardContent>
        </Card>
      </div>

      {/* Campus Members Directory */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Campus Member Directory</CardTitle>
              <CardDescription>
                Roster of authenticated learners, instructors, and campus administrators.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter by name or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex rounded-md border border-input p-0.5 text-xs">
                {(["all", "student", "teacher", "institution_admin"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`rounded px-2.5 py-1 capitalize transition-colors ${
                      roleFilter === r
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">Display Name</TableHead>
                  <TableHead className="font-semibold">User Reference</TableHead>
                  <TableHead className="font-semibold">Institution Role</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingMembers ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Loading campus members…
                    </TableCell>
                  </TableRow>
                ) : filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10">
                      <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p className="font-medium text-foreground">No members assigned yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Assign teachers or students to {selectedInst.name} to build your campus
                        directory.
                      </p>
                      <Button size="sm" onClick={() => setAssignModalOpen(true)} className="mt-4">
                        <UserPlus className="h-4 w-4 mr-1.5" /> Assign First Member
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow key={member.id} className="hover:bg-muted/20">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                            {member.display_name ? member.display_name.charAt(0) : "U"}
                          </div>
                          <span>{member.display_name || "Unnamed Account"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs font-mono text-muted-foreground">
                          {member.user_id}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`capitalize ${
                            member.role === "institution_admin"
                              ? "bg-primary/10 text-primary"
                              : member.role === "teacher"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          {member.role.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.active ? "default" : "outline"} className="text-xs">
                          {member.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Academic Operations & Cohorts */}
      <CampusAcademicManager institutionId={selectedInstId} />

      {/* Assign Member Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Member to Campus</DialogTitle>
            <DialogDescription>
              Assign an authenticated user to{" "}
              <strong className="text-foreground">{selectedInst.name}</strong> with a designated
              role.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              assignMutation.mutate();
            }}
            className="space-y-4 py-2"
          >
            {assignError && (
              <div
                role="alert"
                className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium"
              >
                {assignError}
              </div>
            )}

            <div>
              <label
                className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5"
                htmlFor="member-user-id"
              >
                User Account UUID *
              </label>
              <input
                id="member-user-id"
                required
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                value={memberUserId}
                onChange={(e) => setMemberUserId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Enter the user's platform account identifier to link them to this institution.
              </p>
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5"
                htmlFor="member-role"
              >
                Assigned Role *
              </label>
              <select
                id="member-role"
                value={memberRole}
                onChange={(e) =>
                  setMemberRole(e.target.value as "teacher" | "student" | "institution_admin")
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="student">Student (Learner)</option>
                <option value="teacher">Teacher (Course Instructor)</option>
                <option value="institution_admin">Institution Administrator</option>
              </select>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setAssignModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={assignMutation.isPending}
                className="bg-primary text-primary-foreground"
              >
                {assignMutation.isPending ? "Assigning…" : "Confirm Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
