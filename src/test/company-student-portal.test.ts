import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const migration0005 = readFileSync(
  "drizzle/migrations/0005_company_student_portal_enhancements.sql",
  "utf8",
);

describe("Company & Student Multi-Tenant Portal Architecture", () => {
  it("enforces direct 1-on-1 messaging table with owner and recipient RLS", () => {
    expect(migration0005).toContain("CREATE TABLE IF NOT EXISTS public.direct_messages");
    expect(migration0005).toContain("ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY");
    expect(migration0005).toContain("sender_id = auth.uid() OR recipient_id = auth.uid()");
    expect(migration0005).toContain("recipient_id uuid NOT NULL REFERENCES public.profiles(id)");
  });

  it("enforces public institution discovery policy for students", () => {
    expect(migration0005).toContain("Active institutions public discovery");
    expect(migration0005).toContain("status = 'active'");
  });

  it("enforces structured lesson notes table for study materials and module resources", () => {
    expect(migration0005).toContain("CREATE TABLE IF NOT EXISTS public.lesson_notes");
    expect(migration0005).toContain("ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY");
    expect(migration0005).toContain("lesson_id uuid NOT NULL REFERENCES public.lessons(id)");
  });
});
