import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─── Public Types ────────────────────────────────────────────────────────────

export type SystemRoleCode =
  | "super_admin"
  | "institution_owner"
  | "institution_admin"
  | "academic_admin"
  | "department_head"
  | "teacher"
  | "examination_officer"
  | "accountant"
  | "student"
  | "parent"
  | "librarian"
  | "support_agent";

export type PermissionCode =
  | "platform.dashboard.view"
  | "platform.analytics.view"
  | "platform.settings.manage"
  | "platform.audit_logs.view"
  | "platform.integrations.manage"
  | "institutions.view"
  | "institutions.create"
  | "institutions.update"
  | "institutions.suspend"
  | "institutions.delete"
  | "institutions.settings.manage"
  | "users.view"
  | "users.create"
  | "users.update"
  | "users.suspend"
  | "users.delete"
  | "users.roles.assign"
  | "users.permissions.manage"
  | "courses.view"
  | "courses.create"
  | "courses.update"
  | "courses.delete"
  | "courses.publish"
  | "courses.assign_teacher"
  | "courses.enroll_students"
  | "lessons.view"
  | "lessons.create"
  | "lessons.update"
  | "lessons.delete"
  | "lessons.publish"
  | "learning_materials.upload"
  | "learning_materials.delete"
  | "assessments.view"
  | "assessments.create"
  | "assessments.update"
  | "assessments.publish"
  | "assessments.grade"
  | "assessments.results.release"
  | "assessments.appeals.manage"
  | "assignments.create"
  | "assignments.view"
  | "assignments.grade"
  | "assignments.feedback.manage"
  | "attendance.view"
  | "attendance.record"
  | "attendance.update"
  | "attendance.reports.export"
  | "payments.view"
  | "payments.reconcile"
  | "payments.refund"
  | "invoices.view"
  | "invoices.create"
  | "subscriptions.view"
  | "subscriptions.manage"
  | "certificates.view"
  | "certificates.issue"
  | "certificates.revoke"
  | "certificates.verify"
  | "reports.view"
  | "reports.export"
  | "analytics.view"
  | "academic.years.manage"
  | "departments.manage"
  | "classes.manage"
  | "announcements.create"
  | "announcements.publish"
  | "messages.send"
  | "discussions.moderate"
  | "support.tickets.view"
  | "support.tickets.assign"
  | "support.tickets.update"
  | "support.access.request";

export interface RbacRole {
  id: string;
  code: string;
  name: string;
  description: string;
  institution_id: string | null;
  is_system: boolean;
  permission_count?: number;
}

export interface RbacPermission {
  code: string;
  category: string;
  name: string;
  description: string;
}

export interface UserAssignedRole {
  id: string;
  user_id: string;
  role_id: string;
  institution_id: string | null;
  role_code: string;
  role_name: string;
  assigned_at: string;
}

export interface RbacAuditEntry {
  id: string;
  actor_id: string | null;
  action: string;
  target_user_id: string | null;
  role_code: string | null;
  permission_code: string | null;
  details: Record<string, any>;
  created_at: string;
}

// ─── Validation Schemas ───────────────────────────────────────────────────────

const assignRoleSchema = z.object({
  target_user_id: z.string().uuid("Invalid user ID"),
  role_code: z.string().min(2).max(80),
  institution_id: z.string().uuid("Invalid institution ID").optional(),
});

const revokeRoleSchema = z.object({
  target_user_id: z.string().uuid("Invalid user ID"),
  role_code: z.string().min(2).max(80),
  institution_id: z.string().uuid("Invalid institution ID").optional(),
});

const overridePermSchema = z.object({
  target_user_id: z.string().uuid("Invalid user ID"),
  permission_code: z.string().min(2).max(120),
  granted: z.boolean(),
  institution_id: z.string().uuid().optional(),
});

// ─── Server Functions ─────────────────────────────────────────────────────────

/** List all system and institution roles visible to the current user. */
export const listRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context: _ctx }): Promise<RbacRole[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("roles" as never)
      .select("id, code, name, description, institution_id, is_system")
      .order("is_system", { ascending: false })
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as RbacRole[];
  });

/** List all permissions in the system. */
export const listPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context: _ctx }): Promise<RbacPermission[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("permissions" as never)
      .select("code, category, name, description")
      .order("category")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as RbacPermission[];
  });

/** Get effective permissions for the current user (optionally scoped to an institution). */
export const getMyPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ institution_id: z.string().uuid().optional() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<PermissionCode[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc(
      "get_user_permissions" as never,
      {
        _user_id: context.userId,
        _institution_id: data.institution_id ?? null,
      } as never,
    );
    if (error) throw new Error(error.message);
    return ((result as Array<{ permission_code: string }>) ?? []).map(
      (r) => r.permission_code as PermissionCode,
    );
  });

