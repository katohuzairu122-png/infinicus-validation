import type { EmailMessage } from './EmailSender.js';

export function verificationEmail(toEmail: string, verificationUrlBase: string, rawToken: string): EmailMessage {
  const url = `${verificationUrlBase}?token=${encodeURIComponent(rawToken)}`;
  return {
    to: toEmail,
    subject: 'Verify your INFINICUS email address',
    text: `Verify your email address to confirm you own this account: ${url}\n\nThis link expires in 24 hours. Your account is already active — this step is just to confirm we can reach you.`,
    html: `<p>Verify your email address to confirm you own this account:</p><p><a href="${url}">${url}</a></p><p>This link expires in 24 hours. Your account is already active — this step is just to confirm we can reach you.</p>`,
  };
}
