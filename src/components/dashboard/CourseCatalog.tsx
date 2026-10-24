import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Search,
  Smartphone,
  CheckCircle,
  GraduationCap,
  Clock,
  User,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listCourses, enrollInFreeCourse, type CourseSummary } from "@/lib/course.functions";
import { MpesaPaymentModal } from "@/components/dashboard/MpesaPaymentModal";

interface CourseCatalogProps {
  institutionId?: string;
}

export function CourseCatalog({ institutionId }: CourseCatalogProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "free" | "paid">("all");
  const [selectedCourseForPayment, setSelectedCourseForPayment] = useState<CourseSummary | null>(
    null,
  );
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["courses", institutionId],
    queryFn: () => listCourses({ data: { institution_id: institutionId, published_only: true } }),
  });

  const freeEnrollMutation = useMutation({
    mutationFn: (courseId: string) => enrollInFreeCourse({ data: { course_id: courseId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });

  const handleEnrollClick = (course: CourseSummary) => {
    if (course.price > 0) {
      setSelectedCourseForPayment(course);
      setPaymentModalOpen(true);
    } else {
      freeEnrollMutation.mutate(course.id);
    }
  };

  const filtered = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    const matchesPrice =
      filter === "all" ||
      (filter === "free" && c.price === 0) ||
      (filter === "paid" && c.price > 0);
    return matchesSearch && matchesPrice;
  });

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search catalog by title, code, keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex rounded-md border border-input p-0.5 text-xs">
          {(["all", "free", "paid"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-3 py-1 capitalize transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "paid" ? "Lipa na M-Pesa" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading course catalog…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/80 p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
          <h3 className="text-base font-semibold text-foreground">No courses available yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Check back soon or create new courses in the Faculty Studio.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <Card
              key={course.id}
              className="flex flex-col border border-border/80 shadow-sm overflow-hidden hover:border-primary/50 transition-colors"
            >
              <div className="h-36 bg-gradient-to-br from-primary/15 via-muted to-muted/40 p-4 flex flex-col justify-between border-b border-border/50">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-xs bg-background/80">
                    {course.code}
                  </Badge>
                  <Badge
                    variant={course.price > 0 ? "secondary" : "default"}
                    className={
                      course.price === 0 ? "bg-emerald-600 hover:bg-emerald-600 text-white" : ""
                    }
                  >
                    {course.price > 0
                      ? `${course.currency} ${course.price.toLocaleString()}`
                      : "Free Course"}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground line-clamp-1">
                    {course.title}
                  </h3>
                </div>
              </div>

              <CardContent className="flex-1 pt-4 space-y-3">
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {course.description ||
                    "Comprehensive modular course designed by academic educators."}
                </p>

                {course.instructor_name && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span>Instructor: {course.instructor_name}</span>
                  </div>
                )}
              </CardContent>

              <CardFooter className="border-t border-border/50 pt-3 flex items-center justify-between">
                {course.enrolled ? (
                  <Badge className="bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-600/20 py-1 px-3">
                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Enrolled
                  </Badge>
                ) : course.price > 0 ? (
                  <Button
                    size="sm"
                    onClick={() => handleEnrollClick(course)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  >
                    <Smartphone className="h-3.5 w-3.5 mr-1.5" />
                    Lipa na M-Pesa ({course.currency} {course.price})
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleEnrollClick(course)}
                    disabled={freeEnrollMutation.isPending}
                    className="w-full bg-primary text-primary-foreground font-medium"
                  >
                    <GraduationCap className="h-3.5 w-3.5 mr-1.5" />
                    Enroll for Free
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* M-Pesa Payment Dialog */}
      <MpesaPaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        course={selectedCourseForPayment}
      />
    </div>
  );
}