/** Get all role assignments for a specific user. */
export const getUserRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ user_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context: _ctx }): Promise<UserAssignedRole[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("user_assigned_roles" as never)
      .select("id, user_id, role_id, institution_id, created_at, roles(code, name)")
      .eq("user_id", data.user_id as string);
    if (error) throw new Error(error.message);
    return ((rows ?? []) as Array<{
      id: string;
      user_id: string;
      role_id: string;
      institution_id: string | null;
      created_at: string;
      roles: { code: string; name: string } | null;
    }>).map((r) => ({
      id: r.id,
      user_id: r.user_id,
      role_id: r.role_id,
      institution_id: r.institution_id,
      role_code: r.roles?.code ?? "",
      role_name: r.roles?.name ?? "",
      assigned_at: r.created_at,
    }));
  });

/** Assign a role to a user. Enforces server-side privilege checks via DB function. */
export const assignRoleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => assignRoleSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc(
      "assign_user_role" as never,
      {
        _actor_id: context.userId,
        _target_user_id: data.target_user_id,
        _role_code: data.role_code,
        _institution_id: data.institution_id ?? null,
      } as never,
    );
    if (error) throw new Error(error.message);
    return { id: result as string };
  });

/** Revoke a role from a user. Enforces server-side privilege checks via DB function. */
export const revokeRoleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => revokeRoleSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ revoked: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc(
      "revoke_user_role" as never,
      {
        _actor_id: context.userId,
        _target_user_id: data.target_user_id,
        _role_code: data.role_code,
        _institution_id: data.institution_id ?? null,
      } as never,
    );
    if (error) throw new Error(error.message);
    return { revoked: result as boolean };
  });

/** Grant or deny a specific permission override for a user. */
export const overridePermissionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => overridePermSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc(
      "override_user_permission" as never,
      {
        _actor_id: context.userId,
        _target_user_id: data.target_user_id,
        _permission_code: data.permission_code,
        _granted: data.granted,
        _institution_id: data.institution_id ?? null,
      } as never,
    );
    if (error) throw new Error(error.message);
    return { id: result as string };
  });

/** Get RBAC audit log entries (platform-wide or per institution). */
export const listRbacAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ institution_id: z.string().uuid().optional(), limit: z.number().int().min(1).max(200).default(50) })
      .parse(input),
  )
  .handler(async ({ data, context: _ctx }): Promise<RbacAuditEntry[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = (supabaseAdmin as unknown as {
      from(t: string): {
        select(s: string): {
          order(col: string, opts: Record<string, unknown>): {
            limit(n: number): {
              eq(col: string, val: unknown): Promise<{ data: unknown; error: { message: string } | null }>;
            } & Promise<{ data: unknown; error: { message: string } | null }>;
          };
        };
      };
    })
      .from("rbac_audit_logs")
      .select("id, actor_id, action, target_user_id, role_code, permission_code, details, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.institution_id) {
      query = (query as unknown as { eq: (c: string, v: unknown) => typeof query }).eq(
        "institution_id",
        data.institution_id,
      );
    }

    const { data: rows, error } = await (query as unknown as Promise<{ data: unknown; error: { message: string } | null }>);
    if (error) throw new Error(error.message);

    return ((rows ?? []) as Array<{
      id: string;
      actor_id: string | null;
      action: string;
      target_user_id: string | null;
      role_code: string | null;
      permission_code: string | null;
      details: Record<string, unknown>;
      created_at: string;
    }>).map((r) => ({
      id: r.id,
      actor_id: r.actor_id,
      action: r.action,
      target_user_id: r.target_user_id,
      role_code: r.role_code,
      permission_code: r.permission_code,
      details: r.details ?? {},
      created_at: r.created_at,
    }));
  });

/** Get permissions assigned to a specific role. */
export const getRolePermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ role_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context: _ctx }): Promise<string[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("role_permissions" as never)
      .select("permission_code")
      .eq("role_id", data.role_id as string);
    if (error) throw new Error(error.message);
    return ((rows ?? []) as Array<{ permission_code: string }>).map((r) => r.permission_code);
  });

// ─── Client-side Guard Utilities ─────────────────────────────────────────────

/** Check if a permission is in the cached list. Always also enforce on backend. */
export function hasPermission(userPermissions: PermissionCode[], required: PermissionCode): boolean {
  return userPermissions.includes(required);
}

export function hasAnyPermission(userPermissions: PermissionCode[], required: PermissionCode[]): boolean {
  return required.some((p) => userPermissions.includes(p));
}

export function hasAllPermissions(userPermissions: PermissionCode[], required: PermissionCode[]): boolean {
  return required.every((p) => userPermissions.includes(p));
}
