'use strict';

/**
 * Email notifications for new leads.
 * Requires nodemailer + Gmail App Password in .env.
 *
 * Gmail setup:
 *   1. Enable 2-Step Verification on Google account
 *   2. Go to myaccount.google.com → Security → App passwords
 *   3. Create App Password → copy 16-char code → paste as SMTP_PASS in .env
 */

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const nodemailer = require('nodemailer');

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

const COURSE_NAMES = {
  scratch: 'Scratch (6–10 років)',
  python:  'Python (10–14 років)',
  roblox:  'Roblox (9–14 років)',
  web:     'Веб-розробка (12–16 років)',
  help:    'Допоможіть обрати',
};

/**
 * Send notification email for a new lead.
 * Fails silently — lead is already saved to DB regardless.
 */
async function sendLeadNotification(lead) {
  const t = getTransporter();
  if (!t) return;

  const to   = process.env.NOTIFY_EMAIL || process.env.SMTP_USER;
  const from = `"My Computer Academy" <${process.env.SMTP_USER}>`;

  const courseName = COURSE_NAMES[lead.course] || lead.course || '—';
  const time       = new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' });

  const html = `
<!DOCTYPE html>
<html lang="uk">
<head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
    <div style="background:#6C47FF;padding:20px 28px">
      <h2 style="color:#fff;margin:0;font-size:18px">🎓 Нова заявка — My Computer Academy</h2>
    </div>
    <div style="padding:24px 28px">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 0;color:#888;width:140px">Ім'я дитини</td><td style="padding:8px 0;font-weight:600">${lead.child_name}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Вік</td><td style="padding:8px 0">${lead.age || '—'} років</td></tr>
        <tr><td style="padding:8px 0;color:#888">Курс</td><td style="padding:8px 0">${courseName}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Телефон</td><td style="padding:8px 0"><strong><a href="tel:${lead.phone}" style="color:#6C47FF;text-decoration:none">${lead.phone}</a></strong></td></tr>
        <tr><td style="padding:8px 0;color:#888">Email</td><td style="padding:8px 0">${lead.email ? `<a href="mailto:${lead.email}" style="color:#6C47FF">${lead.email}</a>` : '—'}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Заявка №</td><td style="padding:8px 0">#${lead.id}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Час</td><td style="padding:8px 0">${time}</td></tr>
      </table>
    </div>
    <div style="background:#f9f7ff;padding:16px 28px;border-top:1px solid #eee">
      <p style="margin:0;color:#888;font-size:13px">Передзвоніть протягом 30 хвилин 📞</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Нова заявка #${lead.id}
Дитина: ${lead.child_name}, ${lead.age || '—'} років
Курс: ${courseName}
Телефон: ${lead.phone}
Email: ${lead.email || '—'}
Час: ${time}`;

  try {
    await t.sendMail({
      from,
      to,
      subject: `📩 Нова заявка: ${lead.child_name} — ${courseName}`,
      text,
      html,
    });
    console.log(`[MAIL] Notification sent to ${to} for lead #${lead.id}`);
  } catch (err) {
    console.error(`[MAIL ERROR] Failed to send notification:`, err.message);
  }
}

module.exports = { sendLeadNotification };
