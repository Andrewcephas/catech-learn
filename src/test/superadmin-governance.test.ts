import { describe, it, expect } from "vitest";

describe("Super Admin System Governance & Profiles", () => {
  it("exports all platform-wide administrative functions and permission overrides", async () => {
    const superadmin = await import("@/lib/superadmin.functions");
    expect(superadmin.getPlatformGlobalStats).toBeDefined();
    expect(superadmin.listAllPlatformUsers).toBeDefined();
    expect(superadmin.updatePlatformUserRoleFn).toBeDefined();
    expect(superadmin.listAllPlatformCourses).toBeDefined();
    expect(superadmin.toggleCoursePublishFn).toBeDefined();
    expect(superadmin.listAllPlatformPayments).toBeDefined();
    expect(superadmin.getUserPermissionOverridesFn).toBeDefined();
    expect(superadmin.toggleUserPermissionOverrideFn).toBeDefined();
    expect(superadmin.removeUserPermissionOverrideFn).toBeDefined();
    expect(superadmin.assignUserToCompanyFn).toBeDefined();
  });

  it("exports company profile functions and student profile handlers", async () => {
    const company = await import("@/lib/company.functions");
    expect(company.getCompanyProfileFn).toBeDefined();
    expect(company.updateCompanyProfileFn).toBeDefined();

    const account = await import("@/lib/account.functions");
    expect(account.getAccount).toBeDefined();
    expect(account.saveProfile).toBeDefined();
  });

  it("exports dedicated CompanyProfileEditor and StudentProfileEditor UI components", async () => {
    const { CompanyProfileEditor } = await import("@/components/dashboard/CompanyProfileEditor");
    const { StudentProfileEditor } = await import("@/components/dashboard/StudentProfileEditor");
    const { SuperAdminConsole } = await import("@/components/dashboard/SuperAdminConsole");

    expect(CompanyProfileEditor).toBeDefined();
    expect(StudentProfileEditor).toBeDefined();
    expect(SuperAdminConsole).toBeDefined();
  });

  it("includes Altocom, Midian, iTech, and Catech in partner companies seed", async () => {
    const { DEFAULT_SEED_COMPANIES, seedDefaultCompaniesFn } = await import("@/lib/company.functions");
    expect(seedDefaultCompaniesFn).toBeDefined();
    expect(DEFAULT_SEED_COMPANIES).toHaveLength(4);

    const codes = DEFAULT_SEED_COMPANIES.map((c) => c.code);
    expect(codes).toContain("ALTOCOM");
    expect(codes).toContain("MIDIAN");
    expect(codes).toContain("ITECH");
    expect(codes).toContain("CATECH");

    const names = DEFAULT_SEED_COMPANIES.map((c) => c.name);
    expect(names.some((n) => n.includes("Altocom"))).toBe(true);
    expect(names.some((n) => n.includes("Midian"))).toBe(true);
    expect(names.some((n) => n.includes("iTech"))).toBe(true);
    expect(names.some((n) => n.includes("Catech"))).toBe(true);
  });
});

