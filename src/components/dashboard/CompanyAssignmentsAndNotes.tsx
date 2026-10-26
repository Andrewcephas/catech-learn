import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileCheck2,
  FileText,
  Plus,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  Download,
  AlertCircle,
  ExternalLink,
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
import {
  listCompanyAssignments,
  createCompanyAssignmentFn,
  saveCompanyLessonNoteFn,
} from "@/lib/company.functions";
import { listCourses } from "@/lib/course.functions";
import { submitAssignmentFn, gradeAssignmentFn } from "@/lib/assessment.functions";

interface CompanyAssignmentsAndNotesProps {
  institutionId?: string | undefined;
  isCompanyAdmin?: boolean;
}

export function CompanyAssignmentsAndNotes({
  institutionId,
  isCompanyAdmin = true,
}: CompanyAssignmentsAndNotesProps) {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<"assignments" | "notes">("assignments");

  // Assignment Modal State
  const [createAssignOpen, setCreateAssignOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [moduleTitle, setModuleTitle] = useState("");
  const [assignTitle, setAssignTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxPoints, setMaxPoints] = useState(100);

  // Notes Modal State
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [noteLessonId, setNoteLessonId] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteFileUrl, setNoteFileUrl] = useState("");

  // Student Submission Modal
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [submissionText, setSubmissionText] = useState("");
  const [submissionFileUrl, setSubmissionFileUrl] = useState("");

  // Fetch Courses
  const { data: courses = [] } = useQuery({
    queryKey: ["courses", institutionId],
    queryFn: () => listCourses({ data: { institution_id: institutionId } }),
  });

  // Fetch Assignments
  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ["company-assignments", institutionId],
    queryFn: () => listCompanyAssignments({ data: { institution_id: institutionId } }),
  });

  // Mutations
  const createAssignMutation = useMutation({
    mutationFn: () =>
      createCompanyAssignmentFn({
        data: {
          course_id: selectedCourseId,
          title: moduleTitle ? `[${moduleTitle}] ${assignTitle}` : assignTitle,
          instructions,
          due_date: dueDate || undefined,
          max_points: maxPoints,
        },
      }),
    onSuccess: () => {
      setCreateAssignOpen(false);
      setAssignTitle("");
      setInstructions("");
      setModuleTitle("");
      void queryClient.invalidateQueries({ queryKey: ["company-assignments"] });
    },
  });

  const saveNotesMutation = useMutation({
    mutationFn: () =>
      saveCompanyLessonNoteFn({
        data: {
          lesson_id: noteLessonId,
          title: noteTitle,
          content: noteContent,
          file_url: noteFileUrl || undefined,
        },
      }),
    onSuccess: () => {
      setNotesModalOpen(false);
      setNoteTitle("");
      setNoteContent("");
      setNoteFileUrl("");
      void queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });

  const submitAssignMutation = useMutation({
    mutationFn: () =>
      submitAssignmentFn({
        data: {
          assignment_id: selectedAssignmentId,
          submission_text: submissionText,
          file_url: submissionFileUrl || undefined,
        },
      }),
    onSuccess: () => {
      setSubmitModalOpen(false);
      setSubmissionText("");
      setSubmissionFileUrl("");
      void queryClient.invalidateQueries({ queryKey: ["company-assignments"] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <FileCheck2 className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Module Assignments & Lesson Notes
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {isCompanyAdmin
              ? "Create structured assignments for specific course modules, provide rich lesson notes, and review student submissions."
              : "Access study notes, submit your module coursework, and view feedback from your instructors."}
          </p>
        </div>

        {isCompanyAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                if (courses.length > 0 && !selectedCourseId) {
                  setSelectedCourseId(courses[0]?.id ?? "");
                }
                setCreateAssignOpen(true);
              }}
              className="bg-primary text-primary-foreground text-xs font-semibold"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Assignment
            </Button>
            <Button
              variant="outline"
              onClick={() => setNotesModalOpen(true)}
              className="border-primary/40 hover:bg-primary/10 text-xs font-semibold"
            >
              <FileText className="h-4 w-4 mr-1.5 text-primary" />
              Add Study Notes
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as typeof subTab)}>
        <TabsList className="bg-muted/70 p-1 rounded-xl">
          <TabsTrigger value="assignments" className="text-xs font-semibold gap-1.5">
            <FileCheck2 className="h-3.5 w-3.5" /> Module Assignments ({assignments.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs font-semibold gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Lesson Notes & Documents
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Module Assignments */}
        <TabsContent value="assignments" className="mt-6 space-y-4">
          {loadingAssignments ? (
            <p className="text-xs text-muted-foreground animate-pulse text-center py-8">
              Loading assignments…
            </p>
          ) : assignments.length === 0 ? (
            <Card className="border-dashed border-border/80 p-12 text-center">
              <FileCheck2 className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-bold text-foreground">No assignments posted yet</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {isCompanyAdmin
                  ? "Click 'Create Assignment' above to design tasks for your course modules."
                  : "Your instructors haven't posted any assignments for this session yet."}
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {assignments.map((item) => (
                <Card
                  key={item.id}
                  className="border border-border/80 rounded-2xl flex flex-col justify-between hover:border-primary/50 transition-all bg-card"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] text-primary truncate max-w-[180px]">
                        {item.course_title}
                      </Badge>
                      <Badge className="bg-emerald-600/10 text-emerald-600 font-semibold text-[10px]">
                        {item.max_points} Pts
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-bold text-foreground mt-2 line-clamp-1">
                      {item.title}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-3 mt-1 leading-relaxed">
                      {item.instructions}
                    </CardDescription>
                  </CardHeader>

                  <CardFooter className="pt-3 border-t border-border/70 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {item.due_date ? new Date(item.due_date).toLocaleDateString() : "No deadline"}
                    </span>

                    {!isCompanyAdmin ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedAssignmentId(item.id);
                          setSubmitModalOpen(true);
                        }}
                        className="bg-primary text-primary-foreground text-xs h-7"
                      >
                        Submit Work
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        Active Task
                      </Badge>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Lesson Notes */}
        <TabsContent value="notes" className="mt-6 space-y-4">
          <Card className="border border-border/80 rounded-2xl p-6">
            <h3 className="text-base font-bold text-foreground mb-1">
              Curriculum Study Notes & Downloadable Materials
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Notes attached to specific modules are instantly synced to student learning dashboards and the course video player.
            </p>

            <div className="space-y-3">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="p-4 rounded-xl border border-border/60 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{course.title}</p>
                      <p className="text-[11px] text-muted-foreground">Code: {course.code}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCompanyAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setNoteTitle(`Study Guide: ${course.title}`);
                          setNotesModalOpen(true);
                        }}
                        className="text-xs h-8"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Notes
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Create Assignment */}
      <Dialog open={createAssignOpen} onOpenChange={setCreateAssignOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-primary" />
              Create Module Assignment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assign practical tasks, coding models, or case study prompts for enrolled students.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createAssignMutation.mutate();
            }}
            className="space-y-3 py-2 text-xs"
          >
            <div>
              <label className="block font-semibold mb-1">Target Course Session</label>
              <select
                required
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
              >
                <option value="" disabled>Select course...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title} ({c.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Module / Model Tag</label>
              <input
                type="text"
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
                placeholder="e.g. Module 3: Advanced Frontend or Model A"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Assignment Title</label>
              <input
                required
                type="text"
                value={assignTitle}
                onChange={(e) => setAssignTitle(e.target.value)}
                placeholder="e.g. Build an E-commerce Cart Component"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Instructions & Rubric</label>
              <textarea
                required
                rows={4}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Describe requirements, deliverables, and evaluation criteria..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Due Date (Optional)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Max Points</label>
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={maxPoints}
                  onChange={(e) => setMaxPoints(Number(e.target.value))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                />
              </div>
            </div>

            {createAssignMutation.error && (
              <p className="text-destructive font-medium text-xs">
                {createAssignMutation.error.message}
              </p>
            )}

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                type="button"
                size="sm"
                onClick={() => setCreateAssignOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createAssignMutation.isPending || !selectedCourseId || !assignTitle}
                className="bg-primary text-primary-foreground font-semibold"
              >
                {createAssignMutation.isPending ? "Creating…" : "Publish Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Add Notes & Study Materials */}
      <Dialog open={notesModalOpen} onOpenChange={setNotesModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Add Study Notes & Documents
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide downloadable materials, lecture transcripts or revision notes.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveNotesMutation.mutate();
            }}
            className="space-y-3 py-2 text-xs"
          >
            <div>
              <label className="block font-semibold mb-1">Note Title</label>
              <input
                required
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="e.g. Chapter 4 Summary & Formula Sheet"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Note Content (Markdown / Text)</label>
              <textarea
                rows={5}
                required
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Write revision points, key takeaways, code snippets..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs resize-none"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Attachment File / PDF URL (Optional)</label>
              <input
                type="url"
                value={noteFileUrl}
                onChange={(e) => setNoteFileUrl(e.target.value)}
                placeholder="https://example.com/slides.pdf"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                type="button"
                size="sm"
                onClick={() => setNotesModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saveNotesMutation.isPending || !noteTitle}
                className="bg-primary text-primary-foreground font-semibold"
              >
                {saveNotesMutation.isPending ? "Saving…" : "Save Notes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Student Submit Assignment */}
      <Dialog open={submitModalOpen} onOpenChange={setSubmitModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Submit Coursework
            </DialogTitle>
            <DialogDescription className="text-xs">
              Submit your project write-up or file repository URL for instructor review.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitAssignMutation.mutate();
            }}
            className="space-y-3 py-2 text-xs"
          >
            <div>
              <label className="block font-semibold mb-1">Submission Text / Solution Description</label>
              <textarea
                rows={4}
                required
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                placeholder="Describe your solution, methodology or results..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs resize-none"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">File or Repository URL (Optional)</label>
              <input
                type="url"
                value={submissionFileUrl}
                onChange={(e) => setSubmissionFileUrl(e.target.value)}
                placeholder="https://github.com/your-username/project or Cloud Link"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                type="button"
                size="sm"
                onClick={() => setSubmitModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitAssignMutation.isPending || !submissionText}
                className="bg-primary text-primary-foreground font-semibold"
              >
                {submitAssignMutation.isPending ? "Submitting…" : "Confirm Submission"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
