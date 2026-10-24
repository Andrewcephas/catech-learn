import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface InstitutionItem {
  id: string;
  name: string;
  code: string;
  contact_email: string;
  status: "active" | "suspended";
  created_at: string;
  updated_at: string;
}

export interface InstitutionMember {
  id: string;
  user_id: string;
  display_name: string;
  role: "institution_admin" | "teacher" | "student";
  active: boolean;
}

export interface AuditLogItem {
  id: string;
  institution_id: string | null;
  actor_id: string | null;
  action: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

const saveInstitutionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(160, "Name must not exceed 160 characters"),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9-]{1,29}$/, "Code must be 2-30 characters, alphanumeric with hyphens"),
  contact_email: z.string().trim().email("Invalid contact email").max(254),
  status: z.enum(["active", "suspended"]).default("active"),
});

const assignMemberSchema = z.object({
  institution_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(["institution_admin", "teacher", "student"]),
  active: z.boolean().default(true),
});

export const listInstitutions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InstitutionItem[]> => {
    const { data, error } = await context.supabase
      .from("institutions")
      .select("id, name, code, contact_email, status, created_at, updated_at")
      .order("name", { ascending: true });

    if (error) {
      throw new Error(`Failed to load institutions: ${error.message}`);
    }

    return (data || []) as InstitutionItem[];
  });

export const saveInstitutionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveInstitutionSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: resultId, error } = await context.supabase.rpc("save_institution", {
      _name: data.name,
      _code: data.code,
      _contact_email: data.contact_email,
      _id: data.id,
      _status: data.status,
    });

    if (error) {
      throw new Error(error.message);
    }

    return { id: resultId };
  });

export const getInstitutionMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ institution_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<InstitutionMember[]> => {
    const { data: members, error } = await context.supabase.rpc("institution_member_directory", {
      _institution_id: data.institution_id,
    });

    if (error) {
      throw new Error(error.message);
    }

    return (members || []) as InstitutionMember[];
  });

export const assignInstitutionMemberFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => assignMemberSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: memberId, error } = await context.supabase.rpc("assign_institution_member", {
      _institution_id: data.institution_id,
      _user_id: data.user_id,
      _role: data.role,
      _active: data.active,
    });

    if (error) {
      throw new Error(error.message);
    }

    return { id: memberId };
  });

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: unknown) =>
      z
        .object({
          institution_id: z.string().uuid().optional(),
          limit: z.number().int().min(1).max(100).default(50),
        })
        .optional()
        .parse(input) || { limit: 50 },
  )
  .handler(async ({ data, context }): Promise<AuditLogItem[]> => {
    let query = context.supabase
      .from("institution_audit_logs")
      .select("id, institution_id, actor_id, action, target_id, details, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.institution_id) {
      query = query.eq("institution_id", data.institution_id);
    }

    const { data: logs, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    return (logs || []).map((l) => ({
      id: l.id,
      institution_id: l.institution_id,
      actor_id: l.actor_id,
      action: l.action,
      target_id: l.target_id,
      details: (l.details as Record<string, unknown>) || {},
      created_at: l.created_at,
    }));
  });

export const bootstrapSuperAdminFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ success: boolean; message: string }> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.rpc("provision_initial_platform_admin", {
        _user_id: context.userId,
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        message: "Super administrator provisioned successfully. Please refresh your session.",
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown bootstrap error";
      throw new Error(
        `Bootstrap failed: ${msg}. (Ensure SUPABASE_SERVICE_ROLE_KEY is set in your server environment).`,
      );
    }
  });
