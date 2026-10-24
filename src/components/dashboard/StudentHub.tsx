import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  Award,
  BookOpen,
  Clock,
  CheckCircle,
  Smartphone,
  Receipt,
  Search,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listCourses } from "@/lib/course.functions";
import { listUserPayments } from "@/lib/payment.functions";
import { CourseCatalog } from "@/components/dashboard/CourseCatalog";
import { CourseLearningPlayer } from "@/components/dashboard/CourseLearningPlayer";

interface StudentHubProps {
  displayName: string;
}

export function StudentHub({ displayName }: StudentHubProps) {
  const [subTab, setSubTab] = useState<"my_courses" | "catalog" | "payments">("my_courses");
  const [playingCourseId, setPlayingCourseId] = useState<string | null>(null);

  const { data: allCourses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => listCourses(),
  });

  const enrolledCourses = allCourses.filter((c) => c.enrolled);

  const { data: payments = [] } = useQuery({
    queryKey: ["user-payments"],
    queryFn: () => listUserPayments(),
  });

  if (playingCourseId) {
    return (
      <CourseLearningPlayer courseId={playingCourseId} onBack={() => setPlayingCourseId(null)} />
    );
  }

  return (
    <div className="space-y-8">
      {/* Student Hub Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 p-1.5 text-primary">
              <GraduationCap className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight">Student Learning Hub</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Access your course materials, complete assessments, and track your accredited progress.
          </p>
        </div>
      </div>

      {/* Learning Progress Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Enrolled Courses
            </CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrolledCourses.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active curricula</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Modules
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">0</div>
            <p className="text-xs text-muted-foreground mt-1">Lessons mastered</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lipa na M-Pesa Receipts
            </CardTitle>
            <Smartphone className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{payments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Verified transactions</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Certificates Earned
            </CardTitle>
            <Award className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Verified credentials</p>
          </CardContent>
        </Card>
      </div>

      {/* Sub Tabs */}
      <Tabs
        value={subTab}
        onValueChange={(v) => setSubTab(v as typeof subTab)}
        className="space-y-6"
      >
        <TabsList className="bg-muted/60 p-1 rounded-lg">
          <TabsTrigger value="my_courses" className="gap-1.5 py-1.5 px-3 text-xs font-semibold">
            <BookOpen className="h-3.5 w-3.5" /> My Enrolled Courses ({enrolledCourses.length})
          </TabsTrigger>
          <TabsTrigger value="catalog" className="gap-1.5 py-1.5 px-3 text-xs font-semibold">
            <Search className="h-3.5 w-3.5" /> Browse Course Catalog
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5 py-1.5 px-3 text-xs font-semibold">
            <Receipt className="h-3.5 w-3.5" /> M-Pesa Receipts & Orders
          </TabsTrigger>
        </TabsList>

        {/* My Enrolled Courses */}
        <TabsContent value="my_courses">
          <Card className="border border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">My Active Enrolled Courses</CardTitle>
              <CardDescription>Resume learning modules and submit coursework.</CardDescription>
            </CardHeader>
            <CardContent>
              {enrolledCourses.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/80 p-12 text-center">
                  <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/60 mb-3" />
                  <h3 className="text-base font-semibold text-foreground">
                    No courses enrolled yet
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground max-w-md mx-auto">
                    Explore available courses in our catalog or enroll in courses offered by your
                    campus.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setSubTab("catalog")}
                    className="mt-4 bg-primary text-primary-foreground"
                  >
                    Browse Course Catalog
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {enrolledCourses.map((course) => (
                    <div
                      key={course.id}
                      className="rounded-lg border border-border p-4 bg-card space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="font-mono text-xs">
                          {course.code}
                        </Badge>
                        <Badge className="bg-emerald-600 text-white text-xs">In Progress</Badge>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{course.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {course.description}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setPlayingCourseId(course.id)}
                        className="w-full bg-primary text-primary-foreground text-xs"
                      >
                        Continue Course
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Course Catalog */}
        <TabsContent value="catalog">
          <CourseCatalog />
        </TabsContent>

        {/* M-Pesa Payments & Receipts */}
        <TabsContent value="payments">
          <Card className="border border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-emerald-600" />
                M-Pesa Payment Receipts & Transaction Log
              </CardTitle>
              <CardDescription>
                Audited Safaricom Daraja STK Push transaction history.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Course Item</TableHead>
                      <TableHead className="font-semibold">Phone Number</TableHead>
                      <TableHead className="font-semibold">Amount</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-8 text-muted-foreground text-sm"
                        >
                          No M-Pesa payment records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {p.course_title || "Educational Enrollment"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{p.phone_number}</TableCell>
                          <TableCell className="font-bold text-sm">
                            {p.currency} {p.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={p.status === "completed" ? "default" : "secondary"}
                              className={
                                p.status === "completed"
                                  ? "bg-emerald-600 text-white"
                                  : p.status === "pending"
                                    ? "bg-amber-500/10 text-amber-600"
                                    : ""
                              }
                            >
                              {p.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
