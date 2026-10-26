import { useState, useEffect } from "react";
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
  Smartphone,
  BookOpen,
  KeyRound,
  Layers,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  UserCheck,
  CreditCard,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  Sliders,
  Globe,
  Settings2,
  Phone,
  MapPin,
} from "lucide-react";
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
  bootstrapSuperAdminFn,
  type InstitutionItem,
} from "@/lib/institution.functions";
import {
  getPlatformGlobalStats,
  listAllPlatformUsers,
  updatePlatformUserRoleFn,
  listAllPlatformCourses,
  toggleCoursePublishFn,
  listAllPlatformPayments,
  getUserPermissionOverridesFn,
  toggleUserPermissionOverrideFn,
  removeUserPermissionOverrideFn,
  assignUserToCompanyFn,
  getPlatformSystemSettingsFn,
  updatePlatformSystemSettingsFn,
  updateCompanyFullCredentialsFn,
  type PlatformUserItem,
  type PlatformCourseItem,
  type UserPermissionOverrideItem,
  type PlatformSystemSettings,
} from "@/lib/superadmin.functions";
import { CompanyProfileEditor } from "@/components/dashboard/CompanyProfileEditor";
import { RbacManagementPanel } from "@/components/dashboard/RbacManagementPanel";
import { seedDefaultCompaniesFn } from "@/lib/company.functions";

