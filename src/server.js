const config = require('./config');
const { createRepository } = require('./repositories');
const createApp = require('./app');

async function start() {
  if (config.db.driver === 'postgresql' && config.db.autoMigrate) {
    const { migrate, seed } = require('../scripts/database');
    await migrate();
    await seed();
  }
  const repository = createRepository();
  const app = createApp(repository);
  const server = app.listen(config.port, () => console.log(`UrbanLink Flow disponível em http://localhost:${config.port}`));
  const shutdown = async () => {
    server.close(async () => {
      await repository.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((error) => {
  console.error('Falha ao iniciar a aplicação:', error);
  process.exit(1);
});
