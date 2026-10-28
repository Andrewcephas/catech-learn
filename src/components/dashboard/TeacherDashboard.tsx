import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Users,
  FileCheck2,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  MessageSquare,
  FileText,
  Search,
  ExternalLink,
  ChevronRight,
  Award,
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
import { listCompanyAssignments, saveCompanyLessonNoteFn, getCompanyLearnersDirectory } from "@/lib/company.functions";
import {
  listAssignmentSubmissionsFn,
  gradeAssignmentFn,
  type AssignmentSubmissionItem,
} from "@/lib/assessment.functions";
import { CourseBuilderModal } from "@/components/dashboard/CourseBuilderModal";

interface TeacherDashboardProps {
  displayName: string;
  institutionId?: string | undefined;
  onNavigateToMessages?: (studentId?: string) => void;
}

export function TeacherDashboard({
  displayName,
  institutionId,
  onNavigateToMessages,
}: TeacherDashboardProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "courses" | "grading" | "learners" | "notes">("overview");

  // Modals
  const [builderOpen, setBuilderOpen] = useState(false);
  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmissionItem | null>(null);
  const [gradeScore, setGradeScore] = useState<number>(85);
  const [gradeFeedback, setGradeFeedback] = useState<string>("");

  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [noteCourseId, setNoteCourseId] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  // 1. Fetch assigned courses
  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["teacher-courses", institutionId],
    queryFn: () => listCourses({ data: { institution_id: institutionId } }),
  });

  // 2. Fetch assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ["teacher-assignments", institutionId],
    queryFn: () => listCompanyAssignments({ data: { institution_id: institutionId } }),
  });

  // 3. Fetch submissions across assignments
  const { data: submissions = [], isLoading: loadingSubmissions } = useQuery({
    queryKey: ["teacher-submissions", institutionId],
    queryFn: () => listAssignmentSubmissionsFn({ data: { institution_id: institutionId } }),
  });

  // 4. Fetch learners
  const { data: learners = [] } = useQuery({
    queryKey: ["teacher-learners", institutionId],
    queryFn: () => getCompanyLearnersDirectory({ data: { institution_id: institutionId } }),
  });

  // Mutation: Grade submission
  const gradeMutation = useMutation({
    mutationFn: () =>
      gradeAssignmentFn({
        data: {
          submission_id: selectedSubmission!.id,
          grade: gradeScore,
          feedback: gradeFeedback,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["teacher-submissions"] });
      setGradingModalOpen(false);
      setSelectedSubmission(null);
    },
  });

  // Mutation: Save lesson note
  const saveNoteMutation = useMutation({
    mutationFn: () =>
      saveCompanyLessonNoteFn({
        data: {
          lesson_id: noteCourseId, // Fallback to course ID container
          title: noteTitle,
          content: noteContent,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["teacher-courses"] });
      setNotesModalOpen(false);
      setNoteTitle("");
      setNoteContent("");
    },
  });

  const pendingGradingCount = submissions.filter((s) => s.grade === null).length;
  const gradedCount = submissions.filter((s) => s.grade !== null).length;

  const openGradingDialog = (sub: AssignmentSubmissionItem) => {
    setSelectedSubmission(sub);
    setGradeScore(sub.grade ?? 80);
    setGradeFeedback(sub.feedback ?? "");
    setGradingModalOpen(true);
  };

  const filteredSubmissions = submissions.filter(
    (s) =>
      s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.assignment_title && s.assignment_title.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      {/* Faculty Studio Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-card border border-border/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Faculty Workspace
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Instructor Studio & Grading
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Welcome back, <span className="font-semibold text-foreground">{displayName}</span>. Manage your course curriculum, review student submissions, and grade coursework.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setBuilderOpen(true)}
            size="sm"
            className="bg-primary text-primary-foreground font-semibold text-xs shadow-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Course Session
          </Button>
          <Button
            onClick={() => setNotesModalOpen(true)}
            variant="outline"
            size="sm"
            className="border-border text-xs font-semibold"
          >
            <FileText className="h-3.5 w-3.5 mr-1.5 text-primary" />
            Add Lesson Notes
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/80 rounded-2xl shadow-xs bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Assigned Sessions
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
              Enrolled Learners
            </CardTitle>
            <Users className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">{learners.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Students across cohorts</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-2xl shadow-xs bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Pending Grading
            </CardTitle>
            <FileCheck2 className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-500">{pendingGradingCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Submissions awaiting feedback</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-2xl shadow-xs bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Graded Tasks
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">{gradedCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Completed reviews</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-4">
        <TabsList className="bg-muted/70 p-1 rounded-xl">
          <TabsTrigger value="overview" className="text-xs font-semibold gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Workspace Overview
          </TabsTrigger>
          <TabsTrigger value="courses" className="text-xs font-semibold gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Course Sessions ({courses.length})
          </TabsTrigger>
          <TabsTrigger value="grading" className="text-xs font-semibold gap-1.5 relative">
            <FileCheck2 className="h-3.5 w-3.5" />
            <span>Assignments & Grading</span>
            {pendingGradingCount > 0 && (
              <Badge className="ml-1.5 h-4 w-4 p-0 text-[10px] bg-amber-500 text-white flex items-center justify-center rounded-full">
                {pendingGradingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="learners" className="text-xs font-semibold gap-1.5">
            <Users className="h-3.5 w-3.5" /> Enrolled Learners ({learners.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Quick Actions */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card
              onClick={() => setBuilderOpen(true)}
              className="p-5 border border-border/80 rounded-2xl hover:border-primary/60 hover:shadow-sm cursor-pointer transition-all bg-card"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                <Plus className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Create Course Module</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Establish curriculum modules, video lessons, and digital study guides.
              </p>
            </Card>

            <Card
              onClick={() => setActiveTab("grading")}
              className="p-5 border border-border/80 rounded-2xl hover:border-primary/60 hover:shadow-sm cursor-pointer transition-all bg-card"
            >
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Grade Submissions</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {pendingGradingCount} student tasks are currently awaiting score & feedback.
              </p>
            </Card>

            <Card
              onClick={() => setActiveTab("learners")}
              className="p-5 border border-border/80 rounded-2xl hover:border-primary/60 hover:shadow-sm cursor-pointer transition-all bg-card"
            >
              <div className="h-10 w-10 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center mb-3">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Learner Roster</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Monitor student completion rates and send 1-on-1 direct messages.
              </p>
            </Card>
          </div>

          {/* Recent Submissions needing attention */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Tasks Needing Marking
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab("grading")}
                className="text-xs text-primary hover:underline h-7"
              >
                View all submissions
              </Button>
            </div>

            {submissions.filter((s) => s.grade === null).length === 0 ? (
              <Card className="p-8 text-center border-dashed border-border/80 bg-card">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
                <h4 className="text-xs font-bold text-foreground">All caught up!</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  No submissions currently awaiting grading.
                </p>
              </Card>
            ) : (
              <div className="rounded-2xl border border-border/80 overflow-hidden bg-card">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border/70 font-semibold">
                    <tr>
                      <th className="p-3">Student</th>
                      <th className="p-3">Assignment</th>
                      <th className="p-3">Submitted</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {submissions
                      .filter((s) => s.grade === null)
                      .slice(0, 5)
                      .map((sub) => (
                        <tr key={sub.id} className="hover:bg-muted/30">
                          <td className="p-3 font-semibold text-foreground">{sub.student_name}</td>
                          <td className="p-3 text-muted-foreground">{sub.assignment_title}</td>
                          <td className="p-3 text-muted-foreground">
                            {new Date(sub.submitted_at).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              size="sm"
                              onClick={() => openGradingDialog(sub)}
                              className="text-xs h-7 bg-primary text-primary-foreground font-semibold"
                            >
                              Grade Now
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Course Sessions */}
        <TabsContent value="courses" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Instructional Units & Sessions</h3>
            <Button
              onClick={() => setBuilderOpen(true)}
              size="sm"
              className="text-xs h-8 bg-primary text-primary-foreground font-semibold"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add New Course
            </Button>
          </div>

          {courses.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-border/80 bg-card">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h4 className="text-base font-bold text-foreground">No courses created yet</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Launch the curriculum builder to configure sessions, upload video lessons, and write lecture notes.
              </p>
              <Button onClick={() => setBuilderOpen(true)} size="sm" className="mt-4 text-xs">
                Launch Course Builder
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <Card
                  key={course.id}
                  className="border border-border/80 rounded-2xl p-4 flex flex-col justify-between bg-card hover:border-primary/50 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="font-mono text-[10px] text-primary">
                        {course.code}
                      </Badge>
                      <Badge
                        className={`text-[10px] font-semibold ${
                          course.is_published
                            ? "bg-emerald-600/10 text-emerald-600"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {course.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>

                    <h4 className="font-bold text-sm text-foreground line-clamp-1">{course.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {course.description || "Comprehensive instructional session."}
                    </p>
                  </div>

                  <div className="pt-3 mt-4 border-t border-border/70 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-600">
                      {course.price > 0 ? `KES ${course.price.toLocaleString()}` : "Free"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNoteCourseId(course.id);
                        setNoteTitle(`Study Guide: ${course.title}`);
                        setNotesModalOpen(true);
                      }}
                      className="text-xs h-7 text-primary hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1" /> Add Notes
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Assignments & Grading */}
        <TabsContent value="grading" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Student Submissions & Marking Ledger</h3>
              <p className="text-xs text-muted-foreground">
                Review submitted coursework, award numerical marks (0-100), and write actionable feedback.
              </p>
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search student or assignment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-input bg-card pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {filteredSubmissions.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-border/80 bg-card">
              <FileCheck2 className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h4 className="text-base font-bold text-foreground">No submissions found</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Student submissions will appear here once learners complete module assignments.
              </p>
            </Card>
          ) : (
            <div className="rounded-2xl border border-border/80 overflow-hidden bg-card">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border/70 font-semibold">
                  <tr>
                    <th className="p-3">Student</th>
                    <th className="p-3">Assignment Title</th>
                    <th className="p-3">Submitted At</th>
                    <th className="p-3">Status / Grade</th>
                    <th className="p-3">Feedback</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredSubmissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-muted/30">
                      <td className="p-3 font-semibold text-foreground">{sub.student_name}</td>
                      <td className="p-3 text-muted-foreground font-medium">{sub.assignment_title}</td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(sub.submitted_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        {sub.grade !== null ? (
                          <Badge className="bg-emerald-600/10 text-emerald-600 font-bold text-[10px]">
                            {sub.grade} / 100 Pts
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-600 font-bold text-[10px]">
                            Pending Grade
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground truncate max-w-[200px]">
                        {sub.feedback || "—"}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          onClick={() => openGradingDialog(sub)}
                          className={`text-xs h-7 font-semibold ${
                            sub.grade !== null
                              ? "border border-border text-foreground bg-card hover:bg-muted"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {sub.grade !== null ? "Edit Grade" : "Grade"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Tab 4: Enrolled Learners */}
        <TabsContent value="learners" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Enrolled Students Roster</h3>
            <span className="text-xs text-muted-foreground">{learners.length} active students</span>
          </div>

          {learners.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-border/80 bg-card">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h4 className="text-base font-bold text-foreground">No students enrolled yet</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Students who enroll in your courses via M-Pesa will be listed here with contact details.
              </p>
            </Card>
          ) : (
            <div className="rounded-2xl border border-border/80 overflow-hidden bg-card">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border/70 font-semibold">
                  <tr>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Phone / Contact</th>
                    <th className="p-3">Enrolled Sessions</th>
                    <th className="p-3">Curriculum Progress</th>
                    <th className="p-3 text-right">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {learners.map((learner) => (
                    <tr key={learner.userId} className="hover:bg-muted/30">
                      <td className="p-3 font-semibold text-foreground flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">
                          {learner.displayName.charAt(0)}
                        </div>
                        <span>{learner.displayName}</span>
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">{learner.phoneNumber || "N/A"}</td>
                      <td className="p-3 text-muted-foreground">
                        {learner.enrolledCourses.length > 0 ? learner.enrolledCourses.length : 1} session(s)
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 max-w-[120px]">
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-primary h-full rounded-full transition-all"
                              style={{ width: `${learner.progressPercentage}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-muted-foreground">
                            {learner.progressPercentage}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onNavigateToMessages?.(learner.userId)}
                          className="text-xs h-7 border-border"
                        >
                          <MessageSquare className="h-3 w-3 mr-1 text-primary" />
                          Message
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal: Grade Submission */}
      <Dialog open={gradingModalOpen} onOpenChange={setGradingModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Grade Student Submission
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review student response and award points with constructive feedback.
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-1">
                <p className="font-semibold text-foreground">
                  Student: <span className="text-primary font-bold">{selectedSubmission.student_name}</span>
                </p>
                <p className="text-muted-foreground">
                  Assignment: <span className="font-medium text-foreground">{selectedSubmission.assignment_title}</span>
                </p>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-foreground">Submitted Work</label>
                <div className="p-3 rounded-xl border border-input bg-card max-h-40 overflow-y-auto leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {selectedSubmission.submission_text || "No written text submitted."}
                </div>
                {selectedSubmission.file_url && (
                  <a
                    href={selectedSubmission.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-primary font-semibold hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open Attached File / Project URL
                  </a>
                )}
              </div>

              <div>
                <label className="block font-semibold mb-1 text-foreground">Score (0 - 100 Points)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={gradeScore}
                  onChange={(e) => setGradeScore(Number(e.target.value))}
                  className="w-full rounded-xl border border-input bg-card px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-foreground">Instructor Feedback</label>
                <textarea
                  rows={3}
                  placeholder="Provide constructive feedback for the student..."
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  className="w-full rounded-xl border border-input bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGradingModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={gradeMutation.isPending}
              onClick={() => gradeMutation.mutate()}
              className="bg-primary text-primary-foreground font-semibold text-xs"
            >
              {gradeMutation.isPending ? "Saving Grade…" : "Save Grade & Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Add Lesson Notes */}
      <Dialog open={notesModalOpen} onOpenChange={setNotesModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Add Module Study Notes
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload lecture notes, summary guides, and references for students.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="block font-semibold mb-1">Target Course</label>
              <select
                value={noteCourseId}
                onChange={(e) => setNoteCourseId(e.target.value)}
                className="w-full rounded-xl border border-input bg-card px-3 py-2 text-xs"
              >
                <option value="">Select course...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Note Title</label>
              <input
                type="text"
                placeholder="e.g. Week 2 Lecture Notes & Cheatsheet"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="w-full rounded-xl border border-input bg-card px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Content & Instructions</label>
              <textarea
                rows={4}
                placeholder="Write study notes or key bullet points..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="w-full rounded-xl border border-input bg-card px-3 py-2 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setNotesModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={saveNoteMutation.isPending || !noteTitle}
              onClick={() => saveNoteMutation.mutate()}
              className="bg-primary text-primary-foreground font-semibold text-xs"
            >
              {saveNoteMutation.isPending ? "Saving…" : "Save Notes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Course Builder Modal */}
      {institutionId && (
        <CourseBuilderModal
          open={builderOpen}
          onOpenChange={setBuilderOpen}
          institutionId={institutionId}
        />
      )}
    </div>
  );
}
