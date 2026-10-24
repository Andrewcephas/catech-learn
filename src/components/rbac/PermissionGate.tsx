import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PermissionCode } from "@/lib/rbac.functions";
import { hasPermission, hasAnyPermission, hasAllPermissions } from "@/lib/rbac.functions";

// ─── Legacy Role to Permission Fallback Mapping ───────────────────────────────
// Used when RBAC migration 0004 has not yet been executed in production.
const ROLE_FALLBACK_MAP: Record<string, string[]> = {
  super_admin: ["*"],
  institution_admin: [
    "institution.view",
    "institution.settings.manage",
    "users.view",
    "users.invite",
    "courses.create",
    "courses.edit",
    "courses.delete",
    "courses.publish",
    "courses.view",
    "courses.content.edit",
    "grades.enter",
    "grades.view",
    "reports.view",
    "finance.view",
    "attendance.record",
    "attendance.view",
  ],
  teacher: [
    "courses.create",
    "courses.edit",
    "courses.content.edit",
    "courses.view",
    "grades.enter",
    "grades.view",
    "attendance.record",
    "attendance.view",
  ],
  student: [
    "courses.view",
    "grades.view",
    "attendance.view",
  ],
};

function hasFallbackPermission(roles: string[], isPlatformAdmin: boolean, permission: string): boolean {
  if (isPlatformAdmin || roles.includes("super_admin")) return true;
  for (const role of roles) {
    const granted = ROLE_FALLBACK_MAP[role] || [];
    if (granted.includes("*") || granted.includes(permission)) return true;
    const [category] = permission.split(".");
    if (granted.some((p) => p.startsWith(`${category}.*`))) return true;
  }
  return false;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PermissionGateProps {
  /** Optional: user's permissions. If omitted, automatically retrieved from ["account"] query. */
  permissions?: (PermissionCode | string)[];
  /** Single required permission — children are rendered if the user has it. */
  require?: PermissionCode | string;
  /** List of permissions — children are rendered if the user has ANY of them. */
  requireAny?: (PermissionCode | string)[];
  /** List of permissions — children are rendered if the user has ALL of them. */
  requireAll?: (PermissionCode | string)[];
  /** Content to render when the permission check passes. */
  children: ReactNode;
  /** Optional fallback when the user lacks the required permission(s). */
  fallback?: ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Client-side permission guard component.
 *
 * Renders `children` only if the current user has the required permission(s).
 * If `permissions` is not passed, it reads from the TanStack query cache for ["account"].
 * All real security enforcement is executed server-side.
 */
export function PermissionGate({
  permissions: explicitPermissions,
  require,
  requireAny,
  requireAll,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { data: account } = useQuery<{
    isPlatformAdmin?: boolean;
    roles?: string[];
    rbacPermissions?: string[];
  }>({
    queryKey: ["account"],
    enabled: !explicitPermissions,
  });

  const isPlatformAdmin = Boolean(account?.isPlatformAdmin);
  const roles = account?.roles || [];
  const effectivePermissions = (explicitPermissions || account?.rbacPermissions || []) as PermissionCode[];

  // Super admin always has access
  if (isPlatformAdmin) {
    return <>{children}</>;
  }

  let allowed = false;

  if (require) {
    allowed =
      hasPermission(effectivePermissions, require as PermissionCode) ||
      hasFallbackPermission(roles, isPlatformAdmin, require);
  } else if (requireAny) {
    allowed =
      hasAnyPermission(effectivePermissions, requireAny as PermissionCode[]) ||
      requireAny.some((req) => hasFallbackPermission(roles, isPlatformAdmin, req));
  } else if (requireAll) {
    allowed =
      hasAllPermissions(effectivePermissions, requireAll as PermissionCode[]) ||
      requireAll.every((req) => hasFallbackPermission(roles, isPlatformAdmin, req));
  } else {
    allowed = true;
  }

  return <>{allowed ? children : fallback}</>;
}

/**
 * Hook to check if the current user has a specific permission.
 */
export function useHasPermission(permission: PermissionCode | string): boolean {
  const { data: account } = useQuery<{
    isPlatformAdmin?: boolean;
    roles?: string[];
    rbacPermissions?: string[];
  }>({
    queryKey: ["account"],
  });

  if (!account) return false;
  if (account.isPlatformAdmin) return true;

  const permissions = (account.rbacPermissions || []) as PermissionCode[];
  return (
    hasPermission(permissions, permission as PermissionCode) ||
    hasFallbackPermission(account.roles || [], false, permission)
  );
}

/**
 * Inline helper for checking permissions directly against an array.
 */
export function usePermissionCheck(
  permissions: (PermissionCode | string)[],
  check: {
    require?: PermissionCode | string;
    requireAny?: (PermissionCode | string)[];
    requireAll?: (PermissionCode | string)[];
  },
): boolean {
  const typedPermissions = permissions as PermissionCode[];
  if (check.require) return hasPermission(typedPermissions, check.require as PermissionCode);
  if (check.requireAny) return hasAnyPermission(typedPermissions, check.requireAny as PermissionCode[]);
  if (check.requireAll) return hasAllPermissions(typedPermissions, check.requireAll as PermissionCode[]);
  return true;
}

