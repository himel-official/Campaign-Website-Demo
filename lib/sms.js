/**
 * Pluggable SMS sender.
 *
 * SMS_PROVIDER=demo          -> just logs the message (no SMS credit needed, good for a free demo)
 * SMS_PROVIDER=onecodesoft   -> sends via Onecodesoft / OCS API (sms.ocs-api.top)
 * SMS_PROVIDER=bulksmsbd     -> sends via bulksmsbd.net
 * SMS_PROVIDER=smsto         -> sends via sms.to
 * SMS_PROVIDER=smsgatewaybd  -> sends via app.smsgatewaybd.com
 *
 * Every BD SMS reseller's exact query/body params drift over time, so
 * double check them against your own account's API page after you sign up
 * and adjust the sendVia* functions below if needed — the shape here
 * matches each provider's documented pattern at the time of writing.
 */

// Normalizes a Bangladeshi number to the 8801XXXXXXXXX format most
// gateways expect (11-digit local 01XXXXXXXXX -> 8801XXXXXXXXX).
export function normalizeBdPhone(input) {
  const digits = String(input).replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return "88" + digits;
  if (digits.length === 10) return "880" + digits;
  return digits;
}

export function buildRedeemMessage({ name }) {
  // Bangla confirmation message
  return `প্রিয় ${name}, আপনার ক্যাম্পেইন কোডটি সফলভাবে যাচাই করা হয়েছে। ধন্যবাদ আমাদের ক্যাম্পেইনে অংশগ্রহণ করার জন্য।`;
}

export async function sendSms(phone, message) {
  const provider = process.env.SMS_PROVIDER || "demo";
  const to = normalizeBdPhone(phone);

  if (provider === "onecodesoft") return sendViaOnecodesoft(to, message);
  if (provider === "bulksmsbd") return sendViaBulkSmsBd(to, message);
  if (provider === "smsto") return sendViaSmsTo(to, message);
  if (provider === "smsgatewaybd") return sendViaSmsGatewayBd(to, message);

  // demo fallback — no external call, no cost, no account needed
  console.log(`[DEMO SMS] to=${to} message="${message}"`);
  return { ok: true, provider: "demo" };
}

// Per Onecodesoft's own "API Integration" page (Bulk SMS > API), Send SMS
// (single) endpoint. Required params per their "Request Parameters" table:
// api_key and senderid (an APPROVED 11-digit Sender ID — this one is
// mandatory here, unlike some other providers where it's optional).
//
// Note: their own PHP code sample sets CURLOPT_CUSTOMREQUEST to 'GET' while
// still sending a JSON body via CURLOPT_POSTFIELDS — that combination isn't
// something a browser/Node fetch() can do (GET requests can't carry a
// body), and their Bulk SMS sample immediately below it correctly uses
// POST for the same body-based JSON pattern. Treating that GET as a
// docs/snippet inconsistency, this sends the same request as POST — verify
// this works for your account and switch back to their literal GET if you
// find it matters (e.g. by hitting /send-sms with query params like their
// separate "Quick Send (GET)" example instead).
async function sendViaOnecodesoft(to, message) {
  const apiKey = process.env.ONECODESOFT_API_KEY;
  const senderId = process.env.ONECODESOFT_SENDER_ID;
  if (!apiKey || !senderId) {
    throw new Error("Missing ONECODESOFT_API_KEY / ONECODESOFT_SENDER_ID env vars.");
  }

  const res = await fetch("https://sms.ocs-api.top/api/send-sms", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      senderid: senderId,
      number: to,
      message,
    }),
  });

  const data = await res.json().catch(() => ({}));
  // Their docs don't show a response sample for this specific endpoint, but
  // the "Response Codes" list on the same page documents 202 = Success
  // (submitted) and 1007 = Low Balance (failed) — other/unexpected codes
  // are treated as failures too. We also fall back to plain HTTP status if
  // no response_code-ish field is present, so a genuinely 200 OK response
  // in an unrecognized shape doesn't get thrown away.
  const code = data.response_code ?? data.ErrorCode ?? data.code;
  const looksSuccessful = code === undefined ? res.ok : code === 202 || code === 0;
  if (!res.ok || !looksSuccessful) {
    throw new Error(`Onecodesoft error: ${JSON.stringify(data)}`);
  }
  return { ok: true, provider: "onecodesoft", raw: data };
}

async function sendViaBulkSmsBd(to, message) {
  const apiKey = process.env.BULKSMSBD_API_KEY;
  const senderId = process.env.BULKSMSBD_SENDER_ID;
  if (!apiKey || !senderId) {
    throw new Error("Missing BULKSMSBD_API_KEY / BULKSMSBD_SENDER_ID env vars.");
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    type: "text",
    number: to,
    senderid: senderId,
    message,
  });

  const res = await fetch(`http://bulksmsbd.net/api/smsapi?${params.toString()}`);
  const text = await res.text();
  if (!res.ok) throw new Error(`BulkSMSBD error: ${text}`);
  return { ok: true, provider: "bulksmsbd", raw: text };
}

async function sendViaSmsTo(to, message) {
  const apiKey = process.env.SMSTO_API_KEY;
  const senderId = process.env.SMSTO_SENDER_ID || "SMS.to";
  if (!apiKey) throw new Error("Missing SMSTO_API_KEY env var.");

  const res = await fetch("https://api.sms.to/sms/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, message, sender_id: senderId }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`SMS.to error: ${JSON.stringify(data)}`);
  return { ok: true, provider: "smsto", raw: data };
}

// Per app.smsgatewaybd.com's own API Documentation page (POST
// /send-message, JSON body: client_id, key, sender_id, recipient,
// message). sender_id is optional there — only required if you want your
// approved masking/brand name on the message.
async function sendViaSmsGatewayBd(to, message) {
  const clientId = process.env.SMSGATEWAYBD_CLIENT_ID;
  const apiKey = process.env.SMSGATEWAYBD_API_KEY;
  const senderId = process.env.SMSGATEWAYBD_SENDER_ID; // optional

  if (!clientId || !apiKey) {
    throw new Error("Missing SMSGATEWAYBD_CLIENT_ID / SMSGATEWAYBD_API_KEY env vars.");
  }

  const body = {
    client_id: clientId,
    key: apiKey,
    recipient: to,
    message,
  };
  if (senderId) body.sender_id = senderId;

  const res = await fetch("https://app.smsgatewaybd.com/api/send-message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  // Their docs use response_code 200 for success even on a 200 HTTP status,
  // and distinct codes (1001 invalid recipient, 2001 client not found,
  // 2002 inactive account, 2003 insufficient balance, 3002 bad API key,
  // 4001 no active gateway) for failures.
  if (!res.ok || data.response_code !== 200) {
    throw new Error(`smsgatewaybd error: ${JSON.stringify(data)}`);
  }
  return { ok: true, provider: "smsgatewaybd", raw: data };
}
