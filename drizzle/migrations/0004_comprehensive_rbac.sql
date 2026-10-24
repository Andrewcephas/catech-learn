-- =============================================================================
-- CATECH LEARN: Phase 7 Comprehensive Database-Driven RBAC System
-- Implements complete Role-Based Access Control, Tenant Isolation,
-- Granular Permissions, 12 Standard Roles, Role-Permission Mapping,
-- Custom Roles, Permission Overrides, and RBAC Audit Logging.
-- =============================================================================

-- 1. PERMISSIONS DIRECTORY
CREATE TABLE IF NOT EXISTS public.permissions (
  code text PRIMARY KEY,
  category text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permissions viewable by authenticated users" ON public.permissions
  FOR SELECT TO authenticated USING (true);

-- 2. ROLES (Predefined System Roles and Custom Institution Roles)
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS roles_global_code_idx ON public.roles (code) WHERE institution_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS roles_institution_code_idx ON public.roles (institution_id, code) WHERE institution_id IS NOT NULL;

CREATE POLICY "Roles viewable by authenticated users" ON public.roles
  FOR SELECT TO authenticated
  USING (
    institution_id IS NULL OR
    public.is_platform_admin() OR
    public.has_institution_membership(institution_id)
  );

-- 3. ROLE-PERMISSION MAPPINGS
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_code text NOT NULL REFERENCES public.permissions(code) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission_code)
);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Role permissions viewable" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);

-- 4. USER ASSIGNED ROLES (Scoped globally or per-institution)
CREATE TABLE IF NOT EXISTS public.user_assigned_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_assigned_roles TO authenticated;
GRANT ALL ON public.user_assigned_roles TO service_role;
ALTER TABLE public.user_assigned_roles ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS user_assigned_roles_global_idx ON public.user_assigned_roles(user_id, role_id) WHERE institution_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS user_assigned_roles_inst_idx ON public.user_assigned_roles(user_id, role_id, institution_id) WHERE institution_id IS NOT NULL;

CREATE POLICY "User assigned roles viewable" ON public.user_assigned_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_platform_admin() OR
    (institution_id IS NOT NULL AND public.can_access_institution(institution_id, true))
  );

-- 5. FINE-GRAINED USER PERMISSION OVERRIDES (Explicit Grant / Deny)
CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE,
  permission_code text NOT NULL REFERENCES public.permissions(code) ON DELETE CASCADE,
  granted boolean NOT NULL DEFAULT true,
  granted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_permission_overrides TO authenticated;
GRANT ALL ON public.user_permission_overrides TO service_role;
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS user_perm_override_global_idx ON public.user_permission_overrides(user_id, permission_code) WHERE institution_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS user_perm_override_inst_idx ON public.user_permission_overrides(user_id, institution_id, permission_code) WHERE institution_id IS NOT NULL;

CREATE POLICY "Permission overrides viewable" ON public.user_permission_overrides
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_platform_admin() OR
    (institution_id IS NOT NULL AND public.can_access_institution(institution_id, true))
  );

-- 6. RBAC AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.rbac_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  role_code text,
  permission_code text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rbac_audit_logs TO authenticated;
GRANT ALL ON public.rbac_audit_logs TO service_role;
ALTER TABLE public.rbac_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS rbac_audit_time_idx ON public.rbac_audit_logs(created_at DESC);
CREATE POLICY "RBAC audit logs viewable" ON public.rbac_audit_logs
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin() OR
    (institution_id IS NOT NULL AND public.can_access_institution(institution_id, true))
  );

