const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const swaggerUi = require('swagger-ui-express');
const config = require('./config');
const schemas = require('./validation');
const { authenticate, authorize } = require('./middleware/auth');
const { optimizeRoute } = require('./services/optimizer');
const { roadRoute } = require('./services/roadRouter');
const { lookupCep } = require('./services/cepLookup');
const swaggerDocument = require('./swagger.json');

const resources = {
  vehicles: { read: ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'], create: ['ADMIN', 'MANAGER'], update: ['ADMIN', 'MANAGER'], remove: ['ADMIN', 'MANAGER'] },
  deliveries: { read: ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'], create: ['ADMIN', 'MANAGER', 'OPERATOR'], update: ['ADMIN', 'MANAGER', 'OPERATOR'], remove: ['ADMIN', 'MANAGER'] },
  routes: { read: ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'], create: ['ADMIN', 'MANAGER'], update: ['ADMIN', 'MANAGER'], remove: ['ADMIN', 'MANAGER'] },
  simulations: { read: ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'], create: ['ADMIN', 'MANAGER'], update: ['ADMIN', 'MANAGER'], remove: ['ADMIN', 'MANAGER'] },
  users: { read: ['ADMIN'], create: ['ADMIN'], update: ['ADMIN'], remove: ['ADMIN'] }
};

function cleanUserPayload(payload) {
  const result = { ...payload };
  if (result.password) {
    result.password_hash = bcrypt.hashSync(result.password, 10);
    delete result.password;
  }
  return result;
}

async function nextDeliveryCode(repository) {
  const deliveries = await repository.list('deliveries');
  const greatest = deliveries.reduce((max, item) => {
    const number = Number(String(item.code || '').match(/(\d+)$/)?.[1] || 0);
    return Math.max(max, number);
  }, 1045);
  return `ENT-${greatest + 1}`;
}

function createApp(repository) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(config.env === 'test' ? 'tiny' : 'dev'));
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'UrbanLink Flow API', storage: config.db.driver, timestamp: new Date().toISOString() }));

  app.get('/api/public/stats', async (_req, res, next) => {
    try {
      const dashboard = await repository.dashboard();
      res.json({
        activeDeliveries: dashboard.deliveries.active,
        completedDeliveries: dashboard.deliveries.delivered,
        activeRoutes: dashboard.routes.active,
        onTimeRate: dashboard.deliveries.onTimeRate,
        co2SavedKg: dashboard.sustainability.co2SavedKg
      });
    } catch (error) { next(error); }
  });

  app.post('/api/public/quote', (req, res) => {
    const { origin, destination, priority = 'MEDIA' } = req.body || {};
    const valid = [origin, destination].every((point) => point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng)));
    if (!valid) return res.status(422).json({ error: 'Informe origem e destino válidos.' });
    const rad = (degrees) => degrees * Math.PI / 180;
    const dLat = rad(Number(destination.lat) - Number(origin.lat));
    const dLng = rad(Number(destination.lng) - Number(origin.lng));
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(Number(origin.lat))) * Math.cos(rad(Number(destination.lat))) * Math.sin(dLng / 2) ** 2;
    const straightKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = Number((straightKm * 1.28).toFixed(1));
    const multiplier = { BAIXA: 1, MEDIA: 1.08, ALTA: 1.22, URGENTE: 1.48 }[priority] || 1.08;
    const durationMinutes = Math.max(18, Math.round((distanceKm / 24) * 60 + 12));
    res.json({
      distanceKm,
      durationMinutes,
      priceEstimate: Number((Math.max(18, distanceKm * 3.65) * multiplier).toFixed(2)),
      co2Kg: Number((distanceKm * 0.07).toFixed(2)),
      routeLabel: `${origin.name || 'Origem'} → ${destination.name || 'Destino'}`
    });
  });

  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) return res.status(400).json({ error: 'Informe e-mail e senha.' });
      const user = await repository.findUserByEmail(email);
      if (!user || !user.active || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
      const token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) { next(error); }
  });

  app.get('/api/auth/me', authenticate, (req, res) => res.json({ user: req.user }));

  app.get('/api/geocoding/cep/:cep', authenticate, async (req, res, next) => {
    try { res.json(await lookupCep(req.params.cep)); } catch (error) { next(error); }
  });

  app.get('/api/dashboard', authenticate, async (_req, res, next) => {
    try { res.json(await repository.dashboard()); } catch (error) { next(error); }
  });

  Object.entries(resources).forEach(([resource, settings]) => {
    app.get(`/api/${resource}`, authenticate, authorize(...settings.read), async (_req, res, next) => {
      try { res.json({ data: await repository.list(resource) }); } catch (error) { next(error); }
    });
    app.get(`/api/${resource}/:id`, authenticate, authorize(...settings.read), async (req, res, next) => {
      try {
        const item = await repository.get(resource, req.params.id);
        item ? res.json(item) : res.status(404).json({ error: 'Registro não encontrado.' });
      } catch (error) { next(error); }
    });
    app.post(`/api/${resource}`, authenticate, authorize(...settings.create), async (req, res, next) => {
      try {
        const input = { ...req.body };
        if (resource === 'deliveries') input.code = await nextDeliveryCode(repository);
        const parsed = schemas[resource].safeParse(input);
        if (!parsed.success) return res.status(422).json({ error: 'Dados inválidos.', details: parsed.error.flatten() });
        const payload = resource === 'users' ? cleanUserPayload(parsed.data) : parsed.data;
        if (resource === 'users' && !payload.password_hash) return res.status(422).json({ error: 'A senha é obrigatória no cadastro.' });
        if (resource === 'simulations' && !payload.created_by) payload.created_by = Number(req.user.sub);
        res.status(201).json(await repository.create(resource, payload));
      } catch (error) { next(error); }
    });
    app.put(`/api/${resource}/:id`, authenticate, authorize(...settings.update), async (req, res, next) => {
      try {
        const current = await repository.get(resource, req.params.id);
        if (!current) return res.status(404).json({ error: 'Registro não encontrado.' });
        const parsed = schemas[resource].partial().safeParse(req.body);
        if (!parsed.success) return res.status(422).json({ error: 'Dados inválidos.', details: parsed.error.flatten() });
        const payload = resource === 'users' ? cleanUserPayload(parsed.data) : parsed.data;
        res.json(await repository.update(resource, req.params.id, payload));
      } catch (error) { next(error); }
    });
    app.delete(`/api/${resource}/:id`, authenticate, authorize(...settings.remove), async (req, res, next) => {
      try {
        const removed = await repository.remove(resource, req.params.id);
        removed ? res.status(204).end() : res.status(404).json({ error: 'Registro não encontrado.' });
      } catch (error) { next(error); }
    });
  });

  app.patch('/api/deliveries/:id/status', authenticate, authorize('ADMIN', 'MANAGER', 'OPERATOR'), async (req, res, next) => {
    try {
      const current = await repository.get('deliveries', req.params.id);
      if (!current) return res.status(404).json({ error: 'Entrega não encontrada.' });
      const nextStatus = req.body?.status;
      const transitions = {
        PENDENTE: ['EM_TRANSITO', 'CANCELADA'],
        EM_TRANSITO: ['ENTREGUE', 'ATRASADA', 'CANCELADA'],
        ATRASADA: ['EM_TRANSITO', 'ENTREGUE', 'CANCELADA'],
        ENTREGUE: [],
        CANCELADA: []
      };
      if (!transitions[current.status]?.includes(nextStatus)) {
        return res.status(409).json({ error: `Transição de ${current.status} para ${nextStatus || 'status vazio'} não permitida.` });
      }
      const payload = { status: nextStatus };
      if (nextStatus === 'ENTREGUE') payload.delivered_at = new Date().toISOString();
      res.json(await repository.update('deliveries', req.params.id, payload));
    } catch (error) { next(error); }
  });

  app.post('/api/optimization/route', authenticate, authorize('ADMIN', 'MANAGER', 'OPERATOR'), async (req, res) => {
    const { origin, stops, options = {} } = req.body || {};
    if (!origin || !Array.isArray(stops) || stops.length < 2) return res.status(422).json({ error: 'Informe a origem e pelo menos duas paradas.' });
    const points = [origin, ...stops];
    if (points.some((point) => !Number.isFinite(Number(point.lat)) || !Number.isFinite(Number(point.lng)))) return res.status(422).json({ error: 'As coordenadas informadas são inválidas.' });
    const normalizedOrigin = { ...origin, lat: Number(origin.lat), lng: Number(origin.lng) };
    const normalizedStops = stops.map((stop) => ({ ...stop, lat: Number(stop.lat), lng: Number(stop.lng) }));
    const result = optimizeRoute(normalizedOrigin, normalizedStops, options);
    if (config.env !== 'test') {
      try {
        const optimizedPoints = [normalizedOrigin, ...result.orderedStops];
        const [optimizedRoad, baselineRoad] = await Promise.all([
          roadRoute(optimizedPoints),
          roadRoute([normalizedOrigin, ...normalizedStops])
        ]);
        const serviceMinutes = Number(options.serviceMinutes || 6) * normalizedStops.length;
        result.algorithm = 'vizinho-mais-proximo-com-roteamento-viario';
        result.routingMode = 'road';
        result.geometry = optimizedRoad.geometry;
        result.orderedStops = result.orderedStops.map((stop, index) => ({
          ...stop,
          legDistanceKm: Number(optimizedRoad.legDistancesKm[index].toFixed(2))
        }));
        result.distanceKm = Number(optimizedRoad.distanceKm.toFixed(2));
        result.durationMinutes = Math.round(optimizedRoad.drivingMinutes + serviceMinutes);
        result.savedDistanceKm = Number(Math.max(0, baselineRoad.distanceKm - optimizedRoad.distanceKm).toFixed(2));
        result.savedMinutes = Math.max(0, Math.round(baselineRoad.drivingMinutes - optimizedRoad.drivingMinutes));
        result.estimatedCo2Kg = Number((result.distanceKm * Number(options.emissionFactor || 0.192)).toFixed(2));
        result.co2SavedKg = Number((result.savedDistanceKm * Number(options.emissionFactor || 0.192)).toFixed(2));
      } catch (_error) {
        result.routingMode = 'estimated-fallback';
      }
    } else {
      result.routingMode = 'estimated-test';
    }
    res.json(result);
  });

  app.post('/api/simulations/run', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
    try {
      const traffic = Number(req.body.traffic || 1);
      const vehicles = Number(req.body.vehicles || 3);
      const deliveries = Number(req.body.deliveries || 18);
      const baseDistance = deliveries * 2.75;
      const distanceKm = Number((baseDistance * (1 + Math.max(0, traffic - 1) * 0.18)).toFixed(1));
      const durationMinutes = Math.round((distanceKm / 30) * 60 * traffic + deliveries * 4.5);
      const serviceLevel = Math.max(55, Math.min(99, Math.round(101 - traffic * 12 + vehicles * 2 - deliveries * 0.22)));
      const result = {
        name: req.body.name || `Simulação ${new Date().toLocaleDateString('pt-BR')}`,
        created_by: Number(req.user.sub),
        parameters: { traffic, vehicles, deliveries },
        distance_km: distanceKm,
        duration_minutes: durationMinutes,
        cost_estimate: Number((distanceKm * 2.84 + vehicles * 31).toFixed(2)),
        co2_kg: Number((distanceKm * 0.192).toFixed(2)),
        service_level: serviceLevel
      };
      res.status(201).json(await repository.create('simulations', result));
    } catch (error) { next(error); }
  });

  app.get('/api/reports/deliveries.csv', authenticate, async (_req, res, next) => {
    try {
      const rows = await repository.list('deliveries');
      const fields = ['id', 'code', 'recipient', 'address', 'priority', 'status', 'scheduled_at', 'delivered_at'];
      const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
      const csv = [fields.join(','), ...rows.map((row) => fields.map((field) => escape(row[field])).join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="urbanlink-entregas.csv"');
      res.send(`\ufeff${csv}`);
    } catch (error) { next(error); }
  });

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { customSiteTitle: 'UrbanLink Flow API' }));
  app.use('/vendor/leaflet', express.static(path.dirname(require.resolve('leaflet/dist/leaflet.js'))));
  app.use('/vendor/chart', express.static(path.dirname(require.resolve('chart.js'))));
  app.use(express.static(path.resolve(__dirname, '..', 'public')));
  app.get('*', (req, res, next) => req.path.startsWith('/api/') ? next() : res.sendFile(path.resolve(__dirname, '..', 'public', 'index.html')));

  app.use((req, res) => res.status(404).json({ error: 'Endpoint não encontrado.' }));
  app.use((error, _req, res, _next) => {
    console.error(error);
    const duplicate = error.code === '23505';
    const status = duplicate ? 409 : Number(error.status) || 500;
    res.status(status).json({ error: duplicate ? 'Já existe um registro com esses dados.' : status < 500 ? error.message : 'Erro interno do servidor.' });
  });
  return app;
}

module.exports = createApp;
