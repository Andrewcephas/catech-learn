import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Award, AlertCircle, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getQuizDetailsFn, submitQuizAttemptFn } from "@/lib/assessment.functions";

interface QuizPlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizId: string;
  courseTitle: string;
  onPassed?: (certNumber?: string) => void;
}

export function QuizPlayerModal({
  open,
  onOpenChange,
  quizId,
  courseTitle,
  onPassed,
}: QuizPlayerModalProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(600); // 10 mins default
  const [attemptResult, setAttemptResult] = useState<{
    score: number;
    passed: boolean;
    passScore: number;
    certificateNumber?: string | null;
  } | null>(null);

  const { data: quiz, isLoading } = useQuery({
    queryKey: ["quiz-details", quizId],
    queryFn: () => getQuizDetailsFn({ data: { quiz_id: quizId } }),
    enabled: open && !!quizId,
  });

  // Reset state on open
  useEffect(() => {
    if (open) {
      setCurrentIdx(0);
      setSelectedAnswers({});
      setAttemptResult(null);
      setTimeLeft(quiz?.time_limit_minutes ? quiz.time_limit_minutes * 60 : 600);
    }
  }, [open, quiz]);

  // Timer countdown
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (open && !attemptResult && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [open, attemptResult, timeLeft]);

  // Submission mutation
  const submitMutation = useMutation({
    mutationFn: () => {
      const answers = Object.entries(selectedAnswers).map(([question_id, selected_option_id]) => ({
        question_id,
        selected_option_id,
      }));
      return submitQuizAttemptFn({
        data: {
          quiz_id: quizId,
          answers,
        },
      });
    },
    onSuccess: (res) => {
      setAttemptResult({
        score: res.score,
        passed: res.passed,
        passScore: res.passScore,
        certificateNumber: res.certificateNumber,
      });
      if (res.passed && onPassed) {
        onPassed(res.certificateNumber || undefined);
      }
    },
  });

  if (!quiz && isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md p-8 text-center">
          Loading assessment content…
        </DialogContent>
      </Dialog>
    );
  }

  // Fallback demo questions if quiz has no questions yet in DB
  const defaultQuestions = [
    {
      id: "demo-q1",
      question_text: "What is the primary architectural principle of CATECH Learn multi-tenancy?",
      points: 1,
      options: [
        { id: "opt-1", option_text: "Client-side URL parsing without server isolation" },
        { id: "opt-2", option_text: "Row Level Security with server-enforced tenant boundaries" },
        { id: "opt-3", option_text: "Shared database tables with public read access" },
      ],
    },
    {
      id: "demo-q2",
      question_text: "How are M-Pesa payments verified before activating course access?",
      points: 1,
      options: [
        { id: "opt-4", option_text: "Taking a screenshot of the phone SMS" },
        {
          id: "opt-5",
          option_text: "Automatic server-side STK Query verification with ResultCode 0",
        },
        { id: "opt-6", option_text: "Manual student self-declaration" },
      ],
    },
  ];

  const questions =
    quiz?.questions && quiz.questions.length > 0 ? quiz.questions : defaultQuestions;
  const currentQuestion = questions[currentIdx];

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <DialogTitle>{quiz?.title || "Course Mastery Examination"}</DialogTitle>
              <DialogDescription>{courseTitle}</DialogDescription>
            </div>
            {!attemptResult && (
              <Badge
                variant="outline"
                className="font-mono text-xs flex items-center gap-1.5 py-1 px-2.5"
              >
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span>{formatTimer(timeLeft)}</span>
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Results Screen */}
        {attemptResult ? (
          <div className="py-6 text-center space-y-4">
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                attemptResult.passed
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60"
                  : "bg-amber-100 text-amber-600 dark:bg-amber-950/60"
              }`}
            >
              {attemptResult.passed ? (
                <Award className="h-8 w-8" />
              ) : (
                <AlertCircle className="h-8 w-8" />
              )}
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-foreground">
                {attemptResult.passed ? "Examination Passed!" : "Passing Mark Not Reached"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                You scored{" "}
                <strong className="text-foreground">{Math.round(attemptResult.score)}%</strong>.
                Pass score required was {attemptResult.passScore}%.
              </p>
            </div>

            {attemptResult.passed && attemptResult.certificateNumber && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-left space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Official Accredited Certificate Generated!</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  Certificate ID:{" "}
                  <strong className="text-foreground">{attemptResult.certificateNumber}</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  Your accredited digital credential has been registered in the CATECH verification
                  system.
                </p>
              </div>
            )}

            <DialogFooter className="pt-4 flex flex-wrap justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAttemptResult(null);
                  setCurrentIdx(0);
                  setSelectedAnswers({});
                  setTimeLeft(600);
                }}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Retake Assessment
              </Button>
              <Button
                onClick={() => onOpenChange(false)}
                className="bg-primary text-primary-foreground"
              >
                Done & Return to Course
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Question Display */
          <div className="space-y-6 py-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>
                Question {currentIdx + 1} of {questions.length}
              </span>
              <span>Points: {currentQuestion.points}</span>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h4 className="font-semibold text-base text-foreground leading-relaxed">
                {currentQuestion.question_text}
              </h4>
            </div>

            {/* Answer Choices */}
            <div className="space-y-2.5">
              {currentQuestion.options.map((opt) => {
                const isSelected = selectedAnswers[currentQuestion.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
                    className={`w-full rounded-lg border p-3.5 text-left text-sm transition-all flex items-center justify-between ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                        : "border-border bg-background hover:bg-muted/40 text-foreground"
                    }`}
                  >
                    <span>{opt.option_text}</span>
                    <span
                      className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-muted-foreground"
                      }`}
                    >
                      {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
              >
                Previous
              </Button>

              {currentIdx < questions.length - 1 ? (
                <Button
                  size="sm"
                  onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="bg-primary text-primary-foreground"
                >
                  Next Question <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {submitMutation.isPending ? "Grading Answers…" : "Submit Examination"}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
