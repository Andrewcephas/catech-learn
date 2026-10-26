import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  Send,
  Search,
  CheckCircle2,
  Clock,
  User,
  Building2,
  Sparkles,
  Inbox,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listDirectMessagesFn,
  sendDirectMessageFn,
  markDirectMessageReadFn,
  type DirectMessageItem,
} from "@/lib/messaging.functions";

interface DirectMessagingHubProps {
  currentUserId: string;
  currentUserRole: "company" | "student" | "super_admin";
  institutionId?: string | undefined;
}

export function DirectMessagingHub({
  currentUserId,
  currentUserRole,
  institutionId,
}: DirectMessagingHubProps) {
  const queryClient = useQueryClient();
  const [selectedMessage, setSelectedMessage] = useState<DirectMessageItem | null>(null);
  const [replyText, setReplyText] = useState("");
  const [search, setSearch] = useState("");

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["direct-messages"],
    queryFn: () => listDirectMessagesFn(),
    refetchInterval: 10000, // Poll every 10s for new messages
  });

  const sendMutation = useMutation({
    mutationFn: (payload: { recipientId: string; subject: string; message: string }) =>
      sendDirectMessageFn({
        data: {
          recipient_id: payload.recipientId,
          subject: payload.subject,
          message: payload.message,
          institution_id: institutionId,
        },
      }),
    onSuccess: () => {
      setReplyText("");
      void queryClient.invalidateQueries({ queryKey: ["direct-messages"] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (msgId: string) => markDirectMessageReadFn({ data: { message_id: msgId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["direct-messages"] });
    },
  });

  const handleSelectMessage = (msg: DirectMessageItem) => {
    setSelectedMessage(msg);
    if (!msg.is_read && msg.recipient_id === currentUserId) {
      markReadMutation.mutate(msg.id);
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedMessage) return;

    // Recipient is the other party
    const recipientId =
      selectedMessage.sender_id === currentUserId
        ? selectedMessage.recipient_id
        : selectedMessage.sender_id;

    if (!recipientId || recipientId === "system-sender") return;

    sendMutation.mutate({
      recipientId,
      subject: `Re: ${selectedMessage.subject || "Message"}`,
      message: replyText.trim(),
    });
  };

  const filteredMessages = messages.filter(
    (m) =>
      m.subject.toLowerCase().includes(search.toLowerCase()) ||
      m.message.toLowerCase().includes(search.toLowerCase()) ||
      m.sender_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <MessageSquare className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Direct 1-on-1 Messages
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {currentUserRole === "company"
              ? "Send direct messages to students, answer questions, provide assignment guidance and share announcements."
              : "Chat directly with your company instructors, receive notes and track answers to your queries."}
          </p>
        </div>
      </div>

      {/* Main Messages Shell (Split Panes) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[500px]">
        {/* Left Pane: Message List */}
        <div className="md:col-span-5 flex flex-col space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 rounded-2xl border border-border/80 bg-card p-2 max-h-[560px]">
            {isLoading ? (
              <p className="p-6 text-center text-xs text-muted-foreground animate-pulse">
                Loading messages…
              </p>
            ) : filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Inbox className="mx-auto h-8 w-8 mb-2 text-muted-foreground/50" />
                <p className="text-xs font-semibold text-foreground">No messages yet</p>
                <p className="text-[11px] mt-1">
                  {currentUserRole === "company"
                    ? "Go to Student Directory to start a 1-on-1 conversation with a student."
                    : "Direct messages from your company instructors will appear here."}
                </p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                const isIncoming = msg.recipient_id === currentUserId;

                return (
                  <button
                    key={msg.id}
                    type="button"
                    onClick={() => handleSelectMessage(msg)}
                    className={`w-full text-left p-3 rounded-xl transition-all border ${
                      isSelected
                        ? "bg-primary/10 border-primary shadow-xs"
                        : "bg-background/60 hover:bg-muted/60 border-border/60"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-foreground truncate max-w-[140px]">
                        {isIncoming ? msg.sender_name : `To: ${msg.recipient_name}`}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-foreground truncate">{msg.subject}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                      {msg.message}
                    </p>

                    {!msg.is_read && isIncoming && (
                      <div className="mt-2 flex justify-end">
                        <Badge className="bg-primary text-primary-foreground text-[9px] h-4 px-1.5 font-bold">
                          New
                        </Badge>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Message Viewer & Reply */}
        <div className="md:col-span-7 flex flex-col">
          {selectedMessage ? (
            <Card className="flex-1 flex flex-col justify-between border border-border/80 rounded-2xl shadow-sm overflow-hidden">
              <CardHeader className="border-b border-border/70 pb-4 bg-muted/30">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">
                      {selectedMessage.subject}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1 flex items-center gap-2">
                      <span>From: <strong className="text-foreground">{selectedMessage.sender_name}</strong></span>
                      <span>•</span>
                      <span>To: <strong className="text-foreground">{selectedMessage.recipient_name}</strong></span>
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {new Date(selectedMessage.created_at).toLocaleDateString()}
                  </Badge>
                </div>
              </CardHeader>

              {/* Message Content */}
              <CardContent className="flex-1 py-5 overflow-y-auto">
                <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedMessage.message}
                </div>
              </CardContent>

              {/* Reply Form (if eligible) */}
              <div className="p-4 border-t border-border/70 bg-card">
                <form onSubmit={handleSendReply} className="space-y-3">
                  <textarea
                    rows={3}
                    placeholder="Type your reply here..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background p-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-muted-foreground">
                      Enter your reply and send directly to {selectedMessage.sender_name}
                    </span>
                    <Button
                      size="sm"
                      type="submit"
                      disabled={!replyText.trim() || sendMutation.isPending}
                      className="bg-primary text-primary-foreground text-xs font-semibold"
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      {sendMutation.isPending ? "Sending…" : "Send Reply"}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          ) : (
            <Card className="flex-1 flex flex-col items-center justify-center border-dashed border-border/80 rounded-2xl p-12 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-bold text-foreground">Select a conversation</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Pick a message thread from the left or open any student in the directory to begin messaging.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
