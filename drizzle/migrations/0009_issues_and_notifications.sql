-- ============================================================
-- Migration 0009: Issue Tracker, Notifications & Super Admin Bootstrap
-- ============================================================

-- 1. Issues / Support Tickets Table
CREATE TABLE IF NOT EXISTS public.issues (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  institution_id  uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
  title           text NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
  description     text NOT NULL CHECK (char_length(description) >= 10),
  category        text NOT NULL DEFAULT 'general'
                    CHECK (category IN ('general','billing','access','course','technical','other')),
  priority        text NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low','medium','high','critical')),
  status          text NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','in_progress','resolved','closed')),
  admin_response  text,
  responded_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  responded_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- Reporters can see their own issues
CREATE POLICY "issues_select_own" ON public.issues
  FOR SELECT USING (reporter_id = auth.uid());

-- Super admins can see all issues (via service_role or bypassing RLS)
CREATE POLICY "issues_select_admin" ON public.issues
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Authenticated users can insert their own issues
CREATE POLICY "issues_insert_own" ON public.issues
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- Super admins can update any issue
CREATE POLICY "issues_update_admin" ON public.issues
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Super admins can delete issues
CREATE POLICY "issues_delete_admin" ON public.issues
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Reporters can update their own open issues (edit before it's taken)
CREATE POLICY "issues_update_own_open" ON public.issues
  FOR UPDATE USING (reporter_id = auth.uid() AND status = 'open');

-- 2. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        text NOT NULL DEFAULT 'info'
                CHECK (type IN ('info','success','warning','error','issue_update','issue_reply','system')),
  title       text NOT NULL,
  body        text NOT NULL,
  link_view   text,         -- optional: which dashboard view to navigate to
  link_ref_id uuid,         -- optional: related entity id (issue id, course id, etc.)
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_service" ON public.notifications
  FOR INSERT WITH CHECK (true); -- server-side only via service_role

-- 3. Updated-at trigger for issues
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS issues_updated_at ON public.issues;
CREATE TRIGGER issues_updated_at
  BEFORE UPDATE ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Provision ngumbaucephas2@gmail.com as super_admin
-- This is idempotent: only runs if the user exists and doesn't already have super_admin role
DO $$
DECLARE
  _uid uuid;
BEGIN
  SELECT id INTO _uid
  FROM auth.users
  WHERE email = 'ngumbaucephas2@gmail.com'
  LIMIT 1;

  IF _uid IS NOT NULL THEN
    INSERT INTO public.user_roles(user_id, role)
    VALUES (_uid, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.institution_audit_logs(actor_id, action, target_id, details)
    VALUES (
      NULL,
      'superadmin_provisioned_from_migration',
      _uid,
      '{"email":"ngumbaucephas2@gmail.com","source":"migration_0009"}'::jsonb
    ) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Super admin provisioned for ngumbaucephas2@gmail.com (uid=%)', _uid;
  ELSE
    RAISE NOTICE 'User ngumbaucephas2@gmail.com not found yet — will be elevated on first login via bootstrap.';
  END IF;
END $$;
