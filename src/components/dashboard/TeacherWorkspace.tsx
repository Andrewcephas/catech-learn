import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Users, FileCheck, Calendar, Plus, ExternalLink, Video } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listCourses } from "@/lib/course.functions";
import { CourseBuilderModal } from "@/components/dashboard/CourseBuilderModal";
import { PermissionGate } from "@/components/rbac/PermissionGate";

interface TeacherWorkspaceProps {
  displayName: string;
  institutionId?: string | undefined;
}

export function TeacherWorkspace({ displayName, institutionId }: TeacherWorkspaceProps) {
  const [builderOpen, setBuilderOpen] = useState(false);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["teacher-courses", institutionId],
    queryFn: () => listCourses({ data: { institution_id: institutionId } }),
  });

  return (
    <div className="space-y-8">
      {/* Teacher Workspace Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 p-1.5 text-primary">
              <BookOpen className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight">
              Faculty Studio & Course Operations
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Curate curriculum modules, review student submissions, and manage academic cohorts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PermissionGate require="courses.create">
            <Button
              onClick={() => setBuilderOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Course Module
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Courses
            </CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Assigned instructional units</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Enrolled Learners
            </CardTitle>
            <Users className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {courses.filter((c) => c.enrolled).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Students across active cohorts</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Marking
            </CardTitle>
            <FileCheck className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">0</div>
            <p className="text-xs text-muted-foreground mt-1">Submissions awaiting feedback</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Live Sessions
            </CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Upcoming virtual classes</p>
          </CardContent>
        </Card>
      </div>

      {/* Course Management Showcase */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Curated Instructional Units</CardTitle>
          <CardDescription>
            Organized course modules, video resources, and digital lecture notes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 p-12 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/60 mb-3" />
              <h3 className="text-base font-semibold text-foreground">
                No active courses assigned yet
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground max-w-md mx-auto">
                Launch the curriculum builder to establish your courses, syllabus, and video
                lectures.
              </p>
              <PermissionGate require="courses.create">
                <Button onClick={() => setBuilderOpen(true)} size="sm" className="mt-5">
                  <Plus className="h-4 w-4 mr-1.5" /> Launch Course Curriculum Builder
                </Button>
              </PermissionGate>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="rounded-lg border border-border p-4 space-y-3 bg-muted/20"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-mono text-xs">
                      {course.code}
                    </Badge>
                    <Badge
                      variant={course.is_published ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {course.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{course.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {course.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/60">
                    <span>
                      Price: {course.price > 0 ? `${course.currency} ${course.price}` : "Free"}
                    </span>
                    <span className="text-primary font-semibold">Active Unit</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
