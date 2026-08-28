export function normalizeBdPhone(input) {
  const digits = String(input).replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return "88" + digits;
  if (digits.length === 10) return "880" + digits;
  return digits;
}

export function buildRedeemMessage({ name }) {
  // Bangla confirmation message
  return `(DEMO) প্রিয় ${name}, আপনার ক্যাম্পেইন কোডটি সফলভাবে যাচাই করা হয়েছে। আমাদের ক্যাম্পেইনে অংশগ্রহণ করার জন্য ধন্যবাদ ।`;
}

export async function sendSms(phone, message) {
  const provider = process.env.SMS_PROVIDER;
  const to = normalizeBdPhone(phone);

  if (provider === "onecodesoft") return sendViaOnecodesoft(to, message);
  if (provider === "bulksmsbd") return sendViaBulkSmsBd(to, message);
  if (provider === "smsto") return sendViaSmsTo(to, message);
  if (provider === "smsgatewaybd") return sendViaSmsGatewayBd(to, message);

  console.log(`[DEMO SMS] to=${to} message="${message}"`);
  return { ok: true, provider: "demo" };
}
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
  if (!res.ok || data.response_code !== 200) {
    throw new Error(`smsgatewaybd error: ${JSON.stringify(data)}`);
  }
  return { ok: true, provider: "smsgatewaybd", raw: data };
}
