import { Resend } from "resend";
import { getServerEnv } from "@/lib/env/server";

function getResendClient(): Resend {
  const env = getServerEnv();
  if (!env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY is not configured in environment variables.",
    );
  }
  return new Resend(env.RESEND_API_KEY);
}

const SITE_URL = "https://smarttripai.site";

function getFromEmail(): string {
  const env = getServerEnv();
  return env.RESEND_FROM_EMAIL ?? "noreply@smarttripai.site";
}

// ─── Password Reset ──────────────────────────────────────────────

export async function sendPasswordResetEmail(opts: {
  to: string;
  name?: string;
  resetUrl: string;
}): Promise<void> {
  const resend = getResendClient();
  await resend.emails.send({
    from: getFromEmail(),
    to: opts.to,
    subject: "Reset your Smart Trip AI password",
    html: buildPasswordResetHtml(opts),
  });
}

// ─── Welcome ─────────────────────────────────────────────────────

export async function sendWelcomeEmail(opts: {
  to: string;
  name?: string;
}): Promise<void> {
  const resend = getResendClient();
  await resend.emails.send({
    from: getFromEmail(),
    to: opts.to,
    subject: "Welcome to Smart Trip AI 🌍",
    html: buildWelcomeHtml(opts),
  });
}

// ─── Order Confirmation ──────────────────────────────────────────

export async function sendOrderConfirmationEmail(opts: {
  to: string;
  name: string;
  orderCode: string;
  items: Array<{ title: string; quantity: number; lineTotal: number }>;
  total: number;
  currency: string;
}): Promise<void> {
  const resend = getResendClient();
  await resend.emails.send({
    from: getFromEmail(),
    to: opts.to,
    subject: `Booking Confirmed – ${opts.orderCode} ✈️`,
    html: buildOrderConfirmationHtml(opts),
  });
}

// ─── HTML Templates ──────────────────────────────────────────────

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f4f6f9;
  margin: 0;
  padding: 0;
`;

function wrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${baseStyle}">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);padding:28px 32px;text-align:center;">
            <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">✈️ Smart Trip AI</span>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:32px 32px 24px 32px;">${content}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Smart Trip AI · You received this because you have an account with us.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildPasswordResetHtml(opts: {
  name?: string;
  resetUrl: string;
}): string {
  const name = opts.name ?? "Traveler";
  return wrapper(`
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#1e293b;">Reset your password</h1>
    <p style="margin:0 0 24px 0;font-size:15px;color:#475569;">Hi ${name},</p>
    <p style="margin:0 0 24px 0;font-size:15px;color:#475569;line-height:1.6;">
      We received a request to reset the password for your Smart Trip AI account.
      Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
      <tr>
        <td style="background:#2563eb;border-radius:8px;padding:12px 28px;">
          <a href="${opts.resetUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">
            Reset Password →
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px 0;font-size:13px;color:#94a3b8;">If the button doesn't work, copy and paste this link:</p>
    <p style="margin:0 0 24px 0;font-size:12px;color:#2563eb;word-break:break-all;">${opts.resetUrl}</p>
    <p style="margin:0;font-size:13px;color:#94a3b8;">If you didn't request a password reset, you can safely ignore this email.</p>
  `);
}

function buildWelcomeHtml(opts: { name?: string }): string {
  const name = opts.name ?? "Traveler";
  return wrapper(`
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#1e293b;">Welcome aboard, ${name}! 🎉</h1>
    <p style="margin:0 0 24px 0;font-size:15px;color:#475569;line-height:1.6;">
      Your Smart Trip AI account is ready. Start exploring AI-powered itineraries, discover top attractions,
      and plan unforgettable trips.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
      <tr>
        <td style="background:#2563eb;border-radius:8px;padding:12px 28px;">
          <a href="${SITE_URL}/dashboard" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">
            Go to Dashboard →
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
      🗺️ <strong>Explore attractions</strong> – Find the best experiences worldwide<br>
      🤖 <strong>AI Planner</strong> – Generate personalised itineraries in seconds<br>
      🛒 <strong>Easy booking</strong> – Reserve activities with one click
    </p>
  `);
}

function buildOrderConfirmationHtml(opts: {
  name: string;
  orderCode: string;
  items: Array<{ title: string; quantity: number; lineTotal: number }>;
  total: number;
  currency: string;
}): string {
  const rows = opts.items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 0;font-size:14px;color:#1e293b;border-bottom:1px solid #f1f5f9;">${item.title}</td>
      <td style="padding:10px 0;font-size:14px;color:#475569;text-align:center;border-bottom:1px solid #f1f5f9;">×${item.quantity}</td>
      <td style="padding:10px 0;font-size:14px;color:#1e293b;text-align:right;font-weight:600;border-bottom:1px solid #f1f5f9;">
        ${opts.currency} ${item.lineTotal.toFixed(2)}
      </td>
    </tr>`,
    )
    .join("");

  return wrapper(`
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#1e293b;">Booking Confirmed! ✅</h1>
    <p style="margin:0 0 4px 0;font-size:15px;color:#475569;">Hi ${opts.name},</p>
    <p style="margin:0 0 24px 0;font-size:15px;color:#475569;line-height:1.6;">
      Your booking <strong>${opts.orderCode}</strong> has been confirmed. Here's your summary:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
      <thead>
        <tr>
          <th style="text-align:left;font-size:12px;color:#94a3b8;padding-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Activity</th>
          <th style="text-align:center;font-size:12px;color:#94a3b8;padding-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Qty</th>
          <th style="text-align:right;font-size:12px;color:#94a3b8;padding-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Price</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding-top:12px;font-size:15px;font-weight:700;color:#1e293b;">Total</td>
          <td style="padding-top:12px;font-size:15px;font-weight:700;color:#2563eb;text-align:right;">
            ${opts.currency} ${opts.total.toFixed(2)}
          </td>
        </tr>
      </tfoot>
    </table>
    <p style="margin:0;font-size:13px;color:#94a3b8;">
      Questions? Reply to this email or visit our <a href="${SITE_URL}/help" style="color:#2563eb;">Help Centre</a>.
    </p>
  `);
}
