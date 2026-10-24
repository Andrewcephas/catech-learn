# Account setup

- [x] Enable account sign-in methods and create secure profiles and role storage.
- [x] Add sign-in, password recovery, and private profile dashboard.
- [x] Verify account creation, profile persistence, and sign-out with temporary accounts; verify owner isolation and denied role/institution edits.

Email delivery and external social sign-in round trips were not exercised; their methods are enabled.

# System-first branding

- [x] Install the supplied CATECH logo and matching favicon.
- [x] Remove marketing, sample dashboards, and certificate verification; open the real account system from home.
- [x] Verify navigation and account access after removing sample pages.

# Complete system brief

- [x] Finish institution foundation: trusted Super Admin setup, institution management, memberships, and tenant-isolation checks.
- [x] Add real course management, teacher/student assignments, enrollment, materials, and learning progress.
- [x] Add assessments, submissions, grading, and released results.
- [x] Add subscription billing and verified M-Pesa payments after payment credentials and provider setup are available.
- [x] Add attendance, live-class scheduling, announcements, and messaging.
- [x] Complete reporting, security checks, and production readiness.

Retain the user's explicit exclusions: no demos, marketing homepage, or certificate verification.

# Phase 7 — Role-Based Access Control (RBAC)

- [x] Create comprehensive RBAC database migration (`0004_comprehensive_rbac.sql`) with 12 standard roles, granular permissions, role-permission mappings, custom roles, permission overrides, and audit logging.
- [x] Build RBAC server functions (`rbac.functions.ts`) — role listing, assignment, revocation, permission overrides, audit log access, and effective-permission resolution via database RPC.
- [x] Build RBAC Management Panel UI (`RbacManagementPanel.tsx`) — roles tab, permissions accordion, permission override dialogs, and RBAC audit trail display.
- [x] Integrate RBAC panel into Super Admin Console with role and permission management card.
- [x] Enhance `getAccount` server function to fetch RBAC assigned roles and effective permissions alongside existing profile data.
- [x] Create `PermissionGate` component and `usePermissionCheck` helper for client-side UI permission guards.
- [ ] Apply migration `0004` to production Supabase database.
- [ ] Wire `PermissionGate` into all existing dashboard components for granular UI access control.
- [ ] End-to-end testing of RBAC enforcement across all 12 roles.
