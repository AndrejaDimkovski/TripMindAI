import { apiGet } from "./http";

export function getAdminAnalyticsSummary() {
    return apiGet("/api/admin/analytics/summary");
}
