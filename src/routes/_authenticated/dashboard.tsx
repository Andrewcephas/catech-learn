import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
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
  MessageSquare,
  Users,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Menu,
  FileCheck2,
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
import { getAccount, saveProfile } from "@/lib/account.functions";
import { bootstrapSuperAdminFn } from "@/lib/institution.functions";
import { listPublicCompanies, type CompanySummary } from "@/lib/company.functions";
import { listDirectMessagesFn } from "@/lib/messaging.functions";

// Dashboard Custom Components
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { CompanyDirectory } from "@/components/dashboard/CompanyDirectory";
import { CompanyCourseCatalog } from "@/components/dashboard/CompanyCourseCatalog";
import { CompanyLearnersManager } from "@/components/dashboard/CompanyLearnersManager";
import { DirectMessagingHub } from "@/components/dashboard/DirectMessagingHub";
import { CompanyAssignmentsAndNotes } from "@/components/dashboard/CompanyAssignmentsAndNotes";
import { CourseLearningPlayer } from "@/components/dashboard/CourseLearningPlayer";
import { StudentHub } from "@/components/dashboard/StudentHub";
import { TeacherWorkspace } from "@/components/dashboard/TeacherWorkspace";
import { CampusAcademicManager } from "@/components/dashboard/CampusAcademicManager";
import { SuperAdminConsole } from "@/components/dashboard/SuperAdminConsole";
import { RbacManagementPanel } from "@/components/dashboard/RbacManagementPanel";
import { CompanyProfileEditor } from "@/components/dashboard/CompanyProfileEditor";
import { StudentProfileEditor } from "@/components/dashboard/StudentProfileEditor";
import { IssueReporter } from "@/components/dashboard/IssueReporter";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { listUserPayments } from "@/lib/payment.functions";

