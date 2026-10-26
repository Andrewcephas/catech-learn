import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Ticket,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createIssueFn, listMyIssuesFn, type IssueItem } from "@/lib/issues.functions";

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-500 text-white",
  medium: "bg-amber-500 text-white",
  high: "bg-orange-600 text-white",
  critical: "bg-red-600 text-white",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500 text-white",
  in_progress: "bg-amber-500 text-white",
  resolved: "bg-emerald-600 text-white",
  closed: "bg-slate-500 text-white",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  open: <Clock className="h-3 w-3" />,
  in_progress: <RefreshCw className="h-3 w-3" />,
  resolved: <CheckCircle2 className="h-3 w-3" />,
  closed: <XCircle className="h-3 w-3" />,
};

export function IssueReporter({
  institutionId,
}: {
  institutionId?: string | undefined;
}) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [viewingIssue, setViewingIssue] = useState<IssueItem | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"general" | "billing" | "access" | "course" | "technical" | "other">("general");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [submitMsg, setSubmitMsg] = useState("");
  const [submitError, setSubmitError] = useState("");

  const { data: issues = [], isLoading, refetch } = useQuery({
    queryKey: ["my-issues"],
    queryFn: () => listMyIssuesFn(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createIssueFn({
        data: {
          title: title.trim(),
          description: description.trim(),
          category,
          priority,
          institution_id: institutionId,
        },
      }),
    onSuccess: () => {
      setSubmitMsg("✅ Your issue has been submitted. The admin team will review it shortly.");
      setSubmitError("");
      setTitle("");
      setDescription("");
      setCategory("general");
      setPriority("medium");
      void queryClient.invalidateQueries({ queryKey: ["my-issues"] });
      setTimeout(() => {
        setModalOpen(false);
        setSubmitMsg("");
      }, 2000);
    },
    onError: (err: Error) => setSubmitError(err.message || "Failed to submit issue"),
  });

  const openIssues = issues.filter((i) => i.status === "open").length;
  const resolvedIssues = issues.filter((i) => i.status === "resolved" || i.status === "closed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600">
              <Ticket className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-black tracking-tight text-foreground">My Support Issues</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Raise a support request or report a problem. The platform admin will respond directly.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setTitle("");
            setDescription("");
            setCategory("general");
            setPriority("medium");
            setSubmitMsg("");
            setSubmitError("");
            setModalOpen(true);
          }}
          className="bg-primary text-primary-foreground font-bold text-xs h-9 gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Raise New Issue
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border border-border/80 rounded-2xl shadow-xs">
          <CardContent className="p-4">
            <div className="text-xl font-black text-foreground">{issues.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Total Submitted</p>
          </CardContent>
        </Card>
        <Card className="border border-blue-500/30 rounded-2xl shadow-xs bg-blue-50/30 dark:bg-blue-900/10">
          <CardContent className="p-4">
            <div className="text-xl font-black text-blue-600">{openIssues}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Pending Review</p>
          </CardContent>
        </Card>
        <Card className="border border-emerald-600/30 rounded-2xl shadow-xs bg-emerald-50/30 dark:bg-emerald-900/10">
          <CardContent className="p-4">
            <div className="text-xl font-black text-emerald-600">{resolvedIssues}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Issues List */}
      {isLoading ? (
        <div className="text-center py-12 text-xs text-muted-foreground">Loading your issues…</div>
      ) : issues.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-border/80 rounded-2xl">
          <Ticket className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
          <h3 className="font-bold text-sm text-foreground">No issues submitted yet</h3>
          <p className="text-xs text-muted-foreground mt-1">
            If you encounter any problem, click "Raise New Issue" above.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <div
              key={issue.id}
              onClick={() => setViewingIssue(issue)}
              className="group flex items-start gap-4 p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-md cursor-pointer transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-bold text-sm text-foreground truncate">{issue.title}</span>
                  <Badge className={`text-[10px] font-bold flex items-center gap-1 ${STATUS_COLORS[issue.status] || "bg-slate-500 text-white"}`}>
                    {STATUS_ICONS[issue.status]}
                    {issue.status.replace("_", " ")}
                  </Badge>
                  <Badge className={`text-[10px] font-bold ${PRIORITY_COLORS[issue.priority] || ""}`}>
                    {issue.priority}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-mono capitalize">
                    {issue.category}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{issue.description}</p>
                {issue.adminResponse && (
                  <div className="mt-2 p-2 rounded-lg bg-emerald-600/10 border border-emerald-600/20 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    <span className="font-bold">Admin:</span> {issue.adminResponse}
                  </div>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground shrink-0">
                {new Date(issue.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Raise New Issue */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Raise a Support Issue
            </DialogTitle>
            <DialogDescription className="text-xs">
              Describe your problem clearly. The System Manager (Super Admin) will respond to your ticket.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="space-y-4 py-2 text-xs"
          >
            {submitMsg && (
              <p className="p-3 rounded-xl bg-emerald-600/10 border border-emerald-600/30 text-emerald-700 font-semibold text-xs">
                {submitMsg}
              </p>
            )}

            <div>
              <label className="block font-semibold mb-1">Issue Title *</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cannot access enrolled course, Payment not reflecting..."
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as typeof category)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                >
                  <option value="general">General</option>
                  <option value="billing">Billing / M-Pesa</option>
                  <option value="access">Access / Login</option>
                  <option value="course">Course / Content</option>
                  <option value="technical">Technical / Bug</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as typeof priority)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical — Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Description *</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue in detail: what you tried to do, what happened, and any error messages..."
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {submitError && <p className="text-destructive font-medium text-xs">{submitError}</p>}

            <DialogFooter>
              <Button variant="outline" type="button" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createMutation.isPending}
                className="bg-primary text-primary-foreground font-semibold gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                {createMutation.isPending ? "Submitting…" : "Submit Issue"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: View Issue Detail */}
      <Dialog open={!!viewingIssue} onOpenChange={() => setViewingIssue(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Issue Detail
            </DialogTitle>
          </DialogHeader>
          {viewingIssue && (
            <div className="space-y-4 py-2 text-xs">
              <div className="flex flex-wrap gap-2">
                <Badge className={`text-[10px] font-bold flex items-center gap-1 ${STATUS_COLORS[viewingIssue.status] || ""}`}>
                  {STATUS_ICONS[viewingIssue.status]}
                  {viewingIssue.status.replace("_", " ")}
                </Badge>
                <Badge className={`text-[10px] font-bold ${PRIORITY_COLORS[viewingIssue.priority] || ""}`}>
                  {viewingIssue.priority} priority
                </Badge>
                <Badge variant="outline" className="text-[10px] capitalize">{viewingIssue.category}</Badge>
              </div>

              <div>
                <p className="font-bold text-foreground text-sm mb-1">{viewingIssue.title}</p>
                <p className="text-muted-foreground leading-relaxed">{viewingIssue.description}</p>
              </div>

              {viewingIssue.adminResponse ? (
                <div className="p-3.5 rounded-xl bg-emerald-600/10 border border-emerald-600/30 space-y-1">
                  <p className="font-bold text-emerald-700 dark:text-emerald-400 text-xs uppercase tracking-wide">
                    ✅ Admin Response
                  </p>
                  <p className="text-foreground">{viewingIssue.adminResponse}</p>
                  {viewingIssue.respondedAt && (
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(viewingIssue.respondedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-muted-foreground italic">
                  No admin response yet. Your ticket is in the queue.
                </div>
              )}

              <p className="text-[10px] text-muted-foreground">
                Submitted {new Date(viewingIssue.createdAt).toLocaleString()}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setViewingIssue(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
