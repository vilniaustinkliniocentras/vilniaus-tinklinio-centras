import { Resend } from "resend";
import { siteConfig } from "@/lib/constants";
import { SIGNED_CONTRACT_UPLOAD_TOKEN_TTL_DAYS } from "@/lib/storage/signed-contract-upload-token";

const FROM_EMAIL =
  "Vilniaus tinklinio centras <registracija@vilniaustinkliniocentras.lt>";
const REPLY_TO_EMAIL = "vilniaustinkliniocentras@gmail.com";

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not configured.");
    return null;
  }

  return new Resend(apiKey);
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

function buildContractEmailHtml(
  parentName: string,
  childName: string,
  uploadUrl: string
): string {
  const content = `
    <p style="margin:0 0 16px;">Sveiki, ${escapeHtml(parentName)},</p>
    <p style="margin:0 0 16px;">džiaugiamės, kad ${escapeHtml(childName)} prisijungia prie Vilniaus tinklinio centro treniruočių.</p>
    <p style="margin:0 0 16px;">Prie šio laiško pridedame užpildytą tinklinio treniruočių sutartį.</p>
    <p style="margin:0 0 8px;font-weight:700;color:#1f2f86;">Prašome:</p>
    <ol style="margin:0 0 16px;padding-left:20px;">
      <li style="margin-bottom:8px;">Patikrinti, ar sutartyje nurodyti duomenys yra teisingi.</li>
      <li style="margin-bottom:8px;">Pasirinkti sutartyje esančius sutikimus „Sutinku“ arba „Nesutinku“, jei tai reikalinga prieš pasirašymą.</li>
      <li style="margin-bottom:8px;">Sutartį pasirašyti kvalifikuotu elektroniniu parašu.</li>
      <li style="margin-bottom:8px;">Pasirašymui galite naudoti jums patogią elektroninio pasirašymo platformą.</li>
      <li style="margin-bottom:8px;">Pasirašytą PDF failą įkelti paspaudę žemiau esančią nuorodą.</li>
    </ol>
    <p style="margin:0 0 12px;font-weight:700;color:#1f2f86;">Pasirašytos sutarties įkėlimas</p>
    <p style="margin:0 0 12px;">
      <a href="${escapeHtml(uploadUrl)}" style="color:#1f2f86;text-decoration:underline;word-break:break-all;">${escapeHtml(uploadUrl)}</a>
    </p>
    <p style="margin:0 0 16px;color:#4b5563;">
      Nuoroda galioja ${SIGNED_CONTRACT_UPLOAD_TOKEN_TTL_DAYS} dienų. Po sėkmingo įkėlimo ji nebegalioja.
    </p>
    <p style="margin:0 0 8px;font-weight:700;color:#1f2f86;">Jeigu turite klausimų, susisiekite:</p>
    <p style="margin:0 0 16px;">
      Vilniaus tinklinio centras<br />
      Tel. ${escapeHtml(siteConfig.contact.phone)}<br />
      <a href="mailto:${REPLY_TO_EMAIL}" style="color:#1f2f86;text-decoration:none;">${escapeHtml(REPLY_TO_EMAIL)}</a><br />
      <a href="${siteConfig.url}" style="color:#1f2f86;text-decoration:none;">vilniaustinkliniocentras.lt</a>
    </p>
    <p style="margin:0 0 4px;">Pagarbiai</p>
    <p style="margin:0;font-weight:700;color:#1f2f86;">Vilniaus tinklinio centras</p>
  `;

  return emailLayout(content);
}

export async function sendContractEmailWithPdf(options: {
  to: string;
  parentName: string;
  childName: string;
  filename: string;
  pdfBuffer: Buffer;
  uploadUrl: string;
}): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    throw new Error("El. pašto siuntimo konfigūracija nebaigta.");
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: options.to,
    replyTo: REPLY_TO_EMAIL,
    subject: "Vilniaus tinklinio centras – sutartis pasirašymui",
    html: buildContractEmailHtml(options.parentName, options.childName, options.uploadUrl),
    attachments: [
      {
        filename: options.filename,
        content: options.pdfBuffer,
      },
    ],
  });

  if (error) {
    throw new Error(error.message);
  }
}
