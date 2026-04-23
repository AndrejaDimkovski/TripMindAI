const API_BASE = "http://localhost:8080";

export async function apiGet(path) {
    const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed (${res.status})`);
    }
    return res.json();
}
