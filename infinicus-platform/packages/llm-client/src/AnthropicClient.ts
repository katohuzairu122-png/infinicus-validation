/** Thrown only for a genuine call failure (non-2xx from Anthropic) — callers decide whether that should block anything. */
export class AnthropicCompletionError extends Error {
  constructor(status: number, body: string) {
    super(`Anthropic API returned ${status}: ${body}`);
    this.name = 'AnthropicCompletionError';
  }
}

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

/**
 * Plain `fetch` against Anthropic's Messages API — no SDK dependency,
 * mirroring ResendEmailSender's precedent (packages/authentication/src/
 * email/ResendEmailSender.ts) for a single-endpoint integration. Ported
 * directly from the legacy functions/api/business/decisions/recommend.js,
 * which already proved this exact call shape in production.
 */
export class AnthropicClient {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = DEFAULT_MODEL
  ) {}

  async complete(prompt: string, opts: { maxTokens?: number } = {}): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: opts.maxTokens ?? 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new AnthropicCompletionError(res.status, body);
    }
    const data = (await res.json()) as { content?: { text?: string }[] };
    return data.content?.[0]?.text ?? '';
  }
}
