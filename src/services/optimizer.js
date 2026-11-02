const EARTH_RADIUS_KM = 6371;

function haversine(a, b) {
  const rad = (n) => (n * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function optimizeRoute(origin, stops, options = {}) {
  const averageSpeed = Number(options.averageSpeed || 32);
  const serviceMinutes = Number(options.serviceMinutes || 6);
  const emissionFactor = Number(options.emissionFactor || 0.192);
  const remaining = stops.map((stop, index) => ({ ...stop, originalIndex: index }));
  const orderedStops = [];
  let current = origin;
  let distanceKm = 0;

  while (remaining.length) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    remaining.forEach((stop, index) => {
      const distance = haversine(current, stop);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    const [next] = remaining.splice(nearestIndex, 1);
    distanceKm += nearestDistance;
    orderedStops.push({ ...next, legDistanceKm: Number(nearestDistance.toFixed(2)) });
    current = next;
  }

  const baselineKm = stops.reduce((sum, stop, index) => {
    const previous = index === 0 ? origin : stops[index - 1];
    return sum + haversine(previous, stop);
  }, 0);
  const durationMinutes = Math.round((distanceKm / averageSpeed) * 60 + serviceMinutes * stops.length);
  const baselineDuration = Math.round((baselineKm / averageSpeed) * 60 + serviceMinutes * stops.length);
  const savedDistanceKm = Math.max(0, baselineKm - distanceKm);

  return {
    algorithm: 'vizinho-mais-proximo',
    orderedStops,
    distanceKm: Number(distanceKm.toFixed(2)),
    durationMinutes,
    savedDistanceKm: Number(savedDistanceKm.toFixed(2)),
    savedMinutes: Math.max(0, baselineDuration - durationMinutes),
    estimatedCo2Kg: Number((distanceKm * emissionFactor).toFixed(2)),
    co2SavedKg: Number((savedDistanceKm * emissionFactor).toFixed(2)),
    serviceLevel: durationMinutes <= Number(options.slaMinutes || 180) ? 'DENTRO_DO_SLA' : 'RISCO_DE_ATRASO'
  };
}

module.exports = { haversine, optimizeRoute };
