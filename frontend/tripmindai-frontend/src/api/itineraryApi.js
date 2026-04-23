import { apiPost } from "./http";

export function generateTripItinerary(planId) {
    return apiPost(`/api/plans/${planId}/generate-itinerary`, {});
}
