process.env.NODE_ENV = 'test';
process.env.DB_DRIVER = 'memory';
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const MemoryRepository = require('../src/repositories/memory');
const createApp = require('../src/app');

const repository = new MemoryRepository();
const app = createApp(repository);
let token;
let operatorToken;
let viewerToken;

test('health check responde sem autenticação', async () => {
  const response = await request(app).get('/api/health').expect(200);
  assert.equal(response.body.status, 'ok');
});

test('home pública recebe indicadores e calcula estimativa sem login', async () => {
  const stats = await request(app).get('/api/public/stats').expect(200);
  assert.equal(typeof stats.body.activeDeliveries, 'number');
  const quote = await request(app).post('/api/public/quote').send({
    origin: { name: 'Sé', lat: -23.5505, lng: -46.6333 },
    destination: { name: 'Pinheiros', lat: -23.5677, lng: -46.6939 },
    priority: 'ALTA'
  }).expect(200);
  assert.ok(quote.body.distanceKm > 0);
  assert.ok(quote.body.priceEstimate > 0);
});

test('login emite JWT para credenciais válidas', async () => {
  const response = await request(app).post('/api/auth/login').send({ email: 'admin@urbanlink.com', password: 'Admin@123' }).expect(200);
  token = response.body.token;
  assert.equal(response.body.user.role, 'ADMIN');
  assert.ok(token);
  operatorToken = (await request(app).post('/api/auth/login').send({ email: 'operador@urbanlink.com', password: 'Operador@123' }).expect(200)).body.token;
  viewerToken = (await request(app).post('/api/auth/login').send({ email: 'visualizacao@urbanlink.com', password: 'Visualizador@123' }).expect(200)).body.token;
});

test('código da entrega é criado automaticamente pelo servidor', async () => {
  const response = await request(app).post('/api/deliveries').set('Authorization', `Bearer ${token}`).send({
    recipient: 'Cliente Automático', address: 'Praça da Sé, 1', latitude: -23.5505, longitude: -46.6333,
    priority: 'MEDIA', status: 'PENDENTE', vehicle_id: null, notes: ''
  }).expect(201);
  assert.match(response.body.code, /^ENT-\d+$/);
});

test('perfis aplicam permissões diferentes no backend', async () => {
  await request(app).get('/api/vehicles').set('Authorization', `Bearer ${viewerToken}`).expect(200);
  await request(app).post('/api/vehicles').set('Authorization', `Bearer ${viewerToken}`).send({}).expect(403);
  await request(app).post('/api/vehicles').set('Authorization', `Bearer ${operatorToken}`).send({}).expect(403);
  await request(app).post('/api/simulations/run').set('Authorization', `Bearer ${operatorToken}`).send({}).expect(403);
  await request(app).post('/api/optimization/route').set('Authorization', `Bearer ${viewerToken}`).send({}).expect(403);
  await request(app).get('/api/users').set('Authorization', `Bearer ${operatorToken}`).expect(403);
  await request(app).post('/api/users').set('Authorization', `Bearer ${operatorToken}`).send({}).expect(403);
});

test('rotas protegidas recusam acesso anônimo', async () => {
  await request(app).get('/api/dashboard').expect(401);
});

test('CRUD de veículo funciona de ponta a ponta', async () => {
  const created = await request(app).post('/api/vehicles').set('Authorization', `Bearer ${token}`).send({ plate: 'TST-1A23', model: 'Veículo Teste', type: 'ELETRICO', capacity_kg: 500, status: 'DISPONIVEL', latitude: -23.55, longitude: -46.63, driver_name: 'Teste' }).expect(201);
  assert.equal(created.body.plate, 'TST-1A23');
  const updated = await request(app).put(`/api/vehicles/${created.body.id}`).set('Authorization', `Bearer ${token}`).send({ status: 'EM_ROTA' }).expect(200);
  assert.equal(updated.body.status, 'EM_ROTA');
  await request(app).delete(`/api/vehicles/${created.body.id}`).set('Authorization', `Bearer ${token}`).expect(204);
});

test('fluxo de status de entrega aceita e bloqueia transições corretamente', async () => {
  const started = await request(app).patch('/api/deliveries/2/status').set('Authorization', `Bearer ${token}`).send({ status: 'EM_TRANSITO' }).expect(200);
  assert.equal(started.body.status, 'EM_TRANSITO');
  const delivered = await request(app).patch('/api/deliveries/2/status').set('Authorization', `Bearer ${token}`).send({ status: 'ENTREGUE' }).expect(200);
  assert.ok(delivered.body.delivered_at);
  await request(app).patch('/api/deliveries/2/status').set('Authorization', `Bearer ${token}`).send({ status: 'PENDENTE' }).expect(409);
});

test('otimização retorna sequência e métricas', async () => {
  const response = await request(app).post('/api/optimization/route').set('Authorization', `Bearer ${token}`).send({ origin: { lat: -23.5505, lng: -46.6333 }, stops: [{ name: 'A', lat: -23.56, lng: -46.65 }, { name: 'B', lat: -23.57, lng: -46.67 }] }).expect(200);
  assert.equal(response.body.orderedStops.length, 2);
  assert.ok(response.body.distanceKm > 0);
});
