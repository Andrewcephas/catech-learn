import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Plus,
  Search,
  Shield,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Users,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  listInstitutions,
  saveInstitutionFn,
  listAuditLogs,
  type InstitutionItem,
} from "@/lib/institution.functions";

export function SuperAdminConsole() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInst, setEditingInst] = useState<InstitutionItem | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"active" | "suspended">("active");
  const [formError, setFormError] = useState("");

  const {
    data: institutions = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["institutions"],
    queryFn: () => listInstitutions(),
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["audit-logs", "platform"],
    queryFn: () => listAuditLogs({ data: { limit: 15 } }),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      saveInstitutionFn({
        data: {
          id: editingInst?.id,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          contact_email: email.trim(),
          status,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["institutions"] });
      void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      closeModal();
    },
    onError: (err: Error) => {
      setFormError(err.message || "Failed to save institution");
    },
  });

  const openCreateModal = () => {
    setEditingInst(null);
    setName("");
    setCode("");
    setEmail("");
    setStatus("active");
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (inst: InstitutionItem) => {
    setEditingInst(inst);
    setName(inst.name);
    setCode(inst.code);
    setEmail(inst.contact_email);
    setStatus(inst.status);
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingInst(null);
    setFormError("");
  };

  const filtered = institutions.filter((inst) => {
    const matchSearch =
      inst.name.toLowerCase().includes(search.toLowerCase()) ||
      inst.code.toLowerCase().includes(search.toLowerCase()) ||
      inst.contact_email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || inst.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCount = institutions.filter((i) => i.status === "active").length;
  const suspendedCount = institutions.filter((i) => i.status === "suspended").length;

  return (
    <div className="space-y-8">
      {/* Platform Header & Stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 p-1.5 text-primary">
              <Shield className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight">CATECH Platform Management</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Multi-tenant control center: oversee institutions, tenant lifecycle, and platform
            security.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isLoading}>
            <RotateCw className={`h-4 w-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={openCreateModal}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Institution
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Institutions
            </CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{institutions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Independent tenant instances</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Campuses
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Operational with full access</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Suspended</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{suspendedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Access restricted by policy</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tenant Isolation
            </CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">PostgreSQL RLS</div>
            <p className="text-xs text-muted-foreground mt-1">Row-level server-enforced</p>
          </CardContent>
        </Card>
      </div>

      {/* Institutions Directory Table */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Registered Institutions</CardTitle>
              <CardDescription>
                Configure institutions, academic codes, and manage tenancy status.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search name, code, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex rounded-md border border-input p-0.5 text-xs">
                {(["all", "active", "suspended"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`rounded px-2.5 py-1 capitalize transition-colors ${
                      statusFilter === s
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s}
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
                  <TableHead className="font-semibold">Institution Name</TableHead>
                  <TableHead className="font-semibold">Tenant Code</TableHead>
                  <TableHead className="font-semibold">Contact Email</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Created</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading institutions…
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-destructive">
                      Unable to retrieve institutions.
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <Building2 className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p className="font-medium text-foreground">No institutions found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {search
                          ? "Try adjusting your search criteria."
                          : "Create your first institution to begin."}
                      </p>
                      {!search && (
                        <Button size="sm" onClick={openCreateModal} className="mt-4">
                          <Plus className="h-4 w-4 mr-1.5" /> Create Institution
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((inst) => (
                    <TableRow key={inst.id} className="hover:bg-muted/20">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                            {inst.code.slice(0, 2)}
                          </div>
                          <span>{inst.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono font-semibold">
                          {inst.code}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {inst.contact_email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={inst.status === "active" ? "default" : "destructive"}
                          className={
                            inst.status === "active" ? "bg-emerald-600 hover:bg-emerald-600" : ""
                          }
                        >
                          {inst.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(inst.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(inst)}
                          className="h-8 px-2.5 text-xs font-medium"
                        >
                          Configure
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Platform Security & Audit Trail */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Platform Audit Log
              </CardTitle>
              <CardDescription>
                Audited security events, tenant changes, and administrative actions.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              Tamper-evident
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">Timestamp</TableHead>
                  <TableHead className="font-semibold">Event Action</TableHead>
                  <TableHead className="font-semibold">Target Entity</TableHead>
                  <TableHead className="font-semibold">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-6 text-muted-foreground text-sm"
                    >
                      No audit records logged yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((log) => (
                    <TableRow key={log.id} className="text-xs">
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold font-mono text-primary uppercase">
                          {log.action.replaceAll("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {log.target_id.slice(0, 8)}…
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {JSON.stringify(log.details)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit Institution Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingInst ? "Configure Institution" : "Create New Institution"}
            </DialogTitle>
            <DialogDescription>
              {editingInst
                ? "Update tenant details, contact credentials, and operational status."
                : "Provision a new independent tenant instance on CATECH Learn."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4 py-2"
          >
            {formError && (
              <div
                role="alert"
                className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium"
              >
                {formError}
              </div>
            )}

            <div>
              <label
                className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5"
                htmlFor="inst-name"
              >
                Institution Name *
              </label>
              <input
                id="inst-name"
                required
                maxLength={160}
                placeholder="e.g. Strathmore University / Nairobi High School"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5"
                  htmlFor="inst-code"
                >
                  Unique Code *
                </label>
                <input
                  id="inst-code"
                  required
                  maxLength={30}
                  placeholder="e.g. STRATH-01"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5"
                  htmlFor="inst-status"
                >
                  Status
                </label>
                <select
                  id="inst-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "active" | "suspended")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="active">Active (Operational)</option>
                  <option value="suspended">Suspended (Locked)</option>
                </select>
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5"
                htmlFor="inst-email"
              >
                Official Contact Email *
              </label>
              <input
                id="inst-email"
                type="email"
                required
                maxLength={254}
                placeholder="admin@institution.ac.ke"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={saveMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-primary text-primary-foreground"
              >
                {saveMutation.isPending
                  ? "Saving…"
                  : editingInst
                    ? "Save Changes"
                    : "Create Tenant"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
