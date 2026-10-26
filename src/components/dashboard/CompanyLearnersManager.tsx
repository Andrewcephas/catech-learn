import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Search,
  Phone,
  Mail,
  MessageSquare,
  BookOpen,
  Send,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { getCompanyLearnersDirectory, type CompanyLearner } from "@/lib/company.functions";
import { sendDirectMessageFn, listDirectMessagesFn } from "@/lib/messaging.functions";

interface CompanyLearnersManagerProps {
  institutionId?: string | undefined;
  companyName?: string;
}

export function CompanyLearnersManager({
  institutionId,
  companyName = "Your Company",
}: CompanyLearnersManagerProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedLearner, setSelectedLearner] = useState<CompanyLearner | null>(null);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);

  const { data: learners = [], isLoading } = useQuery({
    queryKey: ["company-learners", institutionId],
    queryFn: () => getCompanyLearnersDirectory({ data: { institution_id: institutionId } }),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["learner-messages", selectedLearner?.userId],
    queryFn: () =>
      selectedLearner
        ? listDirectMessagesFn({ data: { with_user_id: selectedLearner.userId } })
        : Promise.resolve([]),
    enabled: !!selectedLearner && messageModalOpen,
  });

  const messageMutation = useMutation({
    mutationFn: () =>
      sendDirectMessageFn({
        data: {
          recipient_id: selectedLearner!.userId,
          subject: messageSubject.trim() || `Update from ${companyName}`,
          message: messageBody.trim(),
          institution_id: institutionId,
        },
      }),
    onSuccess: () => {
      setSendSuccess(true);
      setMessageBody("");
      void queryClient.invalidateQueries({
        queryKey: ["learner-messages", selectedLearner?.userId],
      });
      void queryClient.invalidateQueries({ queryKey: ["direct-messages"] });
      setTimeout(() => setSendSuccess(false), 3000);
    },
  });

  const openMessageModal = (learner: CompanyLearner) => {
    setSelectedLearner(learner);
    setMessageSubject(`Academic Update: ${learner.enrolledCourses[0]?.courseTitle || "Course Session"}`);
    setMessageBody("");
    setSendSuccess(false);
    setMessageModalOpen(true);
  };

  const filtered = learners.filter(
    (l) =>
      l.displayName.toLowerCase().includes(search.toLowerCase()) ||
      (l.phoneNumber && l.phoneNumber.toLowerCase().includes(search.toLowerCase())) ||
      l.enrolledCourses.some((c) => c.courseTitle.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Learners & Student Contacts
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            View all enrolled students for {companyName}, monitor their learning progress, access contacts, and message them one-by-one.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs px-3 py-1 font-semibold">
            {learners.length} Enrolled Student{learners.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search students by name, phone or course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Learners Table / Cards */}
      {isLoading ? (
        <Card className="p-8 text-center animate-pulse">
          <p className="text-sm text-muted-foreground">Loading student directory…</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-border/80 p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
          <h3 className="text-base font-bold text-foreground">No students enrolled yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {search
              ? `No students found matching "${search}".`
              : "When students browse your company catalog, enroll, and pay via M-Pesa, their contact details and learning progress will appear here."}
          </p>
        </Card>
      ) : (
        <Card className="border border-border/80 rounded-2xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-xs font-bold">Student Name</TableHead>
                <TableHead className="text-xs font-bold">Contact (Phone / M-Pesa)</TableHead>
                <TableHead className="text-xs font-bold">Enrolled Sessions</TableHead>
                <TableHead className="text-xs font-bold">Learning Progress</TableHead>
                <TableHead className="text-xs font-bold">Tasks Submitted</TableHead>
                <TableHead className="text-xs font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((learner) => (
                <TableRow key={learner.userId} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                        {learner.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-foreground">{learner.displayName}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          ID: {learner.userId.slice(0, 8)}…
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <Phone className="h-3 w-3 text-emerald-600" />
                      <span>{learner.phoneNumber || "No phone provided"}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      {learner.enrolledCourses.length > 0 ? (
                        learner.enrolledCourses.map((c) => (
                          <Badge
                            key={c.courseId}
                            variant="secondary"
                            className="text-[10px] font-normal truncate max-w-[200px] block"
                          >
                            {c.courseTitle}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">
                          Registered Member
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="w-36 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-foreground">
                          {learner.progressPercentage}%
                        </span>
                        <span className="text-muted-foreground text-[10px]">
                          {learner.completedLessons}/{learner.totalLessons} lessons
                        </span>
                      </div>
                      <Progress value={learner.progressPercentage} className="h-1.5" />
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {learner.assignmentsSubmitted} Submissions
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openMessageModal(learner)}
                      className="border-primary/40 hover:bg-primary hover:text-primary-foreground text-xs h-8"
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1 text-primary" />
                      Message 1-on-1
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* 1-on-1 Message Modal */}
      <Dialog open={messageModalOpen} onOpenChange={setMessageModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Direct Message: {selectedLearner?.displayName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Send a personalized direct message to this student. The message will appear in their dashboard inbox and send an instant notification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Student Contact Info Card */}
            {selectedLearner && (
              <div className="p-3 bg-muted/60 rounded-xl border border-border/70 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground text-[11px]">Student Phone:</span>
                  <p className="font-mono font-bold text-foreground">{selectedLearner.phoneNumber}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px]">Curriculum Progress:</span>
                  <p className="font-bold text-emerald-600">{selectedLearner.progressPercentage}% Completed</p>
                </div>
              </div>
            )}

            {/* Conversation History Snippet (if any) */}
            {messages.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto p-3 rounded-xl bg-background border border-border/80">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Recent Message History
                </p>
                {messages.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    className={`p-2.5 rounded-lg text-xs ${
                      m.sender_name.includes("You") || m.sender_name === companyName
                        ? "bg-primary/10 border border-primary/20 text-foreground ml-4"
                        : "bg-muted/70 text-foreground mr-4"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                      <span className="font-semibold">{m.sender_name}</span>
                      <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="whitespace-pre-line">{m.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Compose Form */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  placeholder="e.g. Next session schedule / Assignment feedback"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Message Content
                </label>
                <textarea
                  rows={4}
                  required
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Type your message to the student here..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            </div>

            {sendSuccess && (
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Message sent successfully to {selectedLearner?.displayName}!
              </p>
            )}

            {messageMutation.error && (
              <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" /> {messageMutation.error.message}
              </p>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMessageModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!messageBody.trim() || messageMutation.isPending}
              onClick={() => messageMutation.mutate()}
              className="bg-primary text-primary-foreground text-xs font-semibold"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {messageMutation.isPending ? "Sending…" : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
