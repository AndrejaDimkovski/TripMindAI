import { apiFetch } from "./http";

export const registerUser = (data) =>
    apiFetch("/api/auth/register", { method: "POST", body: data });

export const loginUser = (data) =>
    apiFetch("/api/auth/login", { method: "POST", body: data });

export const logoutUser = () =>
    apiFetch("/api/auth/logout", { method: "POST" });