-- 7. SEED GRANULAR PERMISSIONS
INSERT INTO public.permissions (code, category, name, description) VALUES
  -- Platform
  ('platform.dashboard.view', 'platform', 'View Platform Dashboard', 'Access platform analytics and summary metrics'),
  ('platform.analytics.view', 'platform', 'View Platform Analytics', 'View detailed system performance and user statistics'),
  ('platform.settings.manage', 'platform', 'Manage Platform Settings', 'Configure global platform configurations and policies'),
  ('platform.audit_logs.view', 'platform', 'View Platform Audit Logs', 'Access sensitive platform security and action audit logs'),
  ('platform.integrations.manage', 'platform', 'Manage Platform Integrations', 'Configure third-party services and APIs'),

  -- Institutions
  ('institutions.view', 'institutions', 'View Institutions', 'Browse and inspect institution profiles and directories'),
  ('institutions.create', 'institutions', 'Create Institutions', 'Register and initialize new academic institutions'),
  ('institutions.update', 'institutions', 'Update Institutions', 'Modify institution details, branding and settings'),
  ('institutions.suspend', 'institutions', 'Suspend Institutions', 'Change institution operational status to suspended'),
  ('institutions.delete', 'institutions', 'Delete Institutions', 'Permanently remove an institution from the platform'),
  ('institutions.settings.manage', 'institutions', 'Manage Institution Settings', 'Configure institution-level preferences and policies'),

  -- Users
  ('users.view', 'users', 'View Users', 'Inspect user profiles within scope'),
  ('users.create', 'users', 'Create Users', 'Register or onboard new user accounts'),
  ('users.update', 'users', 'Update Users', 'Edit user profiles and account records'),
  ('users.suspend', 'users', 'Suspend Users', 'Deactivate or restrict user accounts'),
  ('users.delete', 'users', 'Delete Users', 'Remove user accounts from the platform'),
  ('users.roles.assign', 'users', 'Assign User Roles', 'Grant or revoke roles within authorized scope'),
  ('users.permissions.manage', 'users', 'Manage User Permissions', 'Assign granular permissions and overrides'),

  -- Courses
  ('courses.view', 'courses', 'View Courses', 'Inspect course details and curriculum structure'),
  ('courses.create', 'courses', 'Create Courses', 'Add new courses to the catalog'),
  ('courses.update', 'courses', 'Update Courses', 'Edit course information, syllabus and media'),
  ('courses.delete', 'courses', 'Delete Courses', 'Remove courses from the catalog'),
  ('courses.publish', 'courses', 'Publish Courses', 'Change course availability to published/live'),
  ('courses.assign_teacher', 'courses', 'Assign Course Teachers', 'Designate lead instructors and educators'),
  ('courses.enroll_students', 'courses', 'Enroll Students', 'Enroll or unenroll students in courses'),

  -- Lessons & Materials
  ('lessons.view', 'lessons', 'View Lessons', 'Access lesson content, transcripts and resources'),
  ('lessons.create', 'lessons', 'Create Lessons', 'Add modules and lessons to authorized courses'),
  ('lessons.update', 'lessons', 'Update Lessons', 'Modify lesson content, videos and sort order'),
  ('lessons.delete', 'lessons', 'Delete Lessons', 'Remove lessons and modules from courses'),
  ('lessons.publish', 'lessons', 'Publish Lessons', 'Toggle lesson preview and public availability'),
  ('learning_materials.upload', 'lessons', 'Upload Learning Materials', 'Attach downloadable files and study documents'),
  ('learning_materials.delete', 'lessons', 'Delete Learning Materials', 'Remove learning resources from lessons'),

  -- Assessments & Quizzes
  ('assessments.view', 'assessments', 'View Assessments', 'Review quizzes, exams and assessment rubrics'),
  ('assessments.create', 'assessments', 'Create Assessments', 'Construct quizzes, tests and assignments'),
  ('assessments.update', 'assessments', 'Update Assessments', 'Edit questions, score thresholds and timers'),
  ('assessments.publish', 'assessments', 'Publish Assessments', 'Make assessments available to enrolled students'),
  ('assessments.grade', 'assessments', 'Grade Assessments', 'Score submissions and record grades'),
  ('assessments.results.release', 'assessments', 'Release Assessment Results', 'Publish finalized grades to students and guardians'),
  ('assessments.appeals.manage', 'assessments', 'Manage Assessment Appeals', 'Process student grade disputes and reviews'),

  -- Assignments
  ('assignments.create', 'assignments', 'Create Assignments', 'Post homework and project assignments'),
  ('assignments.view', 'assignments', 'View Assignments', 'Review student submitted assignments'),
  ('assignments.grade', 'assignments', 'Grade Assignments', 'Evaluate and provide feedback on submissions'),
  ('assignments.feedback.manage', 'assignments', 'Manage Feedback', 'Issue formal academic critiques and rubrics'),

  -- Attendance
  ('attendance.view', 'attendance', 'View Attendance', 'Inspect attendance rolls and session summaries'),
  ('attendance.record', 'attendance', 'Record Attendance', 'Take roll call and mark student presence'),
  ('attendance.update', 'attendance', 'Update Attendance', 'Amend attendance records and absence excuses'),
  ('attendance.reports.export', 'attendance', 'Export Attendance Reports', 'Download official attendance transcripts'),

  -- Payments & Finance
  ('payments.view', 'payments', 'View Payments', 'Access transaction receipts and payment statuses'),
  ('payments.reconcile', 'payments', 'Reconcile Payments', 'Reconcile M-Pesa statements with enrolled learners'),
  ('payments.refund', 'payments', 'Process Refunds', 'Issue authorized refunds according to policy'),
  ('invoices.view', 'payments', 'View Invoices', 'Inspect billing notices and receipt history'),
  ('invoices.create', 'payments', 'Generate Invoices', 'Issue invoices for courses and tuition fees'),
  ('subscriptions.view', 'payments', 'View SaaS Subscriptions', 'Inspect institution software plan and renewal dates'),
  ('subscriptions.manage', 'payments', 'Manage SaaS Subscriptions', 'Upgrade, downgrade or renew institution plan'),

  -- Certificates
  ('certificates.view', 'certificates', 'View Certificates', 'Access earned credentials and diplomas'),
  ('certificates.issue', 'certificates', 'Issue Certificates', 'Generate accredited certificates for passing students'),
  ('certificates.revoke', 'certificates', 'Revoke Certificates', 'Cancel or invalidate an issued certificate'),
  ('certificates.verify', 'certificates', 'Verify Certificates', 'Validate certificate authenticity'),

  -- Reports & Analytics
  ('reports.view', 'reports', 'View Academic Reports', 'Analyze student performance and pass rates'),
  ('reports.export', 'reports', 'Export Academic Reports', 'Download CSV and PDF reports'),
  ('analytics.view', 'reports', 'View Analytics', 'Monitor engagement metrics and course completion'),

  -- Academic Structure
  ('academic.years.manage', 'academic', 'Manage Academic Years', 'Configure terms, semesters and calendars'),
  ('departments.manage', 'academic', 'Manage Departments', 'Create and administer academic faculties/departments'),
  ('classes.manage', 'academic', 'Manage Classes', 'Organize student cohorts and class divisions'),

  -- Communication
  ('announcements.create', 'announcements', 'Create Announcements', 'Draft campus bulletins and alerts'),
  ('announcements.publish', 'announcements', 'Publish Announcements', 'Broadcast news to students and faculty'),
  ('messages.send', 'communication', 'Send Messages', 'Direct message students, teachers and staff'),
  ('discussions.moderate', 'communication', 'Moderate Discussions', 'Review and moderate class discussion boards'),

  -- Support & Helpdesk
  ('support.tickets.view', 'support', 'View Support Tickets', 'Access customer care and helpdesk issues'),
  ('support.tickets.assign', 'support', 'Assign Support Tickets', 'Direct issues to appropriate technical staff'),
  ('support.tickets.update', 'support', 'Update Support Tickets', 'Resolve tickets and update issue status'),
  ('support.access.request', 'support', 'Request Support Access', 'Request time-limited audited diagnostic access')
