import nodemailer from "nodemailer";
import type { SmtpConfig } from "@/lib/settings/types";

export type SendMailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

export async function sendMailWithSmtp(
  smtp: SmtpConfig,
  input: SendMailInput,
): Promise<{ ok: true; messageId?: string } | { ok: false; error: string }> {
  if (!smtp.enabled) {
    return { ok: false, error: "SMTP is disabled in settings." };
  }
  if (!smtp.host?.trim()) {
    return { ok: false, error: "SMTP host is not configured." };
  }
  if (!smtp.fromEmail?.trim()) {
    return { ok: false, error: "From email is not configured." };
  }
  const to = Array.isArray(input.to) ? input.to.filter(Boolean) : [input.to].filter(Boolean);
  if (to.length === 0) {
    return { ok: false, error: "No recipients." };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host.trim(),
      port: smtp.port || 587,
      secure: Boolean(smtp.secure),
      auth:
        smtp.user?.trim()
          ? { user: smtp.user.trim(), pass: smtp.password || "" }
          : undefined,
    });

    const info = await transporter.sendMail({
      from: smtp.fromName?.trim()
        ? `"${smtp.fromName.replace(/"/g, "")}" <${smtp.fromEmail.trim()}>`
        : smtp.fromEmail.trim(),
      replyTo: smtp.replyTo?.trim() || undefined,
      to: to.join(", "),
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    return { ok: true, messageId: info.messageId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
