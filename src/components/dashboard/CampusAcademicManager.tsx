import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderTree,
  Plus,
  Video,
  Bell,
  Calendar,
  Layers,
  Building2,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listDepartments,
  saveDepartmentFn,
  listClasses,
  saveClassFn,
  listLiveClasses,
  scheduleLiveClassFn,
  listAnnouncements,
} from "@/lib/academic.functions";

interface CampusAcademicManagerProps {
  institutionId: string;
}

export function CampusAcademicManager({ institutionId }: CampusAcademicManagerProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"departments" | "classes" | "live" | "announcements">(
    "departments",
  );

  // Modal states
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");

  const [classModalOpen, setClassModalOpen] = useState(false);
  const [className, setClassName] = useState("");
  const [classCode, setClassCode] = useState("");

  const [liveModalOpen, setLiveModalOpen] = useState(false);
  const [liveTitle, setLiveTitle] = useState("");
  const [liveMeetingUrl, setLiveMeetingUrl] = useState("");
  const [liveStartTime, setLiveStartTime] = useState("");
  const [liveEndTime, setLiveEndTime] = useState("");

  // Queries
  const { data: departments = [], isLoading: loadingDepts } = useQuery({
    queryKey: ["departments", institutionId],
    queryFn: () => listDepartments({ data: { institution_id: institutionId } }),
  });

  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ["classes", institutionId],
    queryFn: () => listClasses({ data: { institution_id: institutionId } }),
  });

  const { data: liveClasses = [], isLoading: loadingLive } = useQuery({
    queryKey: ["live-classes", institutionId],
    queryFn: () => listLiveClasses({ data: { institution_id: institutionId } }),
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements", institutionId],
    queryFn: () => listAnnouncements({ data: { institution_id: institutionId } }),
  });

  // Mutations
  const deptMutation = useMutation({
    mutationFn: () =>
      saveDepartmentFn({
        data: {
          institution_id: institutionId,
          name: deptName.trim(),
          code: deptCode.trim().toUpperCase(),
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["departments", institutionId] });
      setDeptModalOpen(false);
      setDeptName("");
      setDeptCode("");
    },
  });

  const classMutation = useMutation({
    mutationFn: () =>
      saveClassFn({
        data: {
          institution_id: institutionId,
          name: className.trim(),
          code: classCode.trim().toUpperCase(),
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["classes", institutionId] });
      setClassModalOpen(false);
      setClassName("");
      setClassCode("");
    },
  });

  const liveMutation = useMutation({
    mutationFn: () =>
      scheduleLiveClassFn({
        data: {
          institution_id: institutionId,
          title: liveTitle.trim(),
          meeting_url: liveMeetingUrl.trim(),
          start_time: liveStartTime,
          end_time: liveEndTime,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["live-classes", institutionId] });
      setLiveModalOpen(false);
      setLiveTitle("");
      setLiveMeetingUrl("");
      setLiveStartTime("");
      setLiveEndTime("");
    },
  });

  return (
    <Card className="border border-border/80 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-primary" />
              Academic Operations & Structure
            </CardTitle>
            <CardDescription>
              Manage academic departments, student cohorts, virtual classes, and announcements.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="space-y-4"
        >
          <TabsList className="bg-muted/60 p-1 rounded-lg">
            <TabsTrigger value="departments" className="gap-1.5 py-1.5 px-3 text-xs font-semibold">
              <FolderTree className="h-3.5 w-3.5" /> Departments ({departments.length})
            </TabsTrigger>
            <TabsTrigger value="classes" className="gap-1.5 py-1.5 px-3 text-xs font-semibold">
              <Layers className="h-3.5 w-3.5" /> Classes / Cohorts ({classes.length})
            </TabsTrigger>
            <TabsTrigger value="live" className="gap-1.5 py-1.5 px-3 text-xs font-semibold">
              <Video className="h-3.5 w-3.5" /> Live Sessions ({liveClasses.length})
            </TabsTrigger>
            <TabsTrigger
              value="announcements"
              className="gap-1.5 py-1.5 px-3 text-xs font-semibold"
            >
              <Bell className="h-3.5 w-3.5" /> Announcements ({announcements.length})
            </TabsTrigger>
          </TabsList>

          {/* Departments Tab */}
          <TabsContent value="departments" className="space-y-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => setDeptModalOpen(true)}
                className="bg-primary text-primary-foreground text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> New Department
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">Department Name</TableHead>
                  <TableHead className="font-semibold">Department Code</TableHead>
                  <TableHead className="font-semibold">Established</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-6 text-muted-foreground text-xs"
                    >
                      No departments established yet. Click "New Department" to structure your
                      campus.
                    </TableCell>
                  </TableRow>
                ) : (
                  departments.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium text-sm">{d.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {d.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(d.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Classes Tab */}
          <TabsContent value="classes" className="space-y-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => setClassModalOpen(true)}
                className="bg-primary text-primary-foreground text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Class Cohort
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">Class / Cohort Name</TableHead>
                  <TableHead className="font-semibold">Class Code</TableHead>
                  <TableHead className="font-semibold">Department</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-6 text-muted-foreground text-xs"
                    >
                      No classes or academic cohorts configured yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  classes.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-sm">{c.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {c.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.department_name || "General Academic"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Live Sessions Tab */}
          <TabsContent value="live" className="space-y-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => setLiveModalOpen(true)}
                className="bg-primary text-primary-foreground text-xs"
              >
                <Video className="h-3.5 w-3.5 mr-1" /> Schedule Live Lecture
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">Lecture Title</TableHead>
                  <TableHead className="font-semibold">Schedule Time</TableHead>
                  <TableHead className="font-semibold">Meeting Portal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liveClasses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-6 text-muted-foreground text-xs"
                    >
                      No live virtual classes scheduled.
                    </TableCell>
                  </TableRow>
                ) : (
                  liveClasses.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium text-sm">{l.title}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(l.start_time).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <a
                          href={l.meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                        >
                          Join Meeting <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="space-y-4">
            <div className="space-y-3">
              {announcements.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No campus-wide announcements published yet.
                </p>
              ) : (
                announcements.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-lg border border-border p-3.5 space-y-1 bg-muted/20"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-foreground">{a.title}</h4>
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.content}</p>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* New Department Modal */}
        <Dialog open={deptModalOpen} onOpenChange={setDeptModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Establish New Department</DialogTitle>
              <DialogDescription>
                Create an academic department for faculty and coursework.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                deptMutation.mutate();
              }}
              className="space-y-4 py-2"
            >
              <div>
                <label
                  className="block text-xs font-semibold uppercase text-muted-foreground mb-1"
                  htmlFor="d-name"
                >
                  Department Name *
                </label>
                <input
                  id="d-name"
                  required
                  placeholder="e.g. Faculty of Information Technology"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label
                  className="block text-xs font-semibold uppercase text-muted-foreground mb-1"
                  htmlFor="d-code"
                >
                  Department Code *
                </label>
                <input
                  id="d-code"
                  required
                  placeholder="e.g. FIT-01"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDeptModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={deptMutation.isPending}
                  className="bg-primary text-primary-foreground"
                >
                  {deptMutation.isPending ? "Saving…" : "Create Department"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* New Class Modal */}
        <Dialog open={classModalOpen} onOpenChange={setClassModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Class / Cohort</DialogTitle>
              <DialogDescription>Group learners into manageable cohort units.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                classMutation.mutate();
              }}
              className="space-y-4 py-2"
            >
              <div>
                <label
                  className="block text-xs font-semibold uppercase text-muted-foreground mb-1"
                  htmlFor="cl-name"
                >
                  Class / Cohort Name *
                </label>
                <input
                  id="cl-name"
                  required
                  placeholder="e.g. Bachelor of Science in IT - Year 1 (2026)"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label
                  className="block text-xs font-semibold uppercase text-muted-foreground mb-1"
                  htmlFor="cl-code"
                >
                  Cohort Code *
                </label>
                <input
                  id="cl-code"
                  required
                  placeholder="e.g. BSIT-Y1-2026"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setClassModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={classMutation.isPending}
                  className="bg-primary text-primary-foreground"
                >
                  {classMutation.isPending ? "Saving…" : "Create Class Cohort"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Schedule Live Class Modal */}
        <Dialog open={liveModalOpen} onOpenChange={setLiveModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule Live Virtual Lecture</DialogTitle>
              <DialogDescription>
                Set meeting credentials for synchronous distance learning.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                liveMutation.mutate();
              }}
              className="space-y-4 py-2"
            >
              <div>
                <label
                  className="block text-xs font-semibold uppercase text-muted-foreground mb-1"
                  htmlFor="l-title"
                >
                  Session Topic / Title *
                </label>
                <input
                  id="l-title"
                  required
                  placeholder="e.g. Weekly Live Q&A and Case Study Review"
                  value={liveTitle}
                  onChange={(e) => setLiveTitle(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label
                  className="block text-xs font-semibold uppercase text-muted-foreground mb-1"
                  htmlFor="l-url"
                >
                  Meeting Link (Google Meet / Zoom / Teams) *
                </label>
                <input
                  id="l-url"
                  type="url"
                  required
                  placeholder="https://meet.google.com/xyz-abcd-efg"
                  value={liveMeetingUrl}
                  onChange={(e) => setLiveMeetingUrl(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-xs font-semibold uppercase text-muted-foreground mb-1"
                    htmlFor="l-start"
                  >
                    Start Time *
                  </label>
                  <input
                    id="l-start"
                    type="datetime-local"
                    required
                    value={liveStartTime}
                    onChange={(e) => setLiveStartTime(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-semibold uppercase text-muted-foreground mb-1"
                    htmlFor="l-end"
                  >
                    End Time *
                  </label>
                  <input
                    id="l-end"
                    type="datetime-local"
                    required
                    value={liveEndTime}
                    onChange={(e) => setLiveEndTime(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setLiveModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={liveMutation.isPending}
                  className="bg-primary text-primary-foreground"
                >
                  {liveMutation.isPending ? "Scheduling…" : "Schedule Live Class"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
