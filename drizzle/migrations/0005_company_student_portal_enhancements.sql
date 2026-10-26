-- =============================================================================
-- CATECH LEARN: Phase 8 Company & Student Portal Enhancements
-- Adds direct 1-on-1 messaging, company student directory, and public institution discovery
-- =============================================================================

-- 1. DIRECT MESSAGING (Company <-> Student)
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text NOT NULL DEFAULT '',
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.direct_messages TO authenticated, service_role;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'direct_messages' AND policyname = 'Direct messages read'
  ) THEN
    CREATE POLICY "Direct messages read" ON public.direct_messages
      FOR SELECT TO authenticated
      USING (sender_id = auth.uid() OR recipient_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'direct_messages' AND policyname = 'Direct messages insert'
  ) THEN
    CREATE POLICY "Direct messages insert" ON public.direct_messages
      FOR INSERT TO authenticated
      WITH CHECK (sender_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'direct_messages' AND policyname = 'Direct messages update'
  ) THEN
    CREATE POLICY "Direct messages update" ON public.direct_messages
      FOR UPDATE TO authenticated
      USING (recipient_id = auth.uid())
      WITH CHECK (recipient_id = auth.uid());
  END IF;
END $$;

-- 2. DISCOVERY POLICY: Allow authenticated learners to discover active institutions/companies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'institutions' AND policyname = 'Active institutions public discovery'
  ) THEN
    CREATE POLICY "Active institutions public discovery" ON public.institutions
      FOR SELECT TO authenticated
      USING (status = 'active');
  END IF;
END $$;

-- 3. LESSON NOTES TABLE (Dedicated study notes & model resources)
CREATE TABLE IF NOT EXISTS public.lesson_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  file_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_notes TO authenticated, service_role;
ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lesson_notes' AND policyname = 'Lesson notes access'
  ) THEN
    CREATE POLICY "Lesson notes access" ON public.lesson_notes
      FOR ALL TO authenticated USING (true);
  END IF;
END $$;
