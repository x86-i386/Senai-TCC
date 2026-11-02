const test = require('node:test');
const assert = require('node:assert/strict');
const { haversine, optimizeRoute } = require('../src/services/optimizer');

test('haversine calcula distância coerente entre pontos', () => {
  const distance = haversine({ lat: -23.5505, lng: -46.6333 }, { lat: -23.5614, lng: -46.6559 });
  assert.ok(distance > 2 && distance < 3);
});

test('otimizador ordena a parada mais próxima primeiro e gera indicadores', () => {
  const origin = { lat: -23.5505, lng: -46.6333 };
  const stops = [
    { id: 1, name: 'Longe', lat: -23.59, lng: -46.70 },
    { id: 2, name: 'Perto', lat: -23.552, lng: -46.637 },
    { id: 3, name: 'Intermediária', lat: -23.565, lng: -46.65 }
  ];
  const result = optimizeRoute(origin, stops);
  assert.equal(result.orderedStops[0].name, 'Perto');
  assert.ok(result.distanceKm > 0);
  assert.ok(result.durationMinutes > 0);
  assert.equal(result.serviceLevel, 'DENTRO_DO_SLA');
});
