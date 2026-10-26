import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface CourseSummary {
  id: string;
  institution_id: string;
  department_id: string | null;
  title: string;
  code: string;
  description: string;
  thumbnail_url: string | null;
  price: number;
  currency: string;
  is_published: boolean;
  instructor_id: string | null;
  instructor_name?: string | undefined;
  enrolled?: boolean | undefined;
  created_at: string;
}

export interface LessonItem {
  id: string;
  module_id: string;
  title: string;
  content: string;
  video_url: string | null;
  duration_minutes: number;
  sort_order: number;
  is_free_preview: boolean;
  completed?: boolean | undefined;
}

export interface ModuleItem {
  id: string;
  course_id: string;
  title: string;
  sort_order: number;
  lessons: LessonItem[];
}

export interface CourseDetail extends CourseSummary {
  modules: ModuleItem[];
  userEnrolled: boolean;
}

const saveCourseSchema = z.object({
  id: z.string().uuid().optional(),
  institution_id: z.string().uuid(),
  department_id: z.string().uuid().optional(),
  title: z.string().trim().min(3, "Title must be at least 3 characters"),
  code: z.string().trim().toUpperCase(),
  description: z.string().trim().default(""),
  price: z.number().min(0, "Price must be non-negative").default(0),
  currency: z.string().default("KES"),
  is_published: z.boolean().default(false),
});

export const listCourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: unknown) =>
      z
        .object({
          institution_id: z.string().uuid().optional(),
          published_only: z.boolean().optional(),
        })
        .optional()
        .parse(input) || {},
  )
  .handler(async ({ data, context }): Promise<CourseSummary[]> => {
    let query = context.supabase
      .from("courses" as never)
      .select(
        "id, institution_id, department_id, title, code, description, thumbnail_url, price, currency, is_published, instructor_id, created_at, profiles(display_name)",
      )
      .order("created_at", { ascending: false });

    if (data?.institution_id) {
      query = query.eq("institution_id", data.institution_id);
    }
    if (data?.published_only) {
      query = query.eq("is_published", true);
    }

    const { data: courses, error } = await query;
    if (error) throw new Error(error.message);

    // Fetch user enrollments to mark enrolled status
    const { data: enrollments } = await context.supabase
      .from("enrollments" as never)
      .select("course_id")
      .eq("user_id", context.userId);

    const enrollmentRows = (enrollments || []) as unknown as Array<{ course_id: string }>;
    const enrolledSet = new Set(enrollmentRows.map((e) => e.course_id));

    const courseRows = (courses || []) as unknown as Array<Record<string, unknown>>;
    return courseRows.map((c) => ({
      id: c["id"] as string,
      institution_id: c["institution_id"] as string,
      department_id: (c["department_id"] as string | null) || null,
      title: c["title"] as string,
      code: c["code"] as string,
      description: (c["description"] as string) || "",
      thumbnail_url: (c["thumbnail_url"] as string | null) || null,
      price: Number(c["price"]),
      currency: (c["currency"] as string) || "KES",
      is_published: Boolean(c["is_published"]),
      instructor_id: (c["instructor_id"] as string | null) || null,
      instructor_name: ((c["profiles"] as { display_name?: string } | null)?.display_name) || undefined,
      enrolled: enrolledSet.has(c["id"] as string),
      created_at: c["created_at"] as string,
    }));
  });

