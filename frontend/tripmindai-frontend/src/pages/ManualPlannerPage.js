import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api";
import { API_BASE } from "../api/http";
import { searchTrip } from "../api/tripsApi";

const FLOW_STORAGE_KEY = "tm_flow_v1";
const BACKEND_BASE = API_BASE || "http://localhost:8080";

function readFlowState() {
    try {
        const raw = sessionStorage.getItem(FLOW_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function saveFlowState(nextState) {
    try {
        sessionStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(nextState));
    } catch {}
}

function normalizeDateToIso(value) {
    if (!value) return "";

    const v = String(value).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

    const m1 = v.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (m1) {
        const [, dd, mm, yyyy] = m1;
        return `${yyyy}-${mm}-${dd}`;
    }

    const m2 = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m2) {
        const [, dd, mm, yyyy] = m2;
        return `${yyyy}-${mm}-${dd}`;
    }

    return "";
}

function formatDateDisplay(value) {
    if (!value) return "";
    const iso = normalizeDateToIso(value);
    if (!iso) return value;
    const [yyyy, mm, dd] = iso.split("-");
    return `${dd}.${mm}.${yyyy}`;
}

function isValidIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(value);
    return !Number.isNaN(d.getTime());
}

function buildImageUrl(path, fallback) {
    if (!path) return fallback;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return `${BACKEND_BASE}${path}`;
}

function destinationImageUrl(destination) {
    return buildImageUrl(
        destination?.imageUrl,
        `${BACKEND_BASE}/images/destinations/default-destination.jpg`
    );
}

function normalizeCityKey(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function resolveOriginToIata(input) {
    const raw = String(input || "").trim();
    if (!raw) return "SKP";

    if (/^[A-Za-z]{3}$/.test(raw)) {
        return raw.toUpperCase();
    }

    const cityToIata = {
        "skopje": "SKP",
        "new york": "NYC",
        "nyc": "NYC",
        "london": "LON",
        "paris": "PAR",
        "rome": "ROM",
        "milan": "MIL",
        "venice": "VCE",
        "istanbul": "IST",
        "antalya": "AYT",
        "izmir": "IZM",
        "bangkok": "BKK",
        "phuket": "HKT",
        "chiang mai": "CNX",
        "barcelona": "BCN",
        "madrid": "MAD",
        "palma": "PMI",
        "nice": "NCE",
        "lyon": "LYS",
        "los angeles": "LAX",
        "miami": "MIA",
        "belgrade": "BEG",
        "athens": "ATH",
        "vienna": "VIE",
        "berlin": "BER",
        "amsterdam": "AMS",
        "zurich": "ZRH",
        "dubai": "DXB",
        "doha": "DOH",
        "podgorica": "TGD",
        "tirana": "TIA",
        "sofia": "SOF",
    };

    const normalized = normalizeCityKey(raw);
    return cityToIata[normalized] || raw.toUpperCase();
}

function boardTypeLabel(value) {
    switch (value) {
        case "ROOM_ONLY":
            return "Room only";
        case "BREAKFAST":
            return "Breakfast included";
        case "HALF_BOARD":
            return "Half board";
        case "FULL_BOARD":
            return "Full board";
        case "ALL_INCLUSIVE":
            return "All inclusive";
        default:
            return "Any";
    }
}

function paymentPolicyLabel(value) {
    switch (value) {
        case "GUARANTEE":
            return "Guarantee";
        case "DEPOSIT":
            return "Prepayment required";
        case "NONE":
        default:
            return "Any";
    }
}

function originDisplayValue(value) {
    const raw = String(value || "").trim().toUpperCase();

    if (!raw) return "Skopje";
    if (raw === "SKP") return "Skopje";

    return value;
}

function normalizeDestination(destination) {
    if (!destination) return null;

    return {
        id: destination.id ?? null,
        cityCode: destination.cityCode || "",
        countryCode: destination.countryCode || "",
        name: destination.name || "",
        description: destination.description || "",
        latitude: destination.latitude ?? null,
        longitude: destination.longitude ?? null,
        imageUrl: destination.imageUrl || null,
    };
}

function normalizeCountry(country) {
    if (!country) return null;

    return {
        ...country,
        id: country.id ?? null,
        code: country.code || "",
        name: country.name || "",
        imageUrl: country.imageUrl || null,
        destinations: Array.isArray(country.destinations)
            ? country.destinations.map((d) => normalizeDestination(d))
            : [],
    };
}

function CardImage({ src, alt, className = "" }) {
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
    }, [src]);

    if (!src || failed) {
        return (
            <div className={`flex items-center justify-center bg-slate-200/80 text-slate-400 ${className}`}>
                <span className="text-sm">No image</span>
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={() => setFailed(true)}
            loading="lazy"
        />
    );
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
            className={`rounded-[20px] px-6 py-3 font-semibold transition ${
                primary
                    ? "bg-[#2b5da8] text-white shadow-lg hover:bg-[#214d8f] disabled:bg-[#2b5da880] disabled:cursor-not-allowed"
                    : "border border-white/20 bg-white/10 text-white hover:bg-white/20"
            } ${className}`}
        >
            {children}
        </button>
    );
}

