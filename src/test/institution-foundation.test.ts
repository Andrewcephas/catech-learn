import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const migration0002 = readFileSync("drizzle/migrations/0002_institution_foundation.sql", "utf8");

describe("Institution Foundation & Multi-Tenant Security", () => {
  it("enforces table creation with proper constraints and RLS", () => {
    expect(migration0002).toContain("CREATE TABLE public.institutions");
    expect(migration0002).toContain("ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY");
    expect(migration0002).toContain("CREATE TABLE public.institution_memberships");
    expect(migration0002).toContain(
      "ALTER TABLE public.institution_memberships ENABLE ROW LEVEL SECURITY",
    );
    expect(migration0002).toContain("UNIQUE (institution_id, user_id)");
    expect(migration0002).toContain("CREATE TABLE public.institution_audit_logs");
    expect(migration0002).toContain(
      "ALTER TABLE public.institution_audit_logs ENABLE ROW LEVEL SECURITY",
    );
  });

  it("safeguards platform administrator functions against unprivileged access", () => {
    expect(migration0002).toContain("CREATE FUNCTION public.is_platform_admin()");
    expect(migration0002).toContain(
      "REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon",
    );
    expect(migration0002).toContain(
      "GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role",
    );
  });

  it("enforces strict tenant isolation checks on institution access", () => {
    expect(migration0002).toContain("CREATE FUNCTION public.can_access_institution");
    expect(migration0002).toContain("i.status = 'active'");
    expect(migration0002).toContain("m.role = 'institution_admin'");
    expect(migration0002).toContain('CREATE POLICY "Institution summaries" ON public.institutions');
    expect(migration0002).toContain(
      'CREATE POLICY "Own or managed memberships" ON public.institution_memberships',
    );
  });

  it("protects initial Super Admin bootstrap with advisory lock and service_role restriction", () => {
    expect(migration0002).toContain("CREATE FUNCTION public.provision_initial_platform_admin");
    expect(migration0002).toContain("pg_advisory_xact_lock(619732461)");
    expect(migration0002).toContain("Initial platform administrator already provisioned");
    expect(migration0002).toContain(
      "REVOKE ALL ON FUNCTION public.provision_initial_platform_admin(uuid) FROM PUBLIC, anon, authenticated",
    );
    expect(migration0002).toContain(
      "GRANT EXECUTE ON FUNCTION public.provision_initial_platform_admin(uuid) TO service_role",
    );
  });

  it("restricts institution creation and status changes to platform administrators", () => {
    expect(migration0002).toContain("CREATE FUNCTION public.save_institution");
    expect(migration0002).toContain("Platform administrator required");
    expect(migration0002).toContain("Only platform administrators change institution status");
    expect(migration0002).toContain(
      "REVOKE ALL ON FUNCTION public.save_institution(text,text,text,uuid,text) FROM PUBLIC, anon",
    );
  });

  it("audits institution and membership modifications automatically", () => {
    expect(migration0002).toContain("CREATE TRIGGER institution_change_audit");
    expect(migration0002).toContain("CREATE TRIGGER membership_change_audit");
  });
});
