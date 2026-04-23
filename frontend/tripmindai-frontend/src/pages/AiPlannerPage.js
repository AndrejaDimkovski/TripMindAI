import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api";
import { recommendTripAi } from "../api/aiApi";
import { searchTrip } from "../api/tripsApi";

const FLOW_STORAGE_KEY = "tm_flow_v1";

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
    if (!value) return "—";
    const iso = normalizeDateToIso(value);
    if (!iso) return String(value);

    const [yyyy, mm, dd] = iso.split("-");
    return `${dd}.${mm}.${yyyy}`;
}

function isValidIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(value);
    return !Number.isNaN(d.getTime());
}

function normalizePromptText(prompt) {
    return String(prompt || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function mapAiBudgetToPriceRange(budgetLevel) {
    const value = String(budgetLevel || "").trim().toLowerCase();

    if (value === "low") return "LOW";
    if (value === "medium") return "MEDIUM";
    if (value === "high") return "HIGH";

    return "";
}

function getBudgetPresentation(level, currency = "EUR") {
    const value = String(level || "").trim().toLowerCase();

    switch (value) {
        case "low":
            return {
                label: "Budget",
                badgeTone: "green",
                description: "Affordable stays and lower total trip cost.",
                rangeText: `0 – 500 ${currency}`,
            };
        case "high":
            return {
                label: "Premium / Luxury",
                badgeTone: "yellow",
                description: "Higher-end hotels, comfort-first options and premium pricing.",
                rangeText: `1200+ ${currency}`,
            };
        case "medium":
        default:
            return {
                label: "Mid-range",
                badgeTone: "blue",
                description: "Balanced comfort and price for most trips.",
                rangeText: `500 – 1200 ${currency}`,
            };
    }
}

function getBudgetPriceRangeText(priceRange, currency = "EUR") {
    const value = String(priceRange || "").trim().toUpperCase();

    if (value === "LOW") return `0 – 500 ${currency}`;
    if (value === "MEDIUM") return `500 – 1200 ${currency}`;
    if (value === "HIGH") return `1200+ ${currency}`;

    return "Will be determined from prompt";
}

function validateDates(from, to) {
    const fromIso = normalizeDateToIso(from);
    const toIso = normalizeDateToIso(to);

    if (from && (!fromIso || !isValidIsoDate(fromIso))) {
        return "From датум мора да биде валиден.";
    }

    if (to && (!toIso || !isValidIsoDate(toIso))) {
        return "To датум мора да биде валиден.";
    }

    if (fromIso && toIso && toIso < fromIso) {
        return "To датум не смее да биде пред From.";
    }

    return "";
}

function normalizeDestination(destination) {
    if (!destination) return null;

    return {
        id: destination.id ?? null,
        countryCode: destination.countryCode || "",
        cityCode: destination.cityCode || "",
        name: destination.name || "",
        latitude: destination.latitude ?? null,
        longitude: destination.longitude ?? null,
        description: destination.description || "",
        imageUrl: destination.imageUrl || null,
    };
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
    const promptRef = useRef(null);
    const previewTimeoutRef = useRef(null);
    const previewRequestIdRef = useRef(0);

    const [countries, setCountries] = useState([]);
    const [loadingCountries, setLoadingCountries] = useState(true);

    const [aiLoading, setAiLoading] = useState(false);
    const [aiPreviewLoading, setAiPreviewLoading] = useState(false);
    const [error, setError] = useState("");
    const [aiError, setAiError] = useState("");

    const [activeCountryName, setActiveCountryName] = useState("");
    const [selectedDestination, setSelectedDestination] = useState(null);
    const [aiSuggestedCodes, setAiSuggestedCodes] = useState([]);
    const [aiPreview, setAiPreview] = useState(null);

    const [aiForm, setAiForm] = useState({
        prompt: "",
        budgetLevel: "medium",
        people: 2,
        originCity: "Skopje",
        fromDate: "",
        toDate: "",
    });

    const [searchForm, setSearchForm] = useState({
        origin: "Skp",
        from: "",
        to: "",
        adults: 2,
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
        const focusTimer = setTimeout(() => promptRef.current?.focus?.(), 0);
        return () => clearTimeout(focusTimer);
    }, []);

    useEffect(() => {
        return () => {
            if (previewTimeoutRef.current) {
                clearTimeout(previewTimeoutRef.current);
            }
        };
    }, []);

    async function loadInitial() {
        setLoadingCountries(true);
        setError("");

        try {
            const flow = readFlowState();

            if (flow?.aiForm) {
                setAiForm((prev) => ({ ...prev, ...flow.aiForm }));
            }

            if (flow?.searchForm) {
                setSearchForm((prev) => ({ ...prev, ...flow.searchForm }));
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

    const detectedBudget = useMemo(() => {
        return aiPreview?.budgetLevel || aiForm.budgetLevel || "medium";
    }, [aiPreview, aiForm.budgetLevel]);

    const detectedPeople = useMemo(() => {
        return aiPreview?.extractedPeople || aiForm.people || 1;
    }, [aiPreview, aiForm.people]);

    const detectedDatesText = useMemo(() => {
        if (aiPreview?.extractedFromDate || aiPreview?.extractedToDate) {
            return `${formatDateDisplay(aiPreview?.extractedFromDate)}${
                aiPreview?.extractedToDate ? ` → ${formatDateDisplay(aiPreview.extractedToDate)}` : ""
            }`;
        }

        if (aiPreview?.extractedMonth) {
            const duration = aiPreview?.extractedDurationDays
                ? ` · ${aiPreview.extractedDurationDays} days`
                : "";
            return `${aiPreview.extractedMonth}${duration}`;
        }

        return "Will be detected from text";
    }, [aiPreview]);

    const livePromptState = useMemo(() => {
        if (!aiForm.prompt?.trim()) return "Waiting for input";
        if (aiPreviewLoading) return "Thinking...";
        if (aiPreview) return "Ready";
        if (aiForm.prompt.trim().length < 8) return "Typing...";
        return "Analyzing...";
    }, [aiForm.prompt, aiPreviewLoading, aiPreview]);

    const budgetPreview = useMemo(() => {
        return getBudgetPresentation(
            detectedBudget || aiForm.budgetLevel,
            searchForm?.targetCurrency || "EUR"
        );
    }, [detectedBudget, aiForm.budgetLevel, searchForm?.targetCurrency]);

    const previewPriceRange = useMemo(() => {
        return mapAiBudgetToPriceRange(detectedBudget || aiForm.budgetLevel);
    }, [detectedBudget, aiForm.budgetLevel]);

    const selectedDestinationName = selectedDestination?.name || aiPreview?.extractedDestinationText || "Not selected yet";
    const selectedCountryLabel = activeCountryName || selectedDestination?.countryCode || "Country not detected yet";

    function clearAiPreview() {
        setAiPreview(null);
        setSelectedDestination(null);
        setActiveCountryName("");
        setAiSuggestedCodes([]);
    }

    function clearPreviewState() {
        setSelectedDestination(null);
        setActiveCountryName("");
        setAiSuggestedCodes([]);
    }

    function triggerAiPreview(promptValue) {
        if (previewTimeoutRef.current) {
            clearTimeout(previewTimeoutRef.current);
        }

        const trimmed = String(promptValue || "").trim();

        if (trimmed.length < 6) {
            setAiPreview(null);
            setAiPreviewLoading(false);
            return;
        }

        const requestId = ++previewRequestIdRef.current;

        previewTimeoutRef.current = setTimeout(async () => {
            try {
                setAiPreviewLoading(true);

                const res = await recommendTripAi({
                    prompt: trimmed,
                    budgetLevel: "medium",
                    people: 2,
                    originCity: aiForm.originCity || "Skopje",
                    fromDate: null,
                    toDate: null,
                });

                if (previewRequestIdRef.current === requestId) {
                    setAiPreview(res?.interpretation || null);
                }
            } catch (e) {
                console.error("AI preview error:", e);
                if (previewRequestIdRef.current === requestId) {
                    setAiPreview(null);
                }
            } finally {
                if (previewRequestIdRef.current === requestId) {
                    setAiPreviewLoading(false);
                }
            }
        }, 600);
    }

    function updatePrompt(value) {
        setAiForm((prev) => {
            const next = {
                ...prev,
                prompt: value,
                fromDate: "",
                toDate: "",
            };

            saveFlowState({
                mode: "ai",
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
                                              }) {
        const safeDestination = normalizeDestination(destinationObj);
        const cityCode = String(safeDestination?.cityCode || "").trim();

        if (!cityCode) {
            throw new Error("AI не врати валидна дестинација.");
        }

        const dateMessage = validateDates(nextSearchForm.from, nextSearchForm.to);
        if (dateMessage) {
            throw new Error(dateMessage);
        }

        const normalizedFrom = normalizeDateToIso(nextSearchForm.from);
        const normalizedTo = normalizeDateToIso(nextSearchForm.to);

        const data = await searchTrip({
            origin: String(nextSearchForm.origin || "SKP").trim(),
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
                from: normalizedFrom,
                to: normalizedTo,
            },
            searchResult: data,
            selectedFlightIndex: null,
            selectedHotelIndex: null,
        });

        navigate("/plan/flights");
    }

    async function handleAiSearch() {
        setAiLoading(true);
        setAiError("");
        clearPreviewState();

        try {
            if (!aiForm.prompt || aiForm.prompt.trim().length < 8) {
                throw new Error("Напиши барем 1-2 реченици за какво патување сакаш.");
            }

            const dateMessage = validateDates(aiForm.fromDate, aiForm.toDate);
            if (dateMessage) {
                throw new Error(dateMessage);
            }

            const res = await recommendTripAi({
                prompt: aiForm.prompt.trim(),
                budgetLevel: aiForm.budgetLevel,
                people: Number(aiForm.people || 1),
                originCity: aiForm.originCity || null,
                fromDate: aiForm.fromDate || null,
                toDate: aiForm.toDate || null,
            });

            const interpretation = res?.interpretation || null;
            const recommendations = Array.isArray(res?.recommendations) ? res.recommendations : [];

            if (!recommendations.length) {
                throw new Error("AI не врати препораки.");
            }

            const codes = recommendations
                .map((r) => String(r?.cityCode || "").toUpperCase())
                .filter(Boolean);

            setAiSuggestedCodes(codes);

            const promptLower = normalizePromptText(aiForm.prompt);
            const extractedDestinationText = normalizePromptText(
                interpretation?.extractedDestinationText || aiPreview?.extractedDestinationText || ""
            );

            const interpretedCodes = Array.isArray(interpretation?.destinationCodes)
                ? interpretation.destinationCodes.map((c) => String(c).toUpperCase())
                : [];

            const bestMatch =
                recommendations.find(
                    (r) => interpretedCodes[0] === String(r?.cityCode || "").toUpperCase()
                ) ||
                recommendations.find((r) =>
                    interpretedCodes.includes(String(r?.cityCode || "").toUpperCase())
                ) ||
                recommendations.find(
                    (r) =>
                        extractedDestinationText &&
                        normalizePromptText(r?.name) === extractedDestinationText
                ) ||
                recommendations.find(
                    (r) =>
                        extractedDestinationText &&
                        normalizePromptText(r?.name).includes(extractedDestinationText)
                ) ||
                recommendations.find((r) =>
                    promptLower.includes(normalizePromptText(r?.name))
                ) ||
                recommendations[0];

            if (!bestMatch?.cityCode) {
                throw new Error("AI не врати валиден city code за дестинација.");
            }

            const nextAdults =
                interpretation?.extractedPeople ||
                aiPreview?.extractedPeople ||
                Math.max(1, Number(searchForm.adults || 1));

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

            const nextAiForm = {
                ...aiForm,
                budgetLevel: normalizedBudget,
                people: nextAdults,
                fromDate: interpretation?.extractedFromDate || aiPreview?.extractedFromDate || "",
                toDate: interpretation?.extractedToDate || aiPreview?.extractedToDate || "",
            };

            const nextSearchForm = {
                ...searchForm,
                from: nextFrom,
                to: nextTo,
                adults: nextAdults,
                priceRange:
                    mapAiBudgetToPriceRange(interpretation?.budgetLevel) ||
                    mapAiBudgetToPriceRange(aiPreview?.budgetLevel) ||
                    mapAiBudgetToPriceRange(normalizedBudget) ||
                    searchForm.priceRange,
            };

            const matchedCountry =
                countries.find(
                    (c) =>
                        c.code === bestMatch.countryCode ||
                        c.name === bestMatch.countryName
                ) || null;

            const selected = normalizeDestination(bestMatch);

            setAiForm(nextAiForm);
            setSearchForm(nextSearchForm);
            setSelectedDestination(selected);
            setActiveCountryName(matchedCountry?.name || bestMatch.countryName || "");

            await searchTripsWithDestination({
                destinationObj: selected,
                countryObj:
                    matchedCountry || {
                        id: null,
                        code: bestMatch.countryCode || "",
                        name: bestMatch.countryName || "",
                        imageUrl: null,
                    },
                nextSearchForm,
                nextAiForm,
                nextCodes: codes,
            });
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
                            ⚠️ {error}
                        </div>
                    ) : null}

                    {aiError ? (
                        <div className="mb-6 rounded-2xl border border-rose-300/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 backdrop-blur">
                            ⚠️ {aiError}
                        </div>
                    ) : null}

                    <div className="grid w-full items-start gap-10 lg:grid-cols-[1.02fr_0.98fr]">
                        <div className="pt-6 lg:pt-10">
                            <HeroPill>AI Travel Planner</HeroPill>

                            <h1 className="mt-8 text-6xl font-extrabold uppercase leading-none text-white md:text-7xl xl:text-[6.3rem]">
                                Plan with AI
                            </h1>

                            <p className="mt-5 max-w-xl text-sm leading-7 text-white/85 md:text-base">
                                Describe your ideal journey and let TravelMindAI detect destination,
                                travel dates, people and budget, then continue directly to flights.
                            </p>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <Badge tone="white">{selectedDestinationName}</Badge>
                                <Badge tone="blue">{selectedCountryLabel}</Badge>
                                <Badge tone="green">{detectedPeople} traveler{Number(detectedPeople) > 1 ? "s" : ""}</Badge>
                            </div>

                            <div className="mt-8 flex flex-wrap gap-4">
                                <HeroButton primary onClick={handleAiSearch} disabled={aiLoading}>
                                    {aiLoading ? "Thinking..." : "Suggest and search"}
                                </HeroButton>

                                <HeroButton onClick={() => navigate("/plan/manual")}>
                                    Switch to manual
                                </HeroButton>

                                <HeroButton onClick={() => navigate("/discover")}>
                                    ← Back
                                </HeroButton>
                            </div>
                        </div>

                        <div className="w-full max-w-[620px] justify-self-end space-y-5 pb-12 lg:pb-20">
                            <GlassCard className="p-6 bg-white/12 !border-white/15 !text-white backdrop-blur-xl">
                                <div className="mb-5 flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-xl font-bold text-white">Write your travel idea</div>
                                        <div className="mt-1 text-sm text-white/70">
                                            Enter your request naturally and AI preview updates while you type.
                                        </div>
                                    </div>

                                    <Badge tone="white">Prompt</Badge>
                                </div>

                                <div>
                                    <label className="mb-3 block text-sm font-medium text-white/80">
                                        Prompt
                                    </label>

                                    <textarea
                                        ref={promptRef}
                                        rows={8}
                                        value={aiForm.prompt}
                                        onChange={(e) => updatePrompt(e.target.value)}
                                        placeholder="I want to go to New York just me, from 30.06.2026 to 07.07.2026 with medium budget..."
                                        className="min-h-[260px] w-full resize-none rounded-[22px] border border-white/15 bg-white/10 px-5 py-5 text-[15px] leading-7 text-white placeholder:text-white/35 outline-none transition focus:border-white/30 focus:bg-white/15"
                                    />

                                    <div className="mt-4 flex items-center justify-between gap-3">
                                        <div className="text-xs text-white/55">
                                            Write destination, dates, people and style in one sentence.
                                        </div>

                                        <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/75">
                                            {aiForm.prompt?.length || 0} chars
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>

                            <GlassCard className="p-6 bg-white/12 !border-white/15 !text-white backdrop-blur-xl">
                                <div className="mb-5 flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-xl font-bold text-white">AI preview</div>
                                        <div className="mt-1 text-sm text-white/70">
                                            Live interpretation while you type
                                        </div>
                                    </div>
                                    <Badge tone="white">{livePromptState}</Badge>
                                </div>

                                <div className="space-y-3">
                                    <div className="rounded-2xl bg-white/10 p-4">
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                                            Detected dates
                                        </div>
                                        <div className="mt-2 text-sm font-semibold text-white">
                                            {detectedDatesText}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-white/10 p-4">
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                                            Detected duration
                                        </div>
                                        <div className="mt-2 text-sm font-semibold text-white">
                                            {aiPreview?.extractedDurationDays
                                                ? `${aiPreview.extractedDurationDays} days`
                                                : "Will be detected from text"}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-white/10 p-4">
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                                            Detected people
                                        </div>
                                        <div className="mt-2 text-sm font-semibold text-white">
                                            {detectedPeople || "Will be detected from text"}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-white/10 p-4">
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                                            Detected budget
                                        </div>

                                        <div className="mt-2 flex items-center gap-2">
                                            <span className="text-sm font-semibold text-white">
                                                {budgetPreview.label}
                                            </span>
                                        </div>

                                        <div className="mt-2 text-sm text-white/75">
                                            {budgetPreview.description}
                                        </div>

                                        <div className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                                            Expected hotel range: {budgetPreview.rangeText}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-white/10 p-4">
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                                            Search price filter
                                        </div>
                                        <div className="mt-2 text-sm font-semibold text-white">
                                            {getBudgetPriceRangeText(
                                                previewPriceRange,
                                                searchForm?.targetCurrency || "EUR"
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-white/10 p-4">
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                                            Destination status
                                        </div>
                                        <div className="mt-2 text-sm font-semibold text-white">
                                            {selectedDestinationName}
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>

                            {aiSuggestedCodes.length > 0 && (
                                <GlassCard className="p-6 bg-white/12 !border-white/15 !text-white backdrop-blur-xl">
                                    <div className="mb-4 text-xl font-bold text-white">
                                        Suggested destination codes
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {aiSuggestedCodes.map((code) => (
                                            <Badge key={code} tone="yellow">
                                                {code}
                                            </Badge>
                                        ))}
                                    </div>
                                </GlassCard>
                            )}

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
