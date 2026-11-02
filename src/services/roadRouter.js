const OSRM_BASE_URL = process.env.ROUTING_API_URL || 'https://router.project-osrm.org';

async function roadRoute(points, { timeoutMs = 8000, fetchImpl = global.fetch } = {}) {
  const coordinates = points.map((point) => `${Number(point.lng)},${Number(point.lat)}`).join(';');
  const url = `${OSRM_BASE_URL}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'UrbanLink-Flow/1.0' }
    });
    if (!response.ok) throw new Error(`Serviço de rotas respondeu ${response.status}.`);
    const payload = await response.json();
    const route = payload.routes?.[0];
    if (payload.code !== 'Ok' || !route?.geometry?.coordinates?.length) throw new Error('O serviço não encontrou um trajeto viário.');
    return {
      distanceKm: route.distance / 1000,
      drivingMinutes: route.duration / 60,
      legDistancesKm: route.legs.map((leg) => leg.distance / 1000),
      geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { roadRoute };
