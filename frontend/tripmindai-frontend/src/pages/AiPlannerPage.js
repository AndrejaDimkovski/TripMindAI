import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api";
import { recommendTripAi } from "../api/aiApi";
import { searchTrip } from "../api/tripsApi";
import AiPromptComposer from "../components/AiPromptComposer";

const FLOW_STORAGE_KEY = "tm_flow_v1";
const AI_PROMPT_MAX_LENGTH = 600;
const AI_DATE_FORMAT_MESSAGE = "Please write dates in valid format: dd.mm.yyyy or dd-mm-yyyy.";

const AI_TRAVEL_TERMS = [
    "travel",
    "trip",
    "vacation",
    "holiday",
    "visit",
    "go",
    "fly",
    "flight",
    "hotel",
    "stay",
    "destination",
    "from",
    "to",
    "days",
    "nights",
    "budget",
    "patuvanje",
    "odmor",
    "let",
    "avion",
    "destinacija",
    "grad",
    "drzava",
    "dena",
    "nokji",
    "budzet",
];

const AI_BLOCKED_TERMS = [
    "hack",
    "hacker",
    "malware",
    "exploit",
    "sql injection",
    "xss",
    "password",
    "jwt",
    "token",
    "steal",
    "bypass login",
    "system prompt",
    "api key",
    "bomb",
    "weapon",
    "drugs",
    "porn",
    "sex",
    "kill",
    "suicide",
    "self harm",
];

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

function validateAiPrompt(prompt) {
    const text = String(prompt || "").trim();
    const normalized = text.toLowerCase();

    if (text.length < 10) {
        return "Write a travel request with destination, dates, people or budget.";
    }

    if (text.length > AI_PROMPT_MAX_LENGTH) {
        return `Prompt is too long. Please keep it under ${AI_PROMPT_MAX_LENGTH} characters.`;
    }

    const dateFormatMessage = validatePromptDateFormats(text);
    if (dateFormatMessage) {
        return dateFormatMessage;
    }

    if (AI_BLOCKED_TERMS.some((term) => normalized.includes(term))) {
        return "AI planner can only be used for safe travel planning requests.";
    }

    const hasTravelIntent = AI_TRAVEL_TERMS.some((term) => normalized.includes(term));
    const hasDateOrDuration =
        /\b\d{2}([.-])\d{2}\1\d{4}\b/.test(normalized) ||
        /\b\d+\s*(day|days|night|nights|den|dena|nok|nokji)\b/.test(normalized);

    if (!hasTravelIntent && !hasDateOrDuration) {
        return "AI planner can only help with travel planning requests.";
    }

    return "";
}

function validatePromptDateFormats(prompt) {
    const text = String(prompt || "");
    const dateLikeTokens = text.match(/\b\d{1,4}[./-]\d{1,2}[./-]\d{1,4}\b/g) || [];
    const validWrittenDate = /^(0[1-9]|[12]\d|3[01])([.-])(0[1-9]|1[0-2])\2\d{4}$/;

    if (dateLikeTokens.some((token) => !validWrittenDate.test(token))) {
        return AI_DATE_FORMAT_MESSAGE;
    }

    const monthNames = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|sept|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
    const textualDate = new RegExp(`\\b(?:\\d{1,2}\\s+(?:${monthNames})\\s+\\d{4}|(?:${monthNames})\\s+\\d{1,2},?\\s+\\d{4})\\b`, "i");

    if (textualDate.test(text)) {
        return AI_DATE_FORMAT_MESSAGE;
    }

    return "";
}

function normalizeDateToIso(value) {
    if (!value) return "";

    const v = String(value).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

    const writtenDate = v.match(/^(\d{2})([.-])(\d{2})\2(\d{4})$/);
    if (writtenDate) {
        const [, dd, , mm, yyyy] = writtenDate;
        return `${yyyy}-${mm}-${dd}`;
    }
    return "";
}

function isValidIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(value);
    return !Number.isNaN(d.getTime());
}

function safePositiveInt(value, fallback = 1) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function clampPeople(value, fallback = 1) {
    const n = safePositiveInt(value, fallback);
    return Math.min(Math.max(n, 1), 20);
}