export function SuperAdminConsole() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "overview" | "companies" | "users" | "courses" | "payments" | "audit" | "rbac" | "settings"
  >("overview");

  // Filter & Search states
  const [companySearch, setCompanySearch] = useState("");
  const [companyStatusFilter, setCompanyStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [userSearch, setUserSearch] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");

  // Modals
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [editingInst, setEditingInst] = useState<InstitutionItem | null>(null);
  const [instName, setInstName] = useState("");
  const [instCode, setInstCode] = useState("");
  const [instEmail, setInstEmail] = useState("");
  const [instPhone, setInstPhone] = useState("");
  const [instAddress, setInstAddress] = useState("");
  const [instDescription, setInstDescription] = useState("");
  const [instAdminEmail, setInstAdminEmail] = useState("");
  const [instAdminPassword, setInstAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [instStatus, setInstStatus] = useState<"active" | "suspended">("active");
  const [instError, setInstError] = useState("");

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PlatformUserItem | null>(null);
  const [targetRole, setTargetRole] = useState<"super_admin" | "institution_admin" | "teacher" | "student">("student");

  const [companyProfileModalOpen, setCompanyProfileModalOpen] = useState(false);
  const [selectedInstForProfile, setSelectedInstForProfile] = useState<InstitutionItem | null>(null);

  const [selectedCompanyIdToAssign, setSelectedCompanyIdToAssign] = useState<string>("");
  const [assignRole, setAssignRole] = useState<"student" | "teacher" | "institution_admin">("student");
  const [assignSuccessMsg, setAssignSuccessMsg] = useState("");

  const [bootstrapSuccessMsg, setBootstrapSuccessMsg] = useState("");

  // Platform System Settings State & Query
  const { data: sysSettings, refetch: refetchSettings } = useQuery({
    queryKey: ["platform-system-settings"],
    queryFn: () => getPlatformSystemSettingsFn(),
  });

  const [sysPlatformName, setSysPlatformName] = useState("CATECH Learn");
  const [sysTagline, setSysTagline] = useState("Accredited Multi-Tenant Learning Platform");
  const [sysSupportEmail, setSysSupportEmail] = useState("support@catech.co.ke");
  const [sysSupportPhone, setSysSupportPhone] = useState("+254 700 000 444");
  const [sysOrgAddress, setSysOrgAddress] = useState("Nairobi, Kenya");
  const [sysCurrency, setSysCurrency] = useState("KES");
  const [sysPaybill, setSysPaybill] = useState("174379");
  const [sysAllowStudentReg, setSysAllowStudentReg] = useState(true);
  const [sysAllowCompanyReg, setSysAllowCompanyReg] = useState(true);
  const [sysMaintenanceMode, setSysMaintenanceMode] = useState(false);
  const [sysSaveMsg, setSysSaveMsg] = useState("");

  // Sync loaded system settings
  useEffect(() => {
    if (sysSettings) {
      setSysPlatformName(sysSettings.platform_name || "CATECH Learn");
      setSysTagline(sysSettings.tagline || "Accredited Multi-Tenant Learning Platform");
      setSysSupportEmail(sysSettings.support_email || "support@catech.co.ke");
      setSysSupportPhone(sysSettings.support_phone || "+254 700 000 444");
      setSysOrgAddress(sysSettings.organization_address || "Nairobi, Kenya");
      setSysCurrency(sysSettings.default_currency || "KES");
      setSysPaybill(sysSettings.mpesa_paybill || "174379");
      setSysAllowStudentReg(sysSettings.allow_student_registration ?? true);
      setSysAllowCompanyReg(sysSettings.allow_company_registration ?? true);
      setSysMaintenanceMode(sysSettings.maintenance_mode ?? false);
    }
  }, [sysSettings]);

  // 1. Telemetry Query
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: () => getPlatformGlobalStats(),
  });

  // 2. Institutions Query
  const { data: institutions = [], isLoading: loadingInsts, refetch: refetchInsts } = useQuery({
    queryKey: ["institutions"],
    queryFn: () => listInstitutions(),
  });

  // 3. Platform Users Query
  const { data: platformUsers = [], isLoading: loadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ["platform-users"],
    queryFn: () => listAllPlatformUsers(),
  });

  // 4. Platform Courses Query
  const { data: platformCourses = [], isLoading: loadingCourses, refetch: refetchCourses } = useQuery({
    queryKey: ["platform-courses"],
    queryFn: () => listAllPlatformCourses(),
  });

  // 5. Platform Payments Query
  const { data: platformPayments = [], isLoading: loadingPayments, refetch: refetchPayments } = useQuery({
    queryKey: ["platform-payments"],
    queryFn: () => listAllPlatformPayments(),
  });

  // 6. Audit Logs Query
  const { data: auditLogs = [], isLoading: loadingAudit } = useQuery({
    queryKey: ["audit-logs", "platform"],
    queryFn: () => listAuditLogs({ data: { limit: 25 } }),
  });

  // Mutations
  const saveInstMutation = useMutation({
    mutationFn: async () => {
      if (editingInst?.id) {
        return updateCompanyFullCredentialsFn({
          data: {
            institution_id: editingInst.id,
            name: instName.trim(),
            code: instCode.trim().toUpperCase(),
            contact_email: instEmail.trim(),
            phone_number: instPhone.trim() || undefined,
            address: instAddress.trim() || undefined,
            description: instDescription.trim() || undefined,
            status: instStatus,
            admin_email: instAdminEmail.trim() || undefined,
            admin_password: instAdminPassword.trim() || undefined,
          },
        });
      } else {
        return saveInstitutionFn({
          data: {
            name: instName.trim(),
            code: instCode.trim().toUpperCase(),
            contact_email: instEmail.trim(),
            status: instStatus,
          },
        });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["institutions"] });
      void queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["public-companies"] });
      setCompanyModalOpen(false);
      setEditingInst(null);
      setInstAdminPassword("");
      setInstError("");
    },
    onError: (err: Error) => setInstError(err.message || "Failed to save company"),
  });

  const updateSysSettingsMutation = useMutation({
    mutationFn: () =>
      updatePlatformSystemSettingsFn({
        data: {
          platform_name: sysPlatformName.trim(),
          tagline: sysTagline.trim(),
          support_email: sysSupportEmail.trim(),
          support_phone: sysSupportPhone.trim(),
          organization_address: sysOrgAddress.trim(),
          default_currency: sysCurrency.trim(),
          mpesa_paybill: sysPaybill.trim(),
          allow_student_registration: sysAllowStudentReg,
          allow_company_registration: sysAllowCompanyReg,
          maintenance_mode: sysMaintenanceMode,
        },
      }),
    onSuccess: (res) => {
      setSysSaveMsg(res.message);
      void queryClient.invalidateQueries({ queryKey: ["platform-system-settings"] });
      setTimeout(() => setSysSaveMsg(""), 3500);
    },
  });

  const seedCompaniesMutation = useMutation({
    mutationFn: () => seedDefaultCompaniesFn(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["institutions"] });
      void queryClient.invalidateQueries({ queryKey: ["public-companies"] });
      void queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: () =>
      updatePlatformUserRoleFn({
        data: {
          user_id: selectedUser!.id,
          role: targetRole,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform-users"] });
      void queryClient.invalidateQueries({ queryKey: ["account"] });
      setRoleModalOpen(false);
    },
  });

  // Query Granular Permission Overrides for Selected User
  const { data: userOverrides = [], refetch: refetchOverrides } = useQuery({
    queryKey: ["user-permission-overrides", selectedUser?.id],
    queryFn: () => getUserPermissionOverridesFn({ data: { user_id: selectedUser!.id } }),
    enabled: Boolean(selectedUser?.id && roleModalOpen),
  });
  const overrideMap = new Map(userOverrides.map((o) => [o.permission_code, o.granted]));

  const togglePermMutation = useMutation({
    mutationFn: (payload: { permission_code: string; granted: boolean }) =>
      toggleUserPermissionOverrideFn({
        data: {
          user_id: selectedUser!.id,
          permission_code: payload.permission_code,
          granted: payload.granted,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-permission-overrides", selectedUser?.id] });
      void queryClient.invalidateQueries({ queryKey: ["platform-users"] });
      void queryClient.invalidateQueries({ queryKey: ["account"] });
    },
  });

  const removePermMutation = useMutation({
    mutationFn: (permission_code: string) =>
      removeUserPermissionOverrideFn({
        data: {
          user_id: selectedUser!.id,
          permission_code,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-permission-overrides", selectedUser?.id] });
      void queryClient.invalidateQueries({ queryKey: ["platform-users"] });
      void queryClient.invalidateQueries({ queryKey: ["account"] });
    },
  });

  const assignCompanyMutation = useMutation({
    mutationFn: () =>
      assignUserToCompanyFn({
        data: {
          user_id: selectedUser!.id,
          institution_id: selectedCompanyIdToAssign,
          role: assignRole,
        },
      }),
    onSuccess: () => {
      setAssignSuccessMsg("User company affiliation successfully updated.");
      void queryClient.invalidateQueries({ queryKey: ["platform-users"] });
      setTimeout(() => setAssignSuccessMsg(""), 3500);
    },
  });

  const toggleCourseMutation = useMutation({
    mutationFn: (payload: { courseId: string; isPublished: boolean }) =>
      toggleCoursePublishFn({
        data: {
          course_id: payload.courseId,
          is_published: payload.isPublished,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform-courses"] });
      void queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
    },
  });

  const bootstrapMutation = useMutation({
    mutationFn: () => bootstrapSuperAdminFn(),
    onSuccess: (res) => {
      setBootstrapSuccessMsg(res.message);
      void queryClient.invalidateQueries({ queryKey: ["account"] });
      void queryClient.invalidateQueries({ queryKey: ["platform-users"] });
    },
  });

  // Refresh All Data
  const refreshAll = () => {
    void refetchStats();
    void refetchInsts();
    void refetchUsers();
    void refetchCourses();
    void refetchPayments();
  };

  const filteredCompanies = institutions.filter((inst) => {
    const match =
      inst.name.toLowerCase().includes(companySearch.toLowerCase()) ||
      inst.code.toLowerCase().includes(companySearch.toLowerCase()) ||
      inst.contact_email.toLowerCase().includes(companySearch.toLowerCase());
    const matchStatus = companyStatusFilter === "all" || inst.status === companyStatusFilter;
    return match && matchStatus;
  });

  const filteredUsers = platformUsers.filter(
    (u) =>
      u.displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.phoneNumber && u.phoneNumber.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.institutionName && u.institutionName.toLowerCase().includes(userSearch.toLowerCase())),
  );

  const filteredCourses = platformCourses.filter(
    (c) =>
      c.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
      c.code.toLowerCase().includes(courseSearch.toLowerCase()) ||
      c.institutionName.toLowerCase().includes(courseSearch.toLowerCase()) ||
      c.instructorName.toLowerCase().includes(courseSearch.toLowerCase()),
  );

  const filteredPayments = platformPayments.filter(
    (p) =>
      p.phoneNumber.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      p.courseTitle.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      p.institutionName.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      (p.receiptNumber && p.receiptNumber.toLowerCase().includes(paymentSearch.toLowerCase())),
  );

  return (
    <div className="space-y-8">
      {/* Platform Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
              <Shield className="h-6 w-6" />
            </span>
            <h2 className="text-2xl font-black tracking-tight text-foreground">
              Super Admin System Governance
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Complete platform oversight: govern multi-tenant companies, global users & role delegations, course catalogs, and M-Pesa collections.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={refreshAll} className="text-xs h-9">
            <RotateCw className="h-3.5 w-3.5 mr-1 text-primary" />
            Sync Platform
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingInst(null);
              setInstName("");
              setInstCode("");
              setInstEmail("");
              setInstStatus("active");
              setInstError("");
              setCompanyModalOpen(true);
            }}
            className="bg-primary text-primary-foreground font-semibold text-xs h-9 shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Register Company
          </Button>
        </div>
      </div>

      {/* Global Telemetry KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/80 rounded-2xl shadow-xs bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Registered Companies
            </CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {stats?.totalCompanies ?? institutions.length}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
              <span className="text-emerald-600 font-semibold">{stats?.activeCompanies ?? institutions.filter(i=>i.status==='active').length} Active</span>
              <span>•</span>
              <span className="text-amber-500 font-semibold">{stats?.suspendedCompanies ?? institutions.filter(i=>i.status==='suspended').length} Suspended</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-2xl shadow-xs bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Platform Scholars & Users
            </CardTitle>
            <Users className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">
              {stats?.totalLearners ?? platformUsers.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Active accounts across all tenants
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-2xl shadow-xs bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Curricula & Sessions
            </CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {stats?.totalCourses ?? platformCourses.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {stats?.publishedCourses ?? platformCourses.filter(c=>c.isPublished).length} Published to catalog
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-2xl shadow-xs bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Global M-Pesa Revenue
            </CardTitle>
            <Smartphone className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">
              KES {(stats?.totalRevenueKes ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {stats?.completedPaymentsCount ?? 0} verified transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Governance Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="bg-muted/70 p-1 rounded-2xl flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs font-semibold gap-1.5 py-2 px-3">
            <Shield className="h-3.5 w-3.5" /> Platform Health & Security
          </TabsTrigger>
          <TabsTrigger value="companies" className="text-xs font-semibold gap-1.5 py-2 px-3">
            <Building2 className="h-3.5 w-3.5" /> Companies ({institutions.length})
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs font-semibold gap-1.5 py-2 px-3">
            <Users className="h-3.5 w-3.5" /> Global Users ({platformUsers.length})
          </TabsTrigger>
          <TabsTrigger value="courses" className="text-xs font-semibold gap-1.5 py-2 px-3">
            <BookOpen className="h-3.5 w-3.5" /> All Sessions ({platformCourses.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="text-xs font-semibold gap-1.5 py-2 px-3">
            <CreditCard className="h-3.5 w-3.5" /> Global M-Pesa Ledger
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs font-semibold gap-1.5 py-2 px-3">
            <FileText className="h-3.5 w-3.5" /> Audit Logs
          </TabsTrigger>
          <TabsTrigger value="rbac" className="text-xs font-semibold gap-1.5 py-2 px-3">
            <Layers className="h-3.5 w-3.5" /> RBAC Permissions
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs font-semibold gap-1.5 py-2 px-3">
            <Sliders className="h-3.5 w-3.5" /> System Settings & Names
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Platform Health & Security */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border border-border/80 rounded-2xl p-6 bg-card">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-emerald-600" /> PostgreSQL Multi-Tenant Isolation
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Row-Level Security (RLS) is strictly enforced on all tenant instances. Each company's courses, student records, and financial receipts are cryptographically isolated.
              </p>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60">
                  <span className="font-semibold text-foreground">PostgreSQL Security Engine</span>
                  <Badge className="bg-emerald-600 text-white font-bold text-[10px]">Active & Enforced</Badge>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60">
                  <span className="font-semibold text-foreground">Safaricom Daraja STK Integration</span>
                  <Badge className="bg-emerald-600 text-white font-bold text-[10px]">Connected (Sandbox/Live)</Badge>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60">
                  <span className="font-semibold text-foreground">Audit Log Immutability</span>
                  <Badge variant="outline" className="font-mono text-[10px]">Tamper-Evident</Badge>
                </div>
              </div>
            </Card>

            <Card className="border border-border/80 rounded-2xl p-6 bg-card">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2 mb-2">
                <KeyRound className="h-4 w-4 text-amber-500" /> Platform Operator Bootstrap
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Promote current account to Super Admin privileges. This verifies advisory locks and configures global administrator roles.
              </p>

              {bootstrapSuccessMsg ? (
                <p className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl text-xs font-semibold mb-3">
                  {bootstrapSuccessMsg}
                </p>
              ) : (
                <Button
                  size="sm"
                  onClick={() => bootstrapMutation.mutate()}
                  disabled={bootstrapMutation.isPending}
                  className="bg-primary text-primary-foreground font-semibold text-xs"
                >
                  <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                  {bootstrapMutation.isPending ? "Executing Bootstrap…" : "Run Super Admin Bootstrap"}
                </Button>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: Companies & Tenants */}
        <TabsContent value="companies" className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search companies by name, code or email..."
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex rounded-xl border border-input p-1 bg-muted/60 text-xs">
              {(["all", "active", "suspended"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setCompanyStatusFilter(s)}
                  className={`rounded-lg px-3 py-1 capitalize font-medium transition-all ${
                    companyStatusFilter === s
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={seedCompaniesMutation.isPending}
                onClick={() => seedCompaniesMutation.mutate()}
                className="text-xs h-8 rounded-xl border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground font-semibold"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1 text-primary" />
                {seedCompaniesMutation.isPending ? "Syncing Companies…" : "Sync Altocom, Midian, iTech, Catech"}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditingInst(null);
                  setInstName("");
                  setInstCode("");
                  setInstEmail("");
                  setInstPhone("");
                  setInstAddress("");
                  setInstDescription("");
                  setInstAdminEmail("");
                  setInstAdminPassword("");
                  setShowAdminPassword(false);
                  setInstStatus("active");
                  setInstError("");
                  setCompanyModalOpen(true);
                }}
                className="text-xs h-8 rounded-xl bg-primary text-primary-foreground font-semibold"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                New Company
              </Button>
            </div>
          </div>

          <Card className="border border-border/80 rounded-2xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-bold text-xs">Company Name</TableHead>
                  <TableHead className="font-bold text-xs">Tenant Code</TableHead>
                  <TableHead className="font-bold text-xs">Official Email</TableHead>
                  <TableHead className="font-bold text-xs">Tenancy Status</TableHead>
                  <TableHead className="font-bold text-xs">Created At</TableHead>
                  <TableHead className="font-bold text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                      No companies found matching criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompanies.map((inst) => (
                    <TableRow key={inst.id} className="hover:bg-muted/30">
                      <TableCell className="font-bold text-xs text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            {inst.code.slice(0, 2)}
                          </div>
                          <span>{inst.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{inst.code}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{inst.contact_email}</TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] font-bold ${
                            inst.status === "active" ? "bg-emerald-600 text-white" : "bg-destructive text-white"
                          }`}
                        >
                          {inst.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(inst.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedInstForProfile(inst);
                              setCompanyProfileModalOpen(true);
                            }}
                            className="text-xs h-7.5 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground font-semibold"
                          >
                            <Building2 className="h-3.5 w-3.5 mr-1" />
                            Company Profile
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingInst(inst);
                              setInstName(inst.name);
                              setInstCode(inst.code);
                              setInstEmail(inst.contact_email);
                              setInstPhone((inst as unknown as Record<string, string>).phone_number || "");
                              setInstAddress((inst as unknown as Record<string, string>).address || "");
                              setInstDescription((inst as unknown as Record<string, string>).description || "");
                              setInstAdminEmail(inst.contact_email);
                              setInstAdminPassword("");
                              setShowAdminPassword(false);
                              setInstStatus(inst.status);
                              setInstError("");
                              setCompanyModalOpen(true);
                            }}
                            className="text-xs h-7.5"
                          >
                            Configure
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB 3: Global Users & Role Management */}
        <TabsContent value="users" className="mt-6 space-y-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users by name, role or phone..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <Card className="border border-border/80 rounded-2xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-bold text-xs">User Identity</TableHead>
                  <TableHead className="font-bold text-xs">Current Role</TableHead>
                  <TableHead className="font-bold text-xs">Company Membership</TableHead>
                  <TableHead className="font-bold text-xs">Phone (M-Pesa)</TableHead>
                  <TableHead className="font-bold text-xs">Joined</TableHead>
                  <TableHead className="font-bold text-xs text-right">Role Governance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                      No users match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                            {user.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-foreground">{user.displayName}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">ID: {user.id.slice(0, 8)}…</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.isSuperAdmin ? "default" : "secondary"}
                          className={`text-[10px] font-bold uppercase ${
                            user.isSuperAdmin ? "bg-primary text-primary-foreground" : ""
                          }`}
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {user.institutionName || <span className="text-muted-foreground italic">None (Independent)</span>}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{user.phoneNumber || "N/A"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setTargetRole(
                              (user.role as typeof targetRole) || "student",
                            );
                            setRoleModalOpen(true);
                          }}
                          className="text-xs h-7.5"
                        >
                          <UserCheck className="h-3.5 w-3.5 mr-1 text-primary" />
                          Change Role
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB 4: Global Sessions & Courses */}
        <TabsContent value="courses" className="mt-6 space-y-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search sessions by title, company or code..."
              value={courseSearch}
              onChange={(e) => setCourseSearch(e.target.value)}
              className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <Card className="border border-border/80 rounded-2xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-bold text-xs">Course Title & Code</TableHead>
                  <TableHead className="font-bold text-xs">Offering Company</TableHead>
                  <TableHead className="font-bold text-xs">Instructor</TableHead>
                  <TableHead className="font-bold text-xs">Price (KES)</TableHead>
                  <TableHead className="font-bold text-xs">Enrolled</TableHead>
                  <TableHead className="font-bold text-xs">Catalog Status</TableHead>
                  <TableHead className="font-bold text-xs text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                      No courses found matching criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCourses.map((course) => (
                    <TableRow key={course.id} className="hover:bg-muted/30">
                      <TableCell>
                        <p className="font-bold text-xs text-foreground">{course.title}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">{course.code}</p>
                      </TableCell>
                      <TableCell className="text-xs font-semibold">{course.institutionName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{course.instructorName}</TableCell>
                      <TableCell className="text-xs font-bold text-emerald-600">
                        {course.price > 0 ? `KES ${course.price.toLocaleString()}` : "Free"}
                      </TableCell>
                      <TableCell className="text-xs font-semibold">{course.enrolledCount} learners</TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] font-bold ${
                            course.isPublished ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {course.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            toggleCourseMutation.mutate({
                              courseId: course.id,
                              isPublished: !course.isPublished,
                            })
                          }
                          className="text-xs h-7.5"
                        >
                          {course.isPublished ? "Unpublish" : "Publish"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB 5: Global M-Pesa Ledger */}
        <TabsContent value="payments" className="mt-6 space-y-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search payments by phone, course or receipt..."
              value={paymentSearch}
              onChange={(e) => setPaymentSearch(e.target.value)}
              className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <Card className="border border-border/80 rounded-2xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-bold text-xs">Phone Number</TableHead>
                  <TableHead className="font-bold text-xs">Course Session</TableHead>
                  <TableHead className="font-bold text-xs">Beneficiary Company</TableHead>
                  <TableHead className="font-bold text-xs">Amount</TableHead>
                  <TableHead className="font-bold text-xs">Status</TableHead>
                  <TableHead className="font-bold text-xs">Daraja Receipt</TableHead>
                  <TableHead className="font-bold text-xs text-right">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                      No payments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs">{p.phoneNumber}</TableCell>
                      <TableCell className="font-semibold text-xs text-foreground">{p.courseTitle}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.institutionName}</TableCell>
                      <TableCell className="font-bold text-xs text-emerald-600">
                        KES {p.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] font-bold ${
                            p.status === "completed"
                              ? "bg-emerald-600 text-white"
                              : p.status === "pending"
                                ? "bg-amber-500 text-white"
                                : "bg-destructive text-white"
                          }`}
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {p.receiptNumber || "Pending"}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(p.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB 6: Platform Audit Log */}
        <TabsContent value="audit" className="mt-6">
          <Card className="border border-border/80 rounded-2xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-bold text-xs">Timestamp</TableHead>
                  <TableHead className="font-bold text-xs">Action</TableHead>
                  <TableHead className="font-bold text-xs">Target Entity</TableHead>
                  <TableHead className="font-bold text-xs">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground">
                      No audit records logged yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((log) => (
                    <TableRow key={log.id} className="text-xs hover:bg-muted/30">
                      <TableCell className="text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                      <TableCell className="font-mono font-bold text-primary uppercase">{log.action}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">{log.target_id.slice(0, 10)}…</TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground max-w-xs truncate">
                        {JSON.stringify(log.details)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB 7: RBAC Management */}
        <TabsContent value="rbac" className="mt-6">
          <RbacManagementPanel />
        </TabsContent>

        {/* TAB 8: System Settings & Platform Branding */}
        <TabsContent value="settings" className="mt-6 space-y-6">
          <Card className="border border-border/80 rounded-2xl p-6 bg-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/70">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-primary" />
                  Global Platform Settings & Brand Configuration
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Govern platform identity names, support channels, payment routing, and global access locks.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => updateSysSettingsMutation.mutate()}
                  disabled={updateSysSettingsMutation.isPending}
                  className="bg-primary text-primary-foreground font-semibold text-xs h-8 px-4"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  {updateSysSettingsMutation.isPending ? "Saving Settings…" : "Save Platform Settings"}
                </Button>
              </div>
            </div>

            {sysSaveMsg && (
              <div className="my-4 p-3 rounded-xl bg-emerald-600/10 border border-emerald-600/30 text-emerald-600 font-semibold text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {sysSaveMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-xs">
              {/* Branding & Platform Names */}
              <div className="space-y-4">
                <div className="pb-2 border-b border-border/60">
                  <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-primary" /> Platform Identity & Names
                  </h4>
                  <p className="text-[11px] text-muted-foreground">The primary title displayed across dashboards and auth.</p>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-foreground">Platform Name</label>
                  <input
                    type="text"
                    value={sysPlatformName}
                    onChange={(e) => setSysPlatformName(e.target.value)}
                    placeholder="e.g. CATECH Learn"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-[10px] text-muted-foreground">Appears in navigation, header branding, and titles.</span>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-foreground">Platform Tagline / Slogan</label>
                  <input
                    type="text"
                    value={sysTagline}
                    onChange={(e) => setSysTagline(e.target.value)}
                    placeholder="e.g. Accredited Multi-Tenant Learning Platform"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-foreground">Organization Headquarters Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={sysOrgAddress}
                      onChange={(e) => setSysOrgAddress(e.target.value)}
                      placeholder="e.g. Nairobi, Kenya"
                      className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Support & Financial Configuration */}
              <div className="space-y-4">
                <div className="pb-2 border-b border-border/60">
                  <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5 text-emerald-600" /> Support & Payment Routing
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Daraja Lipa na M-Pesa till and official help channels.</p>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-foreground">Official Support Email</label>
                  <input
                    type="email"
                    value={sysSupportEmail}
                    onChange={(e) => setSysSupportEmail(e.target.value)}
                    placeholder="e.g. support@catech.co.ke"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-foreground">Official Support Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={sysSupportPhone}
                      onChange={(e) => setSysSupportPhone(e.target.value)}
                      placeholder="e.g. +254 700 000 444"
                      className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-foreground">Billing Currency</label>
                    <input
                      type="text"
                      value={sysCurrency}
                      onChange={(e) => setSysCurrency(e.target.value.toUpperCase())}
                      placeholder="KES"
                      className="w-full font-mono uppercase rounded-xl border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-foreground">M-Pesa Paybill / Till</label>
                    <input
                      type="text"
                      value={sysPaybill}
                      onChange={(e) => setSysPaybill(e.target.value)}
                      placeholder="174379"
                      className="w-full font-mono rounded-xl border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Registration & System Locks */}
              <div className="md:col-span-2 pt-4 border-t border-border/60">
                <h4 className="font-bold text-foreground text-xs uppercase tracking-wider mb-3">
                  Registration & Access Controls
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border/70 bg-muted/20 cursor-pointer hover:bg-muted/40">
                    <input
                      type="checkbox"
                      checked={sysAllowStudentReg}
                      onChange={(e) => setSysAllowStudentReg(e.target.checked)}
                      className="h-4 w-4 rounded border-input text-primary accent-primary"
                    />
                    <div>
                      <span className="font-semibold text-foreground text-xs block">Allow Student Self-Signups</span>
                      <span className="text-[10px] text-muted-foreground">New students can register directly</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border/70 bg-muted/20 cursor-pointer hover:bg-muted/40">
                    <input
                      type="checkbox"
                      checked={sysAllowCompanyReg}
                      onChange={(e) => setSysAllowCompanyReg(e.target.checked)}
                      className="h-4 w-4 rounded border-input text-primary accent-primary"
                    />
                    <div>
                      <span className="font-semibold text-foreground text-xs block">Allow Company Signups</span>
                      <span className="text-[10px] text-muted-foreground">Prospective partners can apply</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-destructive/30 bg-destructive/5 cursor-pointer hover:bg-destructive/10">
                    <input
                      type="checkbox"
                      checked={sysMaintenanceMode}
                      onChange={(e) => setSysMaintenanceMode(e.target.checked)}
                      className="h-4 w-4 rounded border-destructive text-destructive accent-destructive"
                    />
                    <div>
                      <span className="font-semibold text-destructive text-xs block">Maintenance Mode</span>
                      <span className="text-[10px] text-muted-foreground">Restrict non-super-admin access</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Create/Edit Company & Administrator Credentials */}
      <Dialog open={companyModalOpen} onOpenChange={setCompanyModalOpen}>
        <DialogContent className="max-w-xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {editingInst ? `Configure Company & Credentials: ${editingInst.name}` : "Register New Company"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Govern company information, official contact channels, and administrator login credentials.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveInstMutation.mutate();
            }}
            className="space-y-4 py-2 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Company / Institution Name *</label>
                <input
                  required
                  value={instName}
                  onChange={(e) => setInstName(e.target.value)}
                  placeholder="e.g. Safaricom Academy, Altocom"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Tenant Code (2-30 chars uppercase) *</label>
                <input
                  required
                  value={instCode}
                  onChange={(e) => setInstCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ALTOCOM"
                  className="w-full font-mono uppercase rounded-lg border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Official Contact Email *</label>
                <input
                  type="email"
                  required
                  value={instEmail}
                  onChange={(e) => setInstEmail(e.target.value)}
                  placeholder="contact@company.co.ke"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Official Phone Number</label>
                <input
                  type="text"
                  value={instPhone}
                  onChange={(e) => setInstPhone(e.target.value)}
                  placeholder="+254 700 000 111"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Physical Address / Headquarters</label>
                <input
                  type="text"
                  value={instAddress}
                  onChange={(e) => setInstAddress(e.target.value)}
                  placeholder="e.g. Westlands, Nairobi"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Tenancy Status</label>
                <select
                  value={instStatus}
                  onChange={(e) => setInstStatus(e.target.value as "active" | "suspended")}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                >
                  <option value="active">Active (Full operations & sessions enabled)</option>
                  <option value="suspended">Suspended (Access locked by policy)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Company Description / Overview</label>
              <textarea
                rows={2}
                value={instDescription}
                onChange={(e) => setInstDescription(e.target.value)}
                placeholder="Brief summary of company offerings and training specializations..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {/* Administrator Account & Password Management */}
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border/80 space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">
                  Company Administrator Login Credentials
                </h4>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Super admin can directly update or reset the company administrator's email and password below.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-foreground">Admin Account Email</label>
                  <input
                    type="email"
                    value={instAdminEmail}
                    onChange={(e) => setInstAdminEmail(e.target.value)}
                    placeholder={instEmail || "admin@company.co.ke"}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-foreground">
                    {editingInst ? "Set / Reset Password" : "Initial Password"}
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? "text" : "password"}
                      value={instAdminPassword}
                      onChange={(e) => setInstAdminPassword(e.target.value)}
                      placeholder={editingInst ? "Leave blank to keep current password" : "Min 8 characters"}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-9 text-xs focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showAdminPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {editingInst && (
                    <span className="text-[10px] text-muted-foreground">
                      Only fill this if you want to reset the admin password.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {instError && <p className="text-destructive font-medium text-xs">{instError}</p>}

            <DialogFooter className="pt-2">
              <Button variant="outline" type="button" size="sm" onClick={() => setCompanyModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saveInstMutation.isPending} className="bg-primary text-primary-foreground font-semibold">
                {saveInstMutation.isPending ? "Saving Credentials…" : "Save Company & Credentials"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Governance of User Roles, Company Affiliation & Granular Permissions */}
      <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
        <DialogContent className="max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              User Roles & Permissions Governance
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assign primary platform roles, company affiliation, and grant or deactivate granular permissions for{" "}
              <strong>{selectedUser?.displayName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2 text-xs">
            {/* User Identity Info */}
            {selectedUser && (
              <div className="p-3.5 bg-muted/50 rounded-xl border border-border/70 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-sm">
                    {selectedUser.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">{selectedUser.displayName}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">UUID: {selectedUser.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground font-bold uppercase text-[10px]">
                    Current: {selectedUser.role}
                  </Badge>
                  {selectedUser.institutionName && (
                    <Badge variant="outline" className="text-[10px] font-mono">
                      🏢 {selectedUser.institutionName}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* 1. Primary Platform Role Assignment */}
            <div className="space-y-2">
              <label className="block font-bold text-foreground text-xs uppercase tracking-wider">
                1. Primary Platform Role
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "super_admin", label: "Super Admin", icon: Shield, desc: "Full root governance" },
                  { id: "institution_admin", label: "Company Admin", icon: Building2, desc: "Manage academy" },
                  { id: "teacher", label: "Instructor", icon: BookOpen, desc: "Teach & grade" },
                  { id: "student", label: "Scholar", icon: Users, desc: "Enroll & learn" },
                ].map((r) => (
                  <label
                    key={r.id}
                    className={`flex flex-col p-2.5 rounded-xl border cursor-pointer transition-all ${
                      targetRole === r.id
                        ? "border-primary bg-primary/10 shadow-xs"
                        : "border-border/70 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <r.icon className="h-4 w-4 text-primary" />
                      <input
                        type="radio"
                        name="platformRole"
                        value={r.id}
                        checked={targetRole === r.id}
                        onChange={() => setTargetRole(r.id as typeof targetRole)}
                        className="accent-primary"
                      />
                    </div>
                    <span className="font-bold text-foreground text-xs">{r.label}</span>
                    <span className="text-[10px] text-muted-foreground">{r.desc}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  disabled={updateUserRoleMutation.isPending}
                  onClick={() => updateUserRoleMutation.mutate()}
                  className="bg-primary text-primary-foreground font-semibold text-xs h-7.5"
                >
                  <UserCheck className="h-3.5 w-3.5 mr-1" />
                  {updateUserRoleMutation.isPending ? "Applying Role…" : "Apply Role Change"}
                </Button>
              </div>
            </div>

            {/* 2. Company / Tenant Affiliation Assignment */}
            <div className="space-y-2 pt-3 border-t border-border/70">
              <label className="block font-bold text-foreground text-xs uppercase tracking-wider">
                2. Company / Institution Affiliation
              </label>
              <p className="text-[11px] text-muted-foreground">
                Affiliate this student or administrator to an accredited partner company.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                <div className="sm:col-span-2">
                  <select
                    value={selectedCompanyIdToAssign}
                    onChange={(e) => setSelectedCompanyIdToAssign(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Choose Company / Institution --</option>
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <select
                    value={assignRole}
                    onChange={(e) => setAssignRole(e.target.value as typeof assignRole)}
                    className="w-full rounded-xl border border-input bg-card px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Instructor</option>
                    <option value="institution_admin">Company Admin</option>
                  </select>

                  <Button
                    size="sm"
                    disabled={!selectedCompanyIdToAssign || assignCompanyMutation.isPending}
                    onClick={() => assignCompanyMutation.mutate()}
                    className="bg-primary text-primary-foreground font-semibold text-xs shrink-0"
                  >
                    Assign
                  </Button>
                </div>
              </div>

              {assignSuccessMsg && (
                <p className="text-emerald-600 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {assignSuccessMsg}
                </p>
              )}
            </div>

            {/* 3. Granular Permissions Control & Deactivation Matrix */}
            <div className="space-y-3 pt-3 border-t border-border/70">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block font-bold text-foreground text-xs uppercase tracking-wider">
                    3. Granular Permission Activation & Deactivation
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Super admin can explicitly grant or deactivate (revoke) any permission for this account.
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {userOverrides.length} Explicit Override{userOverrides.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              {/* Permissions Control Table */}
              <div className="space-y-2 max-h-72 overflow-y-auto p-1">
                {[
                  {
                    category: "Courses & Curricula",
                    perms: [
                      { code: "courses.create", name: "Create Courses & Sessions", desc: "Build new curricula" },
                      { code: "courses.update", name: "Edit Course Materials", desc: "Update syllabus and lessons" },
                      { code: "courses.publish", name: "Publish to Public Catalog", desc: "Make sessions available to students" },
                      { code: "courses.delete", name: "Delete Course Sessions", desc: "Permanently delete sessions" },
                    ],
                  },
                  {
                    category: "Assignments & Assessments",
                    perms: [
                      { code: "assignments.create", name: "Create Module Assignments", desc: "Assign practical coursework" },
                      { code: "assessments.grade", name: "Grade Submissions", desc: "Award points and evaluate tasks" },
                      { code: "certificates.issue", name: "Issue Verified Certificates", desc: "Generate tamper-evident credentials" },
                    ],
                  },
                  {
                    category: "Communications & Messaging",
                    perms: [
                      { code: "messages.send", name: "Send 1-on-1 Direct Messages", desc: "Message students individually" },
                      { code: "announcements.create", name: "Post Campus Announcements", desc: "Broadcast to all students" },
                    ],
                  },
                  {
                    category: "Financials & Payments",
                    perms: [
                      { code: "payments.view", name: "View M-Pesa Receipts", desc: "Inspect financial transaction log" },
                      { code: "payments.refund", name: "Issue Transaction Reversals", desc: "Manage refunds and cancellations" },
                    ],
                  },
                  {
                    category: "Tenancy & Security Governance",
                    perms: [
                      { code: "institutions.settings.manage", name: "Manage Company Profile", desc: "Update tenant branding and till" },
                      { code: "users.roles.assign", name: "Assign User Roles", desc: "Promote/demote subordinate accounts" },
                    ],
                  },
                ].map((group) => (
                  <div key={group.category} className="rounded-xl border border-border/70 p-3 bg-muted/20 space-y-2">
                    <p className="text-[11px] font-bold uppercase text-primary tracking-wider">
                      {group.category}
                    </p>
                    <div className="space-y-1.5">
                      {group.perms.map((p) => {
                        const isOverridden = overrideMap.has(p.code);
                        const isGranted = overrideMap.get(p.code);

                        return (
                          <div
                            key={p.code}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border transition-colors gap-2 ${
                              isOverridden && isGranted === false
                                ? "bg-destructive/5 border-destructive/30"
                                : isOverridden && isGranted === true
                                  ? "bg-emerald-600/5 border-emerald-600/30"
                                  : "bg-card border-border/60 hover:bg-muted/40"
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-foreground text-xs">{p.name}</p>
                                {isOverridden && isGranted === false && (
                                  <Badge className="bg-destructive text-destructive-foreground text-[9px] font-bold h-4 px-1.5">
                                    Deactivated ⛔
                                  </Badge>
                                )}
                                {isOverridden && isGranted === true && (
                                  <Badge className="bg-emerald-600 text-white text-[9px] font-bold h-4 px-1.5">
                                    Active ✅
                                  </Badge>
                                )}
                                {!isOverridden && (
                                  <Badge variant="outline" className="text-[9px] text-muted-foreground font-mono h-4 px-1.5">
                                    Role Default
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground font-mono">{p.code}</p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Deactivate Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={togglePermMutation.isPending || (isOverridden && isGranted === false)}
                                onClick={() =>
                                  togglePermMutation.mutate({
                                    permission_code: p.code,
                                    granted: false,
                                  })
                                }
                                className={`text-[10px] h-7 px-2 font-bold ${
                                  isOverridden && isGranted === false
                                    ? "opacity-50 cursor-not-allowed bg-destructive/10 text-destructive border-destructive/40"
                                    : "border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                }`}
                                title="Explicitly revoke / deactivate this permission"
                              >
                                <Lock className="h-3 w-3 mr-1" />
                                Deactivate
                              </Button>

                              {/* Grant / Activate Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={togglePermMutation.isPending || (isOverridden && isGranted === true)}
                                onClick={() =>
                                  togglePermMutation.mutate({
                                    permission_code: p.code,
                                    granted: true,
                                  })
                                }
                                className={`text-[10px] h-7 px-2 font-bold ${
                                  isOverridden && isGranted === true
                                    ? "opacity-50 cursor-not-allowed bg-emerald-600/10 text-emerald-600 border-emerald-600/40"
                                    : "border-emerald-600/40 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                                }`}
                                title="Explicitly grant this permission"
                              >
                                <Unlock className="h-3 w-3 mr-1" />
                                Activate
                              </Button>

                              {/* Reset to Role Default */}
                              {isOverridden && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={removePermMutation.isPending}
                                  onClick={() => removePermMutation.mutate(p.code)}
                                  className="text-[10px] h-7 px-1.5 text-muted-foreground hover:text-foreground"
                                  title="Clear override and inherit from role"
                                >
                                  Reset
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setRoleModalOpen(false)} className="text-xs">
              Close Governance Console
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Full Company Profile Governance (Super Admin) */}
      <Dialog open={companyProfileModalOpen} onOpenChange={setCompanyProfileModalOpen}>
        <DialogContent className="max-w-3xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Company Organizational Profile Governance
            </DialogTitle>
            <DialogDescription className="text-xs">
              Super Admin profile management for <strong>{selectedInstForProfile?.name}</strong>. Edit contact phone, bio, physical address, and branding.
            </DialogDescription>
          </DialogHeader>
          {selectedInstForProfile && (
            <div className="py-2">
              <CompanyProfileEditor
                institutionId={selectedInstForProfile.id}
                isSuperAdmin={true}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
