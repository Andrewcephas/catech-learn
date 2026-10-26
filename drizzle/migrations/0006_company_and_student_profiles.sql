-- =============================================================================
-- CATECH LEARN: Phase 9 Company & Student Profile Enhancements
-- Adds extended profile attributes for Companies and Students
-- =============================================================================

-- 1. Extend institutions with company profile metadata
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS description text DEFAULT '';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS phone_number text DEFAULT '';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS address text DEFAULT '';

-- 2. Extend profiles with student profile metadata
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text DEFAULT '';

-- 3. Allow company admins to update their own institution profile
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'institutions' AND policyname = 'Company admins can update own institution'
  ) THEN
    CREATE POLICY "Company admins can update own institution" ON public.institutions
      FOR UPDATE TO authenticated
      USING (public.can_access_institution(id, true))
      WITH CHECK (public.can_access_institution(id, true));
  END IF;
END $$;
