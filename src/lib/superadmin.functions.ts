import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface PlatformGlobalStats {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  totalLearners: number;
  totalCourses: number;
  publishedCourses: number;
  totalRevenueKes: number;
  completedPaymentsCount: number;
  totalAuditEvents: number;
}

export interface PlatformUserItem {
  id: string;
  displayName: string;
  role: string;
  avatarUrl: string | null;
  institutionName: string | null;
  institutionId: string | null;
  createdAt: string;
  phoneNumber?: string | undefined;
  isSuperAdmin: boolean;
}

export interface PlatformCourseItem {
  id: string;
  institutionId: string;
  institutionName: string;
  title: string;
  code: string;
  price: number;
  currency: string;
  isPublished: boolean;
  instructorName: string;
  enrolledCount: number;
  createdAt: string;
}

// 1. Get Global Platform Statistics for Super Admin
export const getPlatformGlobalStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlatformGlobalStats> => {
    // 1. Institutions counts
    const { data: institutions = [] } = await context.supabase
      .from("institutions")
      .select("id, status");

    const totalCompanies = (institutions || []).length;
    const activeCompanies = (institutions || []).filter((i) => i.status === "active").length;
    const suspendedCompanies = totalCompanies - activeCompanies;

    // 2. Profiles / Users count
    const { data: profiles = [] } = await context.supabase
      .from("profiles")
      .select("id");
    const totalLearners = (profiles || []).length;

    // 3. Courses count
    const { data: courses = [] } = await context.supabase
      .from("courses" as never)
      .select("id, is_published");
    const courseRows = (courses || []) as unknown as Array<{ id: string; is_published: boolean }>;
    const totalCourses = courseRows.length;
    const publishedCourses = courseRows.filter((c) => c.is_published).length;

    // 4. Payments & Revenue
    const { data: payments = [] } = await context.supabase
      .from("payments" as never)
      .select("amount, status");

    let totalRevenueKes = 0;
    let completedPaymentsCount = 0;
    const paymentRows = (payments || []) as unknown as Array<{ amount: number | string; status: string }>;
    for (const p of paymentRows) {
      if (p.status === "completed") {
        totalRevenueKes += Number(p.amount) || 0;
        completedPaymentsCount += 1;
      }
    }

    // 5. Audit logs count
    const { count: auditCount } = await context.supabase
      .from("institution_audit_logs")
      .select("*", { count: "exact", head: true });

    return {
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      totalLearners,
      totalCourses,
      publishedCourses,
      totalRevenueKes,
      completedPaymentsCount,
      totalAuditEvents: auditCount || 0,
    };
  });

// 2. List All Platform Users with Roles & Tenant Memberships
export const listAllPlatformUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlatformUserItem[]> => {
    // Fetch profiles, user_roles, and memberships
    const [profilesRes, rolesRes, membershipsRes, paymentsRes] = await Promise.all([
      context.supabase.from("profiles").select("id, display_name, avatar_url, created_at").order("created_at", { ascending: false }),
      context.supabase.from("user_roles").select("user_id, role"),
      context.supabase.from("institution_memberships").select("user_id, institution_id, role, institutions(name)"),
      context.supabase.from("payments" as never).select("user_id, phone_number").order("created_at", { ascending: false }),
    ]);

    const roleMap = new Map<string, string>();
    for (const r of rolesRes.data || []) {
      if (r.role === "super_admin") {
        roleMap.set(r.user_id, "super_admin");
      } else if (!roleMap.has(r.user_id)) {
        roleMap.set(r.user_id, r.role);
      }
    }

    const memberMap = new Map<string, { instName: string; instId: string; role: string }>();
    for (const m of membershipsRes.data || []) {
      memberMap.set(m.user_id, {
        instName: (m.institutions as { name?: string } | null)?.name || "Partner Company",
        instId: m.institution_id,
        role: m.role,
      });
    }

    const phoneMap = new Map<string, string>();
    const paymentRows = (paymentsRes.data || []) as unknown as Array<{ user_id: string; phone_number: string | null }>;
    for (const p of paymentRows) {
      if (p.phone_number && !phoneMap.has(p.user_id)) {
        phoneMap.set(p.user_id, p.phone_number);
      }
    }

    return (profilesRes.data || []).map((p) => {
      const membership = memberMap.get(p.id);
      const role = roleMap.get(p.id) || membership?.role || "student";
      const isSuper = role === "super_admin";

      return {
        id: p.id,
        displayName: p.display_name || "Platform Scholar",
        role,
        avatarUrl: p.avatar_url,
        institutionName: membership?.instName || null,
        institutionId: membership?.instId || null,
        createdAt: p.created_at,
        phoneNumber: phoneMap.get(p.id),
        isSuperAdmin: isSuper,
      };
    });
  });