function normalizeInterpretation(interpretation, fallbackPeople = 1) {
    if (!interpretation) return null;

    const budget = String(interpretation.budgetLevel || "").toLowerCase();
    const rawPeople = interpretation.extractedPeople;
    const rawDuration = interpretation.extractedDurationDays;
    const notes = String(interpretation.notes || "");

    return {
        ...interpretation,
        destinationCodes: Array.isArray(interpretation.destinationCodes) ? interpretation.destinationCodes : [],
        candidateDestinations: Array.isArray(interpretation.candidateDestinations) ? interpretation.candidateDestinations : [],
        candidateCountries: Array.isArray(interpretation.candidateCountries) ? interpretation.candidateCountries : [],
        extractedPeople:
            rawPeople == null || rawPeople === ""
                ? null
                : clampPeople(rawPeople, fallbackPeople),
        extractedDurationDays:
            rawDuration == null || rawDuration === ""
                ? null
                : safePositiveInt(rawDuration, 0),
        budgetLevel: ["low", "medium", "high"].includes(budget) ? budget : "medium",
        confidence: typeof interpretation.confidence === "number" ? interpretation.confidence : 0,
        usedAi: Boolean(interpretation.usedAi),
        needsClarification: Boolean(interpretation.needsClarification),
        dateFlexibilityHint: interpretation.dateFlexibilityHint || "",
        extractedOriginCity: interpretation.extractedOriginCity || "",
        extractedOriginIata: interpretation.extractedOriginIata || "",
        notes,
        isUnsupportedDestination: notes.toLowerCase().includes("do not support"),
    };
}

function mapAiBudgetToPriceRange(budgetLevel) {
    const value = String(budgetLevel || "").trim().toLowerCase();

    if (value === "low") return "LOW";
    if (value === "medium") return "MEDIUM";
    if (value === "high") return "HIGH";

    return "";
}

function detectTripModeFromPrompt(prompt) {
    const text = String(prompt || "").toLowerCase();

    const hotelOnlySignals = [
        "hotel-only",
        "hotel only",
        "only hotel",
        "hotel without flight",
        "hotel without flights",
        "without flight",
        "without flights",
        "no flight",
        "no flights",
        "skip flights",
        "just hotel",
        "accommodation only",
        "stay only",
    ];

    const flightSignals = [
        "flight",
        "flights",
        "fly",
        "direct flight",
        "direct flights",
        "airport",
        "plane",
        "avion",
        "let",
    ];

    if (hotelOnlySignals.some((signal) => text.includes(signal))) {
        return "HOTEL_ONLY";
    }

    if (flightSignals.some((signal) => text.includes(signal))) {
        return "FLIGHT_HOTEL";
    }

    return "";
}

function inferRoomQuantityForTravelers(people, fallback = 1) {
    const travelers = clampPeople(people, fallback);
    if (travelers <= 3) {
        return 1;
    }

    if (travelers === 4) {
        return 2;
    }

    if (travelers >= 5) {
        return Math.ceil(travelers / 3);
    }

    return Math.max(1, Number(fallback || 1));
}

function validateDates(from, to) {
    const fromIso = normalizeDateToIso(from);
    const toIso = normalizeDateToIso(to);

    if (from && (!fromIso || !isValidIsoDate(fromIso))) {
        return "From date must be valid.";
    }

    if (to && (!toIso || !isValidIsoDate(toIso))) {
        return "To date must be valid.";
    }

    const todayIso = new Date().toISOString().slice(0, 10);

    if (fromIso && fromIso < todayIso) {
        return "Travel dates cannot be in the past.";
    }

    if (toIso && toIso < todayIso) {
        return "Travel dates cannot be in the past.";
    }

    if (fromIso && toIso && toIso < fromIso) {
        return "To date cannot be before From date.";
    }

    return "";
}

function normalizeDestination(destination) {
    if (!destination) return null;

    return {
        id: destination.id ?? null,
        countryCode: destination.countryCode || "",
        countryName: destination.countryName || "",
        cityCode: destination.cityCode || "",
        name: destination.name || "",
        latitude: destination.latitude ?? null,
        longitude: destination.longitude ?? null,
        description: destination.description || "",
        imageUrl: destination.imageUrl || null,
    };
}

function originDisplayValue(value) {
    const raw = String(value || "").trim().toUpperCase();

    if (!raw) return "Skopje";
    if (raw === "SKP") return "Skopje";

    return value;
}

function resolveOriginToIata(value) {
    const raw = String(value || "").trim().toUpperCase();

    if (!raw) return "SKP";
    if (raw === "SKP") return "SKP";
    if (raw === "SKOPJE") return "SKP";

    return raw;
}

function GlassCard({ children, className = "" }) {
    return (
        <div className={`rounded-[30px] border border-white/10 bg-white/78 shadow-xl backdrop-blur ${className}`}>
            {children}
        </div>
    );
}

