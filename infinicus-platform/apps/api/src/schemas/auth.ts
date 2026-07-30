import { z } from 'zod';

export const registerBodySchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

export const registerResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  status: z.string(),
});

export const loginBodySchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
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

export const verifyEmailBodySchema = z.object({
  token: z.string().min(1),
});

export const verifyEmailResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  emailVerifiedAt: z.string().datetime(),
});
