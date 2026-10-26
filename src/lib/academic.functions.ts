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
  department_name?: string | undefined;
  academic_year_name?: string | undefined;
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
  course_title?: string | undefined;
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
      .from("departments" as never)
      .select("*")
      .eq("institution_id" as never, data.institution_id)
      .order("name" as never, { ascending: true });

    if (error) throw new Error((error as { message: string }).message);
    return (depts as unknown as DepartmentItem[]) || [];
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
      .from("departments" as never)
      .insert({
        institution_id: data.institution_id,
        name: data.name,
        code: data.code,
      } as never)
      .select("id")
      .single();

    if (error) throw new Error((error as { message: string }).message);
    return { id: (dept as unknown as { id: string }).id };
  });

export const listAcademicYears = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ institution_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<AcademicYearItem[]> => {
    const { data: years, error } = await context.supabase
      .from("academic_years" as never)
      .select("*")
      .eq("institution_id" as never, data.institution_id)
      .order("start_date" as never, { ascending: false });

    if (error) throw new Error((error as { message: string }).message);
    return (years as unknown as AcademicYearItem[]) || [];
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
      .from("academic_years" as never)
      .insert({
        institution_id: data.institution_id,
        name: data.name,
        start_date: data.start_date,
        end_date: data.end_date,
        is_active: true,
      } as never)
      .select("id")
      .single();

    if (error) throw new Error((error as { message: string }).message);
    return { id: (year as unknown as { id: string }).id };
  });

export const listClasses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ institution_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<ClassItem[]> => {
    const { data: classes, error } = await context.supabase
      .from("classes" as never)
      .select("*, departments(name), academic_years(name)" as never)
      .eq("institution_id" as never, data.institution_id);

    if (error) throw new Error((error as { message: string }).message);

    return ((classes as unknown as Array<Record<string, unknown>>) || []).map((c) => {
      const deptName = (c["departments"] as { name?: string } | null)?.name;
      const yearName = (c["academic_years"] as { name?: string } | null)?.name;
      const item: ClassItem = {
        id: c["id"] as string,
        institution_id: c["institution_id"] as string,
        department_id: (c["department_id"] as string | null) ?? null,
        academic_year_id: (c["academic_year_id"] as string | null) ?? null,
        name: c["name"] as string,
        code: c["code"] as string,
      };
      if (deptName !== undefined) item.department_name = deptName;
      if (yearName !== undefined) item.academic_year_name = yearName;
      return item;
    });
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
      .from("classes" as never)
      .insert({
        institution_id: data.institution_id,
        department_id: data.department_id ?? null,
        academic_year_id: data.academic_year_id ?? null,
        name: data.name,
        code: data.code,
      } as never)
      .select("id")
      .single();

    if (error) throw new Error((error as { message: string }).message);
    return { id: (cls as unknown as { id: string }).id };
  });

export const listLiveClasses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ institution_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<LiveClassItem[]> => {
    const { data: live, error } = await context.supabase
      .from("live_classes" as never)
      .select("*, courses(title)" as never)
      .eq("institution_id" as never, data.institution_id)
      .order("start_time" as never, { ascending: true });

    if (error) throw new Error((error as { message: string }).message);

    return ((live as unknown as Array<Record<string, unknown>>) || []).map((l) => {
      const courseTitle = (l["courses"] as { title?: string } | null)?.title;
      const item: LiveClassItem = {
        id: l["id"] as string,
        institution_id: l["institution_id"] as string,
        course_id: (l["course_id"] as string | null) ?? null,
        title: l["title"] as string,
        description: (l["description"] as string) || "",
        start_time: l["start_time"] as string,
        end_time: l["end_time"] as string,
        meeting_url: l["meeting_url"] as string,
        provider: (l["provider"] as string) || "zoom",
      };
      if (courseTitle !== undefined) item.course_title = courseTitle;
      return item;
    });
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
      .from("live_classes" as never)
      .insert({
        institution_id: data.institution_id,
        course_id: data.course_id ?? null,
        instructor_id: context.userId,
        title: data.title,
        description: data.description,
        start_time: data.start_time,
        end_time: data.end_time,
        meeting_url: data.meeting_url,
      } as never)
      .select("id")
      .single();

    if (error) throw new Error((error as { message: string }).message);
    return { id: (created as unknown as { id: string }).id };
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
        .parse(input) ?? {},
  )
  .handler(async ({ data, context }): Promise<AnnouncementItem[]> => {
    const baseQuery = context.supabase
      .from("announcements" as never)
      .select("*")
      .order("created_at" as never, { ascending: false })
      .limit(20);

    const { data: ann, error } = await (
      data?.institution_id
        ? (baseQuery as ReturnType<typeof baseQuery.eq>).eq("institution_id" as never, data.institution_id)
        : baseQuery
    );
    if (error) throw new Error((error as { message: string }).message);
    return (ann as unknown as AnnouncementItem[]) || [];
  });
