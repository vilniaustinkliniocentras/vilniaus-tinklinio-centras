import { Resend } from "resend";
import { siteConfig } from "@/lib/constants";
import { formatTrainingGroupDisplay, formatTrainingGroupScheduleDisplay } from "@/lib/constants/training-groups";
import type { RegistrationFormData } from "@/lib/validation/registration";

const FROM_EMAIL =
  "Vilniaus tinklinio centras <registracija@vilniaustinkliniocentras.lt>";
const ADMIN_EMAIL = "vilniaustinkliniocentras@gmail.com";

export interface RegistrationEmailPayload extends RegistrationFormData {
  preferredTrainingTimes: string | null;
}

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not configured.");
    return null;
  }

  return new Resend(apiKey);
}

function formatBirthDate(date: string): string {
  return new Date(date).toLocaleDateString("lt-LT");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function emailLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="lt">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vilniaus tinklinio centras</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f8f9fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8f9fb;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e7ec;">
            <tr>
              <td style="background-color:#1f2f86;padding:20px 24px;">
                <p style="margin:0;font-size:18px;line-height:1.4;font-weight:700;color:#ffffff;">Vilniaus tinklinio centras</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;font-size:16px;line-height:1.6;color:#374151;">
                ${content}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildConfirmationEmailHtml(): string {
  const content = `
    <p style="margin:0 0 16px;">Sveiki,</p>
    <p style="margin:0 0 16px;">Dėkojame, kad užregistravote vaiką į Vilniaus tinklinio centrą.</p>
    <p style="margin:0 0 16px;">Jūsų registracija sėkmingai gauta.</p>
    <p style="margin:0 0 16px;">Per artimiausias 24 valandas su Jumis susisieks treneris arba administracija dėl pirmosios treniruotės.</p>
    <p style="margin:0 0 16px;">Pirmoji treniruotė – nemokama ir be ilgalaikių įsipareigojimų.</p>
    <p style="margin:0 0 8px;font-weight:700;color:#1f2f86;">Treniruočių vieta:</p>
    <p style="margin:0 0 16px;">${escapeHtml(siteConfig.contact.venue)}<br />${escapeHtml(siteConfig.contact.address)}</p>
    <p style="margin:0 0 8px;font-weight:700;color:#1f2f86;">Jeigu turite klausimų:</p>
    <p style="margin:0 0 16px;">
      <a href="${siteConfig.contact.phoneLink}" style="color:#1f2f86;text-decoration:none;">${escapeHtml(siteConfig.contact.phone)}</a><br />
      <a href="mailto:${siteConfig.contact.email}" style="color:#1f2f86;text-decoration:none;">${escapeHtml(siteConfig.contact.email)}</a>
    </p>
    <p style="margin:0 0 16px;">Iki susitikimo treniruotėje!</p>
    <p style="margin:0;font-weight:700;color:#1f2f86;">Vilniaus tinklinio centras</p>
  `;

  return emailLayout(content);
}

function buildAdminEmailHtml(payload: RegistrationEmailPayload): string {
  const scheduleDisplay = payload.preferredTrainingTimes
    ? formatTrainingGroupScheduleDisplay(payload.preferredTrainingTimes)
    : "—";

  const rows = [
    ["Vaiko vardas ir pavardė", payload.childName.trim()],
    ["Vaiko gimimo data", formatBirthDate(payload.childBirthDate)],
    ["Tėvo / globėjo vardas ir pavardė", payload.parentName.trim()],
    ["El. paštas", payload.email.trim().toLowerCase()],
    ["Telefonas", payload.phone.replace(/\s/g, "")],
    ["Tinklinio patirtis", payload.experience],
    ["Pasirinkta treniruočių grupė", formatTrainingGroupDisplay(payload.trainingGroup)],
    ["Treniruočių laikas", scheduleDisplay],
    ["Kaip apie mus sužinojo", payload.referralSource],
    ["Papildoma informacija", payload.comments.trim() || "—"],
  ];

  const tableRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e4e7ec;font-weight:700;color:#1f2f86;vertical-align:top;width:38%;">${escapeHtml(label)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e4e7ec;color:#374151;vertical-align:top;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");

  const content = `
    <p style="margin:0 0 16px;">Gauta nauja registracija per svetainės formą.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e4e7ec;border-radius:8px;overflow:hidden;font-size:15px;">
      ${tableRows}
    </table>
  `;

  return emailLayout(content);
}

async function sendEmail(
  resend: Resend,
  options: {
    to: string | string[];
    subject: string;
    html: string;
  }
): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendRegistrationEmails(
  payload: RegistrationEmailPayload
): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    return;
  }

  const parentEmail = payload.email.trim().toLowerCase();
  const childName = payload.childName.trim();

  const results = await Promise.allSettled([
    sendEmail(resend, {
      to: parentEmail,
      subject: "Registracija gauta – Vilniaus tinklinio centras",
      html: buildConfirmationEmailHtml(),
    }),
    sendEmail(resend, {
      to: ADMIN_EMAIL,
      subject: `Nauja registracija – ${childName}`,
      html: buildAdminEmailHtml(payload),
    }),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Registration email failed:", result.reason);
    }
  }
}
