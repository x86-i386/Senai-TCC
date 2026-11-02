const bcrypt = require('bcryptjs');

const now = () => new Date().toISOString();

class MemoryRepository {
  constructor() {
    this.data = {
      users: [
        { id: 1, name: 'Ana Martins', email: 'admin@urbanlink.com', role: 'ADMIN', active: 1, password_hash: bcrypt.hashSync('Admin@123', 10), created_at: now() },
        { id: 2, name: 'Carlos Lima', email: 'operador@urbanlink.com', role: 'OPERATOR', active: 1, password_hash: bcrypt.hashSync('Operador@123', 10), created_at: now() },
        { id: 3, name: 'Marina Costa', email: 'gestor@urbanlink.com', role: 'MANAGER', active: 1, password_hash: bcrypt.hashSync('Gestor@123', 10), created_at: now() },
        { id: 4, name: 'Rafael Souza', email: 'visualizacao@urbanlink.com', role: 'VIEWER', active: 1, password_hash: bcrypt.hashSync('Visualizador@123', 10), created_at: now() }
      ],
      vehicles: [
        { id: 1, plate: 'ULF-2A17', model: 'Renault Kangoo E-Tech', type: 'ELETRICO', capacity_kg: 650, status: 'EM_ROTA', latitude: -23.5505, longitude: -46.6333, driver_name: 'Carlos Lima', created_at: now() },
        { id: 2, plate: 'ULF-8B04', model: 'Fiat Fiorino', type: 'UTILITARIO', capacity_kg: 620, status: 'DISPONIVEL', latitude: -23.5614, longitude: -46.6559, driver_name: 'Marina Costa', created_at: now() },
        { id: 3, plate: 'ULF-0E21', model: 'Bicicleta Cargo', type: 'BICICLETA', capacity_kg: 80, status: 'MANUTENCAO', latitude: -23.5489, longitude: -46.6388, driver_name: 'Rafael Souza', created_at: now() }
      ],
      deliveries: [
        { id: 1, code: 'ENT-1042', recipient: 'Loja Vila Madalena', address: 'Rua Harmonia, 180', latitude: -23.5567, longitude: -46.6918, priority: 'ALTA', status: 'EM_TRANSITO', scheduled_at: now(), delivered_at: null, vehicle_id: 1, notes: 'Recebimento pela doca 2', created_at: now() },
        { id: 2, code: 'ENT-1043', recipient: 'Mercado Paulista', address: 'Alameda Santos, 1100', latitude: -23.5654, longitude: -46.6517, priority: 'MEDIA', status: 'PENDENTE', scheduled_at: now(), delivered_at: null, vehicle_id: 2, notes: '', created_at: now() },
        { id: 3, code: 'ENT-1044', recipient: 'Hub Centro', address: 'Av. Ipiranga, 333', latitude: -23.5434, longitude: -46.6395, priority: 'BAIXA', status: 'ENTREGUE', scheduled_at: now(), delivered_at: now(), vehicle_id: 1, notes: 'Entrega confirmada', created_at: now() },
        { id: 4, code: 'ENT-1045', recipient: 'Farmácia Pinheiros', address: 'Rua dos Pinheiros, 924', latitude: -23.5668, longitude: -46.6822, priority: 'URGENTE', status: 'ATRASADA', scheduled_at: now(), delivered_at: null, vehicle_id: 1, notes: 'Carga prioritária', created_at: now() }
      ],
      routes: [
        { id: 1, name: 'Rota Centro Expandido', vehicle_id: 1, status: 'ATIVA', origin_latitude: -23.5505, origin_longitude: -46.6333, total_distance_km: 18.7, estimated_minutes: 64, co2_kg: 3.59, service_level: 92, started_at: now(), finished_at: null, created_at: now() }
      ],
      simulations: [
        { id: 1, name: 'Cenário horário de pico', created_by: 1, parameters: JSON.stringify({ traffic: 1.35, vehicles: 3 }), distance_km: 41.8, duration_minutes: 126, cost_estimate: 198.4, co2_kg: 7.2, service_level: 89, created_at: now() }
      ]
    };
  }

  sanitize(table, row) {
    if (!row) return null;
    const result = { ...row };
    delete result.password_hash;
    if (table === 'simulations' && typeof result.parameters === 'string') {
      try { result.parameters = JSON.parse(result.parameters); } catch (_) {}
    }
    return result;
  }

  async list(table) { return this.data[table].map((row) => this.sanitize(table, row)); }
  async get(table, id) { return this.sanitize(table, this.data[table].find((row) => row.id === Number(id))); }
  async findUserByEmail(email) { return this.data.users.find((user) => user.email.toLowerCase() === email.toLowerCase()); }
  async create(table, values) {
    const collection = this.data[table];
    const id = Math.max(0, ...collection.map((item) => item.id)) + 1;
    const row = { id, ...values, created_at: now() };
    if (table === 'simulations' && typeof row.parameters !== 'string') row.parameters = JSON.stringify(row.parameters || {});
    collection.push(row);
    return this.sanitize(table, row);
  }
  async update(table, id, values) {
    const index = this.data[table].findIndex((row) => row.id === Number(id));
    if (index < 0) return null;
    this.data[table][index] = { ...this.data[table][index], ...values, updated_at: now() };
    return this.sanitize(table, this.data[table][index]);
  }
  async remove(table, id) {
    const index = this.data[table].findIndex((row) => row.id === Number(id));
    if (index < 0) return false;
    this.data[table].splice(index, 1);
    return true;
  }
  async dashboard() {
    const d = this.data.deliveries;
    const active = d.filter((x) => ['PENDENTE', 'EM_TRANSITO', 'ATRASADA'].includes(x.status)).length;
    const delivered = d.filter((x) => x.status === 'ENTREGUE').length;
    return {
      deliveries: { total: d.length, active, delivered, late: d.filter((x) => x.status === 'ATRASADA').length, onTimeRate: d.length ? Math.round(((d.length - d.filter((x) => x.status === 'ATRASADA').length) / d.length) * 100) : 100 },
      vehicles: { total: this.data.vehicles.length, available: this.data.vehicles.filter((x) => x.status === 'DISPONIVEL').length, active: this.data.vehicles.filter((x) => x.status === 'EM_ROTA').length },
      routes: { active: this.data.routes.filter((x) => x.status === 'ATIVA').length, distanceKm: this.data.routes.reduce((sum, x) => sum + Number(x.total_distance_km || 0), 0) },
      sustainability: { co2SavedKg: 12.4, lowEmissionShare: 67 },
      recentDeliveries: d.slice().reverse().slice(0, 5).map((x) => this.sanitize('deliveries', x))
    };
  }
  async close() {}
}

module.exports = MemoryRepository;
