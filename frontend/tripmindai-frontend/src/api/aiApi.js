import { apiPost } from "./http";

export function recommendTripAi(payload) {
    return apiPost("/api/ai/recommend", buildAiPayload(payload));
}

export function getAiOffers(payload) {
    return apiPost("/api/ai/offers", buildAiPayload(payload));
}

function buildAiPayload({
                            prompt,
                            fromDate,
                            toDate,
                            people,
                            originCity,
                            budgetLevel,
                        }) {
    return {
        prompt,
        fromDate,
        toDate,
        people,
        originCity,
        budgetLevel,
    };
}
