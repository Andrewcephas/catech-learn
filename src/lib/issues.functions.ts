import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IssueItem {
  id: string;
  reporterId: string | null;
  reporterName: string;
  institutionId: string | null;
  institutionName: string | null;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  adminResponse: string | null;
  respondedByName: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  linkView: string | null;
  linkRefId: string | null;
  isRead: boolean;
  createdAt: string;
}

interface DbIssueRow {
  id: string;
  reporter_id: string | null;
  institution_id: string | null;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  admin_response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { display_name?: string } | null;
  institutions?: { name?: string } | null;
}

interface DbNotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link_view: string | null;
  link_ref_id: string | null;
  is_read: boolean;
  created_at: string;
}

// ─── Issue CRUD ───────────────────────────────────────────────────────────────

const createIssueSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10),
  category: z.enum(["general", "billing", "access", "course", "technical", "other"]).default("general"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  institution_id: z.string().uuid().optional(),
});

// 1. Create a new issue (any authenticated user)
export const createIssueFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createIssueSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: issue, error } = await context.supabase
      .from("issues" as never)
      .insert({
        reporter_id: context.userId,
        institution_id: data.institution_id || null,
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        status: "open",
      } as never)
      .select("id, title")
      .single();

    if (error) throw new Error(error.message);

    // Notify super admins via service_role
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: admins = [] } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "super_admin");

      const profileRes = await supabaseAdmin
        .from("profiles")
        .select("display_name")
        .eq("id", context.userId)
        .single();
      const reporterName = profileRes.data?.display_name || "A user";

      if (admins && admins.length > 0) {
        await supabaseAdmin.from("notifications" as never).insert(
          admins.map((a: { user_id: string }) => ({
            user_id: a.user_id,
            type: "issue_update",
            title: `🎫 New Issue: ${data.title}`,
            body: `${reporterName} raised a ${data.priority} priority issue. Click to review.`,
            link_view: "platform_issues",
            link_ref_id: (issue as { id: string } | null)?.id || null,
          })) as never
        );
      }
    } catch {
      // Non-critical — issue was still created
    }

    return { success: true, issueId: (issue as { id: string } | null)?.id };
  });

// 2. List issues for current user (reporter)
export const listMyIssuesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<IssueItem[]> => {
    const { data = [], error } = await context.supabase
      .from("issues" as never)
      .select("id, reporter_id, institution_id, title, description, category, priority, status, admin_response, responded_at, created_at, updated_at, institutions(name)")
      .eq("reporter_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const profile = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("id", context.userId)
      .single();

    const name = profile.data?.display_name || "You";

    return ((data || []) as unknown as DbIssueRow[]).map((i) => ({
      id: i.id,
      reporterId: context.userId,
      reporterName: name,
      institutionId: i.institution_id,
      institutionName: i.institutions?.name || null,
      title: i.title,
      description: i.description,
      category: i.category,
      priority: i.priority,
      status: i.status,
      adminResponse: i.admin_response,
      respondedByName: null,
      respondedAt: i.responded_at,
      createdAt: i.created_at,
      updatedAt: i.updated_at,
    }));
  });

// 3. List ALL issues (super admin)
export const listAllIssuesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<IssueItem[]> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data = [], error } = await supabaseAdmin
        .from("issues" as never)
        .select(
          "id, reporter_id, institution_id, title, description, category, priority, status, admin_response, responded_by, responded_at, created_at, updated_at, profiles!issues_reporter_id_fkey(display_name), institutions(name)"
        )
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      return ((data || []) as unknown as DbIssueRow[]).map((i) => ({
        id: i.id,
        reporterId: i.reporter_id,
        reporterName: i.profiles?.display_name || "Unknown User",
        institutionId: i.institution_id,
        institutionName: i.institutions?.name || null,
        title: i.title,
        description: i.description,
        category: i.category,
        priority: i.priority,
        status: i.status,
        adminResponse: i.admin_response,
        respondedByName: null,
        respondedAt: i.responded_at,
        createdAt: i.created_at,
        updatedAt: i.updated_at,
      }));
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : "Failed to list issues");
    }
  });

