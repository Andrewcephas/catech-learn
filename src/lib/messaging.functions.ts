import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface DirectMessageItem {
  id: string;
  sender_id: string;
  sender_name: string;
  recipient_id: string;
  recipient_name: string;
  institution_id: string | null;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const sendMessageSchema = z.object({
  recipient_id: z.string().uuid("Recipient ID required"),
  subject: z.string().trim().default("Direct Message"),
  message: z.string().trim().min(1, "Message content cannot be empty"),
  institution_id: z.string().uuid().optional(),
});

// 1. Send 1-on-1 Message from Company to Student (or Student to Company)
export const sendDirectMessageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sendMessageSchema.parse(input))
  .handler(async ({ data, context }) => {
    // 1. Fetch sender profile display name
    const { data: sender } = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("id", context.userId)
      .single();

    const senderName = sender?.display_name || "Instructor / Academy";

    let messageId = "";

    // 2. Try inserting into direct_messages table
    try {
      const { data: inserted, error: msgErr } = await context.supabase
        .from("direct_messages" as never)
        .insert({
          institution_id: data.institution_id || null,
          sender_id: context.userId,
          recipient_id: data.recipient_id,
          subject: data.subject,
          message: data.message,
          is_read: false,
        } as never)
        .select("id" as never)
        .single();

      if (!msgErr && inserted) {
        messageId = (inserted as { id: string }).id;
      }
    } catch {
      // Table may not yet be migrated
    }

    // 3. Insert notification for recipient so it's always received
    await context.supabase.from("notifications" as never).insert({
      user_id: data.recipient_id,
      title: `Message from ${senderName}: ${data.subject || "Academic Update"}`,
      message: data.message,
      link: "/dashboard?tab=messages",
      is_read: false,
    } as never);

    return {
      success: true,
      messageId,
      sentAt: new Date().toISOString(),
    };
  });

// 2. List Direct Messages for the logged-in user
export const listDirectMessagesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: unknown) =>
      z
        .object({
          with_user_id: z.string().uuid().optional(),
        })
        .optional()
        .parse(input) || {},
  )
  .handler(async ({ data, context }): Promise<DirectMessageItem[]> => {
    // Try fetching from direct_messages table
    try {
      let query = context.supabase
        .from("direct_messages" as never)
        .select(
          "id, sender_id, recipient_id, institution_id, subject, message, is_read, created_at, sender:profiles!direct_messages_sender_id_fkey(display_name), recipient:profiles!direct_messages_recipient_id_fkey(display_name)" as never,
        )
        .or(`sender_id.eq.${context.userId},recipient_id.eq.${context.userId}`)
        .order("created_at" as never, { ascending: false });

      if (data?.with_user_id) {
        query = query.or(
          `and(sender_id.eq.${context.userId},recipient_id.eq.${data.with_user_id}),and(sender_id.eq.${data.with_user_id},recipient_id.eq.${context.userId})`,
        );
      }

      const { data: messages, error } = await query;

      if (!error && messages && messages.length > 0) {
        return (messages as unknown as Array<{
          id: string;
          sender_id: string;
          recipient_id: string;
          institution_id: string | null;
          subject: string;
          message: string;
          is_read: boolean;
          created_at: string;
          sender?: { display_name?: string };
          recipient?: { display_name?: string };
        }>).map((m) => ({
          id: m.id,
          sender_id: m.sender_id,
          sender_name: m.sender?.display_name || "Instructor",
          recipient_id: m.recipient_id,
          recipient_name: m.recipient?.display_name || "Scholar",
          institution_id: m.institution_id,
          subject: m.subject || "Direct Message",
          message: m.message,
          is_read: m.is_read,
          created_at: m.created_at,
        }));
      }
    } catch {
      // Fallback below
    }

    // Fallback: Read from notifications sent to current user
    const { data: notifs } = await context.supabase
      .from("notifications" as never)
      .select("id, user_id, title, message, is_read, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    const notifRows = (notifs || []) as unknown as Array<Record<string, unknown>>;
    return notifRows.map((n) => ({
      id: n["id"] as string,
      sender_id: "system-sender",
      sender_name: (n["title"] as string)?.split(":")[0] || "Company Instructor",
      recipient_id: context.userId,
      recipient_name: "You",
      institution_id: null,
      subject: (n["title"] as string) || "System Notification",
      message: (n["message"] as string) || "",
      is_read: Boolean(n["is_read"]),
      created_at: (n["created_at"] as string) || new Date().toISOString(),
    }));
  });

// 3. Mark message as read
export const markDirectMessageReadFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ message_id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    try {
      await context.supabase
        .from("direct_messages" as never)
        .update({ is_read: true } as never)
        .eq("id" as never, data.message_id)
        .eq("recipient_id" as never, context.userId);
    } catch {
      // Fallback to notifications
      await context.supabase
        .from("notifications" as never)
        .update({ is_read: true } as never)
        .eq("id", data.message_id)
        .eq("user_id", context.userId);
    }

    return { success: true };
  });
