import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Video,
  FileText,
  Award,
  BookOpen,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  getCourseWithCurriculum,
  updateLessonProgressFn,
  type LessonItem,
} from "@/lib/course.functions";
import { QuizPlayerModal } from "@/components/dashboard/QuizPlayerModal";

interface CourseLearningPlayerProps {
  courseId: string;
  onBack: () => void;
}

export function CourseLearningPlayer({ courseId, onBack }: CourseLearningPlayerProps) {
  const queryClient = useQueryClient();
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [earnedCert, setEarnedCert] = useState<string | null>(null);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course-curriculum", courseId],
    queryFn: () => getCourseWithCurriculum({ data: { course_id: courseId } }),
  });

  const progressMutation = useMutation({
    mutationFn: (lessonId: string) =>
      updateLessonProgressFn({
        data: {
          lesson_id: lessonId,
          completed: true,
          last_position_seconds: 0,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["course-curriculum", courseId] });
      void queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });

  if (isLoading || !course) {
    return (
      <div className="py-20 text-center text-muted-foreground">Loading curriculum workspace…</div>
    );
  }

  // Flatten all lessons to enable linear sequential navigation
  const allLessons: LessonItem[] = course.modules.flatMap((m) => m.lessons);
  const currentLesson = allLessons.find((l) => l.id === activeLessonId) || allLessons[0] || null;

  const completedCount = allLessons.filter((l) => l.completed).length;
  const progressPercent =
    allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0;

  const currentLessonIndex = allLessons.findIndex((l) => l.id === currentLesson?.id);
  const nextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < allLessons.length - 1
      ? allLessons[currentLessonIndex + 1]
      : null;

  const handleCompleteAndNext = () => {
    if (currentLesson) {
      progressMutation.mutate(currentLesson.id);
      if (nextLesson) {
        setActiveLessonId(nextLesson.id);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Top Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Dashboard
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">{course.title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="font-mono text-xs">
                {course.code}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Progress: {completedCount} of {allLessons.length} lessons completed (
                {progressPercent}%)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setQuizModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs"
          >
            <Award className="h-4 w-4 mr-1.5" /> Take Final Exam & Earn Certificate
          </Button>
        </div>
      </div>

      <Progress value={progressPercent} className="h-2 w-full" />

      {/* Main Learning Workspace */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lesson View Area (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {currentLesson ? (
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
              {/* Video Player Header */}
              {currentLesson.video_url ? (
                <div className="aspect-video w-full bg-black relative flex items-center justify-center">
                  {currentLesson.video_url.includes("youtube.com") ||
                  currentLesson.video_url.includes("youtu.be") ? (
                    <iframe
                      src={
                        currentLesson.video_url.includes("watch?v=")
                          ? currentLesson.video_url.replace("watch?v=", "embed/")
                          : currentLesson.video_url
                      }
                      title={currentLesson.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={currentLesson.video_url}
                      controls
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              ) : (
                <div className="p-6 bg-gradient-to-r from-primary/10 via-muted to-muted/30 border-b border-border/60">
                  <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase">
                    <FileText className="h-4 w-4" /> Reading & Interactive Module
                  </div>
                  <h3 className="text-2xl font-bold mt-1 text-foreground">{currentLesson.title}</h3>
                </div>
              )}

              {/* Lesson Body */}
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{currentLesson.title}</h3>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Est. Time: {currentLesson.duration_minutes} minutes</span>
                    {currentLesson.completed && (
                      <span className="flex items-center text-emerald-600 font-semibold gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                      </span>
                    )}
                  </div>
                </div>

                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed whitespace-pre-line border-t border-border/60 pt-4">
                  {currentLesson.content ||
                    "Welcome to this lesson module. Watch the instructional presentation above and review syllabus materials."}
                </div>

                {/* Lesson Actions */}
                <div className="flex items-center justify-between border-t border-border/60 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => progressMutation.mutate(currentLesson.id)}
                    disabled={currentLesson.completed || progressMutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-600" />
                    {currentLesson.completed ? "Lesson Completed" : "Mark Lesson Complete"}
                  </Button>

                  {nextLesson ? (
                    <Button
                      size="sm"
                      onClick={handleCompleteAndNext}
                      className="bg-primary text-primary-foreground"
                    >
                      Complete & Next Lesson <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setQuizModalOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Award className="h-4 w-4 mr-1.5" /> Complete Course & Take Exam
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
              No lessons have been published for this course yet.
            </div>
          )}
        </div>

        {/* Curriculum Syllabus Sidebar (1 col) */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
            <h4 className="font-bold text-base text-foreground mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Course Curriculum
            </h4>

            <div className="space-y-4">
              {course.modules.map((mod, modIdx) => (
                <div key={mod.id} className="space-y-2">
                  <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                    Module {modIdx + 1}: {mod.title}
                  </p>
                  <div className="space-y-1">
                    {mod.lessons.map((les) => {
                      const isCurrent = currentLesson?.id === les.id;
                      return (
                        <button
                          key={les.id}
                          type="button"
                          onClick={() => setActiveLessonId(les.id)}
                          className={`w-full rounded-lg p-2.5 text-left text-xs transition-colors flex items-center justify-between ${
                            isCurrent
                              ? "bg-primary/10 text-primary font-bold"
                              : "hover:bg-muted/50 text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {les.completed ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                            <span className="truncate">{les.title}</span>
                          </div>
                          {les.video_url && (
                            <Video className="h-3 w-3 text-muted-foreground shrink-0 ml-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Final Examination Modal */}
      <QuizPlayerModal
        open={quizModalOpen}
        onOpenChange={setQuizModalOpen}
        quizId={course.id}
        courseTitle={course.title}
        onPassed={(certNumber) => {
          if (certNumber) setEarnedCert(certNumber);
        }}
      />
    </div>
  );
}
