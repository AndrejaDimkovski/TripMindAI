import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api";
import { API_BASE } from "../api/http";

const BACKEND_BASE = API_BASE || "http://localhost:8080";
const FLOW_STORAGE_KEY = "tm_flow_v1";

function buildImageUrl(path, fallback) {
    if (!path) return fallback;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return `${BACKEND_BASE}${path}`;
}

function countryImageUrl(country) {
    return buildImageUrl(
        country?.imageUrl,
        `${BACKEND_BASE}/images/countries/default-country.jpg`
    );
}

function destinationImageUrl(destination) {
    return buildImageUrl(
        destination?.imageUrl,
        `${BACKEND_BASE}/images/destinations/default-destination.jpg`
    );
}

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

function displayValue(value, fallback = "—") {
    if (value == null) return fallback;
    if (typeof value === "string" && value.trim() === "") return fallback;
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
            ? country.destinations.map((destination) => normalizeDestination(destination))
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
                <span className="text-sm font-medium">No image</span>
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={displayValue(alt, "Destination image")}
            className={className}
            onError={() => setFailed(true)}
            loading="lazy"
        />
    );
}

function Pill({ children, tone = "light" }) {
    const styles = {
        light: "border border-white/15 bg-white/15 text-white",
        white: "bg-white/90 text-slate-900",
        green: "bg-emerald-100 text-emerald-700",
    };

    return (
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[tone] || styles.light}`}>
            {children}
        </span>
    );
}

export default function DiscoverPage() {
    const navigate = useNavigate();
    const wheelLockRef = useRef(false);

    const [countries, setCountries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [activeCountryIndex, setActiveCountryIndex] = useState(0);
    const [activeDestinationIndex, setActiveDestinationIndex] = useState(0);

    const loadCountries = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const data = await apiGet("/api/geo/countries");
            const normalized = Array.isArray(data) ? data.map((country) => normalizeCountry(country)) : [];

            const enriched = [...normalized];

            for (let i = 0; i < enriched.length; i += 1) {
                const country = enriched[i];

                if ((!country.destinations || country.destinations.length === 0) && country.code) {
                    try {
                        const dests = await apiGet(
                            `/api/geo/countries/${encodeURIComponent(country.code)}/destinations`
                        );

                        enriched[i] = {
                            ...country,
                            destinations: Array.isArray(dests)
                                ? dests.map((destination) => normalizeDestination(destination))
                                : [],
                        };
                    } catch {
                        enriched[i] = {
                            ...country,
                            destinations: [],
                        };
                    }
                }
            }

            setCountries(enriched);

            const saved = readFlowState();
            let nextCountryIndex = 0;
            let nextDestinationIndex = 0;

            if (saved?.activeCountryName) {
                const idx = enriched.findIndex((country) => country.name === saved.activeCountryName);
                if (idx >= 0) {
                    nextCountryIndex = idx;
                }
            }

            const selectedCountry = enriched[nextCountryIndex] || null;

            if (saved?.destination?.cityCode && selectedCountry?.destinations?.length) {
                const dIdx = selectedCountry.destinations.findIndex(
                    (destination) => destination.cityCode === saved.destination.cityCode
                );
                if (dIdx >= 0) {
                    nextDestinationIndex = dIdx;
                }
            }

            setActiveCountryIndex(nextCountryIndex);
            setActiveDestinationIndex(nextDestinationIndex);

            if (selectedCountry) {
                persistSelection(
                    selectedCountry,
                    selectedCountry.destinations?.[nextDestinationIndex] || null
                );
            }
        } catch (e) {
            setError(e.message || "Failed to load countries.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCountries();
    }, [loadCountries]);

    const safeCountryIndex = useMemo(() => {
        if (!countries.length) return 0;
        if (activeCountryIndex < 0) return 0;
        if (activeCountryIndex >= countries.length) return countries.length - 1;
        return activeCountryIndex;
    }, [countries, activeCountryIndex]);

    const activeCountry = useMemo(() => countries[safeCountryIndex] || null, [countries, safeCountryIndex]);
    const destinations = useMemo(() => activeCountry?.destinations || [], [activeCountry]);

    const safeDestinationIndex = useMemo(() => {
        if (!destinations.length) return 0;
        if (activeDestinationIndex < 0) return 0;
        if (activeDestinationIndex >= destinations.length) return destinations.length - 1;
        return activeDestinationIndex;
    }, [destinations, activeDestinationIndex]);

    const featuredDestination = useMemo(
        () => destinations[safeDestinationIndex] || null,
        [destinations, safeDestinationIndex]
    );

    const heroBackground = useMemo(() => {
        if (featuredDestination?.imageUrl) return destinationImageUrl(featuredDestination);
        if (activeCountry?.imageUrl) return countryImageUrl(activeCountry);
        return "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1800&auto=format&fit=crop";
    }, [featuredDestination, activeCountry]);

    const heroTitle = useMemo(() => {
        return featuredDestination?.name || activeCountry?.name || "Explore with AI";
    }, [featuredDestination, activeCountry]);

    const heroSubtitle = useMemo(() => {
        if (featuredDestination?.description?.trim()) {
            const text = String(featuredDestination.description).trim();
            return `${text.slice(0, 170)}${text.length > 170 ? "..." : ""}`;
        }

        if (activeCountry?.name) {
            return `Discover unforgettable places in ${activeCountry.name} and continue your travel planning with a premium AI-first experience.`;
        }

        return "Browse countries and explore premium travel inspiration for your next journey.";
    }, [featuredDestination, activeCountry]);

    const visibleDestinationCards = useMemo(() => {
        if (!destinations.length) return [];
        return destinations.slice(0, 3);
    }, [destinations]);

    function persistSelection(nextCountry, nextDestination) {
        const current = readFlowState() || {};

        saveFlowState({
            ...current,
            activeCountryName: nextCountry?.name || "",
            country: nextCountry
                ? {
                    id: nextCountry.id ?? null,
                    code: nextCountry.code || "",
                    name: nextCountry.name || "",
                    imageUrl: nextCountry.imageUrl || null,
                }
                : null,
            destination: nextDestination ? normalizeDestination(nextDestination) : null,
            searchResult: null,
            selectedFlightIndex: null,
            selectedHotelIndex: null,
        });
    }

    function changeCountry(nextIndex) {
        if (!countries.length) return;

        let normalizedIndex = nextIndex;
        if (normalizedIndex < 0) normalizedIndex = countries.length - 1;
        if (normalizedIndex >= countries.length) normalizedIndex = 0;

        const nextCountry = countries[normalizedIndex];
        const firstDestination = nextCountry?.destinations?.[0] || null;

        setActiveCountryIndex(normalizedIndex);
        setActiveDestinationIndex(0);
        persistSelection(nextCountry, firstDestination);
    }

    function changeDestination(nextIndex) {
        if (!destinations.length) return;

        let normalizedIndex = nextIndex;
        if (normalizedIndex < 0) normalizedIndex = destinations.length - 1;
        if (normalizedIndex >= destinations.length) normalizedIndex = 0;

        const nextDestination = destinations[normalizedIndex];

        setActiveDestinationIndex(normalizedIndex);
        persistSelection(activeCountry, nextDestination);
    }

    function handleWheel(event) {
        if (wheelLockRef.current) return;

        const delta = event.deltaY;
        if (delta === 0) return;

        wheelLockRef.current = true;

        if (event.shiftKey) {
            changeCountry(delta > 0 ? safeCountryIndex + 1 : safeCountryIndex - 1);
        } else {
            changeDestination(delta > 0 ? safeDestinationIndex + 1 : safeDestinationIndex - 1);
        }

        window.setTimeout(() => {
            wheelLockRef.current = false;
        }, 450);
    }

    function goManualPlanner() {
        const current = readFlowState() || {};

        saveFlowState({
            ...current,
            mode: "manual",
            activeCountryName: activeCountry?.name || "",
            country: activeCountry
                ? {
                    id: activeCountry.id ?? null,
                    code: activeCountry.code || "",
                    name: activeCountry.name || "",
                    imageUrl: activeCountry.imageUrl || null,
                }
                : null,
            destination: featuredDestination ? normalizeDestination(featuredDestination) : null,
            searchResult: null,
            selectedFlightIndex: null,
            selectedHotelIndex: null,
        });

        navigate("/plan/manual");
    }

    function goAiPlanner() {
        const current = readFlowState() || {};

        saveFlowState({
            ...current,
            mode: "ai",
            activeCountryName: activeCountry?.name || "",
            country: activeCountry
                ? {
                    id: activeCountry.id ?? null,
                    code: activeCountry.code || "",
                    name: activeCountry.name || "",
                    imageUrl: activeCountry.imageUrl || null,
                }
                : null,
            destination: featuredDestination ? normalizeDestination(featuredDestination) : null,
            searchResult: null,
            selectedFlightIndex: null,
            selectedHotelIndex: null,
        });

        navigate("/plan/ai");
    }

    function goDestinationDetails(destination) {
        if (!destination?.cityCode) return;

        navigate(`/destinations/${destination.cityCode}`, {
            state: {
                destination: normalizeDestination(destination),
                countryName: activeCountry?.name || "",
                countryCode: activeCountry?.code || "",
            },
        });
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0b1620] text-white">
                Loading discover page...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0b1620]">
            <section className="relative min-h-screen overflow-hidden" onWheel={handleWheel}>
                <img
                    src={heroBackground}
                    alt={heroTitle}
                    className="absolute inset-0 h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,14,20,0.80)_0%,rgba(8,18,28,0.52)_36%,rgba(8,18,28,0.18)_68%,rgba(8,18,28,0.16)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_30%)]" />

                <div className="pointer-events-none absolute bottom-7 right-8 rounded-full border border-white/20 bg-black/20 px-4 py-2 text-xs font-medium text-white/85 backdrop-blur">
                    Scroll: destinations • Shift + scroll: countries
                </div>

                <div className="relative z-10 mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 pb-12 pt-28 lg:px-6">
                    {error ? (
                        <div className="mb-6 rounded-2xl border border-rose-300/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 backdrop-blur">
                            ⚠️ {error}
                        </div>
                    ) : null}

                    <div className="flex flex-1 items-center">
                        <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr]">
                            <div className="relative pt-6 lg:pt-0">
                                <div className="absolute left-0 top-0 hidden h-full w-10 lg:block">
                                    <div className="absolute left-5 top-8 h-[74%] w-px bg-white/25" />

                                    {countries.map((country, index) => {
                                        const count = countries.length;
                                        const topPercent =
                                            count <= 1
                                                ? 16
                                                : 16 + (index * 52) / Math.max(count - 1, 1);

                                        const isActive = index === safeCountryIndex;

                                        return (
                                            <button
                                                key={country.id || country.code || index}
                                                type="button"
                                                onClick={() => changeCountry(index)}
                                                className={`absolute left-[15px] h-4 w-4 rounded-full border-4 transition ${
                                                    isActive
                                                        ? "border-white/85 bg-white/85 shadow-[0_0_18px_rgba(255,255,255,0.55)]"
                                                        : "border-white/35 bg-white/35 hover:border-white/60 hover:bg-white/60"
                                                }`}
                                                style={{ top: `${topPercent}%` }}
                                                title={displayValue(country.name, "Country")}
                                                aria-label={displayValue(country.name, "Country")}
                                            />
                                        );
                                    })}
                                </div>

                                <div className="lg:pl-16">
                                    <Pill>Creative Travel Discover</Pill>

                                    <h1 className="mt-8 text-6xl font-extrabold uppercase leading-none text-white md:text-7xl xl:text-[7rem]">
                                        {heroTitle}
                                    </h1>

                                    <p className="mt-5 max-w-xl text-sm leading-7 text-white/85 md:text-base">
                                        {heroSubtitle}
                                    </p>

                                    <div className="mt-5 flex flex-wrap gap-2">
                                        <Pill tone="white">{displayValue(activeCountry?.name, "Country")}</Pill>
                                        <Pill tone="green">
                                            {destinations.length} destination{destinations.length !== 1 ? "s" : ""}
                                        </Pill>
                                    </div>

                                    <div className="mt-8 flex flex-wrap gap-4">
                                        <button
                                            type="button"
                                            onClick={goAiPlanner}
                                            className="rounded-[20px] bg-[#2b5da8] px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-[#214d8f]"
                                        >
                                            Explore →
                                        </button>

                                        <button
                                            type="button"
                                            onClick={goManualPlanner}
                                            className="rounded-[20px] border border-white/30 bg-white/10 px-8 py-4 text-lg font-semibold text-white backdrop-blur transition hover:bg-white/20"
                                        >
                                            Manual
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="hidden items-center justify-end lg:flex">
                                <div className="flex items-start gap-6">
                                    {visibleDestinationCards.map((dest, i) => (
                                        <div
                                            key={dest.id || dest.cityCode || i}
                                            className={`relative overflow-hidden rounded-[28px] shadow-2xl ${
                                                i === 0
                                                    ? "mt-0 h-[420px] w-[290px]"
                                                    : i === 1
                                                        ? "mt-12 h-[360px] w-[260px]"
                                                        : "mt-24 h-[320px] w-[230px]"
                                            }`}
                                        >
                                            <CardImage
                                                src={destinationImageUrl(dest)}
                                                alt={dest.name}
                                                className="h-full w-full object-cover"
                                            />

                                            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

                                            <div className="absolute left-5 right-5 top-5 flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="text-sm font-semibold text-white">
                                                        {displayValue(dest.name, "Destination")}
                                                    </div>
                                                    <div className="mt-1 text-xs text-white/75">
                                                        {displayValue(activeCountry?.name || dest.countryCode, "Country")}
                                                    </div>
                                                </div>

                                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-lg text-slate-800 shadow">
                                                    🔖
                                                </div>
                                            </div>

                                            <div className="absolute bottom-5 left-5 right-5">
                                                <button
                                                    type="button"
                                                    onClick={() => goDestinationDetails(dest)}
                                                    className="rounded-2xl bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white"
                                                >
                                                    About destination
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {visibleDestinationCards.length === 0 && (
                                        <div className="flex h-[360px] w-[280px] items-center justify-center rounded-[28px] border border-white/15 bg-white/10 text-center text-white/75 backdrop-blur">
                                            <div>
                                                <div className="text-5xl">🌍</div>
                                                <div className="mt-4 text-lg font-semibold">
                                                    No destinations found
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-4">
                        {destinations.length > 0 ? (
                            destinations.map((_, index) => {
                                const isActive = index === safeDestinationIndex;
                                return (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => changeDestination(index)}
                                        className={`h-5 w-5 rounded-full backdrop-blur transition ${
                                            isActive
                                                ? "bg-white/60 shadow-[0_0_18px_rgba(255,255,255,0.45)]"
                                                : "bg-white/25 hover:bg-white/40"
                                        }`}
                                        aria-label={`Destination ${index + 1}`}
                                    />
                                );
                            })
                        ) : (
                            <>
                                <div className="h-5 w-5 rounded-full bg-white/30 backdrop-blur" />
                                <div className="h-5 w-5 rounded-full bg-white/20 backdrop-blur" />
                                <div className="h-5 w-5 rounded-full bg-white/20 backdrop-blur" />
                            </>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
