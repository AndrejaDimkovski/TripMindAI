export const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";

const TOKEN_KEY = "tm_jwt_token";

export function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
    if (token) {
        sessionStorage.setItem(TOKEN_KEY, token);
    }
}

export function clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event("tm_auth_cleared"));
}

export async function apiFetch(path, options = {}) {
    const {
        method = "GET",
        body,
        headers = {},
    } = options;

    const token = getToken();

    const response = await fetch(`${API_BASE}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
        },
        body: body != null ? JSON.stringify(body) : undefined,
        credentials: "include",
    });

    const payload = await parseResponsePayload(response);

    if (!response.ok) {
        if (response.status === 401 && !path.startsWith("/api/auth/login")) {
            clearToken();
        }

        const message =
            (typeof payload === "string" && payload) ||
            payload?.message ||
            payload?.detail ||
            payload?.error ||
            "Request not succesful.";

        const error = new Error(message);
        error.status = response.status;
        throw error;
    }

    return payload;
}

export const apiGet = (path) => apiFetch(path);
export const apiPost = (path, body) => apiFetch(path, { method: "POST", body });
export const apiPut = (path, body) => apiFetch(path, { method: "PUT", body });
export const apiDelete = (path) => apiFetch(path, { method: "DELETE" });

async function parseResponsePayload(response) {
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    return isJson
        ? response.json().catch(() => null)
        : response.text().catch(() => "");
}
