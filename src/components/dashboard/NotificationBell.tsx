import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, CheckCheck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listMyNotificationsFn, markNotificationsReadFn, type NotificationItem } from "@/lib/issues.functions";

const TYPE_STYLES: Record<string, string> = {
  info: "border-l-blue-500 bg-blue-50/40 dark:bg-blue-950/20",
  success: "border-l-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20",
  warning: "border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/20",
  error: "border-l-red-600 bg-red-50/40 dark:bg-red-950/20",
  issue_update: "border-l-primary bg-primary/5",
  issue_reply: "border-l-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20",
  system: "border-l-slate-500 bg-muted/40",
};

const TYPE_ICONS: Record<string, string> = {
  info: "ℹ️",
  success: "✅",
  warning: "⚠️",
  error: "❌",
  issue_update: "🎫",
  issue_reply: "💬",
  system: "🔔",
};

interface NotificationBellProps {
  onNavigate?: (view: string) => void;
}

export function NotificationBell({ onNavigate }: NotificationBellProps) {
  const queryClient = useQueryClient();
  const [panelOpen, setPanelOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => listMyNotificationsFn(),
    refetchInterval: 30_000, // poll every 30 seconds
  });

  const unread = notifications.filter((n) => !n.isRead);

  const markReadMutation = useMutation({
    mutationFn: (ids: string[]) => markNotificationsReadFn({ data: { notification_ids: ids } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["my-notifications"] }),
  });

  const handleOpen = () => {
    setPanelOpen(true);
    // Mark all unread as read after a short delay
    if (unread.length > 0) {
      setTimeout(() => {
        markReadMutation.mutate(unread.map((n) => n.id));
      }, 1500);
    }
  };

  const handleClick = (n: NotificationItem) => {
    if (!n.isRead) {
      markReadMutation.mutate([n.id]);
    }
    if (n.linkView && onNavigate) {
      onNavigate(n.linkView);
      setPanelOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (panelOpen ? setPanelOpen(false) : handleOpen())}
        className="relative p-2 rounded-xl hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Notifications"
      >
        {unread.length > 0 ? (
          <BellRing className="h-5 w-5 text-primary animate-pulse" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        {unread.length > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {panelOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setPanelOpen(false)}
          />
          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/70 bg-muted/30">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-primary" />
                <span className="font-bold text-sm text-foreground">Notifications</span>
                {unread.length > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-[10px] font-bold h-4 px-1.5">
                    {unread.length} new
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread.length > 0 && (
                  <button
                    type="button"
                    onClick={() => markReadMutation.mutate(unread.map((n) => n.id))}
                    className="text-[10px] text-primary hover:underline font-semibold"
                    title="Mark all read"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  <Bell className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClick(n)}
                    className={`w-full text-left p-3.5 border-b border-border/50 border-l-4 transition-colors hover:brightness-95 ${
                      TYPE_STYLES[n.type] || "border-l-border bg-card"
                    } ${!n.isRead ? "font-semibold" : "opacity-70"}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base shrink-0">{TYPE_ICONS[n.type] || "🔔"}</span>
                      <div className="min-w-0">
                        <p className="text-xs text-foreground font-bold leading-tight truncate">
                          {n.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                          {n.body}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!n.isRead && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 border-t border-border/70 bg-muted/20">
                <button
                  type="button"
                  onClick={() => markReadMutation.mutate(notifications.map((n) => n.id))}
                  className="text-[11px] text-muted-foreground hover:text-foreground w-full text-center"
                >
                  Mark all as read
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
