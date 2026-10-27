const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const User = require('../models/Users');

// Primary Nodemailer transporter
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

/**
 * Ensures a user has an unsubscribeToken generated and persisted.
 */
async function ensureUnsubscribeToken(user) {
  if (user.unsubscribeToken) return user.unsubscribeToken;
  const token = crypto.randomBytes(24).toString('hex');
  await User.findByIdAndUpdate(user._id || user.id, { unsubscribeToken: token });
  user.unsubscribeToken = token;
  return token;
}

/**
 * Safe email dispatcher: sends via Nodemailer if configured,
 * automatically embedding the Codexium logo via inline CID attachment.
 */
async function sendMailSafe(options) {
  const fromAddress = process.env.EMAIL_USER
    ? `"Codexium" <${process.env.EMAIL_USER}>`
    : '"Codexium" <no-reply@codexium.local>';

  const logoPath = path.join(__dirname, '../assets/Codexium.png');
  const attachments = options.attachments ? [...options.attachments] : [];

  if (fs.existsSync(logoPath) && !attachments.some((a) => a.cid === 'codexium-logo')) {
    attachments.push({
      filename: 'Codexium.png',
      path: logoPath,
      cid: 'codexium-logo',
    });
  }

  const mailOptions = {
    from: fromAddress,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments,
  };

  if (transporter) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`📧 [ContestEmail] Dispatched email to ${options.to} (Message ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.warn(`⚠️ [ContestEmail] SMTP delivery failed (${err.message}). Logging mock delivery for ${options.to}`);
      return { success: true, mocked: true, reason: err.message };
    }
  } else {
    console.log(`ℹ️ [ContestEmail] SMTP not configured. Mock delivery to ${options.to}: "${options.subject}"`);
    return { success: true, mocked: true, reason: 'SMTP unconfigured' };
  }
}

/**
 * Formats a Date into a clean, professional string (e.g., "Saturday, Oct 28, 2026 • 2:00 PM UTC").
 */
function formatContestDateTime(dateInput) {
  try {
    const d = new Date(dateInput);
    const options = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short',
    };
    return d.toLocaleDateString('en-US', options);
  } catch (_) {
    return new Date(dateInput).toUTCString();
  }
}

/**
 * Executive minimalist email shell matching Codexium's pure black aesthetic.
 * Embedded logo uses cid:codexium-logo for universal display across all email clients.
 */
function buildExecutiveEmailTemplate({
  badgeText,
  badgeColor = '#ffa116',
  badgeBg = 'rgba(255, 161, 22, 0.12)',
  title,
  subtitle,
  bodyHtml,
  actionText,
  actionUrl,
  secondaryActionText,
  secondaryActionUrl,
  unsubscribeUrl,
}) {
  const clientBase = process.env.CLIENT_URL || 'http://localhost:5173';
  const finalActionUrl = actionUrl
    ? (actionUrl.startsWith('http') ? actionUrl : `${clientBase}${actionUrl}`)
    : null;
  const finalSecondaryUrl = secondaryActionUrl
    ? (secondaryActionUrl.startsWith('http') ? secondaryActionUrl : `${clientBase}${secondaryActionUrl}`)
    : null;
  const finalUnsubscribeUrl = unsubscribeUrl.startsWith('http')
    ? unsubscribeUrl
    : `${clientBase}/unsubscribe?token=${unsubscribeUrl}`;

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #ffffff;">
  <!-- Outer Table Wrapper -->
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #000000; padding: 36px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container (580px, pure black & flat 1px border) -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #0a0a0a; border-radius: 8px; overflow: hidden; border: 1px solid #222222;">
          
          <!-- Header Bar: Brand Logo & Category Pill -->
          <tr>
            <td style="padding: 24px 32px 18px 32px; border-bottom: 1px solid #1a1a1a;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <!-- Brand Logo with inline CID attachment -->
                  <td align="left" valign="middle">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 32px; height: 32px; vertical-align: middle;">
                          <img src="cid:codexium-logo" alt="Codexium" width="32" height="32" style="border-radius: 6px; display: block; border: 0;" />
                        </td>
                        <td style="padding-left: 10px; font-size: 16px; font-weight: 800; letter-spacing: -0.3px; color: #ffffff;">
                          CODEXIUM
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- Status / Badge Pill -->
                  ${badgeText ? `
                  <td align="right" valign="middle">
                    <span style="display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 600; font-family: 'JetBrains Mono', Consolas, monospace; text-transform: uppercase; color: ${badgeColor}; background-color: ${badgeBg}; border: 1px solid ${badgeColor}40; border-radius: 4px;">
                      ${badgeText}
                    </span>
                  </td>
                  ` : ''}
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero & Title Section -->
          <tr>
            <td style="padding: 28px 32px 10px 32px;">
              ${subtitle ? `
              <div style="font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #8a8a8a; margin-bottom: 6px; font-family: 'JetBrains Mono', Consolas, monospace;">
                ${subtitle}
              </div>
              ` : ''}
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; line-height: 1.3; color: #ffffff; letter-spacing: -0.3px;">
                ${title}
              </h1>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 10px 32px 24px 32px; font-size: 14px; line-height: 1.6; color: #d4d4d4;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Primary & Secondary Action Buttons -->
          ${actionText && finalActionUrl ? `
          <tr>
            <td style="padding: 0 32px 32px 32px;" align="center">
              <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #ffa116;">
                    <a href="${finalActionUrl}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 700; color: #000000; text-decoration: none; border-radius: 6px; letter-spacing: 0.1px;">
                      ${actionText} &rarr;
                    </a>
                  </td>
                  ${secondaryActionText && finalSecondaryUrl ? `
                  <td style="padding-left: 12px;">
                    <a href="${finalSecondaryUrl}" target="_blank" style="display: inline-block; padding: 11px 20px; font-size: 13px; font-weight: 600; color: #ffffff; text-decoration: none; border: 1px solid #222222; border-radius: 6px; background-color: #141414;">
                      ${secondaryActionText}
                    </a>
                  </td>
                  ` : ''}
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Footer Information & Unsubscribe -->
          <tr>
            <td style="padding: 20px 32px; background-color: #000000; border-top: 1px solid #1a1a1a; text-align: center; font-size: 11px; line-height: 1.6; color: #666666;">
              <p style="margin: 0 0 6px 0; color: #666666;">
                You are receiving this notification because contest notifications are enabled for your Codexium account.
              </p>
              <p style="margin: 0;">
                <a href="${finalUnsubscribeUrl}" style="color: #8a8a8a; text-decoration: underline;">
                  Unsubscribe with one click
                </a>
                &nbsp;&bull;&nbsp;
                <a href="${clientBase}/contests" style="color: #8a8a8a; text-decoration: none;">
                  Contests
                </a>
                &nbsp;&bull;&nbsp;
                <a href="${clientBase}/leaderboard" style="color: #8a8a8a; text-decoration: none;">
                  Leaderboard
                </a>
              </p>
              <p style="margin: 10px 0 0 0; font-size: 11px; color: #444444;">
                &copy; ${new Date().getFullYear()} Codexium. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Helper to build a high-contrast 2x2 specification grid for contest details.
 */
function buildSpecGrid({ typeLabel, startStr, durationStr, scoringStr }) {
  return `
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0; border-collapse: separate; border-spacing: 8px 8px;">
      <tr>
        <!-- Cell 1: Problem Track -->
        <td width="50%" valign="top" style="background-color: #141414; border: 1px solid #222222; border-radius: 6px; padding: 12px 14px;">
          <div style="font-size: 10px; font-weight: 700; color: #8a8a8a; text-transform: uppercase; letter-spacing: 0.8px; font-family: 'JetBrains Mono', Consolas, monospace;">
            Problem Track
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #ffffff; margin-top: 3px;">
            ${typeLabel}
          </div>
        </td>

        <!-- Cell 2: Duration -->
        <td width="50%" valign="top" style="background-color: #141414; border: 1px solid #222222; border-radius: 6px; padding: 12px 14px;">
          <div style="font-size: 10px; font-weight: 700; color: #8a8a8a; text-transform: uppercase; letter-spacing: 0.8px; font-family: 'JetBrains Mono', Consolas, monospace;">
            Duration
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #ffffff; margin-top: 3px; font-family: 'JetBrains Mono', Consolas, monospace;">
            ${durationStr}
          </div>
        </td>
      </tr>

      <tr>
        <!-- Cell 3: Start Time -->
        <td width="50%" valign="top" style="background-color: #141414; border: 1px solid #222222; border-radius: 6px; padding: 12px 14px;">
          <div style="font-size: 10px; font-weight: 700; color: #8a8a8a; text-transform: uppercase; letter-spacing: 0.8px; font-family: 'JetBrains Mono', Consolas, monospace;">
            Scheduled Start
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #ffffff; margin-top: 3px;">
            ${startStr}
          </div>
        </td>

        <!-- Cell 4: Scoring Engine -->
        <td width="50%" valign="top" style="background-color: #141414; border: 1px solid #222222; border-radius: 6px; padding: 12px 14px;">
          <div style="font-size: 10px; font-weight: 700; color: #8a8a8a; text-transform: uppercase; letter-spacing: 0.8px; font-family: 'JetBrains Mono', Consolas, monospace;">
            Scoring Engine
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #ffa116; margin-top: 3px;">
            ${scoringStr}
          </div>
        </td>
      </tr>
    </table>
  `;
}

/**
 * 1. Contest Announcement Email (Public Contests)
 */
async function sendContestAnnouncement(contest, user) {
  const token = await ensureUnsubscribeToken(user);
  const startStr = formatContestDateTime(contest.startTime);
  const durHours = Math.round((contest.durationMinutes || 120) / 60 * 10) / 10;
  const durationStr = `${durHours}h (${contest.durationMinutes || 120}m)`;
  const typeLabel = contest.type === 'api' ? 'API / Docker Integration' : 'Algorithmic DSA';
  const scoringStr = contest.scoring === 'points' ? 'Points Mode' : 'ICPC (+20m penalty)';

  const gridHtml = buildSpecGrid({
    typeLabel,
    startStr,
    durationStr,
    scoringStr,
  });

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #d4d4d4; line-height: 1.6;">
      An official coding tournament has been scheduled on Codexium. Compete against top developers in real time, solve challenges, and climb the live public leaderboard.
    </p>

    ${gridHtml}

    ${contest.description ? `
    <div style="padding: 12px 16px; background-color: #141414; border-left: 2px solid #ffa116; border-radius: 0 6px 6px 0; margin-bottom: 18px;">
      <div style="font-size: 11px; font-weight: 700; color: #8a8a8a; text-transform: uppercase; margin-bottom: 4px; font-family: 'JetBrains Mono', monospace;">Contest Overview</div>
      <div style="font-size: 13px; color: #ffffff; line-height: 1.5;">${contest.description}</div>
    </div>
    ` : ''}

    <p style="margin: 16px 0 0 0; font-size: 12px; color: #8a8a8a;">
      Problems will unlock simultaneously across all participant screens the moment the clock reaches zero.
    </p>
  `;

  const html = buildExecutiveEmailTemplate({
    badgeText: 'Tournament',
    badgeColor: '#ffa116',
    badgeBg: 'rgba(255, 161, 22, 0.12)',
    subtitle: 'New Public Contest Scheduled',
    title: contest.title,
    bodyHtml,
    actionText: 'View Contest & Register',
    actionUrl: `/contests/${contest._id}`,
    unsubscribeUrl: `${process.env.API_BASE_URL || 'http://localhost:5000/api'}/contests/unsubscribe?token=${token}`,
  });

  return await sendMailSafe({
    to: user.email,
    subject: `🏆 New Contest: "${contest.title}" (${startStr})`,
    text: `A new contest "${contest.title}" has been announced on Codexium. Starts: ${startStr}. Register at ${process.env.CLIENT_URL || 'http://localhost:5173'}/contests/${contest._id}`,
    html,
  });
}

/**
 * 2. Contest 1-Hour Reminder Email
 */
async function sendContestReminder(contest, user) {
  const token = await ensureUnsubscribeToken(user);
  const startStr = formatContestDateTime(contest.startTime);
  const durHours = Math.round((contest.durationMinutes || 120) / 60 * 10) / 10;
  const durationStr = `${durHours}h (${contest.durationMinutes || 120}m)`;
  const typeLabel = contest.type === 'api' ? 'API / Docker Integration' : 'Algorithmic DSA';
  const scoringStr = contest.scoring === 'points' ? 'Points Mode' : 'ICPC Standard';

  const gridHtml = buildSpecGrid({
    typeLabel,
    startStr,
    durationStr,
    scoringStr,
  });

  const bodyHtml = `
    <!-- Countdown Urgency Banner -->
    <div style="background-color: #141414; border: 1px solid rgba(239, 71, 67, 0.4); border-radius: 6px; padding: 16px 20px; text-align: center; margin-bottom: 20px;">
      <div style="font-size: 11px; font-weight: 700; color: #ef4743; letter-spacing: 1px; text-transform: uppercase; font-family: 'JetBrains Mono', monospace;">
        Starting in approximately 60 minutes
      </div>
      <div style="font-size: 18px; font-weight: 700; color: #ffffff; margin-top: 4px;">
        Prepare Your Workspace & Enter Lobby
      </div>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 14px; color: #d4d4d4; line-height: 1.6;">
      The contest you registered for begins in one hour. Ensure you have a stable network connection and join the contest room early.
    </p>

    ${gridHtml}

    <div style="background-color: #141414; border: 1px solid #222222; border-radius: 6px; padding: 14px 18px; margin-top: 18px;">
      <div style="font-size: 11px; font-weight: 700; color: #8a8a8a; text-transform: uppercase; margin-bottom: 6px; font-family: 'JetBrains Mono', monospace;">
        Competition Rules
      </div>
      <ul style="margin: 0; padding-left: 18px; color: #8a8a8a; font-size: 12px; line-height: 1.6;">
        <li>Problems will reveal automatically at start without needing a page refresh.</li>
        <li>Your rank updates live on the Socket.IO leaderboard as submissions are judged.</li>
        <li>In ICPC mode, each wrong submission adds a 20-minute penalty once the problem is solved.</li>
      </ul>
    </div>
  `;

  const html = buildExecutiveEmailTemplate({
    badgeText: 'Starting Soon',
    badgeColor: '#ef4743',
    badgeBg: 'rgba(239, 71, 67, 0.12)',
    subtitle: '1-Hour Countdown Reminder',
    title: contest.title,
    bodyHtml,
    actionText: 'Enter Contest Lobby',
    actionUrl: `/contests/${contest._id}`,
    unsubscribeUrl: `${process.env.API_BASE_URL || 'http://localhost:5000/api'}/contests/unsubscribe?token=${token}`,
  });

  return await sendMailSafe({
    to: user.email,
    subject: `⏰ 1 Hour Until Start: "${contest.title}" starts soon!`,
    text: `Reminder: Contest "${contest.title}" begins in 1 hour at ${startStr}. Join lobby: ${process.env.CLIENT_URL || 'http://localhost:5173'}/contests/${contest._id}`,
    html,
  });
}

/**
 * 3. Contest Invitation Email (Private Contests)
 */
async function sendContestInvitation(contest, user, inviterName) {
  const token = await ensureUnsubscribeToken(user);
  const startStr = formatContestDateTime(contest.startTime);
  const joinUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/contests/join?code=${contest.joinCode}`;
  const durHours = Math.round((contest.durationMinutes || 90) / 60 * 10) / 10;

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #d4d4d4; line-height: 1.6;">
      <strong style="color: #ffffff;">${inviterName || 'A peer developer'}</strong> has personally invited you to join a private competitive coding match on Codexium.
    </p>

    <!-- Join Code Box -->
    <div style="background-color: #141414; border: 1px dashed #ffa116; border-radius: 6px; padding: 20px 18px; text-align: center; margin: 20px 0;">
      <div style="font-size: 10px; font-weight: 700; color: #8a8a8a; letter-spacing: 1.5px; text-transform: uppercase; font-family: 'JetBrains Mono', monospace;">
        Your 8-Character Join Code
      </div>
      <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #ffa116; font-family: 'JetBrains Mono', Consolas, monospace; margin: 10px 0;">
        ${contest.joinCode || 'N/A'}
      </div>
      <div style="font-size: 12px; color: #8a8a8a;">
        Scheduled Start: <strong style="color: #ffffff;">${startStr}</strong> &bull; Duration: <strong style="color: #ffffff;">${durHours} Hours</strong>
      </div>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 13px; color: #8a8a8a; line-height: 1.6;">
      Click the button below to join the private duel directly, or paste the access code into the <strong>Enter Code</strong> modal on the Contests page.
    </p>
  `;

  const html = buildExecutiveEmailTemplate({
    badgeText: 'Private Invitation',
    badgeColor: '#ffa116',
    badgeBg: 'rgba(255, 161, 22, 0.12)',
    subtitle: `${inviterName || 'A friend'} challenged you to a match`,
    title: contest.title,
    bodyHtml,
    actionText: 'Accept Invitation & Enter Arena',
    actionUrl: `/contests/join?code=${contest.joinCode}`,
    unsubscribeUrl: `${process.env.API_BASE_URL || 'http://localhost:5000/api'}/contests/unsubscribe?token=${token}`,
  });

  return await sendMailSafe({
    to: user.email,
    subject: `📩 Match Invitation: "${contest.title}" (Code: ${contest.joinCode})`,
    text: `You have been invited by ${inviterName} to join private contest "${contest.title}". Access code: ${contest.joinCode}. Join directly: ${joinUrl}`,
    html,
  });
}

module.exports = {
  ensureUnsubscribeToken,
  sendMailSafe,
  sendContestAnnouncement,
  sendContestReminder,
  sendContestInvitation,
};
