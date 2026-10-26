// Safaricom Daraja M-Pesa Service (Sandbox & Production)
// Provides OAuth authentication, STK Push initiation, and transaction status querying.

interface MpesaAuthResponse {
  access_token: string;
  expires_in: string;
}

interface StkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

interface StkQueryResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;
  ResultDesc: string;
}

function getDarajaBaseUrl(): string {
  const env = process.env["MPESA_ENVIRONMENT"] || "sandbox";
  return env === "live" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
}

/**
 * Obtain OAuth bearer token from Safaricom Daraja API
 */
export async function getMpesaAccessToken(): Promise<string> {
  const consumerKey = process.env["MPESA_CONSUMER_KEY"];
  const consumerSecret = process.env["MPESA_CONSUMER_SECRET"];

  if (!consumerKey || !consumerSecret) {
    throw new Error(
      "M-Pesa credentials missing. Ensure MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET are configured.",
    );
  }

  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const url = `${getDarajaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to authenticate with M-Pesa Daraja API: ${response.status} - ${errorText}`,
    );
  }

  const data = (await response.json()) as MpesaAuthResponse;
  return data.access_token;
}

/**
 * Format timestamp as YYYYMMDDHHmmss required by Daraja
 */
export function getMpesaTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Generate password = Base64(BusinessShortCode + Passkey + Timestamp)
 */
export function generateMpesaPassword(
  shortcode: string,
  passkey: string,
  timestamp: string,
): string {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

/**
 * Standardize phone number into 254XXXXXXXXX format
 */
export function normalizeMpesaPhoneNumber(rawPhone: string): string {
  let cleaned = rawPhone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "254" + cleaned.slice(1);
  } else if (cleaned.startsWith("+254")) {
    cleaned = cleaned.slice(1);
  } else if (!cleaned.startsWith("254") && cleaned.length === 9) {
    cleaned = "254" + cleaned;
  }

  if (!/^254[17]\d{8}$/.test(cleaned)) {
    throw new Error(
      `Invalid Kenyan Safaricom phone number: ${rawPhone}. Expected format 2547XXXXXXXX or 07XXXXXXXX.`,
    );
  }

  return cleaned;
}

/**
 * Initiate Lipa Na M-Pesa Online (STK Push)
 */
export async function initiateStkPush(params: {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}): Promise<StkPushResponse> {
  const shortcode = process.env["MPESA_BUSINESS_SHORTCODE"] || "174379";
  const passkey = process.env["MPESA_PASSKEY"];
  const callbackUrl =
    process.env["MPESA_CALLBACK_URL"] || "https://learn.catech.co.ke/api/payments/mpesa/callback";

  if (!passkey) {
    throw new Error("MPESA_PASSKEY is not configured in server environment.");
  }

  const token = await getMpesaAccessToken();
  const timestamp = getMpesaTimestamp();
  const password = generateMpesaPassword(shortcode, passkey, timestamp);
  const formattedPhone = normalizeMpesaPhoneNumber(params.phoneNumber);

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.ceil(params.amount),
    PartyA: formattedPhone,
    PartyB: shortcode,
    PhoneNumber: formattedPhone,
    CallBackURL: callbackUrl,
    AccountReference: params.accountReference.slice(0, 12),
    TransactionDesc: params.transactionDesc.slice(0, 100),
  };

  const response = await fetch(`${getDarajaBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || (data as StkPushResponse).ResponseCode !== "0") {
    throw new Error(
      (data as StkPushResponse).ResponseDescription ||
        (data as { errorMessage?: string }).errorMessage ||
        "STK Push request rejected by Safaricom",
    );
  }

  return data as StkPushResponse;
}

/**
 * Query status of an existing STK Push transaction
 */
export async function queryStkStatus(checkoutRequestId: string): Promise<StkQueryResponse> {
  const shortcode = process.env["MPESA_BUSINESS_SHORTCODE"] || "174379";
  const passkey = process.env["MPESA_PASSKEY"];

  if (!passkey) {
    throw new Error("MPESA_PASSKEY is not configured in server environment.");
  }

  const token = await getMpesaAccessToken();
  const timestamp = getMpesaTimestamp();
  const password = generateMpesaPassword(shortcode, passkey, timestamp);

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  };

  const response = await fetch(`${getDarajaBaseUrl()}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  return data as StkQueryResponse;
}
