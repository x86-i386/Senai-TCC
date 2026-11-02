const config = require('../config');
const MemoryRepository = require('./memory');
const PostgreSqlRepository = require('./postgresql');

function createRepository() {
  return config.db.driver === 'postgresql' ? new PostgreSqlRepository(config.db) : new MemoryRepository();
}

module.exports = { createRepository };
