# ক্যাম্পেইন কোড যাচাই — Campaign Code Redemption Site

A demo site where a visitor enters their **name, mobile number, and a 10-digit
campaign code**. If the code exists in the database and hasn't been used yet,
it's marked as used and a Bangla confirmation SMS is sent to their number.

Stack: **Next.js 14** (App Router) → free hosting on **Vercel**
**Supabase** (free Postgres) → stores the 200 codes and redemption records
**Onecodesoft / OCS API** (or SMS Gateway BD / BulkSMSBD / SMS.to) → SMS
delivery (a **demo mode** with no SMS account is also built in)

---

## 1. Project structure

```
app/
  page.js              the form (name, phone, 10-digit code boxes)
  layout.js, globals.css
  api/redeem/route.js  server route: validates + claims the code + sends SMS
lib/
  supabaseClient.js     server-side Supabase client (service role key)
  sms.js                pluggable SMS sender (demo / onecodesoft / smsgatewaybd / bulksmsbd / smsto)
scripts/
  generate-codes.js     generates 200 unique 10-digit codes
supabase/
  schema.sql             run once to create the `codes` table
  seed.sql, codes.csv     sample 200 generated codes (regenerate anytime)
```

## 2. Set up the database (Supabase, free)

1. Create a free project at https://supabase.com.
2. Open **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, run it.
3. Generate your 200 codes locally:
   ```bash
   npm install
   npm run generate-codes
   ```
   This writes `supabase/seed.sql` (and a plain `supabase/codes.csv` you can
   print/hand out as vouchers). Paste `seed.sql`'s contents into the SQL
   Editor and run it to load the 200 codes.
4. From **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`
     (server-only — never expose this in the browser; this project only
     uses it inside the API route, which is correct)

## 3. Set up SMS (pick one)

**Option A — Demo mode (no account needed).** Set `SMS_PROVIDER=demo` in
`.env.local`. Messages aren't actually sent; they're printed in the
server/Vercel logs so you can demo the whole flow for free.

**Option B — Real Bangla SMS (this project defaults to this):**
- [Onecodesoft](https://onecodesoft.com) (Bulk SMS product, API at
  `sms.ocs-api.top`), [SMS Gateway BD](https://app.smsgatewaybd.com),
  [BulkSMSBD](https://bulksmsbd.net), or [SMS.to](https://sms.to) — sign up
  and get credentials from whichever you use, then set in `.env.local`:
  ```
  SMS_PROVIDER=onecodesoft
  ONECODESOFT_API_KEY=xxxx
  ONECODESOFT_SENDER_ID=xxxx   # required — an approved 11-digit Sender ID
  ```
  Both values come from your Onecodesoft dashboard → **Bulk SMS → API**.
  `ONECODESOFT_SENDER_ID` is **required** by their API (not optional like
  some other providers) — requests are rejected without an approved
  Sender ID.
  or
  ```
  SMS_PROVIDER=smsgatewaybd
  SMSGATEWAYBD_CLIENT_ID=xxxx
  SMSGATEWAYBD_API_KEY=xxxx
  SMSGATEWAYBD_SENDER_ID=xxxx   # optional — only needed for an approved masking/brand ID
  ```
  `SMSGATEWAYBD_CLIENT_ID` and `SMSGATEWAYBD_API_KEY` come from your
  [SMS Gateway BD](https://app.smsgatewaybd.com) dashboard's **API
  Documentation** page (`client_id` and `key`).
  or
  ```
  SMS_PROVIDER=bulksmsbd
  BULKSMSBD_API_KEY=xxxx
  BULKSMSBD_SENDER_ID=xxxx
  ```
  or
  ```
  SMS_PROVIDER=smsto
  SMSTO_API_KEY=xxxx
  ```
- Double-check the exact request params on your account's API docs page
  after signup — resellers sometimes tweak their param names — and adjust
  `lib/sms.js` if needed. The functions there are small and isolated on
  purpose. **Note on Onecodesoft specifically:** their own PHP code sample
  for single-SMS send sets the HTTP method to GET while still attaching a
  JSON body — that's not something a browser/Node request can actually do
  (GET can't carry a body), so `sendViaOnecodesoft()` sends it as POST
  instead, matching how their own Bulk SMS sample does the same thing. This
  worked in testing against the documented shape, but if your account
  rejects it, try their separate "Quick Send (GET)" endpoint instead, which
  passes everything as URL query parameters.

## 4. Run locally

```bash
cp .env.example .env.local   # fill in the values from steps 2 & 3
npm install
npm run dev
```
Open http://localhost:3000.

## 5. Deploy to Vercel (free)

1. Push this folder to a GitHub repo.
2. Go to https://vercel.com → **New Project** → import the repo.
3. In the Vercel project's **Settings → Environment Variables**, add the
   same variables from `.env.local`.
4. Deploy. Vercel builds and hosts it on a free `*.vercel.app` URL.

## How code redemption stays safe against double-use

The API route updates the row with `WHERE code = ? AND is_used = false` in a
single database call. Postgres only lets one concurrent request win that
update, so even if two people submit the same code at the exact same
moment, only one gets marked as used — no separate "check then update" race
condition.

## Customizing the Bangla SMS text

Edit `buildRedeemMessage()` in `lib/sms.js`.
