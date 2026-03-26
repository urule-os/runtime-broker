import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { loadConfig } from './config.js';
import { authMiddleware } from '@urule/auth-middleware';
import { MockProvider } from './providers/mock-provider.js';
import { SessionManager } from './services/session-manager.js';
import { sessionsRoutes } from './routes/sessions.routes.js';

export async function buildServer() {
  const config = loadConfig();
  const app = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'info',
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
            hostname: request.hostname,
            remoteAddress: request.ip,
          };
        },
      },
    },
    genReqId: () => crypto.randomUUID(),
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Auth middleware
  await app.register(authMiddleware, { publicRoutes: ['/healthz'] });

  const sessionManager = new SessionManager();
  sessionManager.registerProvider(new MockProvider());

  app.register(sessionsRoutes, { sessionManager });

  app.get('/healthz', async () => ({ status: 'ok' }));

  return { app, config };
}
