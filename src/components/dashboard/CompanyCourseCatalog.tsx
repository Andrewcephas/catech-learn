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
  Building2,
  PlayCircle,
  Sparkles,
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

interface CompanyCourseCatalogProps {
  company: { id: string; name: string; code: string } | null;
  onStartLearning: (courseId: string) => void;
  onSwitchCompanyClick: () => void;
}

export function CompanyCourseCatalog({
  company,
  onStartLearning,
  onSwitchCompanyClick,
}: CompanyCourseCatalogProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "free" | "paid">("all");
  const [selectedCourseForPayment, setSelectedCourseForPayment] = useState<CourseSummary | null>(
    null,
  );
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["courses", company?.id],
    queryFn: () =>
      listCourses({
        data: {
          institution_id: company?.id,
          published_only: true,
        },
      }),
  });

  const freeEnrollMutation = useMutation({
    mutationFn: (courseId: string) => enrollInFreeCourse({ data: { course_id: courseId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });

  const handleEnrollClick = (course: CourseSummary) => {
    if (course.enrolled) {
      onStartLearning(course.id);
    } else if (course.price > 0) {
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
      {/* Company Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-gradient-to-r from-primary/10 via-background to-card border border-border/80 p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-primary/20 text-primary">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Selected Institution Sessions
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {company ? `${company.name} Course Sessions` : "All Educational Offerings"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {company
              ? `Showing academic cohorts and sessions exclusively offered by ${company.name} (${company.code}).`
              : "Choose an institution to unlock structured courses and verified credentials."}
          </p>
        </div>

        {company && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSwitchCompanyClick}
            className="border-primary/40 text-xs shrink-0"
          >
            <Building2 className="h-3.5 w-3.5 mr-1 text-primary" />
            Switch Company
          </Button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search sessions by title, topic or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex rounded-xl border border-input p-1 bg-muted/60 text-xs">
          {(["all", "free", "paid"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1 capitalize font-medium transition-all ${
                filter === f
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "paid" ? "🟢 Lipa na M-Pesa" : f === "free" ? "Free Sessions" : "All Offerings"}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse h-64 border border-border/60 bg-muted/30" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-border/80 p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-bold text-foreground">No sessions available</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {search
              ? `No sessions matched "${search}".`
              : `${company?.name || "This company"} has not published any open sessions yet. Check back shortly or switch companies.`}
          </p>
          {company && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSwitchCompanyClick}
              className="mt-4 text-xs"
            >
              Browse Other Companies
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <Card
              key={course.id}
              className="border border-border/80 rounded-2xl flex flex-col justify-between hover:border-primary/50 hover:shadow-lg transition-all duration-200 overflow-hidden bg-card"
            >
              {/* Card Header */}
              <div className="h-32 bg-gradient-to-br from-primary/20 via-primary/5 to-muted/50 p-4 flex flex-col justify-between border-b border-border/60">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="font-mono text-[10px] font-bold">
                    {course.code}
                  </Badge>
                  {course.enrolled ? (
                    <Badge className="bg-emerald-600 text-white font-semibold text-[10px]">
                      <CheckCircle className="h-3 w-3 mr-1" /> Enrolled
                    </Badge>
                  ) : course.price > 0 ? (
                    <Badge className="bg-emerald-600/15 text-emerald-600 border border-emerald-600/30 font-bold text-[10px]">
                      KES {course.price.toLocaleString()}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-600/40 text-[10px] font-bold">
                      Free Session
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span className="truncate">{course.instructor_name || "Company Faculty"}</span>
                </div>
              </div>

              {/* Card Body */}
              <CardContent className="pt-4 pb-2 space-y-2 flex-1">
                <CardTitle className="text-base font-bold text-foreground line-clamp-1">
                  {course.title}
                </CardTitle>
                <CardDescription className="text-xs line-clamp-3 leading-relaxed">
                  {course.description || "Comprehensive hands-on curriculum with accredited certificate on completion."}
                </CardDescription>

                <div className="pt-3 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" /> Self-Paced / Live
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                    <Smartphone className="h-3 w-3" /> M-Pesa Verified
                  </span>
                </div>
              </CardContent>

              {/* Card Footer */}
              <CardFooter className="pt-3 pb-4 border-t border-border/70">
                {course.enrolled ? (
                  <Button
                    onClick={() => onStartLearning(course.id)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 shadow-sm"
                  >
                    <PlayCircle className="h-4 w-4 mr-1.5" />
                    Start Learning
                  </Button>
                ) : course.price > 0 ? (
                  <Button
                    onClick={() => handleEnrollClick(course)}
                    className="w-full bg-primary text-primary-foreground font-bold text-xs h-9 shadow-sm"
                  >
                    <Smartphone className="h-4 w-4 mr-1.5" />
                    Enroll & Pay via M-Pesa
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleEnrollClick(course)}
                    disabled={freeEnrollMutation.isPending}
                    variant="outline"
                    className="w-full border-primary/50 text-foreground hover:bg-primary hover:text-primary-foreground font-semibold text-xs h-9"
                  >
                    <GraduationCap className="h-4 w-4 mr-1.5 text-primary" />
                    {freeEnrollMutation.isPending ? "Enrolling…" : "Enroll Free"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* M-Pesa Payment Modal */}
      {selectedCourseForPayment && (
        <MpesaPaymentModal
          course={selectedCourseForPayment}
          open={paymentModalOpen}
          onOpenChange={(open) => {
            setPaymentModalOpen(open);
            if (!open) {
              void queryClient.invalidateQueries({ queryKey: ["courses"] });
              void queryClient.invalidateQueries({ queryKey: ["user-payments"] });
            }
          }}
          onPaymentSuccess={() => {
            void queryClient.invalidateQueries({ queryKey: ["courses"] });
            void queryClient.invalidateQueries({ queryKey: ["user-payments"] });
            onStartLearning(selectedCourseForPayment.id);
          }}
        />
      )}
    </div>
  );
}
