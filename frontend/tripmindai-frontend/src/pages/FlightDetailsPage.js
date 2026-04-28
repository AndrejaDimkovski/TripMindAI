import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFlightDetails } from "../api/tripsApi";

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

function getPlannerRoute(flow) {
    return flow?.mode === "ai" ? "/plan/ai" : "/plan/manual";
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

function flightPriceAmount(flight) {
    const amount = Number(
        flight?.convertedTotalWithTaxes ??
        flight?.convertedTotalPrice ??
        flight?.totalWithTaxes ??
        flight?.totalPrice ??
        0
    );

    return Number.isFinite(amount) ? amount : 0;
}

function flightPriceCurrency(flight, fallback = "EUR") {
    return flight?.convertedCurrency || flight?.currency || fallback;
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

function formatStops(stops) {
    const total = Number(stops || 0);
    if (total <= 0) return "Direct";
    if (total === 1) return "1 stop";
    return `${total} stops`;
}

function minutesText(minutes) {
    const total = Number(minutes || 0);
    if (!total || total <= 0) return "—";

    const h = Math.floor(total / 60);
    const m = total % 60;

    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
}

function getSegmentLabel(segmentIndex, totalSegments, tripType) {
    if (tripType === "ROUND_TRIP" || totalSegments > 1) {
        if (segmentIndex === 0) return "Outbound";
        if (segmentIndex === 1) return "Return";
    }

    return "Journey";
}

function getStopoverLabel(legIndex, totalLegs, leg) {
    if (legIndex === totalLegs - 1) return null;
    return leg?.arrivalCity || leg?.arrivalAirportCode || "Stopover";
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
        <div className={`rounded-[28px] border border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl ${className}`}>
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

export default function FlightDetailsPage() {
    const navigate = useNavigate();

    const [flow, setFlow] = useState(null);
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const current = readFlowState();

        if (!current?.searchResult) {
            navigate(getPlannerRoute(current), { replace: true });
            return;
        }

        if (current?.selectedFlightIndex == null) {
            navigate("/plan/flights", { replace: true });
            return;
        }

        setFlow(current);

        const selectedFlight =
            current?.searchResult?.flights?.[current.selectedFlightIndex] || null;

        if (!selectedFlight?.token) {
            setError("Flight token not found.");
            setLoading(false);
            return;
        }

        loadDetails(selectedFlight.token);
    }, [navigate]);

    async function loadDetails(token) {
        try {
            setLoading(true);
            setError("");

            const data = await getFlightDetails(token);
            setDetails(data || null);
        } catch (e) {
            setError(e.message || "Failed to load flight details.");
        } finally {
            setLoading(false);
        }
    }

    const selectedFlight = useMemo(() => {
        if (!flow || flow.selectedFlightIndex == null) return null;
        return flow?.searchResult?.flights?.[flow.selectedFlightIndex] || null;
    }, [flow]);

    const detailsSegments = useMemo(() => {
        return Array.isArray(details?.segments) ? details.segments : [];
    }, [details]);

    function goBack() {
        navigate("/plan/flights");
    }

    function continueToHotels() {
        if (!flow || !selectedFlight) return;

        const next = {
            ...flow,
            flightDetails: details || null,
        };

        saveFlowState(next);
        setFlow(next);
        navigate("/plan/hotels");
    }

    if (!flow) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0b1620] text-white">
                Loading flight details...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0b1620]">
            <section className="relative min-h-screen overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1800&auto=format&fit=crop')] bg-cover bg-center" />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,14,20,0.84)_0%,rgba(8,18,28,0.62)_36%,rgba(8,18,28,0.32)_68%,rgba(8,18,28,0.26)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_28%)]" />

                <div className="relative z-10 mx-auto max-w-[1400px] px-4 pb-16 pt-28 lg:px-6">
                    <div className="pt-6 lg:pt-10">
                        <HeroPill>Flight details</HeroPill>

                        <h1 className="mt-8 text-5xl font-extrabold uppercase leading-none text-white md:text-6xl xl:text-[5.3rem]">
                            View
                            <br />
                            Flight
                        </h1>

                        <p className="mt-5 max-w-2xl text-sm leading-7 text-white/85 md:text-base">
                            Review detailed flight segments, schedule, carrier and stopover information before continuing.
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2">
                            <Badge tone="green">{formatTripType(selectedFlight?.tripType)}</Badge>
                            <Badge tone="blue">{formatStops(selectedFlight?.stops)}</Badge>
                            {selectedFlight?.airlineCode ? (
                                <Badge tone="light">{selectedFlight.airlineCode}</Badge>
                            ) : null}
                        </div>

                        <div className="mt-8 flex flex-wrap gap-4">
                            <HeroButton onClick={goBack}>
                                ← Back
                            </HeroButton>

                            <HeroButton
                                primary
                                onClick={continueToHotels}
                                disabled={!selectedFlight}
                            >
                                Continue to hotels
                            </HeroButton>
                        </div>
                    </div>

                    <div className="mt-8">
                        <GlassPanel className="p-6 text-white">
                            <div className="mb-5">
                                <div className="text-2xl font-bold text-white">Selected flight</div>
                                <div className="mt-1 text-sm text-white/70">
                                    Basic summary of your chosen offer
                                </div>
                            </div>

                            {!selectedFlight ? (
                                <div className="rounded-2xl bg-white/10 p-4 text-white/75">
                                    No selected flight.
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    <InfoTile
                                        label="Route"
                                        value={`${displayValue(selectedFlight?.originIata)} → ${displayValue(selectedFlight?.destIata)}`}
                                    />
                                    <InfoTile
                                        label="Outbound"
                                        value={`${formatDateTime(selectedFlight?.departureAt)} → ${formatDateTime(selectedFlight?.arrivalAt)}`}
                                    />
                                    {selectedFlight?.returnDepartureAt || selectedFlight?.returnArrivalAt ? (
                                        <InfoTile
                                            label="Return"
                                            value={`${formatDateTime(selectedFlight?.returnDepartureAt)} → ${formatDateTime(selectedFlight?.returnArrivalAt)}`}
                                        />
                                    ) : null}
                                    <InfoTile
                                        label="Airline"
                                        value={selectedFlight?.airlineName || selectedFlight?.airlineCode}
                                    />
                                    <InfoTile
                                        label="Price"
                                        value={`${fmtMoney(flightPriceAmount(selectedFlight))} ${flightPriceCurrency(selectedFlight)}`}
                                    />
                                </div>
                            )}
                        </GlassPanel>
                    </div>

                    {loading ? (
                        <div className="mt-8">
                            <GlassPanel className="p-6 text-white">
                                Loading flight details...
                            </GlassPanel>
                        </div>
                    ) : null}

                    {error ? (
                        <div className="mt-8">
                            <GlassPanel className="p-6 text-white">
                                {error}
                            </GlassPanel>
                        </div>
                    ) : null}

                    {!loading && !error && details ? (
                        <div className="mt-8 space-y-6">
                            {detailsSegments.length > 0 ? (
                                detailsSegments.map((segment, segmentIndex) => {
                                    const segmentLabel = getSegmentLabel(
                                        segmentIndex,
                                        detailsSegments.length,
                                        details?.tripType || selectedFlight?.tripType
                                    );

                                    const legs = Array.isArray(segment?.legs) ? segment.legs : [];

                                    return (
                                        <GlassPanel
                                            key={`${segment?.departureAirportCode || "SEG"}-${segmentIndex}`}
                                            className="p-6 text-white"
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge tone="green">{segmentLabel}</Badge>
                                                <Badge tone="blue">{minutesText(segment?.totalMinutes)}</Badge>
                                                <Badge tone="light">{formatStops(legs.length - 1)}</Badge>
                                            </div>

                                            <h2 className="mt-4 text-2xl font-bold text-white">
                                                {displayValue(segment?.departureCity || segment?.departureAirportCode)} →{" "}
                                                {displayValue(segment?.arrivalCity || segment?.arrivalAirportCode)}
                                            </h2>

                                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                                <InfoTile
                                                    label="Departure"
                                                    value={`${displayValue(segment?.departureAirportName)}\n${formatDateTime(segment?.departureTime)}`}
                                                />
                                                <InfoTile
                                                    label="Arrival"
                                                    value={`${displayValue(segment?.arrivalAirportName)}\n${formatDateTime(segment?.arrivalTime)}`}
                                                />
                                            </div>

                                            <div className="mt-5 space-y-4">
                                                {legs.map((leg, legIndex) => {
                                                    const stopover = getStopoverLabel(legIndex, legs.length, leg);

                                                    return (
                                                        <div
                                                            key={`${leg?.flightNumber || "LEG"}-${legIndex}`}
                                                            className="rounded-2xl bg-white/10 p-4"
                                                        >
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <Badge tone="light">Flight {legIndex + 1}</Badge>
                                                                {leg?.airlineCode ? (
                                                                    <Badge tone="yellow">{leg.airlineCode}</Badge>
                                                                ) : null}
                                                                {leg?.flightNumber ? (
                                                                    <Badge tone="blue">{leg.flightNumber}</Badge>
                                                                ) : null}
                                                            </div>

                                                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                                                                <InfoTile
                                                                    label="Route"
                                                                    value={`${displayValue(leg?.departureAirportCode)} → ${displayValue(leg?.arrivalAirportCode)}`}
                                                                />
                                                                <InfoTile
                                                                    label="Carrier"
                                                                    value={leg?.airlineName || "Unknown airline"}
                                                                />
                                                                <InfoTile
                                                                    label="Schedule"
                                                                    value={`${formatDateTime(leg?.departureTime)} → ${formatDateTime(leg?.arrivalTime)}`}
                                                                />
                                                                <InfoTile
                                                                    label="Cabin / Duration"
                                                                    value={`${displayValue(leg?.cabinClass)} · ${minutesText(leg?.totalMinutes)}`}
                                                                />
                                                            </div>

                                                            {stopover ? (
                                                                <div className="mt-3">
                                                                    <Badge tone="dark">Stopover: {stopover}</Badge>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </GlassPanel>
                                    );
                                })
                            ) : (
                                <GlassPanel className="p-6 text-white">
                                    No detailed segments available for this flight.
                                </GlassPanel>
                            )}
                        </div>
                    ) : null}
                </div>
            </section>
        </div>
    );
}