const accountOptions = queryOptions({ queryKey: ["account"], queryFn: () => getAccount() });

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CATECH Learn" },
      { name: "description", content: "Your CATECH Learn account, sessions, and company portal." },
      { property: "og:title", content: "CATECH Learn Portal" },
      {
        property: "og:description",
        content: "Multi-tenant learning environment with M-Pesa payments and direct student messaging.",
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
  const [bootstrapModalOpen, setBootstrapModalOpen] = useState(false);
  const [bootstrapMessage, setBootstrapMessage] = useState("");
  const [bootstrapError, setBootstrapError] = useState("");

  const queryClient = useQueryClient();

  // Determine user capabilities
  const rbacPerms = (data as { rbacPermissions?: string[] }).rbacPermissions || [];
  const rbacRoleCodes = ((data as { rbacRoles?: Array<{ role_code: string }> }).rbacRoles || []).map(
    (r) => r.role_code,
  );

  const hasInstAdmin =
    data.memberships.some((m) => m.role === "institution_admin") ||
    rbacRoleCodes.some((code) => ["institution_admin", "institution_owner"].includes(code)) ||
    rbacPerms.some((p) =>
      ["institutions.view", "institutions.settings.manage", "users.roles.assign"].includes(p),
    );

  const hasTeacher =
    data.roles.includes("teacher") ||
    data.memberships.some((m) => m.role === "teacher") ||
    rbacRoleCodes.some((code) => ["teacher", "academic_admin", "department_head"].includes(code)) ||
    rbacPerms.some((p) =>
      ["courses.create", "courses.update", "courses.content.edit", "assessments.grade"].includes(p),
    );

  // Active role: "company" vs "student" vs "super_admin"
  const [userRole, setUserRole] = useState<"company" | "student" | "super_admin">(() => {
    // Super admin never has student workspace
    if (data.isPlatformAdmin) {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("catech_active_role");
        if (stored === "company") return "company";
      }
      return "super_admin";
    }
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("catech_active_role");
      if (stored === "company" && (hasInstAdmin || hasTeacher)) {
        return "company";
      }
      if (stored === "student") return "student";
    }
    return hasInstAdmin || hasTeacher ? "company" : "student";
  });

  // Active Company / Institution selection state
  const [selectedCompany, setSelectedCompany] = useState<{
    id: string;
    name: string;
    code: string;
  } | null>(() => {
    // Check if user is already a member of an institution
    const firstMembership = data.memberships[0]?.institution;
    if (firstMembership) {
      return {
        id: firstMembership.id,
        name: firstMembership.name,
        code: firstMembership.code,
      };
    }
    // Check localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("catech_selected_company");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return null;
  });

  // Currently playing course (fullscreen player mode)
  const [playingCourseId, setPlayingCourseId] = useState<string | null>(null);

  // Active navigation view - student directly lands on my_learning progress
  const [activeView, setActiveView] = useState<string>(() => {
    return userRole === "company"
      ? "company_overview"
      : userRole === "super_admin"
        ? "platform_control"
        : "my_learning";
  });

  // Query unread messages
  const { data: messages = [] } = useQuery({
    queryKey: ["direct-messages"],
    queryFn: () => listDirectMessagesFn(),
  });
  const unreadCount = messages.filter((m) => !m.is_read && m.recipient_id === data.profile.id).length;

  // Query payments
  const { data: payments = [] } = useQuery({
    queryKey: ["user-payments"],
    queryFn: () => listUserPayments(),
  });

  // Update company selection and persist
  const handleSelectCompany = (company: CompanySummary) => {
    const payload = {
      id: company.id,
      name: company.name,
      code: company.code,
    };
    setSelectedCompany(payload);
    if (typeof window !== "undefined") {
      localStorage.setItem("catech_selected_company", JSON.stringify(payload));
      localStorage.setItem("catech_selected_company_id", company.id);
    }
    setActiveView("my_learning");
  };

  const handleRoleSwitch = (newRole: "company" | "student" | "super_admin") => {
    // Super admin never has student workspace
    if (data.isPlatformAdmin && newRole === "student") {
      newRole = "super_admin";
    }
    setUserRole(newRole);
    if (typeof window !== "undefined") {
      localStorage.setItem("catech_active_role", newRole);
    }
    setActiveView(
      newRole === "super_admin"
        ? "platform_control"
        : newRole === "company"
          ? "company_overview"
          : "my_learning",
    );
  };

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

  // If learning player is open, render full learning view
  if (playingCourseId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-4 max-w-7xl mx-auto">
          <CourseLearningPlayer
            courseId={playingCourseId}
            onBack={() => setPlayingCourseId(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* 1. Left Collapsible Side Navigation */}
      <DashboardSidebar
        activeView={activeView}
        onViewChange={setActiveView}
        userRole={userRole}
        onRoleSwitch={handleRoleSwitch}
        selectedCompany={selectedCompany}
        onSelectCompanyClick={() => setActiveView("select_company")}
        displayName={data.profile.display_name}
        isPlatformAdmin={data.isPlatformAdmin}
        hasCompanyAccess={hasInstAdmin || hasTeacher}
        unreadCount={unreadCount}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top App Bar */}
        <header className="sticky top-0 z-20 h-16 border-b border-border/70 bg-card/85 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  {userRole === "company"
                    ? "Company Portal"
                    : userRole === "super_admin"
                      ? "Platform Administrator"
                      : "Student Workspace"}
                </span>
                {selectedCompany && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] h-4.5 px-2 font-mono text-foreground font-semibold"
                  >
                    🏢 {selectedCompany.name}
                  </Badge>
                )}
              </div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-foreground truncate max-w-xs sm:max-w-md">
                {activeView === "select_company" && "Partner Companies & Academies"}
                {activeView === "sessions" && `${selectedCompany ? selectedCompany.name : "Available"} Course Sessions`}
                {activeView === "my_learning" && "My Enrolled Sessions & Progress"}
                {activeView === "assignments" && "Coursework, Tasks & Study Notes"}
                {activeView === "messages" && "Direct 1-on-1 Messages"}
                {activeView === "my_issues" && "My Support Issues & Tickets"}
                {activeView === "company_overview" && "Company Overview & Operations"}
                {activeView === "company_learners" && "Learner Directory & Contacts"}
                {activeView === "company_courses" && "Course & Curriculum Studio"}
                {activeView === "company_assignments" && "Module Assignments & Grading"}
                {activeView === "company_live" && "Live Classes & Campus Announcements"}
                {activeView === "company_payments" && "M-Pesa Collections & Records"}
                {activeView === "payments" && "Lipa na M-Pesa Receipts"}
                {activeView === "profile" && "Account & Credentials"}
                {activeView === "company_settings" && "Company & Tenancy Settings"}
                {activeView === "platform_control" && "Super Admin Platform Control"}
                {activeView === "platform_issues" && "Platform Issues & Support Tickets"}
                {activeView === "rbac_management" && "Role-Based Access Control"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <NotificationBell onNavigate={setActiveView} />

            {/* Quick Messages Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveView("messages")}
              className="text-xs h-8.5 rounded-xl border-border/80 relative"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1 text-primary" />
              <span className="hidden sm:inline">Messages</span>
              {unreadCount > 0 && (
                <Badge className="ml-1.5 h-4 w-4 p-0 text-[10px] font-bold bg-destructive text-destructive-foreground flex items-center justify-center rounded-full">
                  {unreadCount}
                </Badge>
              )}
            </Button>

            {/* Quick Switch Company Button (for students) */}
            {userRole === "student" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveView("select_company")}
                className="text-xs h-8.5 rounded-xl border-border/80 hidden sm:flex items-center"
              >
                <Building2 className="h-3.5 w-3.5 mr-1 text-primary" />
                <span>{selectedCompany ? "Switch Company" : "Select Company"}</span>
              </Button>
            )}

            {/* Platform Admin Bootstrap Trigger */}
            {!data.isPlatformAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBootstrapModalOpen(true)}
                className="text-xs h-8 text-muted-foreground hover:text-foreground hidden lg:flex"
              >
                <KeyRound className="h-3.5 w-3.5 mr-1 text-amber-500" />
                Bootstrap
              </Button>
            )}
          </div>
        </header>

        {/* Main Body Content Container */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {/* VIEW: Select Company Directory */}
          {activeView === "select_company" && (
            <CompanyDirectory
              selectedCompanyId={selectedCompany?.id || null}
              onSelectCompany={handleSelectCompany}
              onExploreCourses={() => setActiveView("sessions")}
            />
          )}

          {/* VIEW: Available Sessions (with M-Pesa Payment) */}
          {activeView === "sessions" && (
            <CompanyCourseCatalog
              company={selectedCompany}
              onStartLearning={(courseId) => setPlayingCourseId(courseId)}
              onSwitchCompanyClick={() => setActiveView("select_company")}
            />
          )}

          {/* VIEW: Student Hub / My Learning */}
          {activeView === "my_learning" && (
            <StudentHub displayName={data.profile.display_name} />
          )}

          {/* VIEW: Direct Messages */}
          {activeView === "messages" && (
            <DirectMessagingHub
              currentUserId={data.profile.id}
              currentUserRole={userRole}
              institutionId={selectedCompany?.id}
            />
          )}

          {/* VIEW: Student Tasks & Notes / Company Assignments */}
          {(activeView === "assignments" || activeView === "company_assignments") && (
            <CompanyAssignmentsAndNotes
              institutionId={selectedCompany?.id || data.memberships[0]?.institution_id}
              isCompanyAdmin={userRole === "company" || userRole === "super_admin"}
            />
          )}

          {/* VIEW: Company Learners Directory & Contacts */}
          {activeView === "company_learners" && (
            <CompanyLearnersManager
              institutionId={selectedCompany?.id || data.memberships[0]?.institution_id}
              companyName={selectedCompany?.name || "Your Company"}
            />
          )}

          {/* VIEW: Company Overview */}
          {activeView === "company_overview" && (
            userRole === "super_admin" ? (
              <SuperAdminConsole initialTab="companies" />
            ) : (
            <div className="space-y-8">
              {/* Stats Overview */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border border-border/80 rounded-2xl shadow-xs bg-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                      Active Company
                    </CardTitle>
                    <Building2 className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold truncate">
                      {selectedCompany?.name || "CATECH Partner"}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Code: {selectedCompany?.code || "INST-01"}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-border/80 rounded-2xl shadow-xs bg-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                      Student Enrolled
                    </CardTitle>
                    <Users className="h-4 w-4 text-emerald-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-black text-emerald-600">
                      {payments.length > 0 ? payments.length : 1}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Active student profiles
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-border/80 rounded-2xl shadow-xs bg-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                      1-on-1 Messages
                    </CardTitle>
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-black text-foreground">
                      {messages.length}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-border/80 rounded-2xl shadow-xs bg-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                      M-Pesa Collections
                    </CardTitle>
                    <Smartphone className="h-4 w-4 text-emerald-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-black text-emerald-600">
                      KES {payments.reduce((acc, p) => acc + (p.status === "completed" ? p.amount : 0), 0).toLocaleString()}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Verified transactions
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions Grid */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Card
                  onClick={() => setActiveView("company_learners")}
                  className="p-5 border border-border/80 rounded-2xl hover:border-primary/60 hover:shadow-md cursor-pointer transition-all bg-card"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <Users className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground">View Students & Contacts</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    See student phone numbers, curriculum progress %, and message them directly.
                  </p>
                </Card>

                <Card
                  onClick={() => setActiveView("company_assignments")}
                  className="p-5 border border-border/80 rounded-2xl hover:border-primary/60 hover:shadow-md cursor-pointer transition-all bg-card"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground">Create Module Assignments</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Design practical challenges, upload lesson notes, and grade submissions.
                  </p>
                </Card>

                <Card
                  onClick={() => setActiveView("company_courses")}
                  className="p-5 border border-border/80 rounded-2xl hover:border-primary/60 hover:shadow-md cursor-pointer transition-all bg-card"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground">Manage Course Sessions</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add new video modules, set KES pricing, and publish curriculum to students.
                  </p>
                </Card>
              </div>

              {/* Enrolled Students Component */}
              <CompanyLearnersManager
                institutionId={selectedCompany?.id || data.memberships[0]?.institution_id}
                companyName={selectedCompany?.name || "Your Company"}
              />
            </div>
            )
          )}

          {/* VIEW: Learners & Users Directory */}
          {activeView === "company_learners" && (
            userRole === "super_admin" ? (
              <SuperAdminConsole initialTab="users" />
            ) : (
              <CompanyLearnersManager
                institutionId={selectedCompany?.id || data.memberships[0]?.institution_id}
                companyName={selectedCompany?.name || "Your Company"}
              />
            )
          )}

          {/* VIEW: Course Sessions Manager (Company Studio) */}
          {activeView === "company_courses" && (
            userRole === "super_admin" ? (
              <SuperAdminConsole initialTab="courses" />
            ) : (
              <TeacherWorkspace
                displayName={data.profile.display_name}
                institutionId={selectedCompany?.id || data.memberships[0]?.institution_id}
              />
            )
          )}

          {/* VIEW: Live Virtual Classes */}
          {activeView === "company_live" && (
            <CampusAcademicManager
              institutionId={selectedCompany?.id || data.memberships[0]?.institution_id || ""}
            />
          )}

          {/* VIEW: Payments / Receipts Table */}
          {(activeView === "payments" || activeView === "company_payments") && (
            userRole === "super_admin" ? (
              <SuperAdminConsole initialTab="payments" />
            ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-600/10 text-emerald-600">
                      <Smartphone className="h-5 w-5" />
                    </span>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                      Lipa na M-Pesa Transaction Ledger
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Real-time Safaricom Daraja STK Push verification and instant receipts.
                  </p>
                </div>
              </div>

              {payments.length === 0 ? (
                <Card className="p-12 text-center border-dashed border-border/80">
                  <Smartphone className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
                  <h3 className="text-base font-bold text-foreground">No payments recorded</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    When courses are enrolled and paid via M-Pesa, transaction records appear here.
                  </p>
                </Card>
              ) : (
                <div className="rounded-2xl border border-border/80 overflow-hidden bg-card">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border/70 font-bold">
                      <tr>
                        <th className="p-3">Reference / Phone</th>
                        <th className="p-3">Course Title</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Receipt Number</th>
                        <th className="p-3 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/30">
                          <td className="p-3 font-mono">{p.phone_number}</td>
                          <td className="p-3 font-semibold">{p.course_title || "Accredited Session"}</td>
                          <td className="p-3 font-bold text-emerald-600">
                            KES {p.amount.toLocaleString()}
                          </td>
                          <td className="p-3">
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
                          </td>
                          <td className="p-3 font-mono">{p.mpesa_receipt_number || "Pending Daraja"}</td>
                          <td className="p-3 text-right text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            )
          )}

          {/* VIEW: Company Settings / Profile */}
          {activeView === "company_settings" && (
            <div className="space-y-6">
              <div className="border-b border-border/70 pb-4">
                <h2 className="text-xl font-black text-foreground">Company & Tenancy Profile</h2>
                <p className="text-xs text-muted-foreground">
                  Manage your organization's brand, contact credentials, bio, and student-facing profile.
                </p>
              </div>
              <CompanyProfileEditor
                institutionId={selectedCompany?.id || data.memberships[0]?.institution_id}
                isSuperAdmin={data.isPlatformAdmin}
              />
            </div>
          )}

          {/* VIEW: Account Profile & Credentials (Student / User) */}
          {activeView === "profile" && (
            <div className="space-y-6">
              <div className="border-b border-border/70 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-black text-foreground">
                    {userRole === "company" ? "Company & Account Profile" : "Student Profile & Credentials"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {userRole === "company"
                      ? "Manage your enterprise organization details and personal administrator identity."
                      : "Manage your student credentials, Safaricom M-Pesa phone number, and learning profile."}
                  </p>
                </div>
              </div>

              {userRole === "company" ? (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-3">
                      🏢 Company Organizational Profile
                    </h3>
                    <CompanyProfileEditor
                      institutionId={selectedCompany?.id || data.memberships[0]?.institution_id}
                      isSuperAdmin={data.isPlatformAdmin}
                    />
                  </div>

                  <div className="pt-6 border-t border-border/70">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-3">
                      👤 Personal Administrator Identity
                    </h3>
                    <StudentProfileEditor
                      profile={data.profile}
                      roles={data.roles}
                      isPlatformAdmin={data.isPlatformAdmin}
                      selectedCompany={selectedCompany}
                      onBrowseCompaniesClick={() => setActiveView("select_company")}
                    />
                  </div>
                </div>
              ) : (
                <StudentProfileEditor
                  profile={data.profile}
                  roles={data.roles}
                  isPlatformAdmin={data.isPlatformAdmin}
                  selectedCompany={selectedCompany}
                  onBrowseCompaniesClick={() => setActiveView("select_company")}
                />
              )}
            </div>
          )}

          {/* VIEW: Student Support Issues */}
          {activeView === "my_issues" && (
            <IssueReporter institutionId={selectedCompany?.id} />
          )}

          {/* VIEW: Super Admin Platform Issues */}
          {activeView === "platform_issues" && (
            <SuperAdminConsole initialTab="issues" />
          )}

          {/* VIEW: Platform Control */}
          {activeView === "platform_control" && (
            <SuperAdminConsole initialTab="overview" />
          )}

          {/* VIEW: RBAC Management */}
          {activeView === "rbac_management" && (
            <RbacManagementPanel institutionId={selectedCompany?.id} />
          )}
        </main>
      </div>

      {/* Bootstrap Super Admin Dialog */}
      <Dialog open={bootstrapModalOpen} onOpenChange={setBootstrapModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-500" />
              Platform Admin Bootstrap
            </DialogTitle>
            <DialogDescription className="text-xs">
              Promote your verified account to initial platform super administrator.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              This initialization triggers advisory lock verification and assigns full multi-tenant super admin privileges.
            </p>

            {bootstrapMessage && (
              <p className="text-emerald-600 font-semibold p-2.5 rounded-lg bg-emerald-500/10">
                {bootstrapMessage}
              </p>
            )}

            {bootstrapError && (
              <p className="text-destructive font-medium p-2.5 rounded-lg bg-destructive/10">
                {bootstrapError}
              </p>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBootstrapModalOpen(false)}
              className="text-xs"
            >
              Close
            </Button>
            {!bootstrapMessage && (
              <Button
                size="sm"
                disabled={bootstrapMutation.isPending}
                onClick={() => bootstrapMutation.mutate()}
                className="bg-primary text-primary-foreground font-semibold text-xs"
              >
                {bootstrapMutation.isPending ? "Initializing…" : "Confirm Super Admin Bootstrap"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
