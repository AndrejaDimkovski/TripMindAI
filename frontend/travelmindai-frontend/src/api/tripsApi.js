import { apiFetch } from "./http";

export function searchTrip({ origin, dest, from, to, adults, cityCode }) {
    const params = new URLSearchParams({
        origin, dest, from,
        adults: String(adults),
        cityCode
    });
    if (to) params.append("to", to);

    return apiFetch(`/api/trips/search?${params.toString()}`);
}
