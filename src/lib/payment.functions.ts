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
  course_title?: string | undefined;
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
      .from("courses" as never)
      .select("id, institution_id, title, code, price, currency")
      .eq("id", data.course_id)
      .single();

    const courseRow = course as unknown as {
      id: string;
      institution_id: string;
      title: string;
      code: string;
      price: number | string;
      currency: string;
    } | null;

    if (courseErr || !courseRow) throw new Error("Course not found");
    const amount = Number(courseRow.price);
    if (amount <= 0) throw new Error("Free courses do not require payment.");

    // 2. Call Safaricom Daraja STK Push server module
    const { initiateStkPush } = await import("@/lib/mpesa.server");
    const stkResponse = await initiateStkPush({
      phoneNumber: data.phone_number,
      amount,
      accountReference: courseRow.code.slice(0, 12),
      transactionDesc: `Enrollment in ${courseRow.title.slice(0, 30)}`,
    });

    // 3. Persist pending transaction
    const { data: payment, error: payErr } = await context.supabase
      .from("payments" as never)
      .insert({
        institution_id: courseRow.institution_id,
        user_id: context.userId,
        course_id: courseRow.id,
        amount,
        currency: courseRow.currency || "KES",
        payment_method: "mpesa",
        status: "pending",
        checkout_request_id: stkResponse.CheckoutRequestID,
        merchant_request_id: stkResponse.MerchantRequestID,
        phone_number: data.phone_number,
      } as never)
      .select("id, checkout_request_id")
      .single();

    if (payErr) {
      console.error("Failed to persist payment:", payErr);
    }

    const paymentRecord = payment as { id?: string } | null;
    return {
      success: true,
      checkoutRequestId: stkResponse.CheckoutRequestID,
      customerMessage: stkResponse.CustomerMessage,
      paymentId: paymentRecord?.id,
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
      .from("payments" as never)
      .select("*")
      .eq("checkout_request_id", data.checkout_request_id)
      .maybeSingle();

    if (error || !payment) throw new Error("Payment record not found");
    const paymentRow = payment as unknown as Record<string, unknown>;
    if (paymentRow["status"] === "completed") {
      return { completed: true, message: "Payment already verified and course unlocked." };
    }

    // 2. Query Safaricom Daraja STK Query
    try {
      const { queryStkStatus } = await import("@/lib/mpesa.server");
      const queryResult = await queryStkStatus(data.checkout_request_id);

      if (queryResult.ResultCode === "0") {
        // Success: Update payment and create enrollment
        await context.supabase
          .from("payments" as never)
          .update({
            status: "completed",
            result_code: 0,
            result_desc: queryResult.ResultDesc,
            updated_at: new Date().toISOString(),
          } as never)
          .eq("id", paymentRow["id"] as string);

        if (paymentRow["course_id"]) {
          await context.supabase.from("enrollments" as never).upsert(
            {
              course_id: paymentRow["course_id"],
              user_id: paymentRow["user_id"],
              status: "active",
              payment_id: paymentRow["id"],
              enrolled_at: new Date().toISOString(),
            } as never,
            { onConflict: "course_id,user_id" },
          );
        }

        return { completed: true, message: "Payment confirmed! You are now enrolled." };
      } else if (queryResult.ResultCode === "1032") {
        await context.supabase
          .from("payments" as never)
          .update({ status: "cancelled", result_code: 1032, result_desc: queryResult.ResultDesc } as never)
          .eq("id", paymentRow["id"] as string);
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
      .from("payments" as never)
      .select(
        "id, course_id, amount, currency, payment_method, status, phone_number, mpesa_receipt_number, created_at, courses(title)",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const paymentRows = (payments || []) as unknown as Array<Record<string, unknown>>;
    return paymentRows.map((p) => ({
      id: p["id"] as string,
      course_id: (p["course_id"] as string) || null,
      amount: Number(p["amount"]),
      currency: p["currency"] as string,
      payment_method: p["payment_method"] as string,
      status: p["status"] as PaymentRecord["status"],
      phone_number: p["phone_number"] as string,
      mpesa_receipt_number: (p["mpesa_receipt_number"] as string) || null,
      created_at: p["created_at"] as string,
      course_title: ((p["courses"] as { title?: string } | null)?.title) || undefined,
    }));
  });
