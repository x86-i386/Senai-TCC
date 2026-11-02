function normalizeCep(value) {
  return String(value || '').replace(/\D/g, '');
}

async function lookupCep(value, options = {}) {
  const cep = normalizeCep(value);
  if (cep.length !== 8) throw Object.assign(new Error('Informe um CEP válido com 8 números.'), { status: 422 });
  const fetchImpl = options.fetchImpl || fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || 8000);
  try {
    const response = await fetchImpl(`https://brasilapi.com.br/api/cep/v2/${cep}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'UrbanLink-Flow/1.0' }
    });
    if (!response.ok) throw Object.assign(new Error('CEP não encontrado.'), { status: response.status === 404 ? 404 : 502 });
    const data = await response.json();
    let latitude = Number(data.location?.coordinates?.latitude);
    let longitude = Number(data.location?.coordinates?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      const query = [data.street, data.neighborhood, data.city, data.state, cep, 'Brasil'].filter(Boolean).join(', ');
      const geocode = await fetchImpl(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json', 'User-Agent': 'UrbanLink-Flow/1.0' }
      });
      const matches = geocode.ok ? await geocode.json() : [];
      latitude = Number(matches[0]?.lat);
      longitude = Number(matches[0]?.lon);
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw Object.assign(new Error('O CEP foi encontrado, mas não foi possível posicioná-lo no mapa.'), { status: 422 });
    return {
      cep,
      address: [data.street, data.neighborhood, data.city, data.state].filter(Boolean).join(', '),
      street: data.street || '',
      neighborhood: data.neighborhood || '',
      city: data.city || '',
      state: data.state || '',
      latitude,
      longitude
    };
  } catch (error) {
    if (error.name === 'AbortError') throw Object.assign(new Error('A consulta do CEP demorou demais. Tente novamente.'), { status: 504 });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { lookupCep, normalizeCep };
