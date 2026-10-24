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

export const getQuizDetailsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ quiz_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<QuizDetail> => {
    const { data: quiz, error } = await context.supabase
      .from("quizzes")
      .select("*, quiz_questions(*, quiz_question_options(id, option_text))")
      .eq("id", data.quiz_id)
      .single();

    if (error || !quiz) throw new Error("Assessment not found");

    const questions: QuizQuestionData[] = (quiz.quiz_questions || []).map((q) => ({
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
      id: quiz.id,
      course_id: quiz.course_id,
      title: quiz.title,
      description: quiz.description || "",
      time_limit_minutes: quiz.time_limit_minutes || 30,
      pass_score: quiz.pass_score,
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
      .from("quiz_questions")
      .select("id, points, quiz_question_options(id, is_correct)")
      .eq("quiz_id", data.quiz_id);

    if (error || !questions) throw new Error("Failed to evaluate assessment");

    let totalPoints = 0;
    let earnedPoints = 0;

    const answerMap = new Map(data.answers.map((a) => [a.question_id, a.selected_option_id]));

    for (const q of questions) {
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
      .from("quizzes")
      .select("pass_score, course_id, courses(institution_id, title)")
      .eq("id", data.quiz_id)
      .single();

    const passScore = quiz?.pass_score || 70;
    const passed = percentage >= passScore;

    // Record attempt
    const { data: attempt, error: attemptErr } = await context.supabase
      .from("quiz_attempts")
      .insert({
        quiz_id: data.quiz_id,
        user_id: context.userId,
        score: percentage,
        passed,
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (attemptErr) throw new Error(attemptErr.message);

    // If passed and linked to course, issue automated certificate
    let certNumber: string | null = null;
    if (passed && quiz?.course_id && quiz.courses) {
      const courseInfo = quiz.courses as { institution_id: string; title: string };
      const uniqueSuffix = Math.floor(100000 + Math.random() * 900000);
      const year = new Date().getFullYear();
      certNumber = `CAT-${courseInfo.institution_id.slice(0, 4).toUpperCase()}-${year}-${uniqueSuffix}`;

      await context.supabase.from("certificates").upsert(
        {
          institution_id: courseInfo.institution_id,
          user_id: context.userId,
          course_id: quiz.course_id,
          certificate_number: certNumber,
          issue_date: new Date().toISOString().split("T")[0],
          qr_code_data: `https://learn.catech.co.ke/verify?cert=${certNumber}`,
          verification_hash: Buffer.from(
            `${context.userId}:${quiz.course_id}:${certNumber}`,
          ).toString("hex"),
          status: "active",
        },
        { onConflict: "user_id,course_id" },
      );
    }

    return {
      attemptId: attempt.id,
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
      .from("assignment_submissions")
      .upsert(
        {
          assignment_id: data.assignment_id,
          user_id: context.userId,
          submission_text: data.submission_text,
          file_url: data.file_url || null,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "assignment_id,user_id" },
      )
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: sub.id, message: "Assignment submitted successfully." };
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
      .from("assignment_submissions")
      .update({
        grade: data.grade,
        feedback: data.feedback,
        graded_by: context.userId,
        graded_at: new Date().toISOString(),
      })
      .eq("id", data.submission_id);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const verifyCertificateFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ cert_number: z.string().trim() }).parse(input))
  .handler(async ({ data }): Promise<CertificateInfo | null> => {
    // Public verification query using anonymous service client
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: cert, error } = await supabase
      .from("certificates")
      .select(
        "certificate_number, issue_date, status, profiles(display_name), courses(title, institutions(name))",
      )
      .eq("certificate_number", data.cert_number)
      .maybeSingle();

    if (error || !cert) return null;

    const studentName =
      (cert.profiles as { display_name?: string } | null)?.display_name || "Verified Scholar";
    const courseTitle = (cert.courses as { title?: string } | null)?.title || "Accredited Course";
    const instName =
      (
        (cert.courses as { institutions?: { name?: string } } | null)?.institutions as {
          name?: string;
        }
      )?.name || "CATECH Partner Institution";

    return {
      certificate_number: cert.certificate_number,
      student_name: studentName,
      course_title: courseTitle,
      institution_name: instName,
      issue_date: cert.issue_date,
      status: cert.status as "active" | "revoked",
    };
  });
