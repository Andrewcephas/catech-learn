import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface PaymentRecord {
  id: string;
  course_id: string | null;
  amount: number;
  currency: string;
  payment_method: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  phone_number: string;
  mpesa_receipt_number: string | null;
  created_at: string;
  course_title?: string;
}

const initiatePaymentSchema = z.object({
  course_id: z.string().uuid(),
  phone_number: z.string().trim().min(9, "Phone number required"),
});

export const initiateCoursePaymentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => initiatePaymentSchema.parse(input))
  .handler(async ({ data, context }) => {
    // 1. Fetch course details
    const { data: course, error: courseErr } = await context.supabase
      .from("courses")
      .select("id, institution_id, title, code, price, currency")
      .eq("id", data.course_id)
      .single();

    if (courseErr || !course) throw new Error("Course not found");
    const amount = Number(course.price);
    if (amount <= 0) throw new Error("Free courses do not require payment.");

    // 2. Call Safaricom Daraja STK Push server module
    const { initiateStkPush } = await import("@/lib/mpesa.server");
    const stkResponse = await initiateStkPush({
      phoneNumber: data.phone_number,
      amount,
      accountReference: course.code.slice(0, 12),
      transactionDesc: `Enrollment in ${course.title.slice(0, 30)}`,
    });

    // 3. Persist pending transaction
    const { data: payment, error: payErr } = await context.supabase
      .from("payments")
      .insert({
        institution_id: course.institution_id,
        user_id: context.userId,
        course_id: course.id,
        amount,
        currency: course.currency || "KES",
        payment_method: "mpesa",
        status: "pending",
        checkout_request_id: stkResponse.CheckoutRequestID,
        merchant_request_id: stkResponse.MerchantRequestID,
        phone_number: data.phone_number,
      })
      .select("id, checkout_request_id")
      .single();

    if (payErr) {
      console.error("Failed to persist payment:", payErr);
    }

    return {
      success: true,
      checkoutRequestId: stkResponse.CheckoutRequestID,
      customerMessage: stkResponse.CustomerMessage,
      paymentId: payment?.id,
    };
  });

export const verifyPaymentAndEnrollFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ checkout_request_id: z.string().trim().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // 1. Find payment record
    const { data: payment, error } = await context.supabase
      .from("payments")
      .select("*")
      .eq("checkout_request_id", data.checkout_request_id)
      .maybeSingle();

    if (error || !payment) throw new Error("Payment record not found");
    if (payment.status === "completed") {
      return { completed: true, message: "Payment already verified and course unlocked." };
    }

    // 2. Query Safaricom Daraja STK Query
    try {
      const { queryStkStatus } = await import("@/lib/mpesa.server");
      const queryResult = await queryStkStatus(data.checkout_request_id);

      if (queryResult.ResultCode === "0") {
        // Success: Update payment and create enrollment
        await context.supabase
          .from("payments")
          .update({
            status: "completed",
            result_code: 0,
            result_desc: queryResult.ResultDesc,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.id);

        if (payment.course_id) {
          await context.supabase.from("enrollments").upsert(
            {
              course_id: payment.course_id,
              user_id: payment.user_id,
              status: "active",
              payment_id: payment.id,
              enrolled_at: new Date().toISOString(),
            },
            { onConflict: "course_id,user_id" },
          );
        }

        return { completed: true, message: "Payment confirmed! You are now enrolled." };
      } else if (queryResult.ResultCode === "1032") {
        await context.supabase
          .from("payments")
          .update({ status: "cancelled", result_code: 1032, result_desc: queryResult.ResultDesc })
          .eq("id", payment.id);
        return {
          completed: false,
          status: "cancelled",
          message: "Transaction cancelled on phone.",
        };
      } else {
        return {
          completed: false,
          status: "pending",
          message: queryResult.ResultDesc || "Waiting for M-Pesa PIN entry on phone...",
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown payment verification error";
      return { completed: false, status: "pending", message: msg };
    }
  });

export const listUserPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PaymentRecord[]> => {
    const { data: payments, error } = await context.supabase
      .from("payments")
      .select(
        "id, course_id, amount, currency, payment_method, status, phone_number, mpesa_receipt_number, created_at, courses(title)",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return (payments || []).map((p) => ({
      id: p.id,
      course_id: p.course_id,
      amount: Number(p.amount),
      currency: p.currency,
      payment_method: p.payment_method,
      status: p.status as PaymentRecord["status"],
      phone_number: p.phone_number,
      mpesa_receipt_number: p.mpesa_receipt_number,
      created_at: p.created_at,
      course_title: (p.courses as { title?: string } | null)?.title,
    }));
  });
