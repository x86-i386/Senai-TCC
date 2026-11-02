const test = require('node:test');
const assert = require('node:assert/strict');
const { lookupCep, normalizeCep } = require('../src/services/cepLookup');

test('normaliza e consulta CEP retornando endereço e coordenadas', async () => {
  let requestedUrl = '';
  const fetchImpl = async (url) => {
    requestedUrl = url;
    return {
      ok: true,
      json: async () => ({
        street: 'Praça da Sé', neighborhood: 'Sé', city: 'São Paulo', state: 'SP',
        location: { coordinates: { latitude: '-23.5505', longitude: '-46.6333' } }
      })
    };
  };
  const result = await lookupCep('01001-000', { fetchImpl, timeoutMs: 100 });
  assert.equal(normalizeCep('01001-000'), '01001000');
  assert.match(requestedUrl, /01001000$/);
  assert.equal(result.address, 'Praça da Sé, Sé, São Paulo, SP');
  assert.equal(result.latitude, -23.5505);
  assert.equal(result.longitude, -46.6333);
});

test('rejeita CEP incompleto antes da consulta externa', async () => {
  await assert.rejects(() => lookupCep('123', { fetchImpl: async () => assert.fail('não deveria consultar') }), /CEP válido/);
});
