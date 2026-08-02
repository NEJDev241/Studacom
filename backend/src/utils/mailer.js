/**
 * Envoi d'emails via Nodemailer (SMTP). Configuré par variables d'environnement
 * pour ne jamais coder d'identifiants en dur. Si SMTP_HOST n'est pas défini,
 * l'envoi est simplement journalisé en console (mode dégradé, pratique en dev
 * ou tant que les identifiants SMTP définitifs ne sont pas fournis).
 */
const nodemailer = require("nodemailer");

let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendQuoteNotification(quote) {
  const subject = `Nouvelle demande de devis — ${quote.name}`;
  const text = [
    `Nouvelle demande de devis reçue sur le site Studacom :`,
    ``,
    `Nom : ${quote.name}`,
    `Téléphone : ${quote.phone}`,
    `Email : ${quote.email}`,
    `Service : ${quote.service}`,
    `Budget : ${quote.budget || "—"}`,
    `Description : ${quote.description || "—"}`,
  ].join("\n");

  if (!transporter) {
    console.log("── [MAIL - mode dégradé, SMTP non configuré] ──");
    console.log(subject);
    console.log(text);
    return { delivered: false, mode: "console" };
  }

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: process.env.MAIL_TO || "ogmbindustrie@gmail.com",
    subject,
    text,
  });
  return { delivered: true, mode: "smtp" };
}

module.exports = { sendQuoteNotification };
