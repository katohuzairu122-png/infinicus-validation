import type { EmailMessage, EmailSender } from './EmailSender.js';

/** Thrown only for a genuine send failure (non-2xx from Resend) — callers decide whether that should block anything. */
export class EmailSendError extends Error {
  constructor(status: number, body: string) {
    super(`Resend API returned ${status}: ${body}`);
    this.name = 'EmailSendError';
  }
}

/**
 * Plain `fetch` against Resend's REST API — no SDK dependency needed for
 * a single POST. Mirrors how infrastructure/deployment scripts elsewhere
 * in this repo prefer a direct HTTP call over pulling in a client library
 * for a one-endpoint integration.
 */
export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly fromAddress: string
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.fromAddress,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new EmailSendError(res.status, body);
    }
  }
}
