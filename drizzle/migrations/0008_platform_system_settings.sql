-- 0008_platform_system_settings.sql
-- Platform system branding and configuration settings table

CREATE TABLE IF NOT EXISTS public.platform_system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name text NOT NULL DEFAULT 'CATECH Learn',
  tagline text NOT NULL DEFAULT 'Accredited Learning & Career Development Platform',
  support_email text NOT NULL DEFAULT 'support@catech.co.ke',
  support_phone text NOT NULL DEFAULT '+254 700 000 444',
  organization_address text NOT NULL DEFAULT 'Nairobi, Kenya',
  default_currency text NOT NULL DEFAULT 'KES',
  mpesa_paybill text NOT NULL DEFAULT '174379',
  allow_student_registration boolean NOT NULL DEFAULT true,
  allow_company_registration boolean NOT NULL DEFAULT true,
  maintenance_mode boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_system_settings ENABLE ROW LEVEL SECURITY;

-- Read policy: authenticated users can read system settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'platform_system_settings' AND policyname = 'Public platform settings read'
  ) THEN
    CREATE POLICY "Public platform settings read" ON public.platform_system_settings
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Write policy: only platform admins can update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'platform_system_settings' AND policyname = 'Super admin platform settings manage'
  ) THEN
    CREATE POLICY "Super admin platform settings manage" ON public.platform_system_settings
      FOR ALL TO authenticated USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

-- Insert default platform configuration if empty
INSERT INTO public.platform_system_settings (
  platform_name,
  tagline,
  support_email,
  support_phone,
  organization_address,
  default_currency,
  mpesa_paybill,
  allow_student_registration,
  allow_company_registration,
  maintenance_mode
)
SELECT
  'CATECH Learn',
  'Accredited Multi-Tenant Learning & Career Development Platform',
  'support@catech.co.ke',
  '+254 700 000 444',
  'Ngong Road, Nairobi, Kenya',
  'KES',
  '174379',
  true,
  true,
  false
WHERE NOT EXISTS (SELECT 1 FROM public.platform_system_settings LIMIT 1);