// 3. Promote or Update Platform Role for a User
const updateRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["super_admin", "institution_admin", "teacher", "student"]),
});

export const updatePlatformUserRoleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateRoleSchema.parse(input))
  .handler(async ({ data, context }) => {
    // 1. Upsert into user_roles
    const { error: roleErr } = await context.supabase
      .from("user_roles")
      .upsert(
        {
          user_id: data.user_id,
          role: data.role,
        },
        { onConflict: "user_id,role" },
      );

    if (roleErr) {
      // Try via supabaseAdmin
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: data.user_id, role: data.role }, { onConflict: "user_id,role" });
      } catch (err: unknown) {
        throw new Error(roleErr.message);
      }
    }

    // 2. Audit log the action
    await context.supabase.from("institution_audit_logs").insert({
      actor_id: context.userId,
      action: "platform_user_role_updated",
      target_id: data.user_id,
      details: { assigned_role: data.role },
    });

    return { success: true, message: `User role successfully updated to ${data.role}.` };
  });

// 4. List All Courses Across All Companies
export const listAllPlatformCourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlatformCourseItem[]> => {
    const { data: courses = [], error } = await context.supabase
      .from("courses" as never)
      .select("id, institution_id, title, code, price, currency, is_published, created_at, profiles(display_name), institutions(name)")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    // Get enrollment counts per course
    const { data: enrollments = [] } = await context.supabase
      .from("enrollments" as never)
      .select("course_id");

    const countMap = new Map<string, number>();
    const enrollmentRows = (enrollments || []) as unknown as Array<{ course_id: string }>;
    for (const e of enrollmentRows) {
      countMap.set(e.course_id, (countMap.get(e.course_id) || 0) + 1);
    }

    const courseRows = (courses || []) as unknown as Array<Record<string, unknown>>;
    return courseRows.map((c) => ({
      id: c["id"] as string,
      institutionId: c["institution_id"] as string,
      institutionName: (c["institutions"] as { name?: string } | null)?.name || "CATECH Institution",
      title: c["title"] as string,
      code: c["code"] as string,
      price: Number(c["price"]),
      currency: c["currency"] as string,
      isPublished: Boolean(c["is_published"]),
      instructorName: (c["profiles"] as { display_name?: string } | null)?.display_name || "Faculty Lead",
      enrolledCount: countMap.get(c["id"] as string) || 0,
      createdAt: c["created_at"] as string,
    }));
  });

// 5. Toggle Course Published Status Globally
export const toggleCoursePublishFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: unknown) =>
      z.object({ course_id: z.string().uuid(), is_published: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("courses" as never)
      .update({ is_published: data.is_published } as never)
      .eq("id", data.course_id);

    if (error) throw new Error(error.message);
    return { success: true };
  });

// 6. List All Platform Payments Across All Tenants
export const listAllPlatformPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: payments = [], error } = await context.supabase
      .from("payments" as never)
      .select("id, institution_id, user_id, course_id, amount, currency, payment_method, status, checkout_request_id, mpesa_receipt_number, phone_number, created_at, courses(title), institutions(name)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    const paymentRows = (payments || []) as unknown as Array<Record<string, unknown>>;
    return paymentRows.map((p) => ({
      id: p["id"] as string,
      institutionName: (p["institutions"] as { name?: string } | null)?.name || "System Payment",
      courseTitle: (p["courses"] as { title?: string } | null)?.title || "Course Session",
      phoneNumber: p["phone_number"] as string,
      amount: Number(p["amount"]),
      currency: p["currency"] as string,
      status: p["status"] as string,
      receiptNumber: p["mpesa_receipt_number"] as string | null,
      createdAt: p["created_at"] as string,
    }));
  });

// 7. Get User Permission Overrides
export interface UserPermissionOverrideItem {
  id: string;
  permission_code: string;
  granted: boolean;
  institution_id: string | null;
  created_at: string;
}

export const getUserPermissionOverridesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ user_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<UserPermissionOverrideItem[]> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: rows = [], error } = await supabaseAdmin
        .from("user_permission_overrides" as never)
        .select("id, permission_code, granted, institution_id, created_at")
        .eq("user_id", data.user_id);

      if (!error && rows) {
        return rows as unknown as UserPermissionOverrideItem[];
      }
    } catch {
      // Fallback
    }

    const { data: rows = [] } = await context.supabase
      .from("user_permission_overrides" as never)
      .select("id, permission_code, granted, institution_id, created_at")
      .eq("user_id", data.user_id);

    return (rows || []) as unknown as UserPermissionOverrideItem[];
  });