// 4. Respond to / update issue status (super admin)
const respondIssueSchema = z.object({
  issue_id: z.string().uuid(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
  admin_response: z.string().trim().min(1).max(2000).optional(),
});

export const respondToIssueFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => respondIssueSchema.parse(input))
  .handler(async ({ data, context }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const updatePayload: Record<string, unknown> = {
        status: data.status,
        updated_at: new Date().toISOString(),
      };
      if (data.admin_response) {
        updatePayload["admin_response"] = data.admin_response;
        updatePayload["responded_by"] = context.userId;
        updatePayload["responded_at"] = new Date().toISOString();
      }

      const { data: updated, error } = await supabaseAdmin
        .from("issues" as never)
        .update(updatePayload as never)
        .eq("id", data.issue_id)
        .select("reporter_id, title")
        .single();

      if (error) throw new Error(error.message);

      // Notify the reporter
      const issue = updated as { reporter_id?: string; title?: string } | null;
      if (issue?.reporter_id) {
        await supabaseAdmin.from("notifications" as never).insert({
          user_id: issue.reporter_id,
          type: "issue_reply",
          title: `✅ Issue Update: ${issue.title}`,
          body: data.admin_response
            ? `Super Admin responded: "${data.admin_response.slice(0, 120)}…"`
            : `Your issue status was updated to "${data.status}".`,
          link_view: "my_issues",
          link_ref_id: data.issue_id,
        } as never);
      }

      await context.supabase.from("institution_audit_logs").insert({
        actor_id: context.userId,
        action: "issue_status_updated",
        target_id: data.issue_id,
        details: { status: data.status, has_response: Boolean(data.admin_response) },
      });

      return { success: true, message: "Issue updated and reporter notified." };
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : "Failed to update issue");
    }
  });

// 5. Delete issue (super admin only)
const deleteIssueSchema = z.object({ issue_id: z.string().uuid() });

export const deleteIssueFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteIssueSchema.parse(input))
  .handler(async ({ data, context }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin
        .from("issues" as never)
        .delete()
        .eq("id", data.issue_id);

      if (error) throw new Error(error.message);

      await context.supabase.from("institution_audit_logs").insert({
        actor_id: context.userId,
        action: "issue_deleted",
        target_id: data.issue_id,
        details: {},
      });

      return { success: true };
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : "Failed to delete issue");
    }
  });

// ─── Notifications ────────────────────────────────────────────────────────────

// 6. List my notifications
export const listMyNotificationsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NotificationItem[]> => {
    const { data = [], error } = await context.supabase
      .from("notifications" as never)
      .select("id, user_id, type, title, body, link_view, link_ref_id, is_read, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return [];

    return ((data || []) as unknown as DbNotificationRow[]).map((n) => ({
      id: n.id,
      userId: n.user_id,
      type: n.type,
      title: n.title,
      body: n.body,
      linkView: n.link_view,
      linkRefId: n.link_ref_id,
      isRead: n.is_read,
      createdAt: n.created_at,
    }));
  });

// 7. Mark notification(s) read
const markReadSchema = z.object({
  notification_ids: z.array(z.string().uuid()).min(1),
});

export const markNotificationsReadFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => markReadSchema.parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("notifications" as never)
      .update({ is_read: true } as never)
      .in("id", data.notification_ids)
      .eq("user_id", context.userId);

    return { success: true };
  });

// 8. Count unread notifications (lightweight)
export const countUnreadNotificationsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ count: number }> => {
    const { count, error } = await context.supabase
      .from("notifications" as never)
      .select("*", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("is_read", false);

    if (error) return { count: 0 };
    return { count: count || 0 };
  });
