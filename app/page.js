"use client";

import { useRef, useState } from "react";

const CODE_LENGTH = 10;

const COPY = {
  brandName: "Details Business Solution Campaign 2026",
  headerTag: "Code Redemption",

  heroHeadline: "Verify Your Campaign Code",
  heroSub:
    "Enter your name, mobile number, and your 10-digit code. If it's valid and unused, we'll send a confirmation SMS to your phone instantly.",

  steps: [
    {
      title: "Enter your details",
      desc: "Your name, mobile number, and campaign code.",
    },
    {
      title: "We verify it",
      desc: "Each code or mobile numbers can be used only once, ever.",
    },
    {
      title: "Get your SMS",
      desc: "A confirmation text will be sent to your number.",
    },
  ],

  ticketHeading: "Redeem your code",
  nameLabel: "Full name",
  namePlaceholder: "e.g. Himel Mahmud",
  phoneLabel: "Mobile number",
  phonePlaceholder: "e.g. 01518907160",
  codeLabel: "Campaign code",
  codeHint: "10 digits",
  submitLabel: "Verify code",
  submittingLabel: "Verifying...",

  footerNote:
    "Each code can be used only once. Contact the campaign helpline 01518907160 if you run into any issues.\n\nDeveloped by Himel Mahmud ♞",
  incompleteCodeTitle: "Code incomplete",
  incompleteCodeDetail: "Please enter the full 10-digit code.",
  verifyFailedTitle: "Verification failed",
  genericErrorDetail: "Something went wrong. Please try again.",
  acceptedTitle: "Code accepted",
  smsFailedDetail: "Your code was verified, but we couldn't send the SMS.",
  successTitle: "Congratulations!",
  successDetail: (phone) => `Your code has been verified. A confirmation SMS has been sent to ${phone}.`,
  connectionErrorTitle: "Couldn't reach the server",
  connectionErrorDetail: "Check your internet connection and try again.",
};

export default function Home() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
  const [status, setStatus] = useState(null); // { type: 'success'|'error', title, detail }
  const [loading, setLoading] = useState(false);
  const boxRefs = useRef([]);

  function setDigit(i, val) {
    const clean = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < CODE_LENGTH - 1) {
      boxRefs.current[i + 1]?.focus();
    }
  }

  function onKeyDown(i, e) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      boxRefs.current[i - 1]?.focus();
    }
  }

  function onPaste(e) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!text) return;
    e.preventDefault();
    const next = Array(CODE_LENGTH).fill("");
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    boxRefs.current[Math.min(text.length, CODE_LENGTH - 1)]?.focus();
  }

  async function onSubmit(e) {
    e.preventDefault();
    const code = digits.join("");
    setStatus(null);

    if (code.length !== CODE_LENGTH) {
      setStatus({ type: "error", title: COPY.incompleteCodeTitle, detail: COPY.incompleteCodeDetail });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, code }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setStatus({
          type: "error",
          title: COPY.verifyFailedTitle,
          detail: data.error || COPY.genericErrorDetail,
        });
      } else if (data.smsSent === false) {
        setStatus({
          type: "success",
          title: COPY.acceptedTitle,
          detail: data.warning || COPY.smsFailedDetail,
        });
      } else {
        setStatus({
          type: "success",
          title: COPY.successTitle,
          detail: COPY.successDetail(phone),
        });
        setDigits(Array(CODE_LENGTH).fill(""));
        boxRefs.current[0]?.focus();
      }
    } catch (err) {
      setStatus({ type: "error", title: COPY.connectionErrorTitle, detail: COPY.connectionErrorDetail });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">DBS</span>
          {COPY.brandName}
        </div>
        <span className="header-tag">{COPY.headerTag}</span>
      </header>

      <section className="hero">
        <h1 className="headline">{COPY.heroHeadline}</h1>
        <p className="sub">{COPY.heroSub}</p>
      </section>

      <div className="steps">
        {COPY.steps.map((s, i) => (
          <div className="step" key={s.title}>
            <span className="step-num">{String(i + 1).padStart(2, "0")}</span>
            <p className="step-title">{s.title}</p>
            <p className="step-desc">{s.desc}</p>
          </div>
        ))}
      </div>

      <main className="wrap">
        <form className="ticket" onSubmit={onSubmit}>
          <div className="ticket-top">
            <p className="ticket-heading">{COPY.ticketHeading}</p>

            <div className="field">
              <label htmlFor="name">{COPY.nameLabel}</label>
              <input
                id="name"
                type="text"
                placeholder={COPY.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="field" style={{ marginBottom: 22 }}>
              <label htmlFor="phone">{COPY.phoneLabel}</label>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                placeholder={COPY.phonePlaceholder}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="code-label-row">
              <label style={{ marginBottom: 0 }}>{COPY.codeLabel}</label>
              <span className="code-hint">{COPY.codeHint}</span>
            </div>
            <div className="code-boxes" onPaste={onPaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => (boxRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => onKeyDown(i, e)}
                  aria-label={`Code digit ${i + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="ticket-notch" aria-hidden="true" />
          <div className="ticket-perf" aria-hidden="true" />

          <div className="ticket-bottom">
            <button className="submit" type="submit" disabled={loading}>
              {loading ? COPY.submittingLabel : COPY.submitLabel}
            </button>

            {status && (
              <div className={`status ${status.type}`} role="status">
                <span className="stamp">{status.type === "success" ? "✓ Result" : "✕ Error"}</span>
                <strong>{status.title}</strong>
                <div>{status.detail}</div>
              </div>
            )}
          </div>
        </form>

        <footer className="note">{COPY.footerNote}</footer>
      </main>
    </>
  );
}
