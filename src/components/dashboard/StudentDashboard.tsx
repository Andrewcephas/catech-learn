import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GraduationCap,
  Award,
  BookOpen,
  Clock,
  CheckCircle2,
  Smartphone,
  Search,
  Building2,
  FileCheck2,
  MessageSquare,
  PlayCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listCourses, type CourseSummary } from "@/lib/course.functions";
import { listUserPayments } from "@/lib/payment.functions";
import { listCompanyAssignments, type CompanySummary } from "@/lib/company.functions";
import {
  listStudentSubmissionsFn,
  submitAssignmentFn,
  type StudentSubmissionItem,
} from "@/lib/assessment.functions";
import { MpesaPaymentModal } from "@/components/dashboard/MpesaPaymentModal";

interface StudentDashboardProps {
  displayName: string;
  selectedCompany: { id: string; name: string; code: string } | null;
  onStartLearning: (courseId: string) => void;
  onBrowseCompaniesClick: () => void;
  onNavigateToMessages: () => void;
}

export function StudentDashboard({
  displayName,
  selectedCompany,
  onStartLearning,
  onBrowseCompaniesClick,
  onNavigateToMessages,
}: StudentDashboardProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"my_courses" | "browse" | "assignments" | "receipts">("my_courses");

  // Search & Filters
  const [courseSearch, setCourseSearch] = useState("");
  const [filterPrice, setFilterPrice] = useState<"all" | "free" | "paid">("all");

  // Payment Modal
  const [selectedCourseForPayment, setSelectedCourseForPayment] = useState<CourseSummary | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  // Submit Assignment Modal
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [selectedAssignmentTitle, setSelectedAssignmentTitle] = useState("");
  const [submissionText, setSubmissionText] = useState("");
  const [submissionFileUrl, setSubmissionFileUrl] = useState("");

  // 1. Fetch all courses (filtered by company if selected)
  const { data: allCourses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["courses", selectedCompany?.id],
    queryFn: () => listCourses({ data: { institution_id: selectedCompany?.id } }),
  });

  const enrolledCourses = allCourses.filter((c) => c.enrolled);

  // 2. Fetch payments
  const { data: payments = [] } = useQuery({
    queryKey: ["user-payments"],
    queryFn: () => listUserPayments(),
  });

  // 3. Fetch company assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ["student-assignments", selectedCompany?.id],
    queryFn: () => listCompanyAssignments({ data: { institution_id: selectedCompany?.id } }),
  });

  // 4. Fetch student's own submissions
  const { data: mySubmissions = [], isLoading: loadingSubmissions } = useQuery({
    queryKey: ["my-submissions"],
    queryFn: () => listStudentSubmissionsFn(),
  });

  // Mutation: Submit Assignment
  const submitMutation = useMutation({
    mutationFn: () =>
      submitAssignmentFn({
        data: {
          assignment_id: selectedAssignmentId,
          submission_text: submissionText,
          file_url: submissionFileUrl || undefined,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
      setSubmitModalOpen(false);
      setSubmissionText("");
      setSubmissionFileUrl("");
    },
  });

  const handleEnrollClick = (course: CourseSummary) => {
    if (course.enrolled) {
      onStartLearning(course.id);
    } else if (course.price > 0) {
      setSelectedCourseForPayment(course);
      setPaymentModalOpen(true);
    } else {
      onStartLearning(course.id);
    }
  };

  const filteredCatalog = allCourses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
      c.code.toLowerCase().includes(courseSearch.toLowerCase()) ||
      c.description.toLowerCase().includes(courseSearch.toLowerCase());
    const matchesPrice =
      filterPrice === "all" ||
      (filterPrice === "free" && c.price === 0) ||
      (filterPrice === "paid" && c.price > 0);
    return matchesSearch && matchesPrice;
  });

  return (
    <div className="space-y-6">
      {/* Student Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-card border border-border/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <GraduationCap className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Student Workspace
            </span>
            {selectedCompany && (
              <Badge variant="outline" className="text-[10px] h-4.5 px-2 font-mono text-foreground font-semibold">
                🏢 {selectedCompany.name}
              </Badge>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Welcome, {displayName}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Continue learning, submit module assignments, and track your accredited progress.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setActiveTab("browse")}
            size="sm"
            className="bg-primary text-primary-foreground font-semibold text-xs shadow-xs"
          >
            <BookOpen className="h-3.5 w-3.5 mr-1.5" />
            Explore Sessions
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onBrowseCompaniesClick}
            className="border-border text-xs font-semibold"
          >
            <Building2 className="h-3.5 w-3.5 mr-1.5 text-primary" />
            {selectedCompany ? "Switch Company" : "Select Company"}
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/80 rounded-2xl shadow-xs bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Enrolled Courses
            </CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">{enrolledCourses.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Active learning cohorts</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-2xl shadow-xs bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Submitted Tasks
            </CardTitle>
            <FileCheck2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">{mySubmissions.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Assignments completed</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-2xl shadow-xs bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              M-Pesa Receipts
            </CardTitle>
            <Smartphone className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">{payments.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Verified transactions</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-2xl shadow-xs bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Certificates
            </CardTitle>
            <Award className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">0</div>
            <p className="text-[11px] text-muted-foreground mt-1">Verified qualifications</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-4">
        <TabsList className="bg-muted/70 p-1 rounded-xl">
          <TabsTrigger value="my_courses" className="text-xs font-semibold gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" /> My Enrolled Courses ({enrolledCourses.length})
          </TabsTrigger>
          <TabsTrigger value="browse" className="text-xs font-semibold gap-1.5">
            <Search className="h-3.5 w-3.5" /> Browse Course Catalog
          </TabsTrigger>
          <TabsTrigger value="assignments" className="text-xs font-semibold gap-1.5">
            <FileCheck2 className="h-3.5 w-3.5" /> Tasks & Coursework ({assignments.length})
          </TabsTrigger>
          <TabsTrigger value="receipts" className="text-xs font-semibold gap-1.5">
            <Smartphone className="h-3.5 w-3.5" /> M-Pesa Receipts ({payments.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: My Courses */}
        <TabsContent value="my_courses" className="space-y-4 mt-4">
          {enrolledCourses.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-border/80 bg-card">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h4 className="text-base font-bold text-foreground">You are not enrolled in any courses yet</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Explore the course sessions offered by {selectedCompany?.name || "our partner academies"} and enroll to start your learning journey.
              </p>
              <Button
                onClick={() => setActiveTab("browse")}
                size="sm"
                className="mt-4 text-xs bg-primary text-primary-foreground font-semibold"
              >
                Browse Available Courses
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {enrolledCourses.map((course) => (
                <Card
                  key={course.id}
                  className="border border-border/80 rounded-2xl flex flex-col justify-between bg-card hover:border-primary/50 transition-all shadow-xs"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Badge variant="outline" className="font-mono text-[10px] text-primary">
                        {course.code}
                      </Badge>
                      <Badge className="bg-emerald-600/10 text-emerald-600 font-semibold text-[10px]">
                        Enrolled
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-bold text-foreground line-clamp-1">
                      {course.title}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2 mt-1">
                      {course.description || "Interactive course session with verified certificate."}
                    </CardDescription>
                  </CardHeader>

                  <CardFooter className="pt-3 border-t border-border/70 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Active Session
                    </span>
                    <Button
                      size="sm"
                      onClick={() => onStartLearning(course.id)}
                      className="bg-primary text-primary-foreground font-semibold text-xs h-8"
                    >
                      <PlayCircle className="h-3.5 w-3.5 mr-1" />
                      Resume Learning
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Browse Catalog */}
        <TabsContent value="browse" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search sessions by title, topic or code..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                className="w-full rounded-xl border border-input bg-card pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex rounded-xl border border-input p-1 bg-muted/60 text-xs">
              {(["all", "free", "paid"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterPrice(f)}
                  className={`px-3 py-1 rounded-lg font-medium transition-all capitalize ${
                    filterPrice === f ? "bg-card text-foreground font-bold shadow-xs" : "text-muted-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredCatalog.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-border/80 bg-card">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h4 className="text-base font-bold text-foreground">No course sessions found</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Try searching with different terms or check another company.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCatalog.map((course) => (
                <Card
                  key={course.id}
                  className="border border-border/80 rounded-2xl flex flex-col justify-between bg-card hover:border-primary/50 transition-all shadow-xs"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Badge variant="outline" className="font-mono text-[10px] text-primary">
                        {course.code}
                      </Badge>
                      <span className="font-bold text-xs text-emerald-600">
                        {course.price > 0 ? `KES ${course.price.toLocaleString()}` : "Free"}
                      </span>
                    </div>
                    <CardTitle className="text-sm font-bold text-foreground line-clamp-1">
                      {course.title}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2 mt-1">
                      {course.description || "Comprehensive syllabus and practical assessments."}
                    </CardDescription>
                  </CardHeader>

                  <CardFooter className="pt-3 border-t border-border/70 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-muted-foreground">
                      {course.instructor_name || "Certified Instructor"}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleEnrollClick(course)}
                      className="bg-primary text-primary-foreground font-semibold text-xs h-8"
                    >
                      {course.enrolled ? "Go to Class" : course.price > 0 ? "Enroll via M-Pesa" : "Enroll Free"}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Tasks & Coursework */}
        <TabsContent value="assignments" className="space-y-6 mt-4">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">Available Module Assignments</h3>
            {assignments.length === 0 ? (
              <Card className="p-8 text-center border-dashed border-border/80 bg-card">
                <FileCheck2 className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">No active assignments for this company.</p>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {assignments.map((item) => {
                  const alreadySubmitted = mySubmissions.some((s) => s.assignment_id === item.id);
                  return (
                    <Card key={item.id} className="border border-border/80 rounded-2xl p-4 bg-card flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <Badge variant="outline" className="text-[10px] text-primary truncate max-w-[160px]">
                            {item.course_title}
                          </Badge>
                          <Badge className="bg-emerald-600/10 text-emerald-600 text-[10px] font-bold">
                            {item.max_points} Pts
                          </Badge>
                        </div>
                        <h4 className="font-bold text-sm text-foreground line-clamp-1">{item.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.instructions}</p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-border/70 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-muted-foreground">
                          {item.due_date ? `Due: ${new Date(item.due_date).toLocaleDateString()}` : "No deadline"}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedAssignmentId(item.id);
                            setSelectedAssignmentTitle(item.title);
                            setSubmitModalOpen(true);
                          }}
                          className={`text-xs h-7 font-semibold ${
                            alreadySubmitted
                              ? "border border-border text-foreground bg-card hover:bg-muted"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {alreadySubmitted ? "Resubmit" : "Submit Work"}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* My Submissions Results */}
          <div className="space-y-3 pt-4 border-t border-border/70">
            <h3 className="text-sm font-bold text-foreground">My Submissions & Teacher Feedback</h3>
            {mySubmissions.length === 0 ? (
              <p className="text-xs text-muted-foreground">You have not submitted any assignments yet.</p>
            ) : (
              <div className="rounded-2xl border border-border/80 overflow-hidden bg-card">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border/70 font-semibold">
                    <tr>
                      <th className="p-3">Assignment</th>
                      <th className="p-3">Submitted Date</th>
                      <th className="p-3">Score / Result</th>
                      <th className="p-3">Teacher Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {mySubmissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-muted/30">
                        <td className="p-3 font-semibold text-foreground">{sub.assignment_title}</td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(sub.submitted_at).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          {sub.grade !== null ? (
                            <Badge className="bg-emerald-600/10 text-emerald-600 font-bold text-[10px]">
                              {sub.grade} / 100 Pts
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/10 text-amber-600 font-semibold text-[10px]">
                              Under Review
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {sub.feedback || "Awaiting instructor feedback."}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 4: M-Pesa Receipts */}
        <TabsContent value="receipts" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Lipa na M-Pesa Transaction History</h3>
            <span className="text-xs text-muted-foreground">{payments.length} verified receipts</span>
          </div>

          {payments.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-border/80 bg-card">
              <Smartphone className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h4 className="text-base font-bold text-foreground">No transaction receipts</h4>
              <p className="text-xs text-muted-foreground mt-1">
                When you enroll in paid sessions via Safaricom M-Pesa, official STK push receipts appear here.
              </p>
            </Card>
          ) : (
            <div className="rounded-2xl border border-border/80 overflow-hidden bg-card">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border/70 font-semibold">
                  <tr>
                    <th className="p-3">Phone Number</th>
                    <th className="p-3">Course / Session</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">M-Pesa Receipt Code</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="p-3 font-mono text-muted-foreground">{p.phone_number}</td>
                      <td className="p-3 font-semibold text-foreground">{p.course_title || "Accredited Session"}</td>
                      <td className="p-3 font-bold text-emerald-600">KES {p.amount.toLocaleString()}</td>
                      <td className="p-3 font-mono font-semibold text-foreground">
                        {p.mpesa_receipt_number || "Verified"}
                      </td>
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
      </Tabs>

      {/* Modal: Submit Assignment */}
      <Dialog open={submitModalOpen} onOpenChange={setSubmitModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-primary" />
              Submit Coursework
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedAssignmentTitle}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitMutation.mutate();
            }}
            className="space-y-3 py-2 text-xs"
          >
            <div>
              <label className="block font-semibold mb-1 text-foreground">Your Answer / Text Response</label>
              <textarea
                required
                rows={5}
                placeholder="Write your solution, analysis, or project response here..."
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                className="w-full rounded-xl border border-input bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">
                Optional: File Attachment / Google Drive / GitHub Link
              </label>
              <input
                type="url"
                placeholder="https://github.com/... or https://drive.google.com/..."
                value={submissionFileUrl}
                onChange={(e) => setSubmissionFileUrl(e.target.value)}
                className="w-full rounded-xl border border-input bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <DialogFooter className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setSubmitModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                type="submit"
                disabled={submitMutation.isPending || !submissionText.trim()}
                className="bg-primary text-primary-foreground font-semibold text-xs"
              >
                {submitMutation.isPending ? "Submitting…" : "Confirm Submission"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* M-Pesa Modal */}
      {selectedCourseForPayment && (
        <MpesaPaymentModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          courseId={selectedCourseForPayment.id}
          courseTitle={selectedCourseForPayment.title}
          amount={selectedCourseForPayment.price}
          currency={selectedCourseForPayment.currency || "KES"}
          onSuccess={() => {
            void queryClient.invalidateQueries({ queryKey: ["courses"] });
            void queryClient.invalidateQueries({ queryKey: ["user-payments"] });
            setPaymentModalOpen(false);
            onStartLearning(selectedCourseForPayment.id);
          }}
        />
      )}
    </div>
  );
}
