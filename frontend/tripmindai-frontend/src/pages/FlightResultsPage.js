import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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

function fmtMoney(v) {
    const n = Number(v || 0);
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function displayValue(value, fallback = "—") {
    if (value == null) return fallback;
    if (typeof value === "string" && value.trim() === "") return fallback;
    return value;
}

function priceText(item, fallbackCurrency = "EUR") {
    if (!item) return `0.00 ${fallbackCurrency}`;

    const amount = Number(
        item?.convertedTotalWithTaxes ??
        item?.convertedTotalPrice ??
        item?.totalWithTaxes ??
        item?.totalPrice ??
        0
    );

    const currency =
        item?.convertedCurrency ||
        item?.currency ||
        fallbackCurrency ||
        "EUR";

    return `${fmtMoney(amount)} ${currency}`;
}

function flightStopsText(stops) {
    const n = Number(stops || 0);
    if (n === 0) return "Direct flight";
    if (n === 1) return "1 stop";
    return `${n} stops`;
}

function getPlannerRoute(flow) {
    return flow?.mode === "ai" ? "/plan/ai" : "/plan/manual";
}

function formatDateDisplay(value) {
    if (!value) return "—";

    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
        const [yyyy, mm, dd] = String(value).split("-");
        return `${dd}.${mm}.${yyyy}`;
    }

    try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return String(value);

        return d.toLocaleDateString(undefined, {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    } catch {
        return String(value);
    }
}

function formatDateTime(value) {
    if (!value) return "—";

    try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return String(value);

        return d.toLocaleString(undefined, {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return String(value);
    }
}

function formatTripType(value) {
    if (!value) return "—";
    return value === "ROUND_TRIP" ? "Round trip" : "One way";
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

function Badge({ children, tone = "light" }) {
    const styles = {
        light: "bg-white/90 text-slate-900",
        green: "bg-emerald-100 text-emerald-700",
        blue: "bg-blue-100 text-blue-700",
        yellow: "bg-amber-100 text-amber-700",
        dark: "bg-slate-900 text-white",
        white: "bg-white/90 text-slate-900",
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
            <div className="mt-2 break-words whitespace-pre-line text-sm font-semibold leading-6 text-white">
                {displayValue(value)}
            </div>
        </div>
    );
}

export default function FlightResultsPage() {
    const navigate = useNavigate();

    const [flow, setFlow] = useState(null);
    const [selectedFlightIndex, setSelectedFlightIndex] = useState(null);

    useEffect(() => {
        const current = readFlowState();

        if (!current?.searchResult) {
            navigate(getPlannerRoute(current), { replace: true });
            return;
        }

        setFlow(current);

        const flights = Array.isArray(current?.searchResult?.flights) ? current.searchResult.flights : [];
        const initialIndex =
            current?.selectedFlightIndex != null &&
            current.selectedFlightIndex >= 0 &&
            current.selectedFlightIndex < flights.length
                ? current.selectedFlightIndex
                : null;

        setSelectedFlightIndex(initialIndex);
    }, [navigate]);

    const flights = useMemo(() => {
        return Array.isArray(flow?.searchResult?.flights) ? flow.searchResult.flights : [];
    }, [flow]);

    const hotelsCount = useMemo(() => {
        return Array.isArray(flow?.searchResult?.hotels) ? flow.searchResult.hotels.length : 0;
    }, [flow]);

    const selectedFlight = useMemo(() => {
        if (selectedFlightIndex == null) return null;
        return flights[selectedFlightIndex] || null;
    }, [flights, selectedFlightIndex]);

    const destinationName = flow?.destination?.name || "Destination";
    const countryName = flow?.country?.name || "";
    const searchForm = flow?.searchForm || {};
    const currency = searchForm?.targetCurrency || "EUR";

    const flightsServiceAvailable = flow?.searchResult?.flightsServiceAvailable !== false;
    const flightsMessage =
        flow?.searchResult?.flightsMessage ||
        "Flight service is temporarily unavailable. Please try again later.";

    function persistSelectedFlight(index) {
        const current = readFlowState() || {};
        const next = {
            ...current,
            selectedFlightIndex: index,
        };

        saveFlowState(next);
        setFlow(next);
    }

    function handleSelectFlight(index) {
        setSelectedFlightIndex(index);
        persistSelectedFlight(index);
    }

    function openFlightDetails(index) {
        setSelectedFlightIndex(index);
        persistSelectedFlight(index);
        navigate("/plan/flight-details");
    }

    function goBack() {
        const current = readFlowState();
        navigate(getPlannerRoute(current));
    }

    function continueToHotels() {
        if (selectedFlightIndex == null) return;
        persistSelectedFlight(selectedFlightIndex);
        navigate("/plan/hotels");
    }

    if (!flow) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0b1620] text-white">
                Loading flight results...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0b1620]">
            <section className="relative min-h-screen overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1800&auto=format&fit=crop')] bg-cover bg-center" />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,14,20,0.84)_0%,rgba(8,18,28,0.62)_36%,rgba(8,18,28,0.32)_68%,rgba(8,18,28,0.26)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_28%)]" />

                <div className="relative z-10 mx-auto max-w-[1600px] px-4 pb-16 pt-28 lg:px-6">
                    <div className="grid items-start gap-10 lg:grid-cols-[1.02fr_0.98fr]">
                        <div className="pt-6 lg:pt-10">
                            <HeroPill>Flight Results</HeroPill>

                            <h1 className="mt-8 text-6xl font-extrabold uppercase leading-none text-white md:text-7xl xl:text-[6.2rem]">
                                Choose
                                <br />
                                Flight
                            </h1>

                            <p className="mt-5 max-w-xl text-sm leading-7 text-white/85 md:text-base">
                                Review available flights for {destinationName}
                                {countryName ? `, ${countryName}` : ""} and continue to hotel selection.
                            </p>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <Badge tone="white">{destinationName}</Badge>
                                <Badge tone="blue">{displayValue(countryName, "Country")}</Badge>
                                <Badge tone="green">{flights.length} flight{flights.length !== 1 ? "s" : ""}</Badge>
                            </div>

                            <div className="mt-8 flex flex-wrap gap-4">
                                <HeroButton onClick={goBack}>
                                    ← Back
                                </HeroButton>

                                <HeroButton
                                    primary
                                    onClick={continueToHotels}
                                    disabled={selectedFlightIndex == null}
                                >
                                    Continue to hotels
                                </HeroButton>
                            </div>
                        </div>

                        <div className="w-full max-w-[620px] justify-self-end">
                            <GlassPanel className="p-6 text-white">
                                <div className="mb-5">
                                    <div className="text-2xl font-bold text-white">Trip summary</div>
                                    <div className="mt-1 text-sm text-white/70">
                                        Current route and search overview
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <InfoTile label="Destination" value={destinationName} />
                                    <InfoTile label="Country" value={countryName} />
                                    <InfoTile label="Flights found" value={flights.length} />
                                    <InfoTile label="Hotels found" value={hotelsCount} />
                                </div>

                                <div className="mt-4 rounded-2xl bg-white/10 p-4">
                                    <div
                                        className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                                        Travel dates
                                    </div>
                                    <div className="mt-2 text-sm font-semibold text-white">
                                        {formatDateDisplay(searchForm?.from)}
                                        {searchForm?.to ? ` → ${formatDateDisplay(searchForm.to)}` : ""}
                                    </div>
                                </div>

                                <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-500/15 p-4">
                                    <div
                                        className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                                        Price notice
                                    </div>
                                    <div className="mt-2 text-sm leading-6 text-white/80">
                                        Displayed prices are indicative and may differ from the final airline offer at
                                        booking time.
                                    </div>
                                </div>

                            </GlassPanel>
                        </div>
                    </div>

                    {flights.length === 0 ? (
                        <div className="mt-10">
                            <GlassPanel className="p-6 text-white lg:p-8">
                                <h2 className="text-2xl font-bold text-white">
                                {flightsServiceAvailable ? "No flights found" : "Flight service unavailable"}
                                </h2>
                                <p className="mt-2 text-sm text-white/70">
                                    {flightsServiceAvailable
                                        ? "No real flights were returned for this search. Try another destination, dates, or passenger count."
                                        : flightsMessage}
                                </p>

                                <div className="mt-5">
                                    <HeroButton onClick={goBack}>
                                        Back to planner
                                    </HeroButton>
                                </div>
                            </GlassPanel>
                        </div>
                    ) : (
                        <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                            <div className="space-y-4">
                                {flights.map((flight, index) => {
                                    const isSelected = selectedFlightIndex === index;

                                    return (
                                        <GlassPanel
                                            key={`${flight?.originIata || "ORG"}-${flight?.destIata || "DST"}-${index}`}
                                            className={`p-5 text-white transition lg:p-6 ${
                                                isSelected
                                                    ? "border-emerald-400 bg-emerald-500/15 ring-2 ring-emerald-400/30"
                                                    : "hover:bg-white/15"
                                            }`}
                                        >
                                            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                                <div className="flex-1">
                                                    <h3 className="text-2xl font-bold text-white">
                                                        {displayValue(flight?.originCity || flight?.originIata, "Origin")} →{" "}
                                                        {displayValue(flight?.destCity || flight?.destIata, "Destination")}
                                                    </h3>

                                                    <div className="mt-2 text-sm text-white/70">
                                                        {displayValue(flight?.originCity || flight?.originIata, "Origin")} (
                                                        {displayValue(flight?.originIata)}) →{" "}
                                                        {displayValue(flight?.destCity || flight?.destIata, "Destination")} (
                                                        {displayValue(flight?.destIata)})
                                                    </div>

                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        <Badge tone="light">{formatTripType(flight?.tripType)}</Badge>
                                                        <Badge tone="green">{flightStopsText(flight?.stops)}</Badge>
                                                        {flight?.airlineName ? (
                                                            <Badge tone="blue">{flight.airlineName}</Badge>
                                                        ) : null}
                                                    </div>

                                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                                        <div className="rounded-2xl bg-white/10 p-4">
                                                            <div className="text-xs uppercase tracking-wide text-white/55">
                                                                Outbound
                                                            </div>
                                                            <div className="mt-2 font-semibold text-white">
                                                                {formatDateTime(flight?.departureAt)} →{" "}
                                                                {formatDateTime(flight?.arrivalAt)}
                                                            </div>
                                                        </div>

                                                        <div className="rounded-2xl bg-white/10 p-4">
                                                            <div className="text-xs uppercase tracking-wide text-white/55">
                                                                Return
                                                            </div>
                                                            <div className="mt-2 font-semibold text-white">
                                                                {flight?.returnDepartureAt || flight?.returnArrivalAt
                                                                    ? `${formatDateTime(flight?.returnDepartureAt)} → ${formatDateTime(flight?.returnArrivalAt)}`
                                                                    : "—"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex min-w-[240px] flex-col items-start gap-3 lg:items-end">
                                                    <div className="text-2xl font-bold text-white">
                                                        {priceText(flight, currency)}
                                                    </div>

                                                    <div className="flex w-full flex-col gap-2 lg:w-auto">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSelectFlight(index)}
                                                            className={`rounded-2xl px-5 py-3 font-semibold transition ${
                                                                isSelected
                                                                    ? "bg-emerald-500 text-white"
                                                                    : "border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"
                                                            }`}
                                                        >
                                                            {isSelected ? "Selected" : "Select flight"}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => openFlightDetails(index)}
                                                            className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/20"
                                                        >
                                                            View details
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </GlassPanel>
                                    );
                                })}
                            </div>

                            <aside>
                                <div className="space-y-6 lg:sticky lg:top-24">
                                    <GlassPanel className="p-6 text-white">
                                        <div className="mb-5">
                                            <div className="text-xl font-bold text-white">Selected flight</div>
                                            <div className="mt-1 text-sm text-white/70">
                                                Review your chosen option before continuing
                                            </div>
                                        </div>

                                        {!selectedFlight ? (
                                            <div className="rounded-2xl bg-white/10 p-4 text-white/75">
                                                Select a flight to continue.
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge tone="green">
                                                        {formatTripType(selectedFlight?.tripType)}
                                                    </Badge>
                                                    <Badge tone="blue">
                                                        {flightStopsText(selectedFlight?.stops)}
                                                    </Badge>
                                                </div>

                                                <div className="mt-4 space-y-3">
                                                    <InfoTile
                                                        label="Route"
                                                        value={`${displayValue(selectedFlight?.originIata)} → ${displayValue(selectedFlight?.destIata)}`}
                                                    />
                                                    <InfoTile
                                                        label="Airline"
                                                        value={selectedFlight?.airlineName || selectedFlight?.airlineCode}
                                                    />
                                                    <InfoTile
                                                        label="Outbound"
                                                        value={`${formatDateTime(selectedFlight?.departureAt)} → ${formatDateTime(selectedFlight?.arrivalAt)}`}
                                                    />
                                                    <InfoTile
                                                        label="Return"
                                                        value={
                                                            selectedFlight?.returnDepartureAt || selectedFlight?.returnArrivalAt
                                                                ? `${formatDateTime(selectedFlight?.returnDepartureAt)} → ${formatDateTime(selectedFlight?.returnArrivalAt)}`
                                                                : "—"
                                                        }
                                                    />
                                                    <InfoTile
                                                        label="Price"
                                                        value={priceText(selectedFlight, currency)}
                                                    />
                                                </div>

                                                <div className="mt-5 flex flex-col gap-3">
                                                    <HeroButton
                                                        onClick={() => openFlightDetails(selectedFlightIndex)}
                                                        disabled={selectedFlightIndex == null}
                                                    >
                                                        View full details
                                                    </HeroButton>

                                                    <HeroButton
                                                        primary
                                                        onClick={continueToHotels}
                                                        disabled={selectedFlightIndex == null}
                                                    >
                                                        Continue to hotels
                                                    </HeroButton>
                                                </div>
                                            </>
                                        )}
                                    </GlassPanel>
                                </div>
                            </aside>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