export const getCourseWithCurriculum = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ course_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<CourseDetail> => {
    const { data: course, error } = await context.supabase
      .from("courses" as never)
      .select("*, profiles(display_name)")
      .eq("id", data.course_id)
      .single();

    if (error || !course) throw new Error("Course not found");
    const courseData = course as unknown as Record<string, unknown>;

    const [modulesRes, enrollRes, progressRes] = await Promise.all([
      context.supabase
        .from("modules" as never)
        .select("*, lessons(*)")
        .eq("course_id", data.course_id)
        .order("sort_order", { ascending: true }),
      context.supabase
        .from("enrollments" as never)
        .select("id, status")
        .eq("course_id", data.course_id)
        .eq("user_id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("lesson_progress" as never)
        .select("lesson_id, completed")
        .eq("user_id", context.userId),
    ]);

    const progressRows = (progressRes.data || []) as unknown as Array<{ lesson_id: string; completed: boolean }>;
    const completedLessons = new Set(
      progressRows.filter((p) => p.completed).map((p) => p.lesson_id),
    );

    const moduleRows = (modulesRes.data || []) as unknown as Array<{
      id: string;
      course_id: string;
      title: string;
      sort_order: number;
      lessons?: Array<{
        id: string;
        module_id: string;
        title: string;
        content: string;
        video_url: string | null;
        duration_minutes: number;
        sort_order: number;
        is_free_preview: boolean;
      }>;
    }>;

    const formattedModules: ModuleItem[] = moduleRows.map((m) => ({
      id: m.id,
      course_id: m.course_id,
      title: m.title,
      sort_order: m.sort_order,
      lessons: (m.lessons || [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((l) => ({
          id: l.id,
          module_id: l.module_id,
          title: l.title,
          content: l.content,
          video_url: l.video_url,
          duration_minutes: l.duration_minutes,
          sort_order: l.sort_order,
          is_free_preview: l.is_free_preview,
          completed: completedLessons.has(l.id),
        })),
    }));

    return {
      id: courseData["id"] as string,
      institution_id: courseData["institution_id"] as string,
      department_id: (courseData["department_id"] as string | null) || null,
      title: courseData["title"] as string,
      code: courseData["code"] as string,
      description: (courseData["description"] as string) || "",
      thumbnail_url: (courseData["thumbnail_url"] as string | null) || null,
      price: Number(courseData["price"]),
      currency: (courseData["currency"] as string) || "KES",
      is_published: Boolean(courseData["is_published"]),
      instructor_id: (courseData["instructor_id"] as string | null) || null,
      instructor_name: ((courseData["profiles"] as { display_name?: string } | null)?.display_name) || undefined,
      created_at: courseData["created_at"] as string,
      modules: formattedModules,
      userEnrolled: Boolean(enrollRes.data),
    };
  });

export const saveCourseFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveCourseSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    if (data.id) {
      const { data: updated, error } = await context.supabase
        .from("courses" as never)
        .update({
          title: data.title,
          code: data.code,
          description: data.description,
          price: data.price,
          currency: data.currency,
          is_published: data.is_published,
          department_id: data.department_id || null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", data.id)
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      return { id: (updated as { id: string }).id };
    } else {
      const { data: created, error } = await context.supabase
        .from("courses" as never)
        .insert({
          institution_id: data.institution_id,
          department_id: data.department_id || null,
          title: data.title,
          code: data.code,
          description: data.description,
          price: data.price,
          currency: data.currency,
          is_published: data.is_published,
          instructor_id: context.userId,
        } as never)
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      return { id: (created as { id: string }).id };
    }
  });

export const saveModuleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        course_id: z.string().uuid(),
        title: z.string().trim().min(2),
        sort_order: z.number().int().default(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    if (data.id) {
      const { data: mod, error } = await context.supabase
        .from("modules" as never)
        .update({ title: data.title, sort_order: data.sort_order } as never)
        .eq("id", data.id)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: (mod as { id: string }).id };
    } else {
      const { data: mod, error } = await context.supabase
        .from("modules" as never)
        .insert({ course_id: data.course_id, title: data.title, sort_order: data.sort_order } as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: (mod as { id: string }).id };
    }
  });

export const saveLessonFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        module_id: z.string().uuid(),
        title: z.string().trim().min(2),
        content: z.string().default(""),
        video_url: z.string().url().optional().or(z.literal("")),
        duration_minutes: z.number().int().min(1).default(15),
        sort_order: z.number().int().default(0),
        is_free_preview: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const payload = {
      module_id: data.module_id,
      title: data.title,
      content: data.content,
      video_url: data.video_url || null,
      duration_minutes: data.duration_minutes,
      sort_order: data.sort_order,
      is_free_preview: data.is_free_preview,
    };

    if (data.id) {
      const { data: lesson, error } = await context.supabase
        .from("lessons" as never)
        .update(payload as never)
        .eq("id", data.id)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: (lesson as { id: string }).id };
    } else {
      const { data: lesson, error } = await context.supabase
        .from("lessons" as never)
        .insert(payload as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: (lesson as { id: string }).id };
    }
  });

export const enrollInFreeCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ course_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ success: boolean; enrollmentId: string }> => {
    // Verify course is free
    const { data: course, error: courseErr } = await context.supabase
      .from("courses" as never)
      .select("price")
      .eq("id", data.course_id)
      .single();

    const courseRow = course as { price?: number | string } | null;
    if (courseErr || !courseRow) throw new Error("Course not found");
    if (Number(courseRow.price) > 0)
      throw new Error("Paid course requires M-Pesa transaction verification");

    const { data: enrollment, error } = await context.supabase
      .from("enrollments" as never)
      .insert({
        course_id: data.course_id,
        user_id: context.userId,
        status: "active",
      } as never)
      .select("id")
      .single();

    if (error) throw new Error(`Enrollment failed: ${error.message}`);
    return { success: true, enrollmentId: (enrollment as { id: string }).id };
  });

export const updateLessonProgressFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        lesson_id: z.string().uuid(),
        completed: z.boolean(),
        last_position_seconds: z.number().int().min(0).default(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("lesson_progress" as never).upsert(
      {
        user_id: context.userId,
        lesson_id: data.lesson_id,
        completed: data.completed,
        last_position_seconds: data.last_position_seconds,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "user_id,lesson_id" },
    );

    if (error) throw new Error(error.message);
    return { success: true };
  });