// 8. Super Admin Grant or Deactivate Permission for a User
const togglePermSchema = z.object({
  user_id: z.string().uuid(),
  permission_code: z.string().trim().min(2),
  granted: z.boolean(),
  institution_id: z.string().uuid().optional(),
});

export const toggleUserPermissionOverrideFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => togglePermSchema.parse(input))
  .handler(async ({ data, context }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("user_permission_overrides" as never).upsert(
        {
          user_id: data.user_id,
          permission_code: data.permission_code,
          granted: data.granted,
          granted_by: context.userId,
          institution_id: data.institution_id || null,
        } as never,
        { onConflict: "user_id,permission_code" } as never,
      );
    } catch {
      await context.supabase.from("user_permission_overrides" as never).upsert(
        {
          user_id: data.user_id,
          permission_code: data.permission_code,
          granted: data.granted,
          granted_by: context.userId,
          institution_id: data.institution_id || null,
        } as never,
        { onConflict: "user_id,permission_code" } as never,
      );
    }

    // Audit log
    await context.supabase.from("institution_audit_logs").insert({
      actor_id: context.userId,
      action: data.granted ? "superadmin_permission_granted" : "superadmin_permission_deactivated",
      target_id: data.user_id,
      details: {
        permission_code: data.permission_code,
        granted: data.granted,
        institution_id: data.institution_id || null,
      },
    });

    return {
      success: true,
      message: `Permission ${data.permission_code} ${data.granted ? "activated (granted)" : "deactivated (revoked)"} successfully.`,
    };
  });

// 9. Reset Permission Override Back to Role Default
export const removeUserPermissionOverrideFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: unknown) =>
      z.object({ user_id: z.string().uuid(), permission_code: z.string() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("user_permission_overrides" as never)
        .delete()
        .eq("user_id", data.user_id)
        .eq("permission_code", data.permission_code);
    } catch {
      await context.supabase
        .from("user_permission_overrides" as never)
        .delete()
        .eq("user_id", data.user_id)
        .eq("permission_code", data.permission_code);
    }

    return { success: true };
  });

// 10. Assign User to a Specific Company
export const assignUserToCompanyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: unknown) =>
      z
        .object({
          user_id: z.string().uuid(),
          institution_id: z.string().uuid(),
          role: z.enum(["institution_admin", "teacher", "student"]),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("institution_memberships").upsert(
        {
          institution_id: data.institution_id,
          user_id: data.user_id,
          role: data.role,
          active: true,
        },
        { onConflict: "institution_id,user_id" },
      );
    } catch {
      await context.supabase.from("institution_memberships").upsert(
        {
          institution_id: data.institution_id,
          user_id: data.user_id,
          role: data.role,
          active: true,
        },
        { onConflict: "institution_id,user_id" },
      );
    }

    return { success: true, message: "User assigned to company successfully." };
  });

// 11. System Configuration & Platform Branding Settings
export interface PlatformSystemSettings {
  id?: string;
  platform_name: string;
  tagline: string;
  support_email: string;
  support_phone: string;
  organization_address: string;
  default_currency: string;
  mpesa_paybill: string;
  allow_student_registration: boolean;
  allow_company_registration: boolean;
  maintenance_mode: boolean;
}

const DEFAULT_PLATFORM_SETTINGS: PlatformSystemSettings = {
  platform_name: "CATECH Learn",
  tagline: "Accredited Multi-Tenant Learning & Career Development Platform",
  support_email: "support@catech.co.ke",
  support_phone: "+254 700 000 444",
  organization_address: "Ngong Road, Nairobi, Kenya",
  default_currency: "KES",
  mpesa_paybill: "174379",
  allow_student_registration: true,
  allow_company_registration: true,
  maintenance_mode: false,
};

export const getPlatformSystemSettingsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlatformSystemSettings> => {
    try {
      const { data, error } = await context.supabase
        .from("platform_system_settings" as never)
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        return DEFAULT_PLATFORM_SETTINGS;
      }
      return data as unknown as PlatformSystemSettings;
    } catch {
      return DEFAULT_PLATFORM_SETTINGS;
    }
  });

