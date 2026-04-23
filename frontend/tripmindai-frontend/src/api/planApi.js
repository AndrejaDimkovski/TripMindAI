import { apiDelete, apiGet, apiPost } from "./http";

export function saveTripPlan(data) {
    return apiPost("/api/plans", data);
}

export function getMyPlans() {
    return apiGet("/api/plans/mine");
}

export function deleteMyPlan(id) {
    return apiDelete(`/api/plans/${id}`);
}
