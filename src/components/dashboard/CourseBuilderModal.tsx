import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Video, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveCourseFn, saveModuleFn, saveLessonFn } from "@/lib/course.functions";

interface CourseBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId: string;
}

export function CourseBuilderModal({ open, onOpenChange, institutionId }: CourseBuilderModalProps) {
  const queryClient = useQueryClient();

  // Step 1: Course Info
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [isPublished, setIsPublished] = useState(true);

  // Created Course ID
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);

  // Step 2: Module Info
  const [moduleTitle, setModuleTitle] = useState("");
  const [createdModuleId, setCreatedModuleId] = useState<string | null>(null);

  // Step 3: Lesson Info
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonDuration, setLessonDuration] = useState(20);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Course Mutation
  const courseMutation = useMutation({
    mutationFn: () =>
      saveCourseFn({
        data: {
          institution_id: institutionId,
          title: title.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim(),
          price: Number(price),
          is_published: isPublished,
        },
      }),
    onSuccess: (res) => {
      setCreatedCourseId(res.id);
      setSuccessMessage("Course established! Now add your first curriculum module.");
      setErrorMessage("");
      void queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Failed to create course");
    },
  });

  // Module Mutation
  const moduleMutation = useMutation({
    mutationFn: () => {
      if (!createdCourseId) throw new Error("Course must be created first");
      return saveModuleFn({
        data: {
          course_id: createdCourseId,
          title: moduleTitle.trim(),
          sort_order: 1,
        },
      });
    },
    onSuccess: (res) => {
      setCreatedModuleId(res.id);
      setSuccessMessage("Curriculum module created! Add an introductory lesson or video link.");
      setErrorMessage("");
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Failed to create module");
    },
  });

  // Lesson Mutation
  const lessonMutation = useMutation({
    mutationFn: () => {
      if (!createdModuleId) throw new Error("Module must be created first");
      return saveLessonFn({
        data: {
          module_id: createdModuleId,
          title: lessonTitle.trim(),
          content: lessonContent.trim(),
          video_url: lessonVideoUrl.trim() || undefined,
          duration_minutes: Number(lessonDuration),
          sort_order: 1,
          is_free_preview: true,
        },
      });
    },
    onSuccess: () => {
      setSuccessMessage("Lesson added successfully! Curriculum is live for enrollment.");
      void queryClient.invalidateQueries({ queryKey: ["courses"] });
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Failed to create lesson");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 p-2 text-primary">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle>Visual Course Curriculum Studio</DialogTitle>
              <DialogDescription>
                Design structured courses, instructional modules, and video lecture content.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-md bg-destructive/10 p-3 text-xs text-destructive font-medium"
          >
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div
            role="status"
            className="rounded-md bg-emerald-500/10 p-3 text-xs text-emerald-600 font-medium flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Phase A: Course Base Details */}
        {!createdCourseId && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              courseMutation.mutate();
            }}
            className="space-y-4 py-2"
          >
            <div>
              <label
                className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5"
                htmlFor="c-title"
              >
                Course Title *
              </label>
              <input
                id="c-title"
                required
                maxLength={120}
                placeholder="e.g. Introduction to Cloud Architecture"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5"
                  htmlFor="c-code"
                >
                  Course Code *
                </label>
                <input
                  id="c-code"
                  required
                  maxLength={20}
                  placeholder="e.g. CS-101"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5"
                  htmlFor="c-price"
                >
                  Price (KES, 0 for Free) *
                </label>
                <input
                  id="c-price"
                  type="number"
                  min="0"
                  step="50"
                  required
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5"
                htmlFor="c-desc"
              >
                Course Description & Objectives
              </label>
              <textarea
                id="c-desc"
                rows={3}
                placeholder="Outline syllabus, key competencies, and prerequisites..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="c-publish"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-4 w-4 rounded border-input text-primary"
              />
              <label
                htmlFor="c-publish"
                className="text-xs font-medium text-foreground cursor-pointer"
              >
                Publish course immediately to student directory
              </label>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={courseMutation.isPending}
                className="bg-primary text-primary-foreground"
              >
                {courseMutation.isPending ? "Establishing…" : "Next: Add Curriculum Module"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Phase B: Module Creation */}
        {createdCourseId && !createdModuleId && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              moduleMutation.mutate();
            }}
            className="space-y-4 py-2"
          >
            <div>
              <label
                className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5"
                htmlFor="mod-title"
              >
                Module 1 Title *
              </label>
              <input
                id="mod-title"
                required
                placeholder="e.g. Module 1: Core Fundamentals & Principles"
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="submit"
                disabled={moduleMutation.isPending}
                className="bg-primary text-primary-foreground"
              >
                {moduleMutation.isPending ? "Saving Module…" : "Next: Add First Lesson"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Phase C: Lesson Creation */}
        {createdModuleId && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              lessonMutation.mutate();
            }}
            className="space-y-4 py-2"
          >
            <div>
              <label
                className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5"
                htmlFor="les-title"
              >
                Lesson Title *
              </label>
              <input
                id="les-title"
                required
                placeholder="e.g. Lesson 1.1: System Architecture Overview"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5"
                  htmlFor="les-video"
                >
                  Video Stream URL (Optional)
                </label>
                <div className="relative">
                  <Video className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    id="les-video"
                    type="url"
                    placeholder="https://...mp4 or YouTube/Vimeo"
                    value={lessonVideoUrl}
                    onChange={(e) => setLessonVideoUrl(e.target.value)}
                    className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5"
                  htmlFor="les-dur"
                >
                  Est. Minutes
                </label>
                <input
                  id="les-dur"
                  type="number"
                  min="1"
                  value={lessonDuration}
                  onChange={(e) => setLessonDuration(Number(e.target.value))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5"
                htmlFor="les-content"
              >
                Lecture Notes & Material Content
              </label>
              <textarea
                id="les-content"
                rows={4}
                placeholder="Key takeaways, rich text summary, lecture transcription..."
                value={lessonContent}
                onChange={(e) => setLessonContent(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="submit"
                disabled={lessonMutation.isPending}
                className="bg-primary text-primary-foreground"
              >
                {lessonMutation.isPending ? "Publishing Lesson…" : "Complete & Publish Course"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
