import { z } from 'zod';

export const registerBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  status: z.string(),
});

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const loginResponseSchema = z.object({
  user: z.object({ id: z.string().uuid(), email: z.string(), status: z.string() }),
  sessionId: z.string().uuid(),
  rawSessionToken: z.string(),
});

export const sessionResponseSchema = z.object({
  user: z.object({ id: z.string().uuid(), email: z.string(), status: z.string() }),
  sessionId: z.string().uuid(),
});