function HeroPill({ children }) {
    return (
        <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
            {children}
        </span>
    );
}

function Badge({ children, tone = "light" }) {
    const styles = {
        light: "bg-slate-100 text-slate-700",
        green: "bg-emerald-100 text-emerald-700",
        blue: "bg-blue-100 text-blue-700",
        yellow: "bg-amber-100 text-amber-700",
        white: "bg-white/90 text-slate-900",
        red: "bg-rose-100 text-rose-700",
    };

    return (
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[tone] || styles.light}`}>
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

export default function AiPlannerPage() {
    const navigate = useNavigate();
    const previewTimerRef = useRef(null);

    const [countries, setCountries] = useState([]);
    const [loadingCountries, setLoadingCountries] = useState(true);

    const [tripMode, setTripMode] = useState("FLIGHT_HOTEL");

    const [aiLoading, setAiLoading] = useState(false);
    const [, setAiPreviewLoading] = useState(false);
    const [error, setError] = useState("");
    const [aiError, setAiError] = useState("");

    const [activeCountryName, setActiveCountryName] = useState("");
    const [selectedDestination, setSelectedDestination] = useState(null);
    const [aiSuggestedCodes, setAiSuggestedCodes] = useState([]);
    const [aiPreview, setAiPreview] = useState(null);
    const [aiOptions, setAiOptions] = useState([]);
    const [pendingSelection, setPendingSelection] = useState(null);

    const [aiForm, setAiForm] = useState({
        prompt: "",
        budgetLevel: "medium",
        people: 1,
        originCity: "",
        fromDate: "",
        toDate: "",
    });

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

    useEffect(() => {
        loadInitial();
    }, []);

    useEffect(() => {
        return () => {
            if (previewTimerRef.current) {
                clearTimeout(previewTimerRef.current);
            }
        };
    }, []);

    async function loadInitial() {
        setLoadingCountries(true);
        setError("");

        try {
            const flow = readFlowState();

            if (flow?.tripMode) {
                setTripMode(flow.tripMode);
            }

            if (flow?.aiForm) {
                setAiForm((prev) => ({ ...prev, ...flow.aiForm }));
            }

            if (flow?.searchForm) {
                setSearchForm((prev) => ({
                    ...prev,
                    ...flow.searchForm,
                    origin: originDisplayValue(flow.searchForm.origin),
                }));
            }

            if (flow?.destination) {
                setSelectedDestination(normalizeDestination(flow.destination));
            }

            if (flow?.activeCountryName) {
                setActiveCountryName(flow.activeCountryName);
            }

            const data = await apiGet("/api/geo/countries");
            const normalized = Array.isArray(data)
                ? data.map((country) => ({
                    ...country,
                    destinations: Array.isArray(country.destinations) ? country.destinations : [],
                }))
                : [];

            setCountries(normalized);
        } catch (e) {
            setError(e.message || "Failed to load countries.");
        } finally {
            setLoadingCountries(false);
        }
    }

    const detectedPeople = useMemo(() => {
        return aiPreview?.extractedPeople ?? null;
    }, [aiPreview]);

    const selectedDestinationName =
        selectedDestination?.name ||
        aiPreview?.extractedDestinationText ||
        aiPreview?.candidateDestinations?.[0] ||
        "Not selected yet";

    const selectedCountryLabel =
        activeCountryName ||
        selectedDestination?.countryName ||
        aiPreview?.extractedCountry ||
        aiPreview?.candidateCountries?.[0] ||
        "Country not detected yet";

    function handleTripModeChange(nextMode) {
        setTripMode(nextMode);
        const current = readFlowState() || {};
        saveFlowState({
            ...current,
            mode: "ai",
            tripMode: nextMode,
            aiForm,
            searchForm,
            destination: selectedDestination,
            activeCountryName,
            aiSuggestedCodes,
        });
    }

    function clearAiPreview() {
        setAiPreview(null);
        setSelectedDestination(null);
        setActiveCountryName("");
        setAiSuggestedCodes([]);
        setAiOptions([]);
        setPendingSelection(null);
    }

    function clearPreviewState() {
        setSelectedDestination(null);
        setActiveCountryName("");
        setAiSuggestedCodes([]);
        setAiOptions([]);
        setPendingSelection(null);
    }

    function triggerAiPreview(promptValue) {
        const trimmed = String(promptValue || "").trim();

        if (trimmed.length < 6 || validateAiPrompt(trimmed)) {
            setAiPreview(null);
            setAiPreviewLoading(false);
            return;
        }

        if (previewTimerRef.current) {
            clearTimeout(previewTimerRef.current);
        }

        previewTimerRef.current = setTimeout(async () => {
            try {
                setAiPreviewLoading(true);

                const res = await recommendTripAi({
                    prompt: trimmed,
                    budgetLevel: aiForm.budgetLevel,
                    people: null,
                    originCity: null,
                    fromDate: null,
                    toDate: null,
                });

                setAiPreview(normalizeInterpretation(res?.interpretation || null, 1));
            } catch (e) {
                console.error("AI preview error:", e);
                setAiPreview(null);
            } finally {
                setAiPreviewLoading(false);
            }
        }, 600);
    }

    function updatePrompt(value) {
        const inferredTripMode = detectTripModeFromPrompt(value);
        const nextTripMode = inferredTripMode || tripMode;

        if (inferredTripMode && inferredTripMode !== tripMode) {
            setTripMode(inferredTripMode);
        }

        setAiForm((prev) => {
            const next = {
                ...prev,
                prompt: value,
                fromDate: "",
                toDate: "",
                originCity: "",
            };

            saveFlowState({
                mode: "ai",
                tripMode: nextTripMode,
                activeCountryName: "",
                country: null,
                destination: null,
                aiForm: next,
                aiSuggestedCodes: [],
                searchForm,
                searchResult: null,
                selectedFlightIndex: null,
                selectedHotelIndex: null,
            });

            return next;
        });

        clearAiPreview();
        triggerAiPreview(value);
    }

    async function searchTripsWithDestination({
                                                  destinationObj,
                                                  countryObj,
                                                  nextSearchForm,
                                                  nextAiForm,
                                                  nextCodes,
                                                  nextTripMode = tripMode,
                                              }) {
        const safeDestination = normalizeDestination(destinationObj);
        const cityCode = String(safeDestination?.cityCode || "").trim();

        if (!cityCode) {
            throw new Error("AI did not return a valid destination.");
        }

        const dateMessage = validateDates(nextSearchForm.from, nextSearchForm.to);
        if (dateMessage) {
            throw new Error(dateMessage);
        }

        const normalizedFrom = normalizeDateToIso(nextSearchForm.from);
        const normalizedTo = normalizeDateToIso(nextSearchForm.to);

        const data = await searchTrip({
            origin: resolveOriginToIata(nextSearchForm.origin),
            destination: cityCode,
            cityCode,
            from: normalizedFrom,
            to: normalizedTo || undefined,
            adults: Math.max(1, Number(nextSearchForm.adults || 1)),
            countryCode: countryObj?.code || safeDestination?.countryCode || "",
            targetCurrency: nextSearchForm.targetCurrency || "EUR",
            countryOfResidence: String(nextSearchForm.countryOfResidence || "MK").trim().toUpperCase(),
            roomQuantity: Math.max(1, Number(nextSearchForm.roomQuantity || 1)),
            priceRange: nextSearchForm.priceRange ? String(nextSearchForm.priceRange).trim() : undefined,
            paymentPolicy: nextSearchForm.paymentPolicy || "NONE",
            boardType: nextSearchForm.boardType ? String(nextSearchForm.boardType).trim() : undefined,
            includeClosed: !!nextSearchForm.includeClosed,
            bestRateOnly: !!nextSearchForm.bestRateOnly,
        });

        saveFlowState({
            tripMode: nextTripMode,
            mode: "ai",
            activeCountryName: countryObj?.name || "",
            country: countryObj
                ? {
                    id: countryObj.id ?? null,
                    code: countryObj.code || "",
                    name: countryObj.name || "",
                    imageUrl: countryObj.imageUrl || null,
                }
                : null,
            destination: safeDestination,
            aiForm: nextAiForm,
            aiSuggestedCodes: nextCodes,
            searchForm: {
                ...nextSearchForm,
                origin: originDisplayValue(resolveOriginToIata(nextSearchForm.origin)),
                from: normalizedFrom,
                to: normalizedTo,
            },
            searchResult: data,
            selectedFlightIndex: null,
            selectedHotelIndex: null,
        });

        navigate(nextTripMode === "HOTEL_ONLY" ? "/plan/hotels" : "/plan/flights");
    }

    async function handleDestinationOptionSelect(option, interpretation, recommendations, nextTripMode = tripMode) {
        const nextAdults = clampPeople(
            interpretation?.extractedPeople || searchForm.adults || aiForm.people || 1,
            1
        );

        const nextFrom =
            interpretation?.extractedFromDate ||
            aiPreview?.extractedFromDate ||
            aiForm.fromDate ||
            searchForm.from ||
            "";

        const nextTo =
            interpretation?.extractedToDate ||
            aiPreview?.extractedToDate ||
            aiForm.toDate ||
            searchForm.to ||
            "";

        const normalizedBudget =
            interpretation?.budgetLevel ||
            aiPreview?.budgetLevel ||
            aiForm.budgetLevel ||
            "medium";

        const nextOrigin =
            interpretation?.extractedOriginIata ||
            interpretation?.extractedOriginCity ||
            searchForm.origin ||
            "Skopje";

        const nextAiForm = {
            ...aiForm,
            originCity: interpretation?.extractedOriginCity || "",
            budgetLevel: normalizedBudget,
            people: nextAdults,
            fromDate: interpretation?.extractedFromDate || aiPreview?.extractedFromDate || "",
            toDate: interpretation?.extractedToDate || aiPreview?.extractedToDate || "",
        };

        const nextSearchForm = {
            ...searchForm,
            origin: originDisplayValue(nextOrigin),
            from: nextFrom,
            to: nextTo,
            adults: nextAdults,
            roomQuantity: inferRoomQuantityForTravelers(nextAdults, searchForm.roomQuantity || 1),
            priceRange:
                mapAiBudgetToPriceRange(interpretation?.budgetLevel) ||
                mapAiBudgetToPriceRange(aiPreview?.budgetLevel) ||
                mapAiBudgetToPriceRange(normalizedBudget) ||
                searchForm.priceRange,
        };

        const matchedCountry =
            countries.find((c) => c.code === option.countryCode || c.name === option.countryName) || null;

        const selected = normalizeDestination(option);

        setAiForm(nextAiForm);
        setSearchForm(nextSearchForm);
        setSelectedDestination(selected);
        setActiveCountryName(matchedCountry?.name || option.countryName || "");

        const codes = recommendations.map((r) => String(r?.cityCode || "").toUpperCase()).filter(Boolean);

        await searchTripsWithDestination({
            destinationObj: selected,
            countryObj:
                matchedCountry || {
                    id: null,
                    code: option.countryCode || "",
                    name: option.countryName || "",
                    imageUrl: null,
                },
            nextSearchForm,
            nextAiForm,
            nextCodes: codes,
            nextTripMode,
        });
    }

    async function handleAiSearch() {
        setAiLoading(true);
        setAiError("");
        clearPreviewState();

        try {
            const promptMessage = validateAiPrompt(aiForm.prompt);
            if (promptMessage) {
                throw new Error(promptMessage);
            }

            const dateMessage = validateDates(aiForm.fromDate, aiForm.toDate);
            if (dateMessage) {
                throw new Error(dateMessage);
            }

            const inferredTripMode = detectTripModeFromPrompt(aiForm.prompt) || tripMode;
            if (inferredTripMode !== tripMode) {
                setTripMode(inferredTripMode);
            }

            const res = await recommendTripAi({
                prompt: aiForm.prompt.trim(),
                budgetLevel: aiForm.budgetLevel,
                people: aiForm.people || null,
                originCity: null,
                fromDate: aiForm.fromDate || null,
                toDate: aiForm.toDate || null,
            });

            const interpretation = normalizeInterpretation(res?.interpretation || null, 1);
            const recommendations = Array.isArray(res?.recommendations) ? res.recommendations : [];

            if (!recommendations.length) {
                throw new Error(
                    interpretation?.notes || "We currently do not support the requested destination."
                );
            }

            if (interpretation?.extractedOriginCity || interpretation?.extractedOriginIata) {
                setAiForm((prev) => ({
                    ...prev,
                    originCity: interpretation.extractedOriginCity || "",
                }));
                setSearchForm((prev) => ({
                    ...prev,
                    origin: interpretation.extractedOriginIata || interpretation.extractedOriginCity || prev.origin,
                }));
            }

            const uniqueOptions = recommendations.filter(
                (item, index, arr) =>
                    arr.findIndex(
                        (x) =>
                            String(x?.cityCode || "").toUpperCase() ===
                            String(item?.cityCode || "").toUpperCase()
                    ) === index
            );

            if (uniqueOptions.length > 1) {
                setPendingSelection({ interpretation, recommendations: uniqueOptions, tripMode: inferredTripMode });
                setAiOptions(uniqueOptions);
                setAiSuggestedCodes(
                    uniqueOptions.map((r) => String(r?.cityCode || "").toUpperCase()).filter(Boolean)
                );
                return;
            }

            await handleDestinationOptionSelect(uniqueOptions[0], interpretation, uniqueOptions, inferredTripMode);
        } catch (e) {
            setAiError(e.message || "AI error");
        } finally {
            setAiLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#0b1620]">
            <section className="relative min-h-screen overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1800&auto=format&fit=crop')] bg-cover bg-center" />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,14,20,0.82)_0%,rgba(8,18,28,0.56)_36%,rgba(8,18,28,0.22)_68%,rgba(8,18,28,0.16)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_30%)]" />

                <div className="relative z-10 mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 pt-28 lg:px-6">
                    {error ? (
                        <div className="mb-6 rounded-2xl border border-rose-300/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 backdrop-blur">
                            {error}
                        </div>
                    ) : null}

                    {aiError ? (
                        <div className="mb-6 rounded-2xl border border-rose-300/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 backdrop-blur">
                            {aiError}
                        </div>
                    ) : null}

                    <div className="grid w-full items-start gap-10 lg:grid-cols-[1.02fr_0.98fr]">
                        <div className="pt-6 lg:pt-10">
                            <HeroPill>AI Trip Planner</HeroPill>

                            <h1 className="mt-8 text-6xl font-extrabold uppercase leading-none text-white md:text-7xl xl:text-[6.3rem]">
                                Plan with AI
                            </h1>

                            <p className="mt-5 max-w-xl text-sm leading-7 text-white/85 md:text-base">
                                Describe your ideal journey and let TripMindAI detect destination, trip dates,
                                origin city, people and budget, then continue directly to{" "}
                                {tripMode === "HOTEL_ONLY" ? "hotels" : "flights"}.
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

                            <div className="mt-5 flex flex-wrap gap-2">
                                <Badge tone="white">
                                    {originDisplayValue(aiPreview?.extractedOriginCity || aiPreview?.extractedOriginIata || searchForm.origin)}
                                </Badge>
                                <Badge tone="white">{selectedDestinationName}</Badge>
                                <Badge tone="blue">{selectedCountryLabel}</Badge>
                                {detectedPeople ? (
                                    <Badge tone="green">
                                        {detectedPeople} traveler{Number(detectedPeople) > 1 ? "s" : ""}
                                    </Badge>
                                ) : null}
                            </div>

                            <div className="mt-8 flex flex-wrap gap-4">
                                <HeroButton primary onClick={handleAiSearch} disabled={aiLoading}>
                                    {aiLoading ? "Thinking..." : tripMode === "HOTEL_ONLY" ? "Suggest and search hotels" : "Suggest and search"}
                                </HeroButton>

                                <HeroButton onClick={() => navigate("/plan/manual")}>
                                    Switch to manual
                                </HeroButton>

                                <HeroButton onClick={() => navigate("/discover")}>
                                    â† Back
                                </HeroButton>
                            </div>
                        </div>

                        <div className="w-full max-w-[620px] justify-self-end space-y-5 pb-12 lg:pb-20">
                            <AiPromptComposer
                                value={aiForm.prompt}
                                onChange={updatePrompt}
                                maxLength={AI_PROMPT_MAX_LENGTH}
                                autoFocus
                            />

                            {aiOptions.length > 1 ? (
                                <GlassCard className="p-6 bg-white/12 !border-white/15 !text-white backdrop-blur-xl">
                                    <div className="mb-4 text-xl font-bold text-white">
                                        Choose a destination option
                                    </div>

                                    <div className="space-y-3">
                                        {aiOptions.map((option) => (
                                            <button
                                                key={option.cityCode}
                                                type="button"
                                                onClick={() =>
                                                    handleDestinationOptionSelect(
                                                        option,
                                                        pendingSelection?.interpretation,
                                                        pendingSelection?.recommendations || aiOptions,
                                                        pendingSelection?.tripMode || tripMode
                                                    )
                                                }
                                                className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-left transition hover:bg-white/15"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <div className="text-base font-semibold text-white">{option.name}</div>
                                                        <div className="mt-1 text-sm text-white/70">
                                                            {option.countryName} Â· {option.cityCode}
                                                        </div>
                                                    </div>
                                                    <Badge tone="blue">Select</Badge>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </GlassCard>
                            ) : null}

                            {loadingCountries ? (
                                <div className="pb-10 text-sm text-white/65">
                                    Loading destinations...
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}


