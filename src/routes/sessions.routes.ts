import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { SessionManager } from '../services/session-manager.js';

const allocateSessionSchema = z.object({
  provider: z.string().optional(),
  workspaceId: z.string(),
  runtimeProfile: z.string().min(1),
  env: z.record(z.string(), z.string()).optional(),
});

export async function sessionsRoutes(
  app: FastifyInstance,
  opts: { sessionManager: SessionManager },
): Promise<void> {
  const { sessionManager } = opts;

  // Allocate a new session
  app.post<{
    Body: { provider?: string; workspaceId: string; runtimeProfile: string; env?: Record<string, string> };
  }>('/api/v1/sessions', async (request, reply) => {
    const parsed = allocateSessionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }
    const { provider = 'mock', workspaceId, runtimeProfile, env } = parsed.data;

    try {
      const session = await sessionManager.allocateSession(provider, {
        workspaceId,
        runtimeProfile,
        env,
      });
      return reply.status(201).send(session);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(400).send({ error: message });
    }
  });

  // Get session status
  app.get<{
    Params: { sessionId: string };
  }>('/api/v1/sessions/:sessionId/status', async (request, reply) => {
    const { sessionId } = request.params;
    const session = sessionManager.getSessionStatus(sessionId);

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    return reply.send(session);
  });

  // Terminate a session
  app.delete<{
    Params: { sessionId: string };
  }>('/api/v1/sessions/:sessionId', async (request, reply) => {
    const { sessionId } = request.params;

    try {
      await sessionManager.terminateSession(sessionId);
      return reply.status(204).send();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(404).send({ error: message });
    }
  });

  // List available runtimes
  app.get('/api/v1/runtimes', async (_request, reply) => {
    const providers = sessionManager.listProviders();
    return reply.send({ runtimes: providers });
  });
}
