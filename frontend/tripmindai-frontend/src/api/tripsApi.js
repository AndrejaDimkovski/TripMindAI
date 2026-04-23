import { apiGet } from "./http";

export function searchTrip({
                               origin,
                               destination,
                               from,
                               to,
                               adults,
                               cityCode,
                               countryCode,
                               targetCurrency = "EUR",
                               countryOfResidence,
                               roomQuantity,
                               priceRange,
                               paymentPolicy,
                               boardType,
                               includeClosed,
                               bestRateOnly,
                           }) {
    const params = new URLSearchParams({
        origin: origin || "",
        destination: destination || "",
        from: from || "",
        adults: String(adults ?? 1),
        cityCode: cityCode || destination || "",
        countryCode: countryCode || "",
        targetCurrency: targetCurrency || "EUR",
    });

    appendIfPresent(params, "to", to);
    appendIfPresent(params, "countryOfResidence", countryOfResidence);
    appendIfDefined(params, "roomQuantity", roomQuantity);
    appendIfPresent(params, "priceRange", priceRange);
    appendIfPresent(params, "paymentPolicy", paymentPolicy);
    appendIfPresent(params, "boardType", boardType);
    appendBoolean(params, "includeClosed", includeClosed);
    appendBoolean(params, "bestRateOnly", bestRateOnly);

    return apiGet(`/api/trips/search?${params.toString()}`);
}

export function getHotelDetails({
                                    hotelId,
                                    checkIn,
                                    checkOut,
                                    adults = 1,
                                    cityName,
                                }) {
    const params = new URLSearchParams({
        hotelId: hotelId || "",
        checkIn: checkIn || "",
        checkOut: checkOut || "",
        adults: String(adults ?? 1),
    });

    appendIfPresent(params, "cityName", cityName);

    return apiGet(`/api/trips/hotel-details?${params.toString()}`);
}

export function getHotelFullDetails({
                                        hotelId,
                                        checkIn,
                                        checkOut,
                                        adults = 1,
                                        cityName,
                                    }) {
    const params = new URLSearchParams({
        hotelId: hotelId || "",
        checkIn: checkIn || "",
        checkOut: checkOut || "",
        adults: String(adults ?? 1),
    });

    appendIfPresent(params, "cityName", cityName);

    return apiGet(`/api/trips/hotel-full-details?${params.toString()}`);
}

export function getFlightDetails(token) {
    const params = new URLSearchParams({
        token: token || "",
    });

    return apiGet(`/api/trips/flight-details?${params.toString()}`);
}

function appendIfPresent(params, key, value) {
    if (value) {
        params.append(key, value);
    }
}

function appendIfDefined(params, key, value) {
    if (value != null) {
        params.append(key, String(value));
    }
}

function appendBoolean(params, key, value) {
    if (value != null) {
        params.append(key, String(Boolean(value)));
    }
}
