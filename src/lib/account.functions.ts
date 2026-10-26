import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profile, roles, memberships] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).single(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      context.supabase
        .from("institution_memberships")
        .select("id, institution_id, role, active, institutions(id, name, code, status)")
        .eq("user_id", context.userId),
    ]);
    if (profile.error) throw new Error(profile.error.message);
    if (roles.error) throw new Error(roles.error.message);

    const userRoles = (roles.data || []).map((row) => row.role);
    const isPlatformAdmin = userRoles.includes("super_admin");

    // Fetch RBAC assigned roles and effective permissions (non-blocking — graceful if tables don't exist yet)
    let rbacRoles: Array<{ role_code: string; role_name: string; institution_id: string | null }> = [];
    let rbacPermissions: string[] = [];
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const [arResult, permResult] = await Promise.all([
        supabaseAdmin
          .from("user_assigned_roles" as never)
          .select("role_id, institution_id, roles(code, name)")
          .eq("user_id", context.userId),
        supabaseAdmin.rpc("get_user_permissions" as never, {
          _user_id: context.userId,
          _institution_id: null,
        } as never),
      ]);
      if (!arResult.error && arResult.data) {
        rbacRoles = (arResult.data as Array<{
          role_id: string;
          institution_id: string | null;
          roles: { code: string; name: string } | null;
        }>).map((r) => ({
          role_code: r.roles?.code ?? "",
          role_name: r.roles?.name ?? "",
          institution_id: r.institution_id,
        }));
      }
      if (!permResult.error && permResult.data) {
        rbacPermissions = (permResult.data as Array<{ permission_code: string }>).map(
          (r) => r.permission_code,
        );
      }
    } catch {
      // RBAC tables may not be migrated yet — fail silently
    }

    return {
      profile: profile.data,
      roles: userRoles,
      isPlatformAdmin,
      rbacRoles,
      rbacPermissions,
      memberships: (memberships.data || []).map((m) => ({
        id: m.id,
        institution_id: m.institution_id,
        role: m.role,
        active: m.active,
        institution: m.institutions as {
          id: string;
          name: string;
          code: string;
          status: string;
        } | null,
      })),
    };
  });


export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        display_name: z.string().trim().min(1).max(100),
        avatar_url: z.string().url().optional().or(z.literal("")),
        phone_number: z.string().trim().optional(),
        bio: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const updatePayload: Record<string, unknown> = {
      display_name: data.display_name,
    };
    if (data.avatar_url !== undefined) updatePayload.avatar_url = data.avatar_url || null;
    if (data.phone_number !== undefined) updatePayload.phone_number = data.phone_number;
    if (data.bio !== undefined) updatePayload.bio = data.bio;

    const result = await context.supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", context.userId)
      .select()
      .single();
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });
