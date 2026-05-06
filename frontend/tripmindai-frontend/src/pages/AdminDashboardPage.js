import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, API_BASE } from "../api/http";
import {
    createCountryAdmin,
    updateCountryAdmin,
    deleteCountryAdmin,
    createDestinationAdmin,
    updateDestinationAdmin,
    deleteDestinationAdmin,
} from "../api/adminGeoApi";

function imgUrl(path) {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${API_BASE}${path}`;
}

function displayValue(value, fallback = "—") {
    if (value == null) return fallback;
    if (typeof value === "string" && value.trim() === "") return fallback;
    return value;
}

function formatCoordinate(value) {
    if (value == null || value === "") return "—";
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(6) : String(value);
}

function HeroPill({ children }) {
    return (
        <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
            {children}
        </span>
    );
}

function HeroButton({ children, primary = false, className = "", ...props }) {
    return (
        <button
            {...props}
            className={`rounded-[18px] px-5 py-3 text-sm font-semibold transition ${
                primary
                    ? "bg-[#2b5da8] text-white shadow-lg hover:bg-[#214d8f] disabled:cursor-not-allowed disabled:bg-[#2b5da880]"
                    : "border border-white/20 bg-white/10 text-white hover:bg-white/20"
            } ${className}`}
        >
            {children}
        </button>
    );
}

function GlassPanel({ children, className = "" }) {
    return (
        <div className={`rounded-[28px] border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl ${className}`}>
            {children}
        </div>
    );
}

function GlassSection({ title, subtitle, children, action, className = "" }) {
    return (
        <GlassPanel className={`p-5 text-white lg:p-6 ${className}`}>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    {subtitle ? <p className="mt-1 text-sm text-white/70">{subtitle}</p> : null}
                </div>
                {action ? <div>{action}</div> : null}
            </div>
            {children}
        </GlassPanel>
    );
}

function Badge({ children, tone = "light" }) {
    const styles = {
        light: "bg-white/90 text-slate-900",
        green: "bg-emerald-100 text-emerald-700",
        blue: "bg-blue-100 text-blue-700",
        yellow: "bg-amber-100 text-amber-700",
        red: "bg-rose-100 text-rose-700",
        slate: "bg-slate-100 text-slate-700",
    };

    return (
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[tone] || styles.light}`}>
            {children}
        </span>
    );
}

function InfoTile({ label, value }) {
    return (
        <div className="rounded-2xl bg-white/10 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                {label}
            </div>
            <div className="mt-2 break-words text-sm font-semibold leading-6 text-white">
                {displayValue(value)}
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-white/82">{label}</label>
            {children}
        </div>
    );
}

function inputClass() {
    return "w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-white/30 focus:bg-white/15";
}

function Input({ label, className = "", ...props }) {
    return (
        <Field label={label}>
            <input {...props} className={`${inputClass()} ${className}`} />
        </Field>
    );
}

function Textarea({ label, className = "", ...props }) {
    return (
        <Field label={label}>
            <textarea {...props} className={`${inputClass()} ${className}`} />
        </Field>
    );
}

function Select({ label, children, className = "", ...props }) {
    return (
        <Field label={label}>
            <select {...props} className={`${inputClass()} ${className}`}>
                {children}
            </select>
        </Field>
    );
}

function ActionButton({ children, variant = "primary", className = "", ...props }) {
    const styles = {
        primary: "bg-[#2b5da8] text-white hover:bg-[#214d8f]",
        secondary: "border border-white/20 bg-white/10 text-white hover:bg-white/20",
        success: "border border-emerald-300/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20",
        danger: "border border-rose-300/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20",
    };

    return (
        <button
            {...props}
            className={`rounded-2xl px-4 py-2 font-semibold transition ${styles[variant] || styles.primary} ${className}`}
        >
            {children}
        </button>
    );
}

function PreviewImage({ src, alt, className = "" }) {
    if (!src) {
        return (
            <div className={`flex items-center justify-center bg-white/10 text-sm text-white/55 ${className}`}>
                No image
            </div>
        );
    }

    return <img src={src} alt={displayValue(alt, "Preview")} className={className} />;
}

export default function AdminDashboardPage() {
    const navigate = useNavigate();
    const [countries, setCountries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");

    const [countryForm, setCountryForm] = useState({
        code: "",
        name: "",
        currencyCode: "EUR",
    });

    const [editingCountryId, setEditingCountryId] = useState(null);

    const [destinationForm, setDestinationForm] = useState({
        countryCode: "",
        cityCode: "",
        name: "",
        latitude: "",
        longitude: "",
        description: "",
        image: null,
    });

    const [editingDestinationId, setEditingDestinationId] = useState(null);
    const [selectedCountryFilter, setSelectedCountryFilter] = useState("");

    async function loadData() {
        setLoading(true);
        setErr("");
        try {
            const data = await apiGet("/api/geo/countries");
            setCountries(Array.isArray(data) ? data : []);
        } catch (e) {
            setErr(e.message || "Failed to load data.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    const allDestinations = useMemo(() => {
        return countries.flatMap((c) =>
            (c.destinations || []).map((d) => ({
                ...d,
                countryName: c.name,
                countryCodeResolved: c.code,
            }))
        );
    }, [countries]);

    const filteredDestinations = useMemo(() => {
        if (!selectedCountryFilter) return allDestinations;

        return allDestinations.filter((d) => d.countryCodeResolved === selectedCountryFilter);
    }, [allDestinations, selectedCountryFilter]);

    async function handleCountrySubmit(e) {
        e.preventDefault();
        setErr("");
        setMsg("");

        try {
            if (!countryForm.code.trim() || !countryForm.name.trim()) {
                throw new Error("Country code and name are required.");
            }

            if (editingCountryId) {
                await updateCountryAdmin(editingCountryId, countryForm);
                setMsg("Country updated.");
            } else {
                await createCountryAdmin(countryForm);
                setMsg("Country created.");
            }

            setCountryForm({ code: "", name: "", currencyCode: "EUR" });
            setEditingCountryId(null);
            await loadData();
        } catch (e2) {
            setErr(e2.message || "Country action failed.");
        }
    }

    function startEditCountry(c) {
        setEditingCountryId(c.id);
        setCountryForm({
            code: c.code || "",
            name: c.name || "",
            currencyCode: c.currencyCode || "EUR",
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function handleDeleteCountry(id) {
        if (!window.confirm("Delete this country and its destinations?")) return;

        setErr("");
        setMsg("");

        try {
            await deleteCountryAdmin(id);
            setMsg("Country deleted.");
            await loadData();
        } catch (e) {
            setErr(e.message || "Delete failed.");
        }
    }

    async function handleDestinationSubmit(e) {
        e.preventDefault();
        setErr("");
        setMsg("");

        try {
            if (!destinationForm.name.trim()) throw new Error("Destination name is required.");

            if (!editingDestinationId) {
                if (!destinationForm.countryCode.trim()) throw new Error("Country is required.");
                if (!destinationForm.cityCode.trim()) throw new Error("City code is required.");
                if (destinationForm.latitude === "" || destinationForm.longitude === "") {
                    throw new Error("Latitude and longitude are required.");
                }

                await createDestinationAdmin(destinationForm);
                setMsg("Destination created.");
            } else {
                await updateDestinationAdmin(editingDestinationId, destinationForm);
                setMsg("Destination updated.");
            }

            setDestinationForm({
                countryCode: "",
                cityCode: "",
                name: "",
                latitude: "",
                longitude: "",
                description: "",
                image: null,
            });
            setEditingDestinationId(null);
            await loadData();
        } catch (e2) {
            setErr(e2.message || "Destination action failed.");
        }
    }

    function startEditDestination(d) {
        setEditingDestinationId(d.id);
        setDestinationForm({
            countryCode: d.countryCodeResolved || d.countryCode || "",
            cityCode: d.cityCode || "",
            name: d.name || "",
            latitude: d.latitude ?? "",
            longitude: d.longitude ?? "",
            description: d.description || "",
            image: null,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function handleDeleteDestination(id) {
        if (!window.confirm("Delete this destination?")) return;

        setErr("");
        setMsg("");

        try {
            await deleteDestinationAdmin(id);
            setMsg("Destination deleted.");
            await loadData();
        } catch (e) {
            setErr(e.message || "Delete failed.");
        }
    }

    return (
        <div className="min-h-screen bg-[#0b1620]">
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1800&auto=format&fit=crop')] bg-cover bg-center" />
                <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(6,13,20,0.93)_0%,rgba(8,18,28,0.84)_34%,rgba(8,18,28,0.52)_70%,rgba(8,18,28,0.42)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_30%)]" />

                <div className="relative z-10 mx-auto w-full max-w-[1550px] px-4 pb-14 pt-24 lg:px-6">
                    <div className="grid items-start gap-8 xl:grid-cols-[1.08fr_0.92fr]">
                        <div className="pt-6 lg:pt-8">
                            <HeroPill>Admin Panel</HeroPill>

                            <h1 className="mt-6 max-w-4xl text-4xl font-extrabold leading-[1.08] text-white md:text-5xl xl:text-[4rem]">
                                Manage countries and destinations
                            </h1>

                            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 md:text-base">
                                Create, update and organize the geographic content shown in your
                                TripMindAI experience. Keep countries and destinations structured,
                                visual and ready for discovery.
                            </p>

                            <div className="mt-8 flex flex-wrap gap-3">
                                <HeroButton onClick={loadData} disabled={loading}>
                                    {loading ? "Refreshing..." : "Refresh data"}
                                </HeroButton>
                                <HeroButton onClick={() => navigate("/admin/analytics")}>
                                    View analytics
                                </HeroButton>
                            </div>
                        </div>

                        <div className="w-full max-w-[560px] justify-self-end">
                            <GlassSection title="Overview" subtitle="Quick admin content stats">
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <InfoTile label="Countries" value={countries.length} />
                                    <InfoTile label="Destinations" value={allDestinations.length} />
                                    <InfoTile
                                        label="Editing"
                                        value={editingCountryId || editingDestinationId ? "Yes" : "No"}
                                    />
                                </div>
                            </GlassSection>
                        </div>
                    </div>

                    {msg ? (
                        <div className="mt-8">
                            <GlassPanel className="p-4 text-white">
                                <div className="text-sm">✅ {msg}</div>
                            </GlassPanel>
                        </div>
                    ) : null}

                    {err ? (
                        <div className="mt-4">
                            <GlassPanel className="p-4 text-white">
                                <div className="text-sm">⚠️ {err}</div>
                            </GlassPanel>
                        </div>
                    ) : null}

                    <div className="mt-8 grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
                        <div className="space-y-6">
                            <GlassSection
                                title={editingCountryId ? "Edit Country" : "Add Country"}
                                subtitle="Create or update a country card"
                            >
                                <form onSubmit={handleCountrySubmit} className="space-y-4">
                                    <Input
                                        label="Code"
                                        value={countryForm.code}
                                        onChange={(e) =>
                                            setCountryForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))
                                        }
                                        placeholder="FR"
                                        maxLength={2}
                                    />

                                    <Input
                                        label="Name"
                                        value={countryForm.name}
                                        onChange={(e) =>
                                            setCountryForm((p) => ({ ...p, name: e.target.value }))
                                        }
                                        placeholder="France"
                                    />

                                    <Input
                                        label="Currency"
                                        value={countryForm.currencyCode}
                                        onChange={(e) =>
                                            setCountryForm((p) => ({
                                                ...p,
                                                currencyCode: e.target.value.toUpperCase(),
                                            }))
                                        }
                                        placeholder="EUR"
                                        maxLength={3}
                                    />

                                    <div className="flex flex-wrap gap-3">
                                        <ActionButton type="submit" variant="primary">
                                            {editingCountryId ? "Update Country" : "Create Country"}
                                        </ActionButton>

                                        {editingCountryId ? (
                                            <ActionButton
                                                variant="secondary"
                                                type="button"
                                                onClick={() => {
                                                    setEditingCountryId(null);
                                                    setCountryForm({ code: "", name: "", currencyCode: "EUR" });
                                                }}
                                            >
                                                Cancel
                                            </ActionButton>
                                        ) : null}
                                    </div>
                                </form>
                            </GlassSection>

                            <GlassSection
                                title={editingDestinationId ? "Edit Destination" : "Add Destination"}
                                subtitle="Manage destination data and image"
                            >
                                <form onSubmit={handleDestinationSubmit} className="space-y-4">
                                    {!editingDestinationId ? (
                                        <>
                                            <Select
                                                label="Country"
                                                value={destinationForm.countryCode}
                                                onChange={(e) =>
                                                    setDestinationForm((p) => ({
                                                        ...p,
                                                        countryCode: e.target.value,
                                                    }))
                                                }
                                            >
                                                <option className="text-slate-900" value="">Choose country</option>
                                                {countries.map((c) => (
                                                    <option className="text-slate-900" key={c.code} value={c.code}>
                                                        {c.name} ({c.code})
                                                    </option>
                                                ))}
                                            </Select>

                                            <Input
                                                label="City Code"
                                                value={destinationForm.cityCode}
                                                onChange={(e) =>
                                                    setDestinationForm((p) => ({
                                                        ...p,
                                                        cityCode: e.target.value.toUpperCase(),
                                                    }))
                                                }
                                                placeholder="PAR"
                                            />
                                        </>
                                    ) : null}

                                    <Input
                                        label="Name"
                                        value={destinationForm.name}
                                        onChange={(e) =>
                                            setDestinationForm((p) => ({ ...p, name: e.target.value }))
                                        }
                                        placeholder="Paris"
                                    />

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Input
                                            label="Latitude"
                                            type="number"
                                            step="any"
                                            value={destinationForm.latitude}
                                            onChange={(e) =>
                                                setDestinationForm((p) => ({
                                                    ...p,
                                                    latitude: e.target.value,
                                                }))
                                            }
                                        />

                                        <Input
                                            label="Longitude"
                                            type="number"
                                            step="any"
                                            value={destinationForm.longitude}
                                            onChange={(e) =>
                                                setDestinationForm((p) => ({
                                                    ...p,
                                                    longitude: e.target.value,
                                                }))
                                            }
                                        />
                                    </div>

                                    <Textarea
                                        label="Description"
                                        rows={4}
                                        value={destinationForm.description}
                                        onChange={(e) =>
                                            setDestinationForm((p) => ({
                                                ...p,
                                                description: e.target.value,
                                            }))
                                        }
                                    />

                                    <Input
                                        label="Image"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) =>
                                            setDestinationForm((p) => ({
                                                ...p,
                                                image: e.target.files?.[0] || null,
                                            }))
                                        }
                                    />

                                    <div className="flex flex-wrap gap-3">
                                        <ActionButton type="submit" variant="primary">
                                            {editingDestinationId ? "Update Destination" : "Create Destination"}
                                        </ActionButton>

                                        {editingDestinationId ? (
                                            <ActionButton
                                                variant="secondary"
                                                type="button"
                                                onClick={() => {
                                                    setEditingDestinationId(null);
                                                    setDestinationForm({
                                                        countryCode: "",
                                                        cityCode: "",
                                                        name: "",
                                                        latitude: "",
                                                        longitude: "",
                                                        description: "",
                                                        image: null,
                                                    });
                                                }}
                                            >
                                                Cancel
                                            </ActionButton>
                                        ) : null}
                                    </div>
                                </form>
                            </GlassSection>
                        </div>

                        <div className="space-y-6">
                            <GlassSection title="Countries" subtitle={`${countries.length} country records`}>
                                {countries.length ? (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {countries.map((c) => (
                                            <div
                                                className="rounded-[28px] border border-white/10 bg-white/10 p-5"
                                                key={c.code}
                                            >
                                                <div className="text-white">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex items-start gap-3">
                                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-sm font-black text-white">
                                                                {displayValue(c.code, "CO")}
                                                            </div>
                                                            <div>
                                                                <h3 className="text-lg font-bold text-white">{displayValue(c.name, "Country")}</h3>
                                                                <div className="mt-1 text-sm text-white/60">Code: {displayValue(c.code)}</div>
                                                                <div className="mt-1 text-sm text-white/60">Currency: {displayValue(c.currencyCode, "EUR")}</div>
                                                                <div className="mt-1 text-sm text-white/60">
                                                                    Destinations: {(c.destinations || []).length}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Badge tone="green">Country</Badge>
                                                    </div>

                                                    <div className="mt-5 flex flex-wrap gap-3">
                                                        <ActionButton
                                                            variant="success"
                                                            className="px-3 py-2 text-sm"
                                                            onClick={() => startEditCountry(c)}
                                                        >
                                                            Edit
                                                        </ActionButton>
                                                        <ActionButton
                                                            variant="danger"
                                                            className="px-3 py-2 text-sm"
                                                            onClick={() => handleDeleteCountry(c.id)}
                                                        >
                                                            Delete
                                                        </ActionButton>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-white/65">No countries yet.</div>
                                )}
                            </GlassSection>

                            <GlassSection
                                title="Destinations"
                                subtitle={`${filteredDestinations.length} of ${allDestinations.length} destination records`}
                                action={
                                    <select
                                        value={selectedCountryFilter}
                                        onChange={(e) => setSelectedCountryFilter(e.target.value)}
                                        className="min-w-[220px] rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white outline-none transition focus:border-white/30 focus:bg-white/15"
                                    >
                                        <option className="text-slate-900" value="">All countries</option>
                                        {countries.map((c) => (
                                            <option className="text-slate-900" key={c.code} value={c.code}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                }
                            >
                                {filteredDestinations.length ? (
                                    <div className="space-y-4">
                                        {filteredDestinations.map((d) => (
                                            <div
                                                className="overflow-hidden rounded-[28px] border border-white/10 bg-white/10"
                                                key={d.id || `${d.countryCode}-${d.cityCode}`}
                                            >
                                                <div className="grid md:grid-cols-[0.85fr_1.15fr]">
                                                    <div>
                                                        <PreviewImage
                                                            src={d.imageUrl ? imgUrl(d.imageUrl) : ""}
                                                            alt={d.name}
                                                            className="h-full min-h-[250px] w-full object-cover"
                                                        />
                                                    </div>

                                                    <div className="p-5 text-white">
                                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                            <div>
                                                                <h3 className="text-lg font-bold text-white">{displayValue(d.name, "Destination")}</h3>
                                                                <div className="mt-1 text-sm text-white/60">
                                                                    {displayValue(d.countryName, "Country")} • {displayValue(d.cityCode, "—")}
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-wrap gap-3">
                                                                <ActionButton
                                                                    variant="success"
                                                                    className="px-3 py-2 text-sm"
                                                                    onClick={() => startEditDestination(d)}
                                                                >
                                                                    Edit
                                                                </ActionButton>
                                                                <ActionButton
                                                                    variant="danger"
                                                                    className="px-3 py-2 text-sm"
                                                                    onClick={() => handleDeleteDestination(d.id)}
                                                                >
                                                                    Delete
                                                                </ActionButton>
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/70">
                                                            Lat: {formatCoordinate(d.latitude)} • Lng: {formatCoordinate(d.longitude)}
                                                        </div>

                                                        <div className="mt-4 text-sm leading-7 text-white/75">
                                                            {displayValue(d.description, "No description.")}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-white/65">
                                        {selectedCountryFilter
                                            ? "No destinations for the selected country."
                                            : "No destinations yet."}
                                    </div>
                                )}
                            </GlassSection>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
