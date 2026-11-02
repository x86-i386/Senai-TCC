const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const config = {
  port: Number(process.env.PORT || 3000),
  env: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'urbanlink-flow-chave-local-segura',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  db: {
    driver: process.env.DB_DRIVER || 'memory',
    url: process.env.URL_BANCO || 'postgresql://urbanlink:urbanlink_dev@127.0.0.1:5432/urbanlink_flow',
    ssl: process.env.BANCO_SSL === 'true',
    autoMigrate: process.env.DB_AUTO_MIGRATE !== 'false'
  }
};

module.exports = config;