function GlassCard({ children, className = "" }) {
    return (
        <div className={`rounded-[30px] border border-white/15 bg-white/12 shadow-xl backdrop-blur-xl ${className}`}>
            {children}
        </div>
    );
}

function Badge({ children, tone = "light" }) {
    const styles = {
        light: "bg-slate-100 text-slate-700",
        green: "bg-emerald-100 text-emerald-700",
        blue: "bg-blue-100 text-blue-700",
        yellow: "bg-amber-100 text-amber-700",
        white: "bg-white/90 text-slate-900",
    };

    return (
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[tone] || styles.light}`}>
            {children}
        </span>
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

export default function ManualPlannerPage() {
    const navigate = useNavigate();

    const [countries, setCountries] = useState([]);
    const [loadingCountries, setLoadingCountries] = useState(true);
    const [loadingSearch, setLoadingSearch] = useState(false);

    const [tripMode, setTripMode] = useState("FLIGHT_HOTEL");

    const [error, setError] = useState("");
    const [searchError, setSearchError] = useState("");

    const [activeCountryName, setActiveCountryName] = useState("");
    const [selectedDestination, setSelectedDestination] = useState(null);

    const [searchForm, setSearchForm] = useState({
        origin: "Skopje",
        from: "",
        to: "",
        adults: 1,
        targetCurrency: "EUR",
        countryOfResidence: "MK",
        roomQuantity: 1,
        priceRange: "",
        paymentPolicy: "NONE",
        boardType: "",
        includeClosed: false,
        bestRateOnly: true,
    });

    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        loadInitial();
    }, []);

    async function loadInitial() {
        setLoadingCountries(true);
        setError("");

        try {
            const flow = readFlowState();

            if (flow?.tripMode) {
                setTripMode(flow.tripMode);
            }

            if (flow?.activeCountryName) {
                setActiveCountryName(flow.activeCountryName);
            }

            if (flow?.destination) {
                setSelectedDestination(normalizeDestination(flow.destination));
            }

            if (flow?.searchForm) {
                setSearchForm((prev) => ({
                    ...prev,
                    ...flow.searchForm,
                    origin: originDisplayValue(flow.searchForm.origin),
                }));
            }

            const data = await apiGet("/api/geo/countries");
            const normalized = Array.isArray(data) ? data.map((country) => normalizeCountry(country)) : [];
            let enriched = [...normalized];

            if (flow?.country?.code && flow?.activeCountryName) {
                const matched = enriched.find(
                    (c) => c.name === flow.activeCountryName || c.code === flow.country.code
                );

                if (matched && (!matched.destinations || matched.destinations.length === 0) && matched.code) {
                    try {
                        const dests = await apiGet(
                            `/api/geo/countries/${encodeURIComponent(matched.code)}/destinations`
                        );

                        enriched = enriched.map((c) =>
                            c.name === matched.name
                                ? {
                                    ...c,
                                    destinations: Array.isArray(dests)
                                        ? dests.map((d) => normalizeDestination(d))
                                        : [],
                                }
                                : c
                        );
                    } catch {}
                }
            }

            setCountries(enriched);
        } catch (e) {
            setError(e.message || "Failed to load data.");
        } finally {
            setLoadingCountries(false);
        }
    }

    const activeCountry = useMemo(() => {
        return countries.find((c) => c.name === activeCountryName) || null;
    }, [countries, activeCountryName]);

    const destinations = useMemo(() => {
        return activeCountry?.destinations || [];
    }, [activeCountry]);

    const resolvedOriginIata = useMemo(() => {
        return resolveOriginToIata(searchForm.origin);
    }, [searchForm.origin]);

    function saveDraft(nextSearchForm, nextTripMode = tripMode, nextDestination = selectedDestination, nextCountry = activeCountry) {
        const current = readFlowState() || {};
        saveFlowState({
            ...current,
            tripMode: nextTripMode,
            mode: "manual",
            activeCountryName,
            country: nextCountry
                ? {
                    id: nextCountry.id ?? null,
                    code: nextCountry.code || "",
                    name: nextCountry.name || "",
                    imageUrl: nextCountry.imageUrl || null,
                }
                : null,
            destination: nextDestination ? normalizeDestination(nextDestination) : null,
            searchForm: nextSearchForm,
        });
    }

    function handleTripModeChange(nextMode) {
        setTripMode(nextMode);
        const current = readFlowState() || {};
        saveFlowState({
            ...current,
            tripMode: nextMode,
            mode: "manual",
            activeCountryName,
            country: activeCountry
                ? {
                    id: activeCountry.id ?? null,
                    code: activeCountry.code || "",
                    name: activeCountry.name || "",
                    imageUrl: activeCountry.imageUrl || null,
                }
                : null,
            destination: selectedDestination ? normalizeDestination(selectedDestination) : null,
            searchForm,
        });
    }

    function validateDates(from, to) {
        const fromIso = normalizeDateToIso(from);
        const toIso = normalizeDateToIso(to);

        if (!fromIso || !isValidIsoDate(fromIso)) {
            return "From датум мора да биде во формат DD.MM.YYYY.";
        }

        if (to && (!toIso || !isValidIsoDate(toIso))) {
            return "To датум мора да биде во формат DD.MM.YYYY.";
        }

        if (toIso && toIso < fromIso) {
            return "To датум не смее да биде пред From.";
        }

        return "";
    }

    async function onCountryChange(countryName) {
        setActiveCountryName(countryName);
        setSelectedDestination(null);
        setSearchError("");

        const country = countries.find((c) => c.name === countryName);
        if (!country) return;

        let nextCountry = country;

        if ((!country.destinations || country.destinations.length === 0) && country.code) {
            try {
                const dests = await apiGet(
                    `/api/geo/countries/${encodeURIComponent(country.code)}/destinations`
                );

                const normalizedDests = Array.isArray(dests)
                    ? dests.map((d) => normalizeDestination(d))
                    : [];

                setCountries((prev) =>
                    prev.map((c) =>
                        c.name === country.name
                            ? { ...c, destinations: normalizedDests }
                            : c
                    )
                );

                nextCountry = { ...country, destinations: normalizedDests };
            } catch (e) {
                console.error(e);
            }
        }

        const current = readFlowState() || {};
        saveFlowState({
            ...current,
            tripMode,
            mode: "manual",
            activeCountryName: nextCountry.name,
            country: {
                id: nextCountry.id ?? null,
                code: nextCountry.code || "",
                name: nextCountry.name || "",
                imageUrl: nextCountry.imageUrl || null,
            },
            destination: null,
            selectedFlightIndex: null,
            selectedHotelIndex: null,
            searchResult: null,
        });
    }

    function onDestinationChange(cityCode) {
        const destination = destinations.find((d) => d.cityCode === cityCode) || null;
        const normalizedDestination = normalizeDestination(destination);
        setSelectedDestination(normalizedDestination);

        const current = readFlowState() || {};
        saveFlowState({
            ...current,
            tripMode,
            mode: "manual",
            activeCountryName,
            country: activeCountry
                ? {
                    id: activeCountry.id ?? null,
                    code: activeCountry.code || "",
                    name: activeCountry.name || "",
                    imageUrl: activeCountry.imageUrl || null,
                }
                : null,
            destination: normalizedDestination,
            searchForm,
            selectedFlightIndex: null,
            selectedHotelIndex: null,
            searchResult: null,
        });
    }

    function updateSearchForm(field, value) {
        setSearchForm((prev) => {
            const next = { ...prev, [field]: value };

            const current = readFlowState() || {};
            saveFlowState({
                ...current,
                tripMode,
                mode: "manual",
                activeCountryName,
                country: activeCountry
                    ? {
                        id: activeCountry.id ?? null,
                        code: activeCountry.code || "",
                        name: activeCountry.name || "",
                        imageUrl: activeCountry.imageUrl || null,
                    }
                    : null,
                destination: selectedDestination ? normalizeDestination(selectedDestination) : null,
                searchForm: next,
            });

            return next;
        });
    }

    function normalizeSearchPayload() {
        if (!selectedDestination?.cityCode) {
            throw new Error("Избери дестинација.");
        }

        const msg = validateDates(searchForm.from, searchForm.to);
        if (msg) {
            throw new Error(msg);
        }

        const fromIso = normalizeDateToIso(searchForm.from);
        const toIso = normalizeDateToIso(searchForm.to);
        const originIata = resolveOriginToIata(searchForm.origin);

        return {
            origin: originIata,
            destination: String(selectedDestination.cityCode).trim(),
            cityCode: String(selectedDestination.cityCode).trim(),
            from: fromIso,
            to: toIso || undefined,
            adults: Math.max(1, Number(searchForm.adults || 1)),
            countryCode: activeCountry?.code || selectedDestination?.countryCode || "",
            targetCurrency: searchForm.targetCurrency || "EUR",
            countryOfResidence: String(searchForm.countryOfResidence || "MK").trim().toUpperCase(),
            roomQuantity: Math.max(1, Number(searchForm.roomQuantity || 1)),
            priceRange: searchForm.priceRange?.trim() || undefined,
            paymentPolicy: searchForm.paymentPolicy || "NONE",
            boardType: searchForm.boardType?.trim() || undefined,
            includeClosed: !!searchForm.includeClosed,
            bestRateOnly: !!searchForm.bestRateOnly,
        };
    }

    async function handleSearch() {
        setLoadingSearch(true);
        setSearchError("");

        try {
            const payload = normalizeSearchPayload();
            const data = await searchTrip(payload);

            const current = readFlowState() || {};
            saveFlowState({
                ...current,
                tripMode,
                mode: "manual",
                activeCountryName,
                country: activeCountry
                    ? {
                        id: activeCountry.id ?? null,
                        code: activeCountry.code || "",
                        name: activeCountry.name || "",
                        imageUrl: activeCountry.imageUrl || null,
                    }
                    : null,
                destination: selectedDestination ? normalizeDestination(selectedDestination) : null,
                searchForm: {
                    ...searchForm,
                    origin: searchForm.origin || "Skopje",
                    from: normalizeDateToIso(searchForm.from),
                    to: normalizeDateToIso(searchForm.to),
                },
                resolvedOriginIata: payload.origin,
                searchResult: data,
                selectedFlightIndex: null,
                selectedHotelIndex: null,
            });

            navigate(tripMode === "HOTEL_ONLY" ? "/plan/hotels" : "/plan/flights");
        } catch (e) {
            setSearchError(e.message || "Search failed.");
        } finally {
            setLoadingSearch(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#0b1620]">
            <section className="relative min-h-screen overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1800&auto=format&fit=crop')] bg-cover bg-center" />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,14,20,0.82)_0%,rgba(8,18,28,0.56)_36%,rgba(8,18,28,0.22)_68%,rgba(8,18,28,0.16)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_30%)]" />

                <div className="relative z-10 mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 pt-28 lg:px-6">
                    {error ? (
                        <div className="mb-6 rounded-2xl border border-rose-300/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 backdrop-blur">
                            ⚠️ {error}
                        </div>
                    ) : null}

                    {searchError ? (
                        <div className="mb-6 rounded-2xl border border-rose-300/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 backdrop-blur">
                            ⚠️ {searchError}
                        </div>
                    ) : null}

                    <div className="grid w-full items-start gap-10 lg:grid-cols-[1.02fr_0.98fr]">
                        <div className="pt-6 lg:pt-10">
                            <HeroPill>Manual Trip Planner</HeroPill>

                            <h1 className="mt-8 text-6xl font-extrabold uppercase leading-none text-white md:text-7xl xl:text-[6.3rem]">
                                Plan manually
                            </h1>

                            <p className="mt-5 max-w-xl text-sm leading-7 text-white/85 md:text-base">
                                Choose country, destination, dates, guests and filters manually, then continue directly to{" "}
                                {tripMode === "HOTEL_ONLY" ? "hotels" : "flights"} and hotels.
                            </p>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleTripModeChange("FLIGHT_HOTEL")}
                                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                                        tripMode === "FLIGHT_HOTEL"
                                            ? "bg-emerald-500 text-white"
                                            : "bg-white/10 text-white"
                                    }`}
                                >
                                    Flight + Hotel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleTripModeChange("HOTEL_ONLY")}
                                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                                        tripMode === "HOTEL_ONLY"
                                            ? "bg-emerald-500 text-white"
                                            : "bg-white/10 text-white"
                                    }`}
                                >
                                    Hotel only
                                </button>
                            </div>

                            <div className="mt-8 flex flex-wrap gap-4">
                                <HeroButton
                                    primary
                                    onClick={handleSearch}
                                    disabled={!selectedDestination || !searchForm.from || loadingSearch}
                                >
                                    {loadingSearch
                                        ? "Searching..."
                                        : tripMode === "HOTEL_ONLY"
                                            ? "Search hotels"
                                            : "Search flights"}
                                </HeroButton>

                                <HeroButton onClick={() => navigate("/plan/ai")}>
                                    Switch to AI
                                </HeroButton>

                                <HeroButton onClick={() => navigate("/discover")}>
                                    ← Back
                                </HeroButton>
                            </div>
                        </div>

                        <div className="w-full max-w-[650px] justify-self-end space-y-5 pb-12 lg:pb-20">
                            <GlassCard className="p-6 text-white">
                                <div className="mb-5 flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-xl font-bold text-white">Set your trip parameters</div>
                                        <div className="mt-1 text-sm text-white/70">
                                            Choose destination and travel details manually.
                                        </div>
                                    </div>
                                    <Badge tone="white">Manual</Badge>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="md:col-span-2">
                                        <Field label="Country">
                                            <select
                                                className={inputClass()}
                                                value={activeCountryName}
                                                onChange={(e) => onCountryChange(e.target.value)}
                                                disabled={loadingCountries}
                                            >
                                                <option className="text-slate-900" value="">
                                                    Select country
                                                </option>
                                                {countries.map((country) => (
                                                    <option
                                                        className="text-slate-900"
                                                        key={country.id || country.code || country.name}
                                                        value={country.name}
                                                    >
                                                        {country.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>
                                    </div>

                                    <div className="md:col-span-2">
                                        <Field label="Destination">
                                            <select
                                                className={inputClass()}
                                                value={selectedDestination?.cityCode || ""}
                                                onChange={(e) => onDestinationChange(e.target.value)}
                                                disabled={!activeCountry}
                                            >
                                                <option className="text-slate-900" value="">
                                                    Select destination
                                                </option>
                                                {destinations.map((destination) => (
                                                    <option
                                                        className="text-slate-900"
                                                        key={destination.id || destination.cityCode}
                                                        value={destination.cityCode}
                                                    >
                                                        {destination.name} ({destination.cityCode})
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>
                                    </div>

                                    <Field label="Origin city">
                                        <input
                                            type="text"
                                            value={searchForm.origin}
                                            onChange={(e) => updateSearchForm("origin", e.target.value)}
                                            placeholder="Skopje"
                                            className={inputClass()}
                                        />
                                    </Field>

                                    <Field label="Adults">
                                        <input
                                            type="number"
                                            min="1"
                                            value={searchForm.adults}
                                            onChange={(e) =>
                                                updateSearchForm("adults", Math.max(1, Number(e.target.value || 1)))
                                            }
                                            className={inputClass()}
                                        />
                                    </Field>

                                    <Field label="From">
                                        <input
                                            type="text"
                                            placeholder="DD.MM.YYYY"
                                            value={formatDateDisplay(searchForm.from)}
                                            onChange={(e) => {
                                                const raw = e.target.value;
                                                const iso = normalizeDateToIso(raw);
                                                updateSearchForm("from", iso || raw);
                                            }}
                                            className={inputClass()}
                                        />
                                    </Field>

                                    <Field label="To">
                                        <input
                                            type="text"
                                            placeholder="DD.MM.YYYY"
                                            value={formatDateDisplay(searchForm.to)}
                                            onChange={(e) => {
                                                const raw = e.target.value;
                                                const iso = normalizeDateToIso(raw);
                                                updateSearchForm("to", iso || raw);
                                            }}
                                            className={inputClass()}
                                        />
                                    </Field>

                                    <Field label="Currency">
                                        <select
                                            value={searchForm.targetCurrency}
                                            onChange={(e) => updateSearchForm("targetCurrency", e.target.value)}
                                            className={inputClass()}
                                        >
                                            <option className="text-slate-900" value="EUR">EUR</option>
                                            <option className="text-slate-900" value="MKD">MKD</option>
                                            <option className="text-slate-900" value="USD">USD</option>
                                            <option className="text-slate-900" value="GBP">GBP</option>
                                        </select>
                                    </Field>

                                    <div className="flex items-end">
                                        <button
                                            type="button"
                                            onClick={() => setShowAdvanced((prev) => !prev)}
                                            className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                                                showAdvanced
                                                    ? "bg-white/20 text-white"
                                                    : "border border-white/15 bg-white/10 text-white hover:bg-white/15"
                                            }`}
                                        >
                                            {showAdvanced ? "Hide advanced" : "Advanced search"}
                                        </button>
                                    </div>
                                </div>

                                {showAdvanced && (
                                    <div className="mt-5 rounded-[26px] border border-white/10 bg-white/8 p-5">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <Field label="Country of residence">
                                                <input
                                                    type="text"
                                                    maxLength={2}
                                                    value={searchForm.countryOfResidence}
                                                    onChange={(e) =>
                                                        updateSearchForm("countryOfResidence", e.target.value.toUpperCase())
                                                    }
                                                    className={inputClass()}
                                                />
                                            </Field>

                                            <Field label="Rooms">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="9"
                                                    value={searchForm.roomQuantity}
                                                    onChange={(e) =>
                                                        updateSearchForm(
                                                            "roomQuantity",
                                                            Math.max(1, Math.min(9, Number(e.target.value || 1)))
                                                        )
                                                    }
                                                    className={inputClass()}
                                                />
                                            </Field>

                                            <Field label="Budget">
                                                <select
                                                    value={searchForm.priceRange}
                                                    onChange={(e) => updateSearchForm("priceRange", e.target.value)}
                                                    className={inputClass()}
                                                >
                                                    <option className="text-slate-900" value="">Any</option>
                                                    <option className="text-slate-900" value="LOW">Low (up to 500 EUR)</option>
                                                    <option className="text-slate-900" value="MEDIUM">Medium (500 - 1200 EUR)</option>
                                                    <option className="text-slate-900" value="HIGH">High (1200+ EUR)</option>
                                                </select>
                                            </Field>

                                            <Field label="Payment policy">
                                                <select
                                                    value={searchForm.paymentPolicy}
                                                    onChange={(e) => updateSearchForm("paymentPolicy", e.target.value)}
                                                    className={inputClass()}
                                                >
                                                    <option className="text-slate-900" value="NONE">
                                                        {paymentPolicyLabel("NONE")}
                                                    </option>
                                                    <option className="text-slate-900" value="GUARANTEE">
                                                        {paymentPolicyLabel("GUARANTEE")}
                                                    </option>
                                                    <option className="text-slate-900" value="DEPOSIT">
                                                        {paymentPolicyLabel("DEPOSIT")}
                                                    </option>
                                                </select>
                                            </Field>

                                            <Field label="Board type">
                                                <select
                                                    value={searchForm.boardType}
                                                    onChange={(e) => updateSearchForm("boardType", e.target.value)}
                                                    className={inputClass()}
                                                >
                                                    <option className="text-slate-900" value="">
                                                        {boardTypeLabel("")}
                                                    </option>
                                                    <option className="text-slate-900" value="ROOM_ONLY">
                                                        {boardTypeLabel("ROOM_ONLY")}
                                                    </option>
                                                    <option className="text-slate-900" value="BREAKFAST">
                                                        {boardTypeLabel("BREAKFAST")}
                                                    </option>
                                                    <option className="text-slate-900" value="HALF_BOARD">
                                                        {boardTypeLabel("HALF_BOARD")}
                                                    </option>
                                                    <option className="text-slate-900" value="FULL_BOARD">
                                                        {boardTypeLabel("FULL_BOARD")}
                                                    </option>
                                                    <option className="text-slate-900" value="ALL_INCLUSIVE">
                                                        {boardTypeLabel("ALL_INCLUSIVE")}
                                                    </option>
                                                </select>
                                            </Field>
                                        </div>

                                        <div className="mt-5 flex flex-col gap-3">
                                            <label className="inline-flex items-center gap-2 text-sm text-white/80">
                                                <input
                                                    type="checkbox"
                                                    checked={!!searchForm.includeClosed}
                                                    onChange={(e) => updateSearchForm("includeClosed", e.target.checked)}
                                                    className="h-4 w-4 rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-emerald-400"
                                                />
                                                Include sold out hotels
                                            </label>

                                            <label className="inline-flex items-center gap-2 text-sm text-white/80">
                                                <input
                                                    type="checkbox"
                                                    checked={!!searchForm.bestRateOnly}
                                                    onChange={(e) => updateSearchForm("bestRateOnly", e.target.checked)}
                                                    className="h-4 w-4 rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-emerald-400"
                                                />
                                                Show best rate only
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </GlassCard>

                            <GlassCard className="p-6 text-white">
                                <div className="mb-5">
                                    <div className="text-xl font-bold text-white">Selected destination</div>
                                    <div className="mt-1 text-sm text-white/70">
                                        Quick preview before moving to {tripMode === "HOTEL_ONLY" ? "hotel" : "flight"} results
                                    </div>
                                </div>

                                {!selectedDestination ? (
                                    <div className="rounded-2xl bg-white/10 px-4 py-6 text-sm text-white/75">
                                        Select a destination to continue.
                                    </div>
                                ) : (
                                    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/10">
                                        <CardImage
                                            src={destinationImageUrl(selectedDestination)}
                                            alt={selectedDestination.name}
                                            className="h-64 w-full object-cover"
                                        />

                                        <div className="p-5">
                                            <h3 className="text-xl font-bold text-white">
                                                {selectedDestination.name}
                                            </h3>

                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <Badge tone="green">{activeCountryName || "Country"}</Badge>
                                                <Badge tone="white">
                                                    City code: {selectedDestination.cityCode || "—"}
                                                </Badge>
                                                <Badge tone="blue">
                                                    Origin airport: {resolvedOriginIata}
                                                </Badge>
                                                <Badge tone="yellow">
                                                    {tripMode === "HOTEL_ONLY" ? "Hotel only" : "Flight + Hotel"}
                                                </Badge>
                                            </div>

                                            <p className="mt-4 text-sm leading-6 text-white/75">
                                                {selectedDestination.description || "No description available."}
                                            </p>

                                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                                <div className="rounded-2xl bg-white/10 p-4">
                                                    <div className="text-xs uppercase tracking-wide text-white/55">
                                                        Dates
                                                    </div>
                                                    <div className="mt-2 font-semibold text-white">
                                                        {searchForm.from
                                                            ? `${formatDateDisplay(searchForm.from)}${
                                                                searchForm.to ? ` → ${formatDateDisplay(searchForm.to)}` : ""
                                                            }`
                                                            : "Not selected"}
                                                    </div>
                                                </div>

                                                <div className="rounded-2xl bg-white/10 p-4">
                                                    <div className="text-xs uppercase tracking-wide text-white/55">
                                                        Guests / Currency
                                                    </div>
                                                    <div className="mt-2 font-semibold text-white">
                                                        {searchForm.adults} guest{Number(searchForm.adults) > 1 ? "s" : ""} ·{" "}
                                                        {searchForm.targetCurrency}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </GlassCard>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
