import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { AuthenticationService } from '@infinicus/authentication';
import {
  registerBodySchema, registerResponseSchema,
  loginBodySchema, loginResponseSchema,
  sessionResponseSchema,
} from '../schemas/auth.js';
import { errorResponseSchema } from '../schemas/common.js';

const authService = new AuthenticationService();

export default async function authRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.post('/v1/auth/register', {
    schema: {
      tags: ['auth'],
      summary: 'Register a new user account (starts in pending status)',
      body: registerBodySchema,
      response: { 201: registerResponseSchema, 400: errorResponseSchema, 409: errorResponseSchema },
    },
  }, async (request, reply) => {
    const user = await authService.register(request.body.email, request.body.password);
    return reply.status(201).send({ id: user.id, email: user.email, status: user.status });
  });

  server.post('/v1/auth/login', {
    schema: {
      tags: ['auth'],
      summary: 'Log in with email and password; returns a bearer session token',
      body: loginBodySchema,
      response: { 200: loginResponseSchema, 401: errorResponseSchema, 403: errorResponseSchema },
    },
  }, async (request, reply) => {
    const { user, session, rawSessionToken } = await authService.login(
      request.body.email, request.body.password,
      { ipAddress: request.ip, userAgent: request.headers['user-agent'] }
    );
    return reply.status(200).send({
      user: { id: user.id, email: user.email, status: user.status },
      sessionId: session.id,
      rawSessionToken,
    });
  });

  server.post('/v1/auth/logout', {
    schema: {
      tags: ['auth'],
      summary: 'Log out the current session',
      response: { 204: z.null().describe('Logged out') },
    },
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const header = request.headers.authorization;
    const token = header!.slice('Bearer '.length).trim();
    await authService.logout(token, { ipAddress: request.ip, userAgent: request.headers['user-agent'] });
    return reply.status(204).send(null);
  });

  server.get('/v1/auth/session', {
    schema: {
      tags: ['auth'],
      summary: 'Validate the current bearer session token',
      response: { 200: sessionResponseSchema, 401: errorResponseSchema },
    },
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { user, session } = request.session!;
    return reply.status(200).send({ user: { id: user.id, email: user.email, status: user.status }, sessionId: session.id });
  });
}
