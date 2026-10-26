import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface QuizQuestionData {
  id: string;
  question_text: string;
  question_type: string;
  points: number;
  options: { id: string; option_text: string }[];
}

export interface QuizDetail {
  id: string;
  course_id: string;
  title: string;
  description: string;
  time_limit_minutes: number;
  pass_score: number;
  questions: QuizQuestionData[];
}

export interface CertificateInfo {
  certificate_number: string;
  student_name: string;
  course_title: string;
  institution_name: string;
  issue_date: string;
  status: "active" | "revoked";
}

interface DbQuizRow {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  time_limit_minutes: number | null;
  pass_score: number;
  quiz_questions: Array<{
    id: string;
    question_text: string;
    question_type: string;
    points: number;
    quiz_question_options: Array<{ id: string; option_text: string; is_correct?: boolean }>;
  }>;
}

interface DbQuizSummaryRow {
  pass_score: number;
  course_id: string;
  courses: { institution_id: string; title: string } | null;
}

export const getQuizDetailsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ quiz_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<QuizDetail> => {
    const { data: quiz, error } = await context.supabase
      .from("quizzes" as never)
      .select("*, quiz_questions(*, quiz_question_options(id, option_text))" as never)
      .eq("id" as never, data.quiz_id)
      .single();

    if (error || !quiz) throw new Error("Assessment not found");

    const quizRow = quiz as unknown as DbQuizRow;

    const questions: QuizQuestionData[] = (quizRow.quiz_questions || []).map((q) => ({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      points: q.points,
      options: (q.quiz_question_options || []).map((o) => ({
        id: o.id,
        option_text: o.option_text,
      })),
    }));

    return {
      id: quizRow.id,
      course_id: quizRow.course_id,
      title: quizRow.title,
      description: quizRow.description || "",
      time_limit_minutes: quizRow.time_limit_minutes || 30,
      pass_score: quizRow.pass_score,
      questions,
    };
  });

export const submitQuizAttemptFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        quiz_id: z.string().uuid(),
        answers: z.array(
          z.object({
            question_id: z.string().uuid(),
            selected_option_id: z.string().uuid(),
          }),
        ),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // 1. Fetch questions and options with is_correct on server side
    const { data: questions, error } = await context.supabase
      .from("quiz_questions" as never)
      .select("id, points, quiz_question_options(id, is_correct)" as never)
      .eq("quiz_id" as never, data.quiz_id);

    if (error || !questions) throw new Error("Failed to evaluate assessment");

    interface QRow { id: string; points: number; quiz_question_options: { id: string; is_correct: boolean }[] }

    let totalPoints = 0;
    let earnedPoints = 0;

    const answerMap = new Map(data.answers.map((a) => [a.question_id, a.selected_option_id]));

    for (const q of (questions as unknown as QRow[])) {
      totalPoints += q.points;
      const selected = answerMap.get(q.id);
      const correctOption = q.quiz_question_options.find((opt) => opt.is_correct);

      if (selected && correctOption && selected === correctOption.id) {
        earnedPoints += q.points;
      }
    }

    const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

    // Fetch quiz pass score
    const { data: quiz } = await context.supabase
      .from("quizzes" as never)
      .select("pass_score, course_id, courses(institution_id, title)" as never)
      .eq("id" as never, data.quiz_id)
      .single();

    const quizRow = quiz as unknown as DbQuizSummaryRow | null;
    const passScore = quizRow?.pass_score || 70;
    const passed = percentage >= passScore;

    // Record attempt
    const { data: attempt, error: attemptErr } = await context.supabase
      .from("quiz_attempts" as never)
      .insert({
        quiz_id: data.quiz_id,
        user_id: context.userId,
        score: percentage,
        passed,
        completed_at: new Date().toISOString(),
      } as never)
      .select("id")
      .single();

    if (attemptErr) throw new Error((attemptErr as { message: string }).message);

    // If passed and linked to course, issue automated certificate
    let certNumber: string | null = null;
    if (passed && quizRow?.course_id && quizRow.courses) {
      const courseInfo = quizRow.courses;
      const uniqueSuffix = Math.floor(100000 + Math.random() * 900000);
      const year = new Date().getFullYear();
      certNumber = `CAT-${courseInfo.institution_id.slice(0, 4).toUpperCase()}-${year}-${uniqueSuffix}`;

      await context.supabase.from("certificates" as never).upsert(
        {
          institution_id: courseInfo.institution_id,
          user_id: context.userId,
          course_id: quizRow.course_id,
          certificate_number: certNumber,
          issue_date: new Date().toISOString().split("T")[0],
          qr_code_data: `https://learn.catech.co.ke/verify?cert=${certNumber}`,
          verification_hash: Buffer.from(
            `${context.userId}:${quizRow.course_id}:${certNumber}`,
          ).toString("hex"),
          status: "active",
        } as never,
        { onConflict: "user_id,course_id" },
      );
    }

    return {
      attemptId: (attempt as unknown as { id: string }).id,
      score: percentage,
      passed,
      passScore,
      certificateNumber: certNumber,
    };
  });

export const submitAssignmentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        assignment_id: z.string().uuid(),
        submission_text: z.string().default(""),
        file_url: z.string().url().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: sub, error } = await context.supabase
      .from("assignment_submissions" as never)
      .upsert(
        {
          assignment_id: data.assignment_id,
          user_id: context.userId,
          submission_text: data.submission_text,
          file_url: data.file_url || null,
          submitted_at: new Date().toISOString(),
        } as never,
        { onConflict: "assignment_id,user_id" },
      )
      .select("id")
      .single();

    if (error) throw new Error((error as { message: string }).message);
    return { id: (sub as unknown as { id: string }).id, message: "Assignment submitted successfully." };
  });

export const gradeAssignmentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        submission_id: z.string().uuid(),
        grade: z.number().min(0).max(100),
        feedback: z.string().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("assignment_submissions" as never)
      .update({
        grade: data.grade,
        feedback: data.feedback,
        graded_by: context.userId,
        graded_at: new Date().toISOString(),
      } as never)
      .eq("id" as never, data.submission_id);

    if (error) throw new Error((error as { message: string }).message);
    return { success: true };
  });

export const verifyCertificateFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ cert_number: z.string().trim() }).parse(input))
  .handler(async ({ data }): Promise<CertificateInfo | null> => {
    // Public verification query using anonymous service client
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: cert, error } = await supabase
      .from("certificates" as never)
      .select(
        "certificate_number, issue_date, status, profiles(display_name), courses(title, institutions(name))" as never,
      )
      .eq("certificate_number" as never, data.cert_number)
      .maybeSingle();

    if (error || !cert) return null;

    const certRow = cert as unknown as {
      certificate_number: string;
      issue_date: string;
      status: string;
      profiles: { display_name?: string } | null;
      courses: { title?: string; institutions?: { name?: string } } | null;
    };

    const studentName = certRow.profiles?.display_name || "Verified Scholar";
    const courseTitle = certRow.courses?.title || "Accredited Course";
    const instName = certRow.courses?.institutions?.name || "CATECH Partner Institution";

    return {
      certificate_number: certRow.certificate_number,
      student_name: studentName,
      course_title: courseTitle,
      institution_name: instName,
      issue_date: certRow.issue_date,
      status: certRow.status as "active" | "revoked",
    };
  });
