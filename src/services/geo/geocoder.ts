/* Busca de endereço (Nominatim/OpenStreetMap). Só sai daqui o texto
   digitado (ou a comarca da matrícula) — nunca dados das pessoas. */

export interface Place {
  label: string;
  lat: number;
  lon: number;
}

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';

export async function searchPlaces(q: string, limit = 5, signal?: AbortSignal): Promise<Place[]> {
  const url = `${ENDPOINT}?format=json&limit=${limit}&accept-language=pt-BR&countrycodes=br&q=${encodeURIComponent(q)}`;
  const r = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`busca respondeu ${r.status}`);
  const list = (await r.json()) as { display_name: string; lat: string; lon: string }[];
  return list.map((p) => ({ label: p.display_name, lat: parseFloat(p.lat), lon: parseFloat(p.lon) }));
}