const updatePlatformSettingsSchema = z.object({
  platform_name: z.string().trim().min(2).max(100),
  tagline: z.string().trim().max(200),
  support_email: z.string().trim().email(),
  support_phone: z.string().trim(),
  organization_address: z.string().trim(),
  default_currency: z.string().trim().default("KES"),
  mpesa_paybill: z.string().trim().default("174379"),
  allow_student_registration: z.boolean().default(true),
  allow_company_registration: z.boolean().default(true),
  maintenance_mode: z.boolean().default(false),
});

export const updatePlatformSystemSettingsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updatePlatformSettingsSchema.parse(input))
  .handler(async ({ data, context }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // Check existing row
      const { data: existing } = await supabaseAdmin
        .from("platform_system_settings" as never)
        .select("id")
        .limit(1)
        .maybeSingle();

      const payload = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      if ((existing as { id?: string } | null)?.id) {
        await supabaseAdmin
          .from("platform_system_settings" as never)
          .update(payload as never)
          .eq("id", (existing as unknown as { id: string }).id);
      } else {
        await supabaseAdmin.from("platform_system_settings" as never).insert(payload as never);
      }

      await context.supabase.from("institution_audit_logs").insert({
        actor_id: context.userId,
        action: "superadmin_system_settings_updated",
        target_id: context.userId,
        details: payload,
      });

      return { success: true, message: "System settings and branding updated successfully." };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update platform settings";
      return { success: false, message: msg };
    }
  });

// 12. Super Admin Full Company Credentials & Password Management
const updateCompanyCredentialsSchema = z.object({
  institution_id: z.string().uuid(),
  name: z.string().trim().min(2, "Company name must be at least 2 characters").max(160),
  code: z.string().trim().toUpperCase(),
  contact_email: z.string().trim().email(),
  phone_number: z.string().trim().optional(),
  address: z.string().trim().optional(),
  description: z.string().trim().optional(),
  status: z.enum(["active", "suspended"]).default("active"),
  admin_email: z.string().trim().email().optional().or(z.literal("")),
  admin_password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
});

export const updateCompanyFullCredentialsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateCompanyCredentialsSchema.parse(input))
  .handler(async ({ data, context }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // 1. Update institution record
      const updatePayload: Record<string, unknown> = {
        name: data.name,
        code: data.code,
        contact_email: data.admin_email || data.contact_email,
        status: data.status,
        updated_at: new Date().toISOString(),
      };
      if (data.phone_number !== undefined) updatePayload["phone_number"] = data.phone_number;
      if (data.address !== undefined) updatePayload["address"] = data.address;
      if (data.description !== undefined) updatePayload["description"] = data.description;

      await supabaseAdmin
        .from("institutions" as never)
        .update(updatePayload as never)
        .eq("id", data.institution_id);

      // 2. If admin_password or admin_email provided, manage the company administrator auth user
      let authUserMsg = "";
      if (data.admin_password || data.admin_email) {
        // Find existing administrator member
        const { data: member } = await supabaseAdmin
          .from("institution_memberships")
          .select("user_id")
          .eq("institution_id", data.institution_id)
          .eq("role", "institution_admin")
          .maybeSingle();

        const targetEmail = data.admin_email || data.contact_email;

        if (member?.user_id) {
          // Update existing administrator
          const authUpdates: { email?: string; password?: string } = {};
          if (data.admin_email) authUpdates.email = data.admin_email;
          if (data.admin_password) authUpdates.password = data.admin_password;

          const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
            member.user_id,
            authUpdates,
          );
          if (authErr) {
            authUserMsg = ` (Warning: Password update skipped: ${authErr.message})`;
          } else {
            authUserMsg = " Administrator login credentials updated successfully.";
          }
        } else if (data.admin_password) {
          // Provision a new admin user if none exists
          const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: targetEmail,
            password: data.admin_password,
            email_confirm: true,
          });

          if (newUser?.user?.id) {
            await supabaseAdmin.from("institution_memberships").upsert({
              institution_id: data.institution_id,
              user_id: newUser.user.id,
              role: "institution_admin",
              active: true,
            });
            authUserMsg = " New company administrator user provisioned and bound.";
          } else if (createErr) {
            authUserMsg = ` (Note: ${createErr.message})`;
          }
        }
      }

      // 3. Log audit event
      await context.supabase.from("institution_audit_logs").insert({
        actor_id: context.userId,
        institution_id: data.institution_id,
        action: "superadmin_company_credentials_updated",
        target_id: data.institution_id,
        details: {
          code: data.code,
          name: data.name,
          status: data.status,
          password_reset: Boolean(data.admin_password),
        },
      });

      return {
        success: true,
        message: `Company details, official contact, and credentials updated.${authUserMsg}`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update company credentials";
      throw new Error(msg);
    }
  });

