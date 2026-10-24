# CATECH Learn: institution foundation

## Direction

Build the uploaded brief as working, testable stages within the existing CATECH Learn system. Keep the supplied logo, real account access, and green/orange identity. Do not restore demos, a marketing homepage, or certificate verification.

The account foundation already includes sign-in, password recovery, profiles, protected pages, and protected student role assignment. The next stage completes the institution foundation—not the entire learning platform at once.

## Next working stage

1. **Trusted Super Admin setup:** provide a secure, non-public provisioning process for an existing verified account. Never make the first registrant an administrator, accept a role at signup, or expose a public administrator-claim button. Confirm the intended account before granting elevated access.
2. **Platform workspace:** add a real Super Admin dashboard with institution counts drawn from saved records, an institution list, search, and creation/editing/activation/suspension controls.
3. **Institution membership:** assign existing accounts to institutions and authorized roles through protected administrator actions. Keep role and institution assignments out of personal profile editing. Record administrator changes in an audit history.
4. **Institution workspace:** show institution details and authorized members to institution administrators; students and teachers see only their own institution/account information at this stage. Do not add nonfunctional course, payment, or assessment controls.
5. **Verification:** exercise institution creation, editing, membership assignment, and suspension with authenticated accounts; verify that another institution's records remain inaccessible.

## Access rules

| Role              | Access in this stage                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| Super Admin       | Manage institutions and trusted membership/role assignments; view platform counts and audit history |
| Institution Admin | Read and manage permitted details of their institution; view its authorized members only            |
| Teacher           | Read their own membership and institution information                                               |
| Student           | Read their own membership and institution information                                               |

Suspended institutions cannot use institution-scoped workflows. Account recovery and personal account access remain available. Institution administrators cannot grant Super Admin access or manage another institution.

## Technical design

Preserve TanStack Start, React, the shared design system, and Lovable Cloud. Extend the existing account provider and managed protected layout rather than introducing another session system.

```text
src/components/                 shared workspace navigation and forms
src/routes/_authenticated/      platform and institution pages
src/lib/                        validated authenticated server functions
src/test/                       permission and workflow tests
drizzle/migrations/             tool-managed additive database changes
```

### Data relationships

- Existing accounts → profiles and protected role assignments.
- Institutions → memberships → existing profiles.
- Memberships identify institution, account, institution-level role, and active status, with uniqueness constraints preventing duplicate memberships.
- Administrator actions → audit entries containing actor, institution, action, target, and timestamp; avoid storing credentials or unnecessary personal data.
- Keep role authority in protected role/membership records, never editable account metadata. Preserve existing profile institution references during the transition; do not leave two conflicting assignment authorities.

### Security

Every private operation validates the session and permissions on the server. Database policies enforce institution isolation, narrow grants, and owner-only account access. Validate input on both sides, check institution status, and make membership/role changes atomic. Define helper functions before policies that depend on them. Administrator-only database access is used only after verified authorization.

### Configuration and external services

The next stage uses the existing Lovable Cloud configuration; no payment or messaging credentials are needed. Initial administrator provisioning requires identifying and approving the intended existing account.

Later M-Pesa work needs official Daraja test credentials and merchant configuration through secure secret entry. Live meetings need a supported meeting provider. App emails require a verified sender domain. Do not enable paid services or claim integrations work before configuration and testing.

## Following stages

1. **Core learning:** courses, modules, lessons, authorized uploads, teacher assignments, student enrollment, and saved progress.
2. **Assessments:** quizzes, assignments, submissions, server-validated attempts, grading, and released results.
3. **Finance:** institution subscriptions and course payments as separate workflows, verified callbacks, idempotency, and receipts.
4. **Communication:** attendance, live-class scheduling, announcements, and authorized messaging.
5. **Operational readiness:** reporting, exports, security and cross-institution tests, monitoring, and deployment checks.

Certificates are deferred; public certificate verification remains excluded by the user's explicit instruction.

## Acceptance checks for this stage

- Authorized administrator creates an institution and sees the saved record after reload.
- Permitted edits and membership assignments persist and appear in audit history.
- Student registration cannot acquire elevated roles.
- Institution A cannot read or modify institution B, including by changing identifiers in requests.
- Institution suspension blocks institution-scoped access, while personal account recovery remains available.
- Navigation offers only implemented workflows and counts contain no fabricated figures.
