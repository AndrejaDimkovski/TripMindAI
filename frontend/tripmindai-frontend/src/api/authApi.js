import { apiFetch, apiPost, clearToken, setToken } from "./http";

export const registerUser = (data) => apiPost("/api/auth/register", data);
export const verifyEmailCode = (data) => apiPost("/api/auth/verify-email", data);
export const loginUser = (data) => apiPost("/api/auth/login", data);
export const loginUser2fa = (data) => apiPost("/api/auth/login/2fa", data);
export const me = () => apiFetch("/api/auth/me");
export const setup2fa = () => apiPost("/api/auth/2fa/setup", {});
export const confirm2fa = (data) => apiPost("/api/auth/2fa/confirm", data);

export function storeAuthToken(token) {
    setToken(token);
}

export function logoutUser() {
    clearToken();
    return Promise.resolve({ message: "logged-out" });
}
