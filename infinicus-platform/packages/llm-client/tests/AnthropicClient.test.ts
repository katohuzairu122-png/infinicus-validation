import { describe, it, expect, vi, afterEach } from 'vitest';
import { AnthropicClient, AnthropicCompletionError } from '../src/AnthropicClient.js';

describe('AnthropicClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the text content from a successful response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ text: 'hello from claude' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new AnthropicClient('test-key');
    const result = await client.complete('say hello');

    expect(result).toBe('hello from claude');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-api-key': 'test-key' }),
      })
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(body.model).toBe('claude-haiku-4-5-20251001');
    expect(body.messages).toEqual([{ role: 'user', content: 'say hello' }]);
  });

  it('throws AnthropicCompletionError on a non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'invalid api key',
    }));

    const client = new AnthropicClient('bad-key');
    await expect(client.complete('say hello')).rejects.toThrow(AnthropicCompletionError);
  });

  it('returns empty string when the response has no content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }));

    const client = new AnthropicClient('test-key');
    const result = await client.complete('say hello');
    expect(result).toBe('');
  });
});
