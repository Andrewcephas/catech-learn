import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Smartphone, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { initiateCoursePaymentFn, verifyPaymentAndEnrollFn } from "@/lib/payment.functions";

interface MpesaPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: {
    id: string;
    title: string;
    code: string;
    price: number;
    currency: string;
  } | null;
  onSuccess?: () => void;
}

export function MpesaPaymentModal({
  open,
  onOpenChange,
  course,
  onSuccess,
}: MpesaPaymentModalProps) {
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"input" | "push_sent" | "completed" | "failed">("input");
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const queryClient = useQueryClient();

  // Reset state when modal reopens
  useEffect(() => {
    if (open) {
      setStep("input");
      setCheckoutRequestId(null);
      setStatusMessage("");
      setErrorMessage("");
    }
  }, [open]);

  // STK Push initiation mutation
  const initiateMutation = useMutation({
    mutationFn: () => {
      if (!course) throw new Error("No course selected");
      return initiateCoursePaymentFn({
        data: {
          course_id: course.id,
          phone_number: phone.trim(),
        },
      });
    },
    onSuccess: (res) => {
      setCheckoutRequestId(res.checkoutRequestId);
      setStatusMessage(
        res.customerMessage || "M-Pesa prompt sent. Check your phone and enter your MPesa PIN.",
      );
      setStep("push_sent");
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "STK Push failed to initiate.");
    },
  });

  // Verification poll
  const verifyMutation = useMutation({
    mutationFn: () => {
      if (!checkoutRequestId) throw new Error("No checkout request ID");
      return verifyPaymentAndEnrollFn({
        data: { checkout_request_id: checkoutRequestId },
      });
    },
    onSuccess: (res) => {
      if (res.completed) {
        setStep("completed");
        setStatusMessage(res.message);
        void queryClient.invalidateQueries({ queryKey: ["courses"] });
        void queryClient.invalidateQueries({ queryKey: ["payments"] });
        if (onSuccess) onSuccess();
      } else {
        setStatusMessage(res.message || "Verifying transaction with Safaricom...");
      }
    },
    onError: (err: Error) => {
      setStatusMessage(err.message);
    },
  });

  const verifyRef = useRef(verifyMutation.mutate);
  verifyRef.current = verifyMutation.mutate;

  // Polling loop when in push_sent state
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (step === "push_sent" && checkoutRequestId) {
      interval = setInterval(() => {
        verifyRef.current();
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, checkoutRequestId]);

  if (!course) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-600/10 p-2 text-emerald-600">
              <Smartphone className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle>Lipa na M-Pesa Online</DialogTitle>
              <DialogDescription>Safaricom Daraja Instant Checkout</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Course Summary */}
          <div className="rounded-lg border border-border bg-muted/40 p-3.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Enrollment Item</p>
            <h4 className="font-bold text-foreground text-sm mt-0.5">{course.title}</h4>
            <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
              <span className="text-xs text-muted-foreground">Amount to Pay:</span>
              <span className="text-base font-extrabold text-primary">
                {course.currency} {course.price.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Form Step */}
          {step === "input" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                initiateMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label
                  className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5"
                  htmlFor="mpesa-phone"
                >
                  M-Pesa Safaricom Phone Number *
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    id="mpesa-phone"
                    required
                    placeholder="07XXXXXXXX or 2547XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  You will receive an instant STK PIN prompt on this phone.
                </p>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-md bg-destructive/10 p-3 text-xs text-destructive font-medium flex items-center gap-2"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={initiateMutation.isPending || !phone}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {initiateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Sending Prompt…
                    </>
                  ) : (
                    "Initiate STK Push"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* STK Push Sent - Waiting for PIN */}
          {step === "push_sent" && (
            <div className="py-6 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>
              <h3 className="text-base font-bold text-foreground">Awaiting M-Pesa PIN</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">{statusMessage}</p>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => verifyMutation.mutate()}
                  disabled={verifyMutation.isPending}
                >
                  {verifyMutation.isPending ? "Verifying…" : "I Have Entered PIN — Verify Now"}
                </Button>
              </div>
            </div>
          )}

          {/* Completed State */}
          {step === "completed" && (
            <div className="py-6 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-foreground">Payment Confirmed!</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                {statusMessage || "Your course enrollment has been successfully activated."}
              </p>
              <DialogFooter className="pt-2">
                <Button
                  onClick={() => onOpenChange(false)}
                  className="w-full bg-primary text-primary-foreground"
                >
                  Start Learning Now
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
