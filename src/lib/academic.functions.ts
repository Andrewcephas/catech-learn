import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface DepartmentItem {
  id: string;
  institution_id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface AcademicYearItem {
  id: string;
  institution_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface ClassItem {
  id: string;
  institution_id: string;
  department_id: string | null;
  academic_year_id: string | null;
  name: string;
  code: string;
  department_name?: string;
  academic_year_name?: string;
}

export interface LiveClassItem {
  id: string;
  institution_id: string;
  course_id: string | null;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  meeting_url: string;
  provider: string;
  course_title?: string;
}

export interface AnnouncementItem {
  id: string;
  institution_id: string | null;
  course_id: string | null;
  title: string;
  content: string;
  target_audience: string;
  created_at: string;
}

export const listDepartments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ institution_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<DepartmentItem[]> => {
    const { data: depts, error } = await context.supabase
      .from("departments")
      .select("*")
      .eq("institution_id", data.institution_id)
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);
    return depts || [];
  });

export const saveDepartmentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        institution_id: z.string().uuid(),
        name: z.string().trim().min(2).max(120),
        code: z.string().trim().toUpperCase(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: dept, error } = await context.supabase
      .from("departments")
      .insert({
        institution_id: data.institution_id,
        name: data.name,
        code: data.code,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: dept.id };
  });

export const listAcademicYears = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ institution_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<AcademicYearItem[]> => {
    const { data: years, error } = await context.supabase
      .from("academic_years")
      .select("*")
      .eq("institution_id", data.institution_id)
      .order("start_date", { ascending: false });

    if (error) throw new Error(error.message);
    return years || [];
  });

export const saveAcademicYearFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        institution_id: z.string().uuid(),
        name: z.string().trim().min(2),
        start_date: z.string(),
        end_date: z.string(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: year, error } = await context.supabase
      .from("academic_years")
      .insert({
        institution_id: data.institution_id,
        name: data.name,
        start_date: data.start_date,
        end_date: data.end_date,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: year.id };
  });

export const listClasses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ institution_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<ClassItem[]> => {
    const { data: classes, error } = await context.supabase
      .from("classes")
      .select("*, departments(name), academic_years(name)")
      .eq("institution_id", data.institution_id);

    if (error) throw new Error(error.message);

    return (classes || []).map((c) => ({
      id: c.id,
      institution_id: c.institution_id,
      department_id: c.department_id,
      academic_year_id: c.academic_year_id,
      name: c.name,
      code: c.code,
      department_name: (c.departments as { name?: string } | null)?.name,
      academic_year_name: (c.academic_years as { name?: string } | null)?.name,
    }));
  });

export const saveClassFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        institution_id: z.string().uuid(),
        department_id: z.string().uuid().optional(),
        academic_year_id: z.string().uuid().optional(),
        name: z.string().trim().min(2),
        code: z.string().trim().toUpperCase(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: cls, error } = await context.supabase
      .from("classes")
      .insert({
        institution_id: data.institution_id,
        department_id: data.department_id || null,
        academic_year_id: data.academic_year_id || null,
        name: data.name,
        code: data.code,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: cls.id };
  });

export const listLiveClasses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ institution_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<LiveClassItem[]> => {
    const { data: live, error } = await context.supabase
      .from("live_classes")
      .select("*, courses(title)")
      .eq("institution_id", data.institution_id)
      .order("start_time", { ascending: true });

    if (error) throw new Error(error.message);

    return (live || []).map((l) => ({
      id: l.id,
      institution_id: l.institution_id,
      course_id: l.course_id,
      title: l.title,
      description: l.description || "",
      start_time: l.start_time,
      end_time: l.end_time,
      meeting_url: l.meeting_url,
      provider: l.provider,
      course_title: (l.courses as { title?: string } | null)?.title,
    }));
  });

export const scheduleLiveClassFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        institution_id: z.string().uuid(),
        course_id: z.string().uuid().optional(),
        title: z.string().trim().min(3),
        description: z.string().default(""),
        start_time: z.string(),
        end_time: z.string(),
        meeting_url: z.string().url("Valid meeting link required"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: created, error } = await context.supabase
      .from("live_classes")
      .insert({
        institution_id: data.institution_id,
        course_id: data.course_id || null,
        instructor_id: context.userId,
        title: data.title,
        description: data.description,
        start_time: data.start_time,
        end_time: data.end_time,
        meeting_url: data.meeting_url,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: unknown) =>
      z
        .object({
          institution_id: z.string().uuid().optional(),
        })
        .optional()
        .parse(input) || {},
  )
  .handler(async ({ data, context }): Promise<AnnouncementItem[]> => {
    let query = context.supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (data?.institution_id) {
      query = query.eq("institution_id", data.institution_id);
    }

    const { data: ann, error } = await query;
    if (error) throw new Error(error.message);
    return ann || [];
  });
