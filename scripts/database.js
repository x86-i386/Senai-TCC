const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('../src/config');

function conexao() { return new Pool({ connectionString: config.db.url, ssl: config.db.ssl ? { rejectUnauthorized: false } : false, max: 2 }); }

async function migrate() {
  const banco = conexao();
  const sql = fs.readFileSync(path.resolve(__dirname, '..', 'database', 'migrations', '001_esquema.sql'), 'utf8');
  await banco.query(sql);
  await banco.end();
  console.log('Migrações executadas com sucesso.');
}

async function seed() {
  const banco = conexao();
  const sql = fs.readFileSync(path.resolve(__dirname, '..', 'database', 'seeds', '001_demonstracao.sql'), 'utf8');
  await banco.query(sql);
  await banco.end();
  console.log('Dados de demonstração carregados.');
}

module.exports = { migrate, seed };
