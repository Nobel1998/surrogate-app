/**
 * Older surrogate forms stored airport name + distance in one `nearestAirport`
 * field (e.g. "LAX 100" or "LAX 100 miles"). Split for display when
 * `airportDistance` is empty.
 */
export function splitAirportFields(nearestAirport: unknown, airportDistance: unknown): {
  nearestAirport: string | null;
  airportDistance: string | null;
} {
  const airportRaw =
    nearestAirport == null || nearestAirport === ''
      ? ''
      : String(nearestAirport).trim();
  const distanceRaw =
    airportDistance == null || airportDistance === ''
      ? ''
      : String(airportDistance).trim();

  if (distanceRaw) {
    return {
      nearestAirport: airportRaw || null,
      airportDistance: distanceRaw,
    };
  }

  if (!airportRaw) {
    return { nearestAirport: null, airportDistance: null };
  }

  const match = airportRaw.match(
    /^(.+?)\s+(\d+(?:\.\d+)?)\s*(?:miles?|mi|公里|千米|km)?\.?$/i
  );
  if (match) {
    return {
      nearestAirport: match[1].trim(),
      airportDistance: match[2].trim(),
    };
  }

  return { nearestAirport: airportRaw, airportDistance: null };
}
