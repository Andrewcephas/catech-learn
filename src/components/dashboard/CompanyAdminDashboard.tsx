import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Users,
  BookOpen,
  Smartphone,
  MessageSquare,
  FileCheck2,
  Plus,
  Sparkles,
  Settings,
  ChevronRight,
  TrendingUp,
  CreditCard,
  UserCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getCompanyLearnersDirectory, listPublicCompanies, type CompanyLearner } from "@/lib/company.functions";
import { listCourses } from "@/lib/course.functions";
import { listUserPayments } from "@/lib/payment.functions";
import { listDirectMessagesFn } from "@/lib/messaging.functions";
import { CompanyLearnersManager } from "@/components/dashboard/CompanyLearnersManager";
import { CompanyAssignmentsAndNotes } from "@/components/dashboard/CompanyAssignmentsAndNotes";
import { TeacherWorkspace } from "@/components/dashboard/TeacherWorkspace";
import { CompanyProfileEditor } from "@/components/dashboard/CompanyProfileEditor";
import { CourseBuilderModal } from "@/components/dashboard/CourseBuilderModal";

interface CompanyAdminDashboardProps {
  displayName: string;
  company: { id: string; name: string; code: string } | null;
  onNavigateToView: (view: string) => void;
  onNavigateToMessages: (recipientId?: string) => void;
}

