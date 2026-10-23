CREATE TABLE public.institutions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 160),
 code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9][A-Z0-9-]{1,29}$'),
 contact_email text NOT NULL DEFAULT '' CHECK (char_length(contact_email) <= 254),
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.institutions TO authenticated;
GRANT ALL ON public.institutions TO service_role;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.institution_memberships (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 institution_id uuid NOT NULL REFERENCES public.institutions(id),
 user_id uuid NOT NULL REFERENCES public.profiles(id),
 role public.app_role NOT NULL DEFAULT 'student' CHECK (role <> 'super_admin'),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (institution_id, user_id)
);
GRANT SELECT ON public.institution_memberships TO authenticated;
GRANT ALL ON public.institution_memberships TO service_role;
ALTER TABLE public.institution_memberships ENABLE ROW LEVEL SECURITY;
CREATE INDEX institution_memberships_user_idx ON public.institution_memberships(user_id, institution_id);
CREATE TABLE public.institution_audit_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 institution_id uuid REFERENCES public.institutions(id),
 actor_id uuid,
 action text NOT NULL,
 target_id uuid NOT NULL,
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.institution_audit_logs TO authenticated;
GRANT ALL ON public.institution_audit_logs TO service_role;
ALTER TABLE public.institution_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX institution_audit_logs_time_idx ON public.institution_audit_logs(created_at DESC);
CREATE FUNCTION public.is_platform_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin');
$$;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;
CREATE FUNCTION public.can_access_institution(_institution_id uuid, _manage boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT public.is_platform_admin() OR EXISTS (
 SELECT 1 FROM public.institution_memberships m JOIN public.institutions i ON i.id = m.institution_id
 WHERE m.institution_id = _institution_id AND m.user_id = auth.uid() AND m.active AND i.status = 'active'
 AND (NOT _manage OR m.role = 'institution_admin'));
$$;
REVOKE ALL ON FUNCTION public.can_access_institution(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_institution(uuid, boolean) TO authenticated, service_role;
CREATE FUNCTION public.has_institution_membership(_institution_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.institution_memberships WHERE institution_id = _institution_id AND user_id = auth.uid() AND active);
$$;
REVOKE ALL ON FUNCTION public.has_institution_membership(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_institution_membership(uuid) TO authenticated, service_role;
CREATE POLICY "Institution summaries" ON public.institutions FOR SELECT TO authenticated USING (public.is_platform_admin() OR public.has_institution_membership(id));
CREATE POLICY "Own or managed memberships" ON public.institution_memberships FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.can_access_institution(institution_id, true));
CREATE POLICY "Managed audit history" ON public.institution_audit_logs FOR SELECT TO authenticated USING (public.is_platform_admin() OR public.can_access_institution(institution_id, true));
CREATE POLICY "Platform account directory" ON public.profiles FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE FUNCTION public.record_institution_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 NEW.updated_at = now();
 INSERT INTO public.institution_audit_logs(institution_id, actor_id, action, target_id, details)
 VALUES (NEW.id, auth.uid(), CASE WHEN TG_OP = 'INSERT' THEN 'institution_created' ELSE 'institution_updated' END, NEW.id,
 jsonb_build_object('name', NEW.name, 'status', NEW.status, 'previous_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END));
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_institution_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER institution_change_audit BEFORE INSERT OR UPDATE ON public.institutions FOR EACH ROW EXECUTE FUNCTION public.record_institution_change();
CREATE FUNCTION public.record_membership_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 NEW.updated_at = now();
 INSERT INTO public.institution_audit_logs(institution_id, actor_id, action, target_id, details)
 VALUES (NEW.institution_id, auth.uid(), CASE WHEN TG_OP = 'INSERT' THEN 'membership_assigned' ELSE 'membership_updated' END, NEW.user_id,
 jsonb_build_object('role', NEW.role, 'active', NEW.active));
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_membership_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER membership_change_audit BEFORE INSERT OR UPDATE ON public.institution_memberships FOR EACH ROW EXECUTE FUNCTION public.record_membership_change();
CREATE FUNCTION public.save_institution(_name text, _code text, _contact_email text, _id uuid DEFAULT NULL, _status text DEFAULT 'active') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result_id uuid; existing_status text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501'; END IF;
 IF _id IS NULL THEN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator required' USING ERRCODE = '42501'; END IF;
 ELSE
  PERFORM 1 FROM public.institutions WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Institution unavailable'; END IF;
  IF NOT public.can_access_institution(_id, true) THEN RAISE EXCEPTION 'Institution access denied' USING ERRCODE = '42501'; END IF;
  SELECT status INTO existing_status FROM public.institutions WHERE id = _id;
  IF NOT public.is_platform_admin() AND _status IS DISTINCT FROM existing_status THEN RAISE EXCEPTION 'Only platform administrators change institution status' USING ERRCODE = '42501'; END IF;
 END IF;
 IF char_length(btrim(_name)) NOT BETWEEN 2 AND 160 OR upper(btrim(_code)) !~ '^[A-Z0-9][A-Z0-9-]{1,29}$' OR char_length(_contact_email) > 254 OR _status NOT IN ('active', 'suspended') THEN RAISE EXCEPTION 'Invalid institution details'; END IF;
 IF _id IS NULL THEN
  INSERT INTO public.institutions(name, code, contact_email, status) VALUES (btrim(_name), upper(btrim(_code)), btrim(_contact_email), _status) RETURNING id INTO result_id;
 ELSE
  UPDATE public.institutions SET name = btrim(_name), code = upper(btrim(_code)), contact_email = btrim(_contact_email), status = _status WHERE id = _id RETURNING id INTO result_id;
 END IF;
 RETURN result_id;
END;
$$;
REVOKE ALL ON FUNCTION public.save_institution(text,text,text,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_institution(text,text,text,uuid,text) TO authenticated;
CREATE FUNCTION public.assign_institution_member(_institution_id uuid, _user_id uuid, _role public.app_role, _active boolean DEFAULT true) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator required' USING ERRCODE = '42501'; END IF;
 IF _role NOT IN ('institution_admin','teacher','student') THEN RAISE EXCEPTION 'Invalid institution role' USING ERRCODE = '42501'; END IF;
 PERFORM 1 FROM public.institutions WHERE id = _institution_id AND status = 'active' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Institution is missing or suspended'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN RAISE EXCEPTION 'Account unavailable'; END IF;
 INSERT INTO public.institution_memberships(institution_id,user_id,role,active) VALUES(_institution_id,_user_id,_role,_active)
 ON CONFLICT(institution_id,user_id) DO UPDATE SET role = EXCLUDED.role, active = EXCLUDED.active RETURNING id INTO result_id;
 RETURN result_id;
END;
$$;
REVOKE ALL ON FUNCTION public.assign_institution_member(uuid,uuid,public.app_role,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_institution_member(uuid,uuid,public.app_role,boolean) TO authenticated;
CREATE FUNCTION public.institution_member_directory(_institution_id uuid) RETURNS TABLE(id uuid, user_id uuid, display_name text, role public.app_role, active boolean) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_access_institution(_institution_id, true) THEN RAISE EXCEPTION 'Institution access denied' USING ERRCODE = '42501'; END IF;
 RETURN QUERY SELECT m.id,m.user_id,p.display_name,m.role,m.active FROM public.institution_memberships m JOIN public.profiles p ON p.id = m.user_id WHERE m.institution_id = _institution_id ORDER BY p.display_name;
END;
$$;
REVOKE ALL ON FUNCTION public.institution_member_directory(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.institution_member_directory(uuid) TO authenticated;
CREATE FUNCTION public.provision_initial_platform_admin(_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(619732461);
 IF EXISTS(SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN RAISE EXCEPTION 'Initial platform administrator already provisioned'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id = _user_id AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Existing verified account required'; END IF;
 INSERT INTO public.user_roles(user_id, role) VALUES (_user_id, 'super_admin') ON CONFLICT(user_id,role) DO NOTHING;
 INSERT INTO public.institution_audit_logs(actor_id, action, target_id, details) VALUES(NULL, 'initial_platform_admin_provisioned', _user_id, '{"source":"trusted_operator"}'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.provision_initial_platform_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_initial_platform_admin(uuid) TO service_role;
COMMENT ON COLUMN public.profiles.institution_id IS 'DEPRECATED: institution_memberships is the authority for institution assignments; retained for compatibility only.';