import { API_BASE, getToken } from "./http";

export function createCountryAdmin({ code, name, currencyCode, image }) {
    const formData = new FormData();
    formData.append("code", code);
    formData.append("name", name);
    formData.append("currencyCode", currencyCode || "EUR");

    if (image) {
        formData.append("image", image);
    }

    return sendForm("/api/admin/geo/countries", "POST", formData);
}

export function updateCountryAdmin(id, { code, name, currencyCode, image }) {
    const formData = new FormData();

    appendIfPresent(formData, "code", code);
    appendIfPresent(formData, "name", name);
    appendIfPresent(formData, "currencyCode", currencyCode);

    if (image) {
        formData.append("image", image);
    }

    return sendForm(`/api/admin/geo/countries/${id}`, "PUT", formData);
}

export function deleteCountryAdmin(id) {
    return sendDelete(`/api/admin/geo/countries/${id}`);
}

export function createDestinationAdmin(data) {
    const formData = new FormData();
    formData.append("countryCode", data.countryCode);
    formData.append("cityCode", data.cityCode);
    formData.append("name", data.name);
    formData.append("latitude", String(data.latitude));
    formData.append("longitude", String(data.longitude));

    appendIfPresent(formData, "description", data.description);

    if (data.image) {
        formData.append("image", data.image);
    }

    return sendForm("/api/admin/geo/destinations", "POST", formData);
}

export function updateDestinationAdmin(id, data) {
    const formData = new FormData();

    appendIfPresent(formData, "name", data.name);
    appendIfDefined(formData, "latitude", data.latitude);
    appendIfDefined(formData, "longitude", data.longitude);
    appendIfNullable(formData, "description", data.description);

    if (data.image) {
        formData.append("image", data.image);
    }

    return sendForm(`/api/admin/geo/destinations/${id}`, "PUT", formData);
}

export function deleteDestinationAdmin(id) {
    return sendDelete(`/api/admin/geo/destinations/${id}`);
}

async function sendForm(path, method, formData) {
    const token = getToken();

    const response = await fetch(`${API_BASE}${path}`, {
        method,
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
    });

    return parseResponse(response);
}

async function sendDelete(path) {
    const token = getToken();

    const response = await fetch(`${API_BASE}${path}`, {
        method: "DELETE",
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    return parseResponse(response);
}

async function parseResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    const payload = isJson
        ? await response.json().catch(() => null)
        : await response.text().catch(() => "");

    if (!response.ok) {
        const message =
            (typeof payload === "string" && payload) ||
            payload?.message ||
            payload?.error ||
            `HTTP ${response.status}`;

        throw new Error(message);
    }

    return payload;
}

function appendIfPresent(formData, key, value) {
    if (value) {
        formData.append(key, value);
    }
}

function appendIfDefined(formData, key, value) {
    if (value !== "" && value != null) {
        formData.append(key, String(value));
    }
}

function appendIfNullable(formData, key, value) {
    if (value != null) {
        formData.append(key, value);
    }
}