ON CONFLICT (code) DO UPDATE SET
  category = EXCLUDED.category,
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 8. SEED THE 12 STANDARD ROLES
INSERT INTO public.roles (code, name, description, is_system, institution_id) VALUES
  ('super_admin', 'CATECH Super Admin', 'Full platform administrator with global oversight across all institutions and settings', true, NULL),
  ('institution_owner', 'Institution Owner', 'Principal institution owner with full administrative authority over their institution', true, NULL),
  ('institution_admin', 'Institution Administrator', 'Institution manager coordinating teachers, students, courses, and operations', true, NULL),
  ('academic_admin', 'Academic Administrator', 'Administrator managing academic terms, departments, classes, and course schedules', true, NULL),
  ('department_head', 'Department Head', 'Faculty leader managing departmental curriculum, teachers, and student progress', true, NULL),
  ('teacher', 'Teacher / Educator', 'Instructor managing assigned courses, lessons, assignments, quizzes, and grading', true, NULL),
  ('examination_officer', 'Examination Officer', 'Academic officer coordinating exam scheduling, assessment security, and grade releases', true, NULL),
  ('accountant', 'Accountant / Bursar', 'Financial officer handling student invoices, M-Pesa reconciliations, and payment records', true, NULL),
  ('student', 'Student / Learner', 'Learner enrolled in courses, taking assessments, submitting assignments, and viewing grades', true, NULL),
  ('parent', 'Parent / Guardian', 'Guardian viewing academic progress, attendance, and fee status of linked dependents', true, NULL),
  ('librarian', 'Librarian', 'Curator managing institutional learning materials, digital libraries, and references', true, NULL),
  ('support_agent', 'Support Agent', 'Customer service representative resolving user tickets and technical inquiries', true, NULL)
