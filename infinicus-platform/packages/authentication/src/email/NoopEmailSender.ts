import type { EmailMessage, EmailSender } from './EmailSender.js';

/**
 * Used when RESEND_API_KEY isn't configured (local dev, most test runs,
 * or any environment that hasn't set up real email yet) — logs instead of
 * silently discarding, so a missing configuration is visible in logs
 * without making registration (which no longer gates on verification —
 * see AuthenticationService.register()) fail outright over an email that
 * was never going to send anyway.
 */
export class NoopEmailSender implements EmailSender {
  async send(message: EmailMessage): Promise<void> {
    // eslint-disable-next-line no-console -- deliberate: makes a missing RESEND_API_KEY visible in logs, matching this codebase's existing console-warning precedent (packages/database/src/client.ts, migrate.ts).
    console.warn(`[email] RESEND_API_KEY not configured — would have sent "${message.subject}" to ${message.to}`);
  }
}