export function CompanyAdminDashboard({
  displayName,
  company,
  onNavigateToView,
  onNavigateToMessages,
}: CompanyAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "sessions" | "learners" | "assignments" | "payments" | "profile">("overview");
  const [builderOpen, setBuilderOpen] = useState(false);

  // 1. Fetch courses
  const { data: courses = [] } = useQuery({
    queryKey: ["courses", company?.id],
    queryFn: () => listCourses({ data: { institution_id: company?.id } }),
  });

  // 2. Fetch learners
  const { data: learners = [] } = useQuery({
    queryKey: ["company-learners", company?.id],
    queryFn: () => getCompanyLearnersDirectory({ data: { institution_id: company?.id } }),
  });

  // 3. Fetch payments
  const { data: payments = [] } = useQuery({
    queryKey: ["user-payments"],
    queryFn: () => listUserPayments(),
  });

  // 4. Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ["direct-messages"],
    queryFn: () => listDirectMessagesFn(),
  });

  const totalRevenue = payments.reduce(
    (acc, p) => acc + (p.status === "completed" ? p.amount : 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-card border border-border/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Company Administration
            </span>
            {company && (
              <Badge variant="outline" className="text-[10px] font-mono font-semibold text-foreground">
                Code: {company.code}
              </Badge>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            {company?.name || "Company Management Portal"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your organization's curriculum sessions, track student enrollments, and monitor M-Pesa revenue collections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setBuilderOpen(true)}
            size="sm"
            className="bg-primary text-primary-foreground font-semibold text-xs shadow-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Learning Session
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab("profile")}
            className="border-border text-xs font-semibold"
          >
            <Settings className="h-3.5 w-3.5 mr-1.5 text-primary" />
            Company Settings
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/80 rounded-2xl shadow-xs bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Enrolled Students
            </CardTitle>
            <Users className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">
              {learners.length > 0 ? learners.length : payments.length > 0 ? payments.length : 1}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Active student profiles</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-2xl shadow-xs bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Active Sessions
            </CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">{courses.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Curated teaching modules</p>
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
              KES {totalRevenue.toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {payments.filter((p) => p.status === "completed").length} verified transactions
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-2xl shadow-xs bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Direct Messages
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">{messages.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">1-on-1 student inquiries</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-4">
        <TabsList className="bg-muted/70 p-1 rounded-xl">
          <TabsTrigger value="overview" className="text-xs font-semibold gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Company Overview
          </TabsTrigger>
          <TabsTrigger value="sessions" className="text-xs font-semibold gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Sessions ({courses.length})
          </TabsTrigger>
          <TabsTrigger value="learners" className="text-xs font-semibold gap-1.5">
            <Users className="h-3.5 w-3.5" /> Students & Contacts
          </TabsTrigger>
          <TabsTrigger value="assignments" className="text-xs font-semibold gap-1.5">
            <FileCheck2 className="h-3.5 w-3.5" /> Assignments & Grading
          </TabsTrigger>
          <TabsTrigger value="payments" className="text-xs font-semibold gap-1.5">
            <Smartphone className="h-3.5 w-3.5" /> M-Pesa Ledger
          </TabsTrigger>
          <TabsTrigger value="profile" className="text-xs font-semibold gap-1.5">
            <Settings className="h-3.5 w-3.5" /> Company Profile
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card
              onClick={() => setActiveTab("learners")}
              className="p-5 border border-border/80 rounded-2xl hover:border-primary/60 hover:shadow-sm cursor-pointer transition-all bg-card"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">View Students & Contacts</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Access student phone numbers for WhatsApp/SMS, view progress %, and send direct messages.
              </p>
            </Card>

            <Card
              onClick={() => setActiveTab("sessions")}
              className="p-5 border border-border/80 rounded-2xl hover:border-primary/60 hover:shadow-sm cursor-pointer transition-all bg-card"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Manage Course Sessions</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Establish curriculum, upload syllabus videos, and set KES enrollment pricing.
              </p>
            </Card>

            <Card
              onClick={() => setActiveTab("assignments")}
              className="p-5 border border-border/80 rounded-2xl hover:border-primary/60 hover:shadow-sm cursor-pointer transition-all bg-card"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Module Assignments</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Create practical challenges, attach notes, and grade student submissions.
              </p>
            </Card>
          </div>

          {/* Learners Manager Preview */}
          <CompanyLearnersManager
            institutionId={company?.id}
            companyName={company?.name || "Your Organization"}
          />
        </TabsContent>

        {/* Tab 2: Sessions */}
        <TabsContent value="sessions" className="space-y-4 mt-4">
          <TeacherWorkspace
            displayName={displayName}
            institutionId={company?.id}
          />
        </TabsContent>

        {/* Tab 3: Students & Contacts */}
        <TabsContent value="learners" className="space-y-4 mt-4">
          <CompanyLearnersManager
            institutionId={company?.id}
            companyName={company?.name || "Your Organization"}
          />
        </TabsContent>

        {/* Tab 4: Assignments */}
        <TabsContent value="assignments" className="space-y-4 mt-4">
          <CompanyAssignmentsAndNotes
            institutionId={company?.id}
            isCompanyAdmin={true}
          />
        </TabsContent>

        {/* Tab 5: M-Pesa Ledger */}
        <TabsContent value="payments" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Lipa na M-Pesa Collections</h3>
              <p className="text-xs text-muted-foreground">
                Real-time Safaricom Daraja STK Push verification and instant receipts.
              </p>
            </div>
            <span className="font-bold text-sm text-emerald-600">
              Total: KES {totalRevenue.toLocaleString()}
            </span>
          </div>

          {payments.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-border/80 bg-card">
              <Smartphone className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h4 className="text-base font-bold text-foreground">No payments recorded yet</h4>
              <p className="text-xs text-muted-foreground mt-1">
                When students enroll and pay for your courses via M-Pesa, transaction records appear here.
              </p>
            </Card>
          ) : (
            <div className="rounded-2xl border border-border/80 overflow-hidden bg-card">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border/70 font-semibold">
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
                      <td className="p-3 font-mono text-muted-foreground">{p.phone_number}</td>
                      <td className="p-3 font-semibold text-foreground">{p.course_title || "Accredited Session"}</td>
                      <td className="p-3 font-bold text-emerald-600">KES {p.amount.toLocaleString()}</td>
                      <td className="p-3">
                        <Badge
                          className={`text-[10px] font-bold ${
                            p.status === "completed"
                              ? "bg-emerald-600/10 text-emerald-600"
                              : "bg-amber-500/10 text-amber-600"
                          }`}
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono font-semibold text-foreground">
                        {p.mpesa_receipt_number || "Verified"}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Tab 6: Company Profile */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          <CompanyProfileEditor
            institutionId={company?.id}
            isSuperAdmin={false}
          />
        </TabsContent>
      </Tabs>

      {/* Course Builder Modal */}
      {company?.id && (
        <CourseBuilderModal
          open={builderOpen}
          onOpenChange={setBuilderOpen}
          institutionId={company.id}
        />
      )}
    </div>
  );
}