ON CONFLICT DO NOTHING;

-- Helper to map permissions to a role code
DO $$
DECLARE
  v_role_id uuid;
BEGIN
  -- 1. SUPER ADMIN: Receives all permissions
  SELECT id INTO v_role_id FROM public.roles WHERE code = 'super_admin' AND institution_id IS NULL;
  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_code)
    SELECT v_role_id, code FROM public.permissions
    ON CONFLICT (role_id, permission_code) DO NOTHING;
  END IF;

  -- 2. INSTITUTION OWNER: All institution-scoped permissions, billing, settings & staff management
  SELECT id INTO v_role_id FROM public.roles WHERE code = 'institution_owner' AND institution_id IS NULL;
  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_code)
    SELECT v_role_id, code FROM public.permissions
    WHERE code NOT LIKE 'platform.%' AND code NOT IN ('institutions.create', 'institutions.delete', 'institutions.suspend')
    ON CONFLICT (role_id, permission_code) DO NOTHING;
  END IF;

  -- 3. INSTITUTION ADMINISTRATOR
  SELECT id INTO v_role_id FROM public.roles WHERE code = 'institution_admin' AND institution_id IS NULL;
  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_code)
    SELECT v_role_id, code FROM public.permissions
    WHERE code IN (
      'institutions.view', 'institutions.settings.manage',
      'users.view', 'users.create', 'users.update', 'users.suspend', 'users.roles.assign',
      'courses.view', 'courses.create', 'courses.update', 'courses.delete', 'courses.publish', 'courses.assign_teacher', 'courses.enroll_students',
      'lessons.view', 'lessons.create', 'lessons.update', 'lessons.delete', 'lessons.publish', 'learning_materials.upload', 'learning_materials.delete',
      'assessments.view', 'assessments.create', 'assessments.update', 'assessments.publish', 'assessments.grade', 'assessments.results.release', 'assessments.appeals.manage',
      'assignments.create', 'assignments.view', 'assignments.grade', 'assignments.feedback.manage',
      'attendance.view', 'attendance.record', 'attendance.update', 'attendance.reports.export',
      'payments.view', 'invoices.view', 'invoices.create',
      'certificates.view', 'certificates.issue',
      'reports.view', 'reports.export', 'analytics.view',
      'academic.years.manage', 'departments.manage', 'classes.manage',
      'announcements.create', 'announcements.publish', 'messages.send', 'discussions.moderate',
      'support.tickets.view', 'support.tickets.update'
    )
    ON CONFLICT (role_id, permission_code) DO NOTHING;
  END IF;

  -- 4. ACADEMIC ADMINISTRATOR
  SELECT id INTO v_role_id FROM public.roles WHERE code = 'academic_admin' AND institution_id IS NULL;
  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_code)
    SELECT v_role_id, code FROM public.permissions
    WHERE code IN (
      'institutions.view', 'users.view',
      'courses.view', 'courses.create', 'courses.update', 'courses.assign_teacher', 'courses.enroll_students',
      'lessons.view', 'academic.years.manage', 'departments.manage', 'classes.manage',
      'assessments.view', 'assessments.results.release',
      'attendance.view', 'attendance.reports.export',
      'reports.view', 'reports.export', 'analytics.view',
      'announcements.create', 'announcements.publish', 'messages.send'
    )
    ON CONFLICT (role_id, permission_code) DO NOTHING;
  END IF;

  -- 5. DEPARTMENT HEAD
  SELECT id INTO v_role_id FROM public.roles WHERE code = 'department_head' AND institution_id IS NULL;
  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_code)
    SELECT v_role_id, code FROM public.permissions
    WHERE code IN (
      'institutions.view', 'users.view',
      'courses.view', 'courses.update', 'courses.assign_teacher',
      'lessons.view', 'assessments.view', 'assessments.results.release',
      'attendance.view', 'reports.view', 'reports.export', 'analytics.view',
      'announcements.create', 'announcements.publish', 'messages.send'
    )
    ON CONFLICT (role_id, permission_code) DO NOTHING;
  END IF;

  -- 6. TEACHER
  SELECT id INTO v_role_id FROM public.roles WHERE code = 'teacher' AND institution_id IS NULL;
  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_code)
    SELECT v_role_id, code FROM public.permissions
    WHERE code IN (
      'courses.view', 'courses.update',
      'lessons.view', 'lessons.create', 'lessons.update', 'lessons.delete', 'lessons.publish', 'learning_materials.upload', 'learning_materials.delete',
      'assessments.view', 'assessments.create', 'assessments.update', 'assessments.publish', 'assessments.grade',
      'assignments.create', 'assignments.view', 'assignments.grade', 'assignments.feedback.manage',
      'attendance.view', 'attendance.record', 'attendance.update',
      'reports.view', 'analytics.view',
      'announcements.create', 'announcements.publish', 'messages.send', 'discussions.moderate'
    )
    ON CONFLICT (role_id, permission_code) DO NOTHING;
  END IF;

  -- 7. EXAMINATION OFFICER
  SELECT id INTO v_role_id FROM public.roles WHERE code = 'examination_officer' AND institution_id IS NULL;
  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_code)
    SELECT v_role_id, code FROM public.permissions
    WHERE code IN (
      'courses.view', 'assessments.view', 'assessments.create', 'assessments.update', 'assessments.publish',
      'assessments.grade', 'assessments.results.release', 'assessments.appeals.manage',
      'certificates.view', 'certificates.issue', 'certificates.revoke',
      'reports.view', 'reports.export', 'announcements.create', 'messages.send'
    )
    ON CONFLICT (role_id, permission_code) DO NOTHING;
  END IF;

  -- 8. ACCOUNTANT
  SELECT id INTO v_role_id FROM public.roles WHERE code = 'accountant' AND institution_id IS NULL;
  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_code)
    SELECT v_role_id, code FROM public.permissions
    WHERE code IN (
      'payments.view', 'payments.reconcile', 'payments.refund',
      'invoices.view', 'invoices.create', 'subscriptions.view',
      'reports.view', 'reports.export', 'messages.send'
    )
    ON CONFLICT (role_id, permission_code) DO NOTHING;
  END IF;

  -- 9. STUDENT
  SELECT id INTO v_role_id FROM public.roles WHERE code = 'student' AND institution_id IS NULL;
  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_code)
    SELECT v_role_id, code FROM public.permissions
    WHERE code IN (
      'courses.view', 'lessons.view', 'assessments.view',
      'assignments.view', 'attendance.view', 'certificates.view', 'certificates.verify',
      'payments.view', 'invoices.view', 'messages.send'
    )
    ON CONFLICT (role_id, permission_code) DO NOTHING;
  END IF;

  -- 10. PARENT OR GUARDIAN
  SELECT id INTO v_role_id FROM public.roles WHERE code = 'parent' AND institution_id IS NULL;
  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_code)
    SELECT v_role_id, code FROM public.permissions
    WHERE code IN (
      'courses.view', 'attendance.view', 'certificates.view',
      'payments.view', 'invoices.view', 'messages.send'
    )
    ON CONFLICT (role_id, permission_code) DO NOTHING;
  END IF;

  -- 11. LIBRARIAN
  SELECT id INTO v_role_id FROM public.roles WHERE code = 'librarian' AND institution_id IS NULL;
  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_code)
    SELECT v_role_id, code FROM public.permissions
    WHERE code IN (
      'courses.view', 'lessons.view', 'learning_materials.upload', 'learning_materials.delete',
      'reports.view', 'messages.send'
    )
    ON CONFLICT (role_id, permission_code) DO NOTHING;
  END IF;

  -- 12. SUPPORT AGENT
  SELECT id INTO v_role_id FROM public.roles WHERE code = 'support_agent' AND institution_id IS NULL;
  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_code)
    SELECT v_role_id, code FROM public.permissions
    WHERE code IN (
      'users.view', 'support.tickets.view', 'support.tickets.assign',
      'support.tickets.update', 'support.access.request', 'messages.send'
    )
    ON CONFLICT (role_id, permission_code) DO NOTHING;
  END IF;
