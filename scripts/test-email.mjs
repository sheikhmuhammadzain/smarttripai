import { Resend } from "resend";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Load .env.local manually ──────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

try {
  const envFile = readFileSync(envPath, "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed
      .slice(eqIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  console.error(
    "❌ Could not read .env.local — make sure it exists at project root.",
  );
  process.exit(1);
}

// ── Config ────────────────────────────────────────────────────────
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = "noreply@updates.smarttripai.site";
const TO_EMAIL = "zaingee320@gmail.com";

if (!RESEND_API_KEY) {
  console.error("❌ RESEND_API_KEY is not set in .env.local");
  process.exit(1);
}

// ── Send ──────────────────────────────────────────────────────────
const resend = new Resend(RESEND_API_KEY);

console.log("📧 Sending test email...");
console.log(`   From : ${RESEND_FROM_EMAIL}`);
console.log(`   To   : ${TO_EMAIL}`);
console.log();

const { data, error } = await resend.emails.send({
  from: RESEND_FROM_EMAIL,
  to: TO_EMAIL,
  subject: "✅ Smart Trip AI — Resend Test Email",
  html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f6f9;margin:0;padding:0;">
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
        <tr>
          <td style="padding:32px 32px 24px 32px;">
            <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:700;color:#1e293b;">
              🎉 Resend is working!
            </h1>
            <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.6;">
              This is a test email from <strong>Smart Trip AI</strong> to confirm that
              your Resend integration is correctly configured and delivering emails.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;background:#f8fafc;border-radius:8px;width:100%;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Test Details</p>
                  <p style="margin:0 0 4px 0;font-size:14px;color:#1e293b;">
                    <strong>From:</strong> ${RESEND_FROM_EMAIL}
                  </p>
                  <p style="margin:0 0 4px 0;font-size:14px;color:#1e293b;">
                    <strong>To:</strong> ${TO_EMAIL}
                  </p>
                  <p style="margin:0;font-size:14px;color:#1e293b;">
                    <strong>Sent at:</strong> ${new Date().toUTCString()}
                  </p>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
              ✅ Welcome emails, password reset links, and order confirmations are all ready to go.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              © ${new Date().getFullYear()} Smart Trip AI · This is an automated test email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
});

if (error) {
  console.error("❌ Failed to send email:");
  console.error(JSON.stringify(error, null, 2));
  process.exit(1);
}

console.log("✅ Email sent successfully!");
console.log(`   Message ID : ${data?.id}`);
