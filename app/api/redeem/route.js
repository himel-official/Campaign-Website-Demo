import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseClient";
import { sendSms, buildRedeemMessage } from "../../../lib/sms";

const PHONE_RE = /^(?:\+?880|0)1[3-9]\d{8}$/; // Bangladeshi mobile numbers
const CODE_RE = /^\d{10}$/;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  const code = String(body.code || "").trim();

  if (!name) {
    return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });
  }
  if (!PHONE_RE.test(phone)) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid Bangladeshi mobile number (e.g. 01XXXXXXXXX)" },
      { status: 400 }
    );
  }
  if (!CODE_RE.test(code)) {
    return NextResponse.json(
      { ok: false, error: "The code must be exactly 10 digits" },
      { status: 400 }
    );
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    console.error("Supabase config error:", err);
    return NextResponse.json(
      { ok: false, error: "Server is misconfigured, please contact the campaign team" },
      { status: 500 }
    );
  }

  // Atomically claim the code: only succeeds if a row with this code
  // exists AND is_used is still false. This update+filter is atomic at
  // the database level, so two people racing on the same code can't
  // both "win" it.
  const { data, error } = await supabase
    .from("codes")
    .update({
      is_used: true,
      used_by_name: name,
      used_by_phone: phone,
    })
    .eq("code", code)
    .eq("is_used", false)
    .select()
    .maybeSingle();

  if (error) {
    // Postgres unique_violation — this phone number already redeemed a
    // different code (used_by_phone has a UNIQUE constraint in the DB).
    if (error.code === "23505") {
      return NextResponse.json(
        { ok: false, error: "This mobile number has already been used to redeem a code" },
        { status: 409 }
      );
    }
    console.error("Supabase error:", error);
    return NextResponse.json({ ok: false, error: "Server error, please try again later" }, { status: 500 });
  }

  if (!data) {
    // Either the code doesn't exist, or it was already used.
    return NextResponse.json(
      { ok: false, error: "This code is invalid or has already been used" },
      { status: 409 }
    );
  }

  try {
    const message = buildRedeemMessage({ name });
    await sendSms(phone, message);
  } catch (smsErr) {
    // The code is already marked used in the DB at this point. We don't
    // roll that back — the redemption itself succeeded — but we surface
    // the SMS failure so you notice it (e.g. in Vercel logs / the response).
    console.error("SMS send failed:", smsErr);
    return NextResponse.json(
      {
        ok: true,
        smsSent: false,
        warning: "Your code was verified, but we couldn't send the SMS",
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ ok: true, smsSent: true });
}
