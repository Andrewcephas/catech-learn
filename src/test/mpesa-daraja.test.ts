import { describe, it, expect } from "vitest";
import {
  normalizeMpesaPhoneNumber,
  getMpesaTimestamp,
  generateMpesaPassword,
} from "@/lib/mpesa.server";
import { readFileSync } from "node:fs";

const migration0003 = readFileSync(
  "drizzle/migrations/0003_complete_lms_payments_assessments.sql",
  "utf8",
);

describe("Safaricom Daraja M-Pesa Integration", () => {
  it("normalizes local 07... numbers to Kenyan international 2547... format", () => {
    expect(normalizeMpesaPhoneNumber("0712345678")).toBe("254712345678");
    expect(normalizeMpesaPhoneNumber("0798765432")).toBe("254798765432");
    expect(normalizeMpesaPhoneNumber("+254712345678")).toBe("254712345678");
    expect(normalizeMpesaPhoneNumber("254712345678")).toBe("254712345678");
  });

  it("rejects invalid or non-Kenyan mobile phone numbers", () => {
    expect(() => normalizeMpesaPhoneNumber("123456")).toThrow();
    expect(() => normalizeMpesaPhoneNumber("0612345678")).toThrow();
    expect(() => normalizeMpesaPhoneNumber("abcdefghijk")).toThrow();
  });

  it("generates a 14-character Daraja timestamp (YYYYMMDDHHmmss)", () => {
    const timestamp = getMpesaTimestamp();
    expect(timestamp).toHaveLength(14);
    expect(/^\d{14}$/.test(timestamp)).toBe(true);
  });

  it("generates a valid base64 encrypted password from Shortcode + Passkey + Timestamp", () => {
    const shortcode = "174379";
    const passkey = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
    const timestamp = "20261023120000";
    const password = generateMpesaPassword(shortcode, passkey, timestamp);

    expect(typeof password).toBe("string");
    // Verify base64 decoded matches the concatenation
    const decoded = Buffer.from(password, "base64").toString("utf8");
    expect(decoded).toBe(`${shortcode}${passkey}${timestamp}`);
  });

  it("ensures payments table schema enforces checkout_request_id and status constraints", () => {
    expect(migration0003).toContain("CREATE TABLE IF NOT EXISTS public.payments");
    expect(migration0003).toContain("checkout_request_id text UNIQUE");
    expect(migration0003).toContain("CHECK (payment_method IN ('mpesa', 'card', 'bank_transfer'))");
    expect(migration0003).toContain(
      "CHECK (status IN ('pending', 'completed', 'failed', 'cancelled'))",
    );
    expect(migration0003).toContain("ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY");
  });
});