END $$;

-- 9. CORE RBAC EVALUATION FUNCTIONS

-- Function: has_permission
CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id uuid,
  _permission_code text,
  _institution_id uuid DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_override boolean;
BEGIN
  -- 1. Check if user is platform admin (Super Admin bypasses all checks unless explicitly denied)
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin') THEN
    -- Check if there is an explicit negative override
    SELECT granted INTO v_override FROM public.user_permission_overrides
    WHERE user_id = _user_id AND permission_code = _permission_code
      AND (institution_id IS NULL OR institution_id = _institution_id)
    ORDER BY institution_id DESC NULLS LAST LIMIT 1;

    IF v_override IS FALSE THEN
      RETURN false;
    END IF;
    RETURN true;
  END IF;

  -- 2. Check explicit permission override
  SELECT granted INTO v_override FROM public.user_permission_overrides
  WHERE user_id = _user_id AND permission_code = _permission_code
    AND (institution_id IS NULL OR institution_id = _institution_id)
  ORDER BY institution_id DESC NULLS LAST LIMIT 1;

  IF v_override IS NOT NULL THEN
    RETURN v_override;
  END IF;

  -- 3. Check role-assigned permissions (global or institution-scoped)
  RETURN EXISTS (
    SELECT 1
    FROM public.user_assigned_roles uar
    JOIN public.roles r ON r.id = uar.role_id
    JOIN public.role_permissions rp ON rp.role_id = r.id
    WHERE uar.user_id = _user_id
      AND rp.permission_code = _permission_code
      AND (
        uar.institution_id IS NULL OR
        _institution_id IS NULL OR
        uar.institution_id = _institution_id
      )
  );
