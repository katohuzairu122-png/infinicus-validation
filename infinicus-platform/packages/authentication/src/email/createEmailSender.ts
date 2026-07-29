import type { EmailSender } from './EmailSender.js';
import { ResendEmailSender } from './ResendEmailSender.js';
import { NoopEmailSender } from './NoopEmailSender.js';

export interface EmailConfig {
  apiKey: string | undefined;
  fromAddress: string;
  verificationUrlBase: string;
}

/**
 * Deliberately not routed through @infinicus/configuration's loadConfig()
 * (which throws on a missing DATABASE_URL and is called exactly once, at
 * apps/api/src/server.ts's own startup, then threaded nowhere else) —
 * every service in this codebase that needs environment configuration
 * reads it close to where it's used (see AuthenticationService's own
 * default-constructed repositories), and email sending is best-effort by
 * design (see NoopEmailSender): a missing RESEND_API_KEY must never
 * prevent this whole module from loading or registration from succeeding.
 */
export function resolveEmailConfig(env: NodeJS.ProcessEnv = process.env): EmailConfig {
  return {
    apiKey: env.RESEND_API_KEY,
    fromAddress: env.EMAIL_FROM_ADDRESS ?? 'INFINICUS <noreply@infini-cus.com>',
    verificationUrlBase: env.EMAIL_VERIFICATION_URL_BASE ?? 'https://infini-cus.com/verify-email',
  };
}

export function createEmailSender(config: EmailConfig = resolveEmailConfig()): EmailSender {
  return config.apiKey ? new ResendEmailSender(config.apiKey, config.fromAddress) : new NoopEmailSender();
}
