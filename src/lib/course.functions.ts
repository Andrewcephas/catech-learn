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
  instructor_name?: string;
  enrolled?: boolean;
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
  completed?: boolean;
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
      .from("courses")
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
      .from("enrollments")
      .select("course_id")
      .eq("user_id", context.userId);

    const enrolledSet = new Set((enrollments || []).map((e) => e.course_id));

    return (courses || []).map((c) => ({
      id: c.id,
      institution_id: c.institution_id,
      department_id: c.department_id,
      title: c.title,
      code: c.code,
      description: c.description,
      thumbnail_url: c.thumbnail_url,
      price: Number(c.price),
      currency: c.currency,
      is_published: c.is_published,
      instructor_id: c.instructor_id,
      instructor_name: (c.profiles as { display_name?: string } | null)?.display_name,
      enrolled: enrolledSet.has(c.id),
      created_at: c.created_at,
    }));
  });

export const getCourseWithCurriculum = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ course_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<CourseDetail> => {
    const { data: course, error } = await context.supabase
      .from("courses")
      .select("*, profiles(display_name)")
      .eq("id", data.course_id)
      .single();

    if (error || !course) throw new Error("Course not found");

    const [modulesRes, enrollRes, progressRes] = await Promise.all([
      context.supabase
        .from("modules")
        .select("*, lessons(*)")
        .eq("course_id", data.course_id)
        .order("sort_order", { ascending: true }),
      context.supabase
        .from("enrollments")
        .select("id, status")
        .eq("course_id", data.course_id)
        .eq("user_id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("user_id", context.userId),
    ]);

    const completedLessons = new Set(
      (progressRes.data || []).filter((p) => p.completed).map((p) => p.lesson_id),
    );

    const formattedModules: ModuleItem[] = (modulesRes.data || []).map((m) => ({
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
      id: course.id,
      institution_id: course.institution_id,
      department_id: course.department_id,
      title: course.title,
      code: course.code,
      description: course.description,
      thumbnail_url: course.thumbnail_url,
      price: Number(course.price),
      currency: course.currency,
      is_published: course.is_published,
      instructor_id: course.instructor_id,
      instructor_name: (course.profiles as { display_name?: string } | null)?.display_name,
      created_at: course.created_at,
      modules: formattedModules,
      userEnrolled: !!enrollRes.data,
    };
  });

export const saveCourseFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveCourseSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    if (data.id) {
      const { data: updated, error } = await context.supabase
        .from("courses")
        .update({
          title: data.title,
          code: data.code,
          description: data.description,
          price: data.price,
          currency: data.currency,
          is_published: data.is_published,
          department_id: data.department_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id)
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      return { id: updated.id };
    } else {
      const { data: created, error } = await context.supabase
        .from("courses")
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
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      return { id: created.id };
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
        .from("modules")
        .update({ title: data.title, sort_order: data.sort_order })
        .eq("id", data.id)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: mod.id };
    } else {
      const { data: mod, error } = await context.supabase
        .from("modules")
        .insert({ course_id: data.course_id, title: data.title, sort_order: data.sort_order })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: mod.id };
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
        .from("lessons")
        .update(payload)
        .eq("id", data.id)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: lesson.id };
    } else {
      const { data: lesson, error } = await context.supabase
        .from("lessons")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: lesson.id };
    }
  });

export const enrollInFreeCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ course_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ success: boolean; enrollmentId: string }> => {
    // Verify course is free
    const { data: course, error: courseErr } = await context.supabase
      .from("courses")
      .select("price")
      .eq("id", data.course_id)
      .single();

    if (courseErr || !course) throw new Error("Course not found");
    if (Number(course.price) > 0)
      throw new Error("Paid course requires M-Pesa transaction verification");

    const { data: enrollment, error } = await context.supabase
      .from("enrollments")
      .insert({
        course_id: data.course_id,
        user_id: context.userId,
        status: "active",
      })
      .select("id")
      .single();

    if (error) throw new Error(`Enrollment failed: ${error.message}`);
    return { success: true, enrollmentId: enrollment.id };
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
    const { error } = await context.supabase.from("lesson_progress").upsert(
      {
        user_id: context.userId,
        lesson_id: data.lesson_id,
        completed: data.completed,
        last_position_seconds: data.last_position_seconds,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" },
    );

    if (error) throw new Error(error.message);
    return { success: true };
  });