END;
$$;
REVOKE ALL ON FUNCTION public.has_permission(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, uuid) TO authenticated, service_role;

-- Function: get_user_permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(
  _user_id uuid,
  _institution_id uuid DEFAULT NULL
) RETURNS TABLE(permission_code text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Super admin receives all permissions
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin') THEN
    RETURN QUERY
    SELECT p.code
    FROM public.permissions p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_permission_overrides upo
      WHERE upo.user_id = _user_id AND upo.permission_code = p.code AND upo.granted = false
        AND (upo.institution_id IS NULL OR upo.institution_id = _institution_id)
    );
    RETURN;
  END IF;

  RETURN QUERY
  WITH role_perms AS (
    SELECT DISTINCT rp.permission_code
    FROM public.user_assigned_roles uar
    JOIN public.roles r ON r.id = uar.role_id
    JOIN public.role_permissions rp ON rp.role_id = r.id
    WHERE uar.user_id = _user_id
      AND (uar.institution_id IS NULL OR _institution_id IS NULL OR uar.institution_id = _institution_id)
  ),
  overrides AS (
    SELECT permission_code, granted
    FROM public.user_permission_overrides
    WHERE user_id = _user_id
      AND (institution_id IS NULL OR institution_id = _institution_id)
  )
  SELECT code FROM (
    SELECT permission_code AS code FROM role_perms
    WHERE permission_code NOT IN (SELECT permission_code FROM overrides WHERE granted = false)
    UNION
    SELECT permission_code AS code FROM overrides WHERE granted = true
  ) final_perms;
