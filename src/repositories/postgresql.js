const { Pool } = require('pg');

const RECURSOS = {
  users: { tabela: 'usuarios', campos: { id:'id', name:'nome', email:'email', password_hash:'senha_hash', role:'perfil', active:'ativo', created_at:'criado_em', updated_at:'atualizado_em' } },
  vehicles: { tabela: 'veiculos', campos: { id:'id', plate:'placa', model:'modelo', type:'tipo', capacity_kg:'capacidade_kg', status:'status', cep:'cep', latitude:'latitude', longitude:'longitude', driver_name:'nome_condutor', created_at:'criado_em', updated_at:'atualizado_em' } },
  deliveries: { tabela: 'entregas', campos: { id:'id', code:'codigo', recipient:'destinatario', address:'endereco', cep:'cep', latitude:'latitude', longitude:'longitude', priority:'prioridade', status:'status', scheduled_at:'agendado_para', delivered_at:'entregue_em', vehicle_id:'veiculo_id', notes:'observacoes', created_at:'criado_em', updated_at:'atualizado_em' } },
  routes: { tabela: 'rotas', campos: { id:'id', name:'nome', vehicle_id:'veiculo_id', status:'status', origin_latitude:'latitude_origem', origin_longitude:'longitude_origem', total_distance_km:'distancia_total_km', estimated_minutes:'minutos_estimados', co2_kg:'co2_kg', service_level:'nivel_servico', started_at:'iniciado_em', finished_at:'finalizado_em', created_at:'criado_em', updated_at:'atualizado_em' } },
  simulations: { tabela: 'simulacoes', campos: { id:'id', name:'nome', created_by:'criado_por', parameters:'parametros', distance_km:'distancia_km', duration_minutes:'duracao_minutos', cost_estimate:'custo_estimado', co2_kg:'co2_kg', service_level:'nivel_servico', created_at:'criado_em' } }
};

class PostgreSqlRepository {
  constructor(config) {
    this.pool = new Pool({ connectionString: config.url, ssl: config.ssl ? { rejectUnauthorized: false } : false, max: 10 });
  }
  recurso(nome) {
    const recurso = RECURSOS[nome];
    if (!recurso) throw new Error('Recurso de dados inválido.');
    return recurso;
  }
  selecionar(nome) {
    const { campos } = this.recurso(nome);
    return Object.entries(campos).map(([logico, fisico]) => `"${fisico}" AS "${logico}"`).join(', ');
  }
  traduzirEntrada(nome, valores) {
    const { campos } = this.recurso(nome);
    const datasOpcionais = new Set(['scheduled_at', 'delivered_at', 'started_at', 'finished_at']);
    return Object.entries(valores)
      .filter(([chave]) => campos[chave] && chave !== 'id')
      .map(([chave, valor]) => {
        if (nome === 'users' && chave === 'active') valor = Boolean(Number(valor));
        if (datasOpcionais.has(chave) && valor === '') valor = null;
        return [campos[chave], valor];
      });
  }
  sanitizar(nome, linha) {
    if (!linha) return null;
    const resultado = { ...linha };
    delete resultado.password_hash;
    if (nome === 'simulations' && typeof resultado.parameters === 'string') {
      try { resultado.parameters = JSON.parse(resultado.parameters); } catch (_) {}
    }
    return resultado;
  }
  async list(nome) {
    const { tabela } = this.recurso(nome);
    const { rows } = await this.pool.query(`SELECT ${this.selecionar(nome)} FROM "${tabela}" ORDER BY id DESC`);
    return rows.map((linha) => this.sanitizar(nome, linha));
  }
  async get(nome, id) {
    const { tabela } = this.recurso(nome);
    const { rows } = await this.pool.query(`SELECT ${this.selecionar(nome)} FROM "${tabela}" WHERE id = $1`, [id]);
    return this.sanitizar(nome, rows[0]);
  }
  async findUserByEmail(email) {
    const { rows } = await this.pool.query('SELECT id, nome AS name, email, senha_hash AS password_hash, perfil AS role, ativo AS active FROM usuarios WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
    return rows[0] || null;
  }
  async create(nome, valores) {
    const { tabela } = this.recurso(nome);
    const entradas = this.traduzirEntrada(nome, valores);
    const colunas = entradas.map(([campo]) => `"${campo}"`).join(', ');
    const marcadores = entradas.map((_, indice) => `$${indice + 1}`).join(', ');
    const { rows } = await this.pool.query(`INSERT INTO "${tabela}" (${colunas}) VALUES (${marcadores}) RETURNING id`, entradas.map(([, valor]) => valor));
    return this.get(nome, rows[0].id);
  }
  async update(nome, id, valores) {
    const { tabela } = this.recurso(nome);
    const entradas = this.traduzirEntrada(nome, valores);
    if (!entradas.length) return this.get(nome, id);
    const atribuicoes = entradas.map(([campo], indice) => `"${campo}" = $${indice + 1}`).join(', ');
    await this.pool.query(`UPDATE "${tabela}" SET ${atribuicoes} WHERE id = $${entradas.length + 1}`, [...entradas.map(([, valor]) => valor), id]);
    return this.get(nome, id);
  }
  async remove(nome, id) {
    const { tabela } = this.recurso(nome);
    const resultado = await this.pool.query(`DELETE FROM "${tabela}" WHERE id = $1`, [id]);
    return resultado.rowCount > 0;
  }
  async dashboard() {
    const [entregas, veiculos, rotas, recentes] = await Promise.all([
      this.pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE status IN ('PENDENTE','EM_TRANSITO','ATRASADA'))::int ativas, COUNT(*) FILTER (WHERE status='ENTREGUE')::int concluidas, COUNT(*) FILTER (WHERE status='ATRASADA')::int atrasadas FROM entregas`),
      this.pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE status='DISPONIVEL')::int disponiveis, COUNT(*) FILTER (WHERE status='EM_ROTA')::int ativos FROM veiculos`),
      this.pool.query(`SELECT COUNT(*) FILTER (WHERE status='ATIVA')::int ativas, COALESCE(SUM(distancia_total_km),0)::float distancia FROM rotas`),
      this.pool.query(`SELECT ${this.selecionar('deliveries')} FROM entregas ORDER BY id DESC LIMIT 5`)
    ]);
    const entrega = entregas.rows[0], veiculo = veiculos.rows[0], rota = rotas.rows[0];
    return {
      deliveries: { total: entrega.total, active: entrega.ativas, delivered: entrega.concluidas, late: entrega.atrasadas, onTimeRate: entrega.total ? Math.round(((entrega.total - entrega.atrasadas) / entrega.total) * 100) : 100 },
      vehicles: { total: veiculo.total, available: veiculo.disponiveis, active: veiculo.ativos },
      routes: { active: rota.ativas, distanceKm: rota.distancia },
      sustainability: { co2SavedKg: Number((rota.distancia * 0.11).toFixed(1)), lowEmissionShare: 67 },
      recentDeliveries: recentes.rows.map((linha) => this.sanitizar('deliveries', linha))
    };
  }
  async close() { await this.pool.end(); }
}

module.exports = PostgreSqlRepository;
