import { loadConfig, validateConfig } from './config.js';
import { buildServer } from './server.js';

const preConfig = loadConfig();
validateConfig(preConfig);
const { app, config } = await buildServer();

app.listen({ port: config.port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`urule-runtime-broker listening on ${address}`);
});

// Graceful shutdown
const shutdown = async () => {
  app.log.info('Shutting down...');
  await app.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