END;
$$;
REVOKE ALL ON FUNCTION public.get_user_permissions(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(uuid, uuid) TO authenticated, service_role;

-- Function: assign_user_role
CREATE OR REPLACE FUNCTION public.assign_user_role(
  _actor_id uuid,
  _target_user_id uuid,
  _role_code text,
  _institution_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role_id uuid;
  v_result_id uuid;
  v_is_platform_admin boolean;
  v_can_manage_inst boolean;
BEGIN
  -- 1. Security Check
  IF _actor_id IS NULL OR auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT public.is_platform_admin() INTO v_is_platform_admin;

  -- If assigning global super_admin, actor MUST be a platform super_admin
  IF _role_code = 'super_admin' AND NOT v_is_platform_admin THEN
    RAISE EXCEPTION 'Only CATECH Super Admin can assign platform administrator role' USING ERRCODE = '42501';
  END IF;

  -- If institution scope is provided, actor must have permission to manage that institution
  IF _institution_id IS NOT NULL THEN
    SELECT public.can_access_institution(_institution_id, true) INTO v_can_manage_inst;
    IF NOT v_can_manage_inst AND NOT v_is_platform_admin THEN
      RAISE EXCEPTION 'Unauthorized to assign roles for this institution' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NOT v_is_platform_admin THEN
      RAISE EXCEPTION 'Global role assignment requires platform administrator privilege' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 2. Lookup role
  SELECT id INTO v_role_id FROM public.roles
  WHERE code = _role_code AND (institution_id IS NULL OR institution_id = _institution_id)
  LIMIT 1;

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role % not found', _role_code USING ERRCODE = 'P0002';
  END IF;

  -- 3. Assign role
  INSERT INTO public.user_assigned_roles (user_id, role_id, institution_id, assigned_by)
  VALUES (_target_user_id, v_role_id, _institution_id, _actor_id)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_result_id;

  -- If already assigned, fetch existing
  IF v_result_id IS NULL THEN
    SELECT id INTO v_result_id FROM public.user_assigned_roles
    WHERE user_id = _target_user_id AND role_id = v_role_id
      AND (institution_id IS NOT DISTINCT FROM _institution_id);
  END IF;

  -- 4. Sync backward compatibility tables (user_roles or institution_memberships)
  IF _role_code = 'super_admin' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, 'super_admin') ON CONFLICT DO NOTHING;
  ELSIF _institution_id IS NOT NULL AND _role_code IN ('institution_admin', 'teacher', 'student') THEN
    INSERT INTO public.institution_memberships (institution_id, user_id, role, active)
    VALUES (_institution_id, _target_user_id, _role_code::public.app_role, true)
    ON CONFLICT (institution_id, user_id) DO UPDATE SET role = EXCLUDED.role, active = true;
  END IF;

  -- 5. Audit Log
  INSERT INTO public.rbac_audit_logs (institution_id, actor_id, action, target_user_id, role_code, details)
  VALUES (
    _institution_id,
    _actor_id,
    'role_assigned',
    _target_user_id,
    _role_code,
    jsonb_build_object('assigned_role_id', v_role_id, 'institution_id', _institution_id)
  );

  RETURN v_result_id;
END;
$$;
REVOKE ALL ON FUNCTION public.assign_user_role(uuid, uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_user_role(uuid, uuid, text, uuid) TO authenticated, service_role;

-- Function: revoke_user_role
CREATE OR REPLACE FUNCTION public.revoke_user_role(
  _actor_id uuid,
  _target_user_id uuid,
  _role_code text,
  _institution_id uuid DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role_id uuid;
  v_is_platform_admin boolean;
  v_can_manage_inst boolean;
BEGIN
  -- 1. Security Check
  IF _actor_id IS NULL OR auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT public.is_platform_admin() INTO v_is_platform_admin;

  IF _role_code = 'super_admin' AND NOT v_is_platform_admin THEN
    RAISE EXCEPTION 'Only CATECH Super Admin can revoke platform administrator role' USING ERRCODE = '42501';
  END IF;

  IF _institution_id IS NOT NULL THEN
    SELECT public.can_access_institution(_institution_id, true) INTO v_can_manage_inst;
    IF NOT v_can_manage_inst AND NOT v_is_platform_admin THEN
      RAISE EXCEPTION 'Unauthorized to revoke roles for this institution' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NOT v_is_platform_admin THEN
      RAISE EXCEPTION 'Global role revocation requires platform administrator privilege' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 2. Lookup role
  SELECT id INTO v_role_id FROM public.roles
  WHERE code = _role_code AND (institution_id IS NULL OR institution_id = _institution_id)
  LIMIT 1;

  IF v_role_id IS NULL THEN
    RETURN false;
  END IF;

  -- 3. Delete assignment
  DELETE FROM public.user_assigned_roles
  WHERE user_id = _target_user_id AND role_id = v_role_id
    AND (institution_id IS NOT DISTINCT FROM _institution_id);

  -- 4. Sync backward compatibility tables
  IF _role_code = 'super_admin' THEN
    DELETE FROM public.user_roles WHERE user_id = _target_user_id AND role = 'super_admin';
  ELSIF _institution_id IS NOT NULL AND _role_code IN ('institution_admin', 'teacher', 'student') THEN
    UPDATE public.institution_memberships
    SET active = false
    WHERE institution_id = _institution_id AND user_id = _target_user_id AND role = _role_code::public.app_role;
  END IF;

  -- 5. Audit Log
  INSERT INTO public.rbac_audit_logs (institution_id, actor_id, action, target_user_id, role_code, details)
  VALUES (
    _institution_id,
    _actor_id,
    'role_revoked',
    _target_user_id,
    _role_code,
    jsonb_build_object('revoked_role_id', v_role_id, 'institution_id', _institution_id)
  );

  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_user_role(uuid, uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_user_role(uuid, uuid, text, uuid) TO authenticated, service_role;

-- Function: override_user_permission
CREATE OR REPLACE FUNCTION public.override_user_permission(
  _actor_id uuid,
  _target_user_id uuid,
  _permission_code text,
  _granted boolean,
  _institution_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result_id uuid;
  v_is_platform_admin boolean;
BEGIN
  IF _actor_id IS NULL OR auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT public.is_platform_admin() INTO v_is_platform_admin;
  IF NOT v_is_platform_admin AND NOT (_institution_id IS NOT NULL AND public.can_access_institution(_institution_id, true)) THEN
    RAISE EXCEPTION 'Unauthorized to override permissions' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE code = _permission_code) THEN
    RAISE EXCEPTION 'Invalid permission code %', _permission_code USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.user_permission_overrides (user_id, institution_id, permission_code, granted, granted_by)
  VALUES (_target_user_id, _institution_id, _permission_code, _granted, _actor_id)
  ON CONFLICT DO UPDATE SET granted = EXCLUDED.granted, granted_by = EXCLUDED.granted_by
  RETURNING id INTO v_result_id;

  INSERT INTO public.rbac_audit_logs (institution_id, actor_id, action, target_user_id, permission_code, details)
  VALUES (
    _institution_id,
    _actor_id,
    CASE WHEN _granted THEN 'permission_granted' ELSE 'permission_revoked' END,
    _target_user_id,
    _permission_code,
    jsonb_build_object('granted', _granted, 'institution_id', _institution_id)
  );

  RETURN v_result_id;
END;
$$;
REVOKE ALL ON FUNCTION public.override_user_permission(uuid, uuid, text, boolean, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.override_user_permission(uuid, uuid, text, boolean, uuid) TO authenticated, service_role;
