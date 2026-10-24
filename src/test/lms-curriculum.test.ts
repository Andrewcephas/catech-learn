import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const migration0003 = readFileSync(
  "drizzle/migrations/0003_complete_lms_payments_assessments.sql",
  "utf8",
);

describe("Core LMS & Assessment Architecture", () => {
  it("enforces courses, modules, lessons, and progress tracking tables with RLS", () => {
    expect(migration0003).toContain("CREATE TABLE IF NOT EXISTS public.courses");
    expect(migration0003).toContain("ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY");
    expect(migration0003).toContain("CREATE TABLE IF NOT EXISTS public.modules");
    expect(migration0003).toContain("ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY");
    expect(migration0003).toContain("CREATE TABLE IF NOT EXISTS public.lessons");
    expect(migration0003).toContain("ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY");
    expect(migration0003).toContain("CREATE TABLE IF NOT EXISTS public.enrollments");
    expect(migration0003).toContain("UNIQUE(course_id, user_id)");
    expect(migration0003).toContain("CREATE TABLE IF NOT EXISTS public.lesson_progress");
    expect(migration0003).toContain("UNIQUE(user_id, lesson_id)");
  });

  it("defines quiz assessment engine and assignment submissions schema", () => {
    expect(migration0003).toContain("CREATE TABLE IF NOT EXISTS public.quizzes");
    expect(migration0003).toContain("CREATE TABLE IF NOT EXISTS public.quiz_questions");
    expect(migration0003).toContain("CREATE TABLE IF NOT EXISTS public.quiz_question_options");
    expect(migration0003).toContain("CREATE TABLE IF NOT EXISTS public.quiz_attempts");
    expect(migration0003).toContain("CREATE TABLE IF NOT EXISTS public.assignments");
    expect(migration0003).toContain("CREATE TABLE IF NOT EXISTS public.assignment_submissions");
  });

  it("defines automated certificates and public verification registry with unique constraints", () => {
    expect(migration0003).toContain("CREATE TABLE IF NOT EXISTS public.certificates");
    expect(migration0003).toContain("certificate_number text NOT NULL UNIQUE");
    expect(migration0003).toContain("qr_code_data text NOT NULL");
    expect(migration0003).toContain("verification_hash text NOT NULL");
    expect(migration0003).toContain("UNIQUE(user_id, course_id)");
  });

  it("provides live classes and announcements for synchronous distance learning", () => {
    expect(migration0003).toContain("CREATE TABLE IF NOT EXISTS public.live_classes");
    expect(migration0003).toContain("meeting_url text NOT NULL");
    expect(migration0003).toContain("CREATE TABLE IF NOT EXISTS public.announcements");
  });

  it("structures academic years, classes, attendance tracking, and SaaS subscription tiers", () => {
    expect(migration0003).toContain("CREATE TABLE IF NOT EXISTS public.academic_years");
    expect(migration0003).toContain("CREATE TABLE IF NOT EXISTS public.classes");
    expect(migration0003).toContain("CREATE TABLE IF NOT EXISTS public.attendance_sessions");
    expect(migration0003).toContain("CREATE TABLE IF NOT EXISTS public.attendance_records");
    expect(migration0003).toContain("CREATE TABLE IF NOT EXISTS public.notifications");
    expect(migration0003).toContain("CREATE TABLE IF NOT EXISTS public.subscription_plans");
    expect(migration0003).toContain("CREATE TABLE IF NOT EXISTS public.institution_subscriptions");
  });
});
