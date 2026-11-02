const test = require('node:test');
const assert = require('node:assert/strict');
const { roadRoute } = require('../src/services/roadRouter');

test('roteador viário converte a geometria para o formato do mapa', async () => {
  let requestedUrl = '';
  const fetchImpl = async (url) => {
    requestedUrl = url;
    return {
      ok: true,
      json: async () => ({
        code: 'Ok',
        routes: [{
          distance: 1234,
          duration: 321,
          legs: [{ distance: 1234 }],
          geometry: { coordinates: [[-46.6333, -23.5505], [-46.64, -23.56]] }
        }]
      })
    };
  };
  const result = await roadRoute([
    { lat: -23.5505, lng: -46.6333 },
    { lat: -23.56, lng: -46.64 }
  ], { fetchImpl, timeoutMs: 100 });
  assert.match(requestedUrl, /route\/v1\/driving/);
  assert.equal(result.distanceKm, 1.234);
  assert.deepEqual(result.geometry[0], [-23.5505, -46.6333]);
});
