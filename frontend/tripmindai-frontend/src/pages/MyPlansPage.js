import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { deleteMyPlan, getMyPlans } from "../api/planApi";
import { generateTripItinerary } from "../api/itineraryApi";
import TripItineraryMap from "../components/TripItineraryMap";

function displayValue(value, fallback = "N/A") {
    if (value == null) return fallback;
    if (typeof value === "string" && value.trim() === "") return fallback;
    return value;
}

function fmtMoney(v) {
    const n = Number(v || 0);
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function fmtDateDisplay(value) {
    if (!value) return "N/A";
    try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) {
            if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
                const [yyyy, mm, dd] = String(value).split("-");
                return `${dd}.${mm}.${yyyy}`;
            }
            return String(value);
        }
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${dd}.${mm}.${yyyy}`;
    } catch {
        return String(value);
    }
}

function fmtDateTime(value) {
    if (!value) return "N/A";
    try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return String(value).replace("T", " ").slice(0, 16);

        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, "0");
        const min = String(d.getMinutes()).padStart(2, "0");

        return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
    } catch {
        return String(value).replace("T", " ").slice(0, 16);
    }
}

function fmtCoord(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(6) : "N/A";
}

function fmtMinutes(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? `${n} min` : "N/A";
}

function calculateNights(from, to) {
    if (!from || !to) return null;

    const d1 = new Date(from);
    const d2 = new Date(to);

    if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return null;

    const diffMs = d2.getTime() - d1.getTime();
    const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));

    return nights > 0 ? nights : null;
}

function itineraryDaysCount(plan, itinerary) {
    if (itinerary?.days?.length) return itinerary.days.length;

    const nights = calculateNights(plan?.fromDate, plan?.toDate);
    if (nights == null) return null;

    return nights;
}

function ActivityIcon({ type }) {
    const svgClass = "h-5 w-5";
    const svgProps = {
        className: svgClass,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true",
    };

    switch (String(type || "").toLowerCase()) {
        case "museum":
            return (
                <svg {...svgProps}>
                    <path d="M3 9l9-5 9 5" />
                    <path d="M4 10h16" />
                    <path d="M6 10v8" />
                    <path d="M10 10v8" />
                    <path d="M14 10v8" />
                    <path d="M18 10v8" />
                    <path d="M4 18h16" />
                    <path d="M3 21h18" />
                </svg>
            );
        case "restaurant":
            return (
                <svg {...svgProps}>
                    <path d="M6 3v7" />
                    <path d="M9 3v7" />
                    <path d="M6 7h3" />
                    <path d="M7.5 10v11" />
                    <path d="M17 3v18" />
                    <path d="M14 3h3a3 3 0 0 1 0 6h-3" />
                </svg>
            );
        case "walking_route":
            return (
                <svg {...svgProps}>
                    <path d="M13 4a2 2 0 1 0-4 0 2 2 0 0 0 4 0z" />
                    <path d="M10.5 7l-2 5 4 2 2.5 5" />
                    <path d="M8.5 12L6 20" />
                    <path d="M12.5 14l4-2" />
                    <path d="M18 20h.01" />
                    <path d="M21 18h.01" />
                </svg>
            );
        case "park":
            return (
                <svg {...svgProps}>
                    <path d="M12 21v-7" />
                    <path d="M8 14h8" />
                    <path d="M12 3l-5 7h10l-5-7z" />
                    <path d="M12 7l-4 6h8l-4-6z" />
                </svg>
            );
        case "shopping":
            return (
                <svg {...svgProps}>
                    <path d="M6 8h12l-1 13H7L6 8z" />
                    <path d="M9 8a3 3 0 0 1 6 0" />
                    <path d="M9 12h.01" />
                    <path d="M15 12h.01" />
                </svg>
            );
        case "viewpoint":
            return (
                <svg {...svgProps}>
                    <path d="M3 20h18" />
                    <path d="M5 20l5-8 4 5 3-4 4 7" />
                    <path d="M7 7a3 3 0 1 0 6 0 3 3 0 0 0-6 0z" />
                </svg>
            );
        case "beach":
            return (
                <svg {...svgProps}>
                    <path d="M4 11a8 8 0 0 1 16 0" />
                    <path d="M12 11v10" />
                    <path d="M8 21h8" />
                    <path d="M4 16c2 1.5 4 1.5 6 0s4-1.5 6 0 3 1 4 0" />
                </svg>
            );
        case "nightlife":
            return (
                <svg {...svgProps}>
                    <path d="M18 15.5A7 7 0 0 1 8.5 6a7 7 0 1 0 9.5 9.5z" />
                    <path d="M17 4h.01" />
                    <path d="M20 8h.01" />
                </svg>
            );
        default:
            return (
                <svg {...svgProps}>
                    <path d="M12 21s7-4.5 7-11a7 7 0 0 0-14 0c0 6.5 7 11 7 11z" />
                    <path d="M12 10.5h.01" />
                </svg>
            );
    }
}

function slotPresentation(slot) {
    switch (String(slot || "").toUpperCase()) {
        case "MORNING":
            return { label: "Morning", eyebrow: "Start the day", dot: "bg-amber-300", border: "border-amber-300/25", glow: "shadow-[0_0_32px_rgba(252,211,77,0.12)]" };
        case "AFTERNOON":
            return { label: "Afternoon", eyebrow: "Explore deeper", dot: "bg-sky-300", border: "border-sky-300/25", glow: "shadow-[0_0_32px_rgba(125,211,252,0.12)]" };
        case "EVENING":
            return { label: "Evening", eyebrow: "Slow down", dot: "bg-violet-300", border: "border-violet-300/25", glow: "shadow-[0_0_32px_rgba(196,181,253,0.12)]" };
        default:
            return { label: "Other", eyebrow: "Flexible stops", dot: "bg-emerald-300", border: "border-emerald-300/25", glow: "shadow-[0_0_32px_rgba(110,231,183,0.12)]" };
    }
}

function slotLabel(slot) {
    return slotPresentation(slot).label;
}

function groupActivitiesByTimeSlot(activities) {
    const grouped = {
        MORNING: [],
        AFTERNOON: [],
        EVENING: [],
        OTHER: [],
    };

    for (const activity of activities || []) {
        const slot = String(activity?.timeSlot || "").toUpperCase();
        if (slot === "MORNING" || slot === "AFTERNOON" || slot === "EVENING") {
            grouped[slot].push(activity);
        } else {
            grouped.OTHER.push(activity);
        }
    }

    return grouped;
}

function activityTypeText(type) {
    const value = String(type || "").replaceAll("_", " ").trim();
    if (!value) return "Activity";
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatTripType(value) {
    if (!value) return "N/A";
    return value === "ROUND_TRIP" ? "Round trip" : "One way";
}

function formatStops(stops) {
    if (stops == null || stops === "") return "N/A";

    const n = Number(stops);
    if (!Number.isFinite(n)) return "N/A";
    if (n <= 0) return "Direct";
    if (n === 1) return "1 stop";
    return `${n} stops`;
}

function isHotelOnlyPlan(plan) {
    return String(plan?.tripMode || "").toUpperCase() === "HOTEL_ONLY";
}

function planDestinationLabel(plan) {
    return displayValue(
        plan?.destinationName ||
        plan?.flightDestinationCity ||
        plan?.destinationCityCode,
        "Destination"
    );
}

function planOriginLabel(plan) {
    return displayValue(
        plan?.flightOriginCity ||
        plan?.origin,
        "Origin"
    );
}

function flightRouteLabel(plan) {
    return `${planOriginLabel(plan)} to ${planDestinationLabel(plan)}`;
}

function flightAirportRouteLabel(plan) {
    return `${displayValue(plan?.flightOriginIata)} to ${displayValue(plan?.flightDestIata)}`;
}

function formatBoardType(value) {
    if (!value || String(value).trim() === "") return null;

    const normalized = String(value).trim().toUpperCase();
    if (normalized === "NONE") return null;

    return String(value).replaceAll("_", " ");
}

function formatPaymentPolicy(value) {
    if (!value || String(value).trim() === "") return null;

    const normalized = String(value).trim().toUpperCase();
    if (normalized === "NONE" || normalized === "PAY_AT_PROPERTY") return null;

    return String(value).replaceAll("_", " ");
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
                    : "border border-white/20 bg-white/10 text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
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

function GlassSection({ title, subtitle, children, className = "" }) {
    return (
        <GlassPanel className={`p-5 text-white lg:p-6 ${className}`}>
            <div className="mb-5">
                <h2 className="text-xl font-bold text-white">{title}</h2>
                {subtitle ? <p className="mt-1 text-sm text-white/70">{subtitle}</p> : null}
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
            <div className="mt-2 break-words whitespace-pre-line text-sm font-semibold leading-6 text-white">
                {displayValue(value)}
            </div>
        </div>
    );
}

function ActivityTimelineSlot({ slot, activities }) {
    if (!activities?.length) return null;

    const meta = slotPresentation(slot);

    return (
        <div className={`relative rounded-[26px] border ${meta.border} bg-white/10 p-4 ${meta.glow}`}>
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                        {meta.eyebrow}
                    </div>
                    <div className="mt-1 text-lg font-bold text-white">{meta.label}</div>
                </div>
                <Badge tone="light">
                    {activities.length} stop{activities.length > 1 ? "s" : ""}
                </Badge>
            </div>

            <div className="relative space-y-4 pl-6 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-white/15">
                {activities.map((activity, idx) => (
                    <div key={`${slot}-${idx}-${activity.name}`} className="relative">
                        <div className={`absolute -left-6 top-1 flex h-6 w-6 items-center justify-center rounded-full ${meta.dot} text-[11px] font-black text-slate-950 ring-4 ring-[#102131]`}>
                            {idx + 1}
                        </div>

                        <div className="rounded-[22px] border border-white/10 bg-slate-950/20 p-4 transition hover:bg-white/10">
                            <div className="mb-3 flex items-start gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-sm font-black text-white">
                                    <ActivityIcon type={activity.type} />
                                </div>

                                <div className="flex-1">
                                    <div className="text-sm font-bold text-white">
                                        {displayValue(activity.name, "Activity")}
                                    </div>
                                    <div className="mt-1 text-xs text-white/55">
                                        {activityTypeText(activity.type)}
                                    </div>
                                </div>

                                {activity.optional ? <Badge tone="yellow">Optional</Badge> : null}
                            </div>

                            <div className="text-sm leading-6 text-white/75">
                                {displayValue(activity.description)}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/60">
                                {activity.estimatedMinutes ? (
                                    <span className="rounded-full bg-white/10 px-3 py-1">
                                        Time: {fmtMinutes(activity.estimatedMinutes)}
                                    </span>
                                ) : null}

                                {activity.zoneName ? (
                                    <span className="rounded-full bg-white/10 px-3 py-1">
                                        Area: {activity.zoneName}
                                    </span>
                                ) : null}

                                {activity.timeSlot ? (
                                    <span className="rounded-full bg-white/10 px-3 py-1">
                                        Slot: {slotLabel(activity.timeSlot)}
                                    </span>
                                ) : null}
                            </div>

                            <div className="mt-2 text-xs text-white/35">
                                lat: {fmtCoord(activity.lat)} | lng: {fmtCoord(activity.lng)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PlanDetailsModal({ plan, onClose }) {
    if (!plan) return null;

    const nights = calculateNights(plan.fromDate, plan.toDate);
    const hotelOnly = isHotelOnlyPlan(plan);
    const boardTypeText = formatBoardType(plan.boardType);
    const paymentPolicyText = formatPaymentPolicy(plan.paymentPolicy);

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[30px] border border-white/10 bg-[#102131] p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap gap-2">
                            <Badge tone="green">{displayValue(plan.countryName, "Country")}</Badge>
                            <Badge tone="yellow">{hotelOnly ? "Hotel only" : "Flight + Hotel"}</Badge>
                            {!hotelOnly ? <Badge tone="blue">{formatTripType(plan.flightTripType)}</Badge> : null}
                            {!hotelOnly ? <Badge tone="light">{formatStops(plan.flightStops)}</Badge> : null}
                        </div>

                        <h2 className="mt-4 text-3xl font-bold text-white">
                            {displayValue(plan.destinationName || plan.destinationCityCode, "Trip details")}
                        </h2>

                        <p className="mt-2 text-sm text-white/70">
                            Detailed booking summary for this saved plan.
                        </p>
                    </div>

                    <HeroButton onClick={onClose} type="button">
                        Close
                    </HeroButton>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <InfoTile
                        label="Travel dates"
                        value={`${fmtDateDisplay(plan.fromDate)} to ${fmtDateDisplay(plan.toDate)}`}
                    />
                    <InfoTile
                        label="Guests / Nights"
                        value={`${plan.adults || 1} guest${Number(plan.adults || 1) > 1 ? "s" : ""}${nights ? ` / ${nights} night${nights > 1 ? "s" : ""}` : ""}`}
                    />
                    <InfoTile
                        label="Route"
                        value={hotelOnly ? displayValue(plan.destinationName || plan.destinationCityCode) : flightRouteLabel(plan)}
                    />
                    <InfoTile
                        label="Total"
                        value={`${fmtMoney(plan.totalPrice)} ${plan.totalCurrency || "EUR"}`}
                    />
                </div>

                <div className={`mt-6 grid gap-6 ${hotelOnly ? "xl:grid-cols-1" : "xl:grid-cols-2"}`}>
                    {!hotelOnly ? (
                        <GlassPanel className="p-5 text-white">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-xl font-bold">Flight summary</h3>
                                <Badge tone="green">{formatTripType(plan.flightTripType)}</Badge>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <InfoTile label="Airline" value={plan.flightAirlineName || plan.flightAirlineCode} />
                                <InfoTile label="Stops" value={formatStops(plan.flightStops)} />
                                <InfoTile label="Route" value={flightRouteLabel(plan)} />
                                <InfoTile label="Airports" value={flightAirportRouteLabel(plan)} />
                                <InfoTile label="Departure" value={fmtDateTime(plan.flightDepartureAt)} />
                                <InfoTile label="Arrival" value={fmtDateTime(plan.flightArrivalAt)} />
                                <InfoTile label="Return departure" value={fmtDateTime(plan.returnFlightDepartureAt)} />
                                <InfoTile label="Return arrival" value={fmtDateTime(plan.returnFlightArrivalAt)} />
                                <InfoTile
                                    label="Flight price"
                                    value={`${fmtMoney(plan.flightPrice)} ${plan.flightCurrency || "EUR"}`}
                                />
                                <InfoTile label="Trip type" value={formatTripType(plan.flightTripType)} />
                            </div>
                        </GlassPanel>
                    ) : null}

                    <GlassPanel className="p-5 text-white">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold">Hotel summary</h3>
                            <Badge tone="blue">{displayValue(plan.hotelName, "Hotel")}</Badge>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <InfoTile label="Hotel" value={plan.hotelName} />
                            <InfoTile label="Check-in" value={fmtDateDisplay(plan.hotelCheckInDate || plan.fromDate)} />
                            <InfoTile label="Check-out" value={fmtDateDisplay(plan.hotelCheckOutDate || plan.toDate)} />
                            <InfoTile label="Room quantity" value={plan.roomQuantity || 1} />
                            {boardTypeText ? <InfoTile label="Board type" value={boardTypeText} /> : null}
                            {paymentPolicyText ? <InfoTile label="Payment policy" value={paymentPolicyText} /> : null}
                            <InfoTile
                                label="Hotel price"
                                value={`${fmtMoney(plan.hotelPrice)} ${plan.hotelCurrency || "EUR"}`}
                            />
                        </div>
                    </GlassPanel>
                </div>

                <div className="mt-6">
                    <GlassPanel className="p-5 text-white">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold">Final recap</h3>
                            <Badge tone="yellow">Saved plan</Badge>
                        </div>

                        <div className={`grid gap-3 ${hotelOnly ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
                            {!hotelOnly ? (
                                <InfoTile label="Flight cost" value={`${fmtMoney(plan.flightPrice)} ${plan.flightCurrency || "EUR"}`} />
                            ) : null}
                            <InfoTile label="Hotel cost" value={`${fmtMoney(plan.hotelPrice)} ${plan.hotelCurrency || "EUR"}`} />
                            <InfoTile label="Grand total" value={`${fmtMoney(plan.totalPrice)} ${plan.totalCurrency || "EUR"}`} />
                        </div>
                    </GlassPanel>
                </div>
            </div>
        </div>
    );
}

export default function MyPlansPage() {
    const location = useLocation();

    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [deletingId, setDeletingId] = useState(null);
    const [generatingId, setGeneratingId] = useState(null);
    const [itineraries, setItineraries] = useState({});
    const [selectedDayByPlan, setSelectedDayByPlan] = useState({});
    const [showSavedMessage, setShowSavedMessage] = useState(!!location.state?.saved);
    const [detailsPlan, setDetailsPlan] = useState(null);

    async function loadPlans() {
        setLoading(true);
        setError("");

        try {
            const data = await getMyPlans();
            setPlans(Array.isArray(data) ? data : []);
        } catch (e) {
            setError(e.message || "Failed to load your plans.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadPlans();
    }, []);

    async function handleDelete(id) {
        const ok = window.confirm("Are you sure you want to delete this trip plan?");
        if (!ok) return;

        setDeletingId(id);

        try {
            await deleteMyPlan(id);
            setPlans((prev) => prev.filter((p) => p.id !== id));

            setItineraries((prev) => {
                const copy = { ...prev };
                delete copy[id];
                return copy;
            });

            setSelectedDayByPlan((prev) => {
                const copy = { ...prev };
                delete copy[id];
                return copy;
            });

            if (detailsPlan?.id === id) {
                setDetailsPlan(null);
            }
        } catch (e) {
            alert(e.message || "Delete failed.");
        } finally {
            setDeletingId(null);
        }
    }

    async function handleGenerateItinerary(planId) {
        try {
            setGeneratingId(planId);

            const data = await generateTripItinerary(planId);

            setItineraries((prev) => ({
                ...prev,
                [planId]: data,
            }));

            setSelectedDayByPlan((prev) => ({
                ...prev,
                [planId]: 0,
            }));
        } catch (e) {
            alert(e.message || "Failed to generate trip itinerary.");
        } finally {
            setGeneratingId(null);
        }
    }

    const totalSaved = useMemo(() => {
        return plans.reduce((sum, p) => sum + Number(p.totalPrice || 0), 0);
    }, [plans]);

    return (
        <div className="min-h-screen bg-[#0b1620]">
            <section className="relative min-h-screen overflow-hidden">
                <div className="fixed inset-0 bg-[url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1800&auto=format&fit=crop')] bg-cover bg-center bg-fixed" />
                <div className="fixed inset-0 bg-[linear-gradient(90deg,rgba(7,14,20,0.90)_0%,rgba(8,18,28,0.74)_36%,rgba(8,18,28,0.44)_68%,rgba(8,18,28,0.34)_100%)]" />
                <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_30%)]" />

                <div className="relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-20 pt-24 lg:px-6">
                    <div className="grid items-start gap-8 xl:grid-cols-[1.15fr_0.85fr]">
                        <div className="pt-6 lg:pt-8">
                            <HeroPill>TravelMindAI Dashboard</HeroPill>

                            <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] text-white md:text-5xl xl:text-[3.8rem]">
                                My Plans
                            </h1>

                            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 md:text-base">
                                Here you can review saved trips, generate itineraries, open booking summaries, and delete plans.
                            </p>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <Badge tone="green">{plans.length} saved plans</Badge>
                                <Badge tone="blue">EUR {fmtMoney(totalSaved)} total value</Badge>
                            </div>
                        </div>

                        <div className="w-full max-w-[520px] justify-self-end">
                            <GlassSection title="Overview" subtitle="Quick summary of your saved trips">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <InfoTile label="Saved plans" value={plans.length} />
                                    <InfoTile label="Total value" value={`EUR ${fmtMoney(totalSaved)}`} />
                                </div>

                                <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-500/20 p-4">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                                        Status
                                    </div>
                                    <div className="mt-2 text-sm font-semibold text-white">
                                        Manage your trips, regenerate itineraries, and review routes.
                                    </div>
                                </div>
                            </GlassSection>
                        </div>
                    </div>

                    {showSavedMessage ? (
                        <div className="mt-8">
                            <GlassPanel className="flex flex-col gap-3 p-4 text-white sm:flex-row sm:items-center sm:justify-between">
                                <span className="text-sm">Trip plan successfully saved.</span>
                                <HeroButton
                                    className="self-start sm:self-auto"
                                    onClick={() => setShowSavedMessage(false)}
                                    type="button"
                                >
                                    Close
                                </HeroButton>
                            </GlassPanel>
                        </div>
                    ) : null}

                    {loading ? (
                        <div className="mt-8">
                            <GlassSection title="Loading">
                                <div className="text-sm text-white/75">Loading your plans...</div>
                            </GlassSection>
                        </div>
                    ) : null}

                    {!loading && error ? (
                        <div className="mt-8">
                            <GlassSection title="Error">
                                <div className="text-sm text-white/85">{error}</div>
                            </GlassSection>
                        </div>
                    ) : null}

                    {!loading && !error && plans.length === 0 ? (
                        <div className="mt-8">
                            <GlassSection title="No saved plans" subtitle="Your trip list is still empty.">
                                <div className="flex flex-col items-center justify-center py-6 text-center">
                                    <div className="text-5xl font-black tracking-[0.18em] text-white/70">EMPTY</div>
                                    <div className="mt-4 text-lg font-semibold text-white">
                                        You do not have any saved trip plans
                                    </div>
                                    <div className="mt-2 max-w-xl text-sm leading-7 text-white/75">
                                        Create a trip from the Plan Trip page and it will appear here.
                                    </div>
                                </div>
                            </GlassSection>
                        </div>
                    ) : null}

                    {!loading && !error && plans.length > 0 ? (
                        <div className="mt-8 space-y-6">
                            {plans.map((p) => {
                                const itinerary = itineraries[p.id];
                                const selectedIndex = selectedDayByPlan[p.id] ?? 0;
                                const selectedDay =
                                    itinerary?.days?.[selectedIndex] || itinerary?.days?.[0] || null;

                                const itineraryDayCount = itineraryDaysCount(p, itinerary);
                                const groupedActivities = groupActivitiesByTimeSlot(selectedDay?.activities || []);
                                const hotelOnly = isHotelOnlyPlan(p);
                                const boardTypeText = formatBoardType(p.boardType);
                                const paymentPolicyText = formatPaymentPolicy(p.paymentPolicy);

                                return (
                                    <GlassSection
                                        key={p.id}
                                        title={displayValue(p.destinationName || p.destinationCityCode, "Destination")}
                                        subtitle={`Created at: ${fmtDateTime(p.createdAt)}`}
                                    >
                                        <div className="flex flex-col gap-4 xl:flex-row xl:justify-between">
                                            <div className="flex-1">
                                                <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                    <div>
                                                        <div className="mb-3 flex flex-wrap items-center gap-2">
                                                            <Badge tone="green">{displayValue(p.countryName, "Country")}</Badge>
                                                            <Badge tone="yellow">{hotelOnly ? "Hotel only" : "Flight + Hotel"}</Badge>
                                                            {!hotelOnly ? (
                                                                <Badge tone="light">{flightRouteLabel(p)}</Badge>
                                                            ) : null}
                                                            {!hotelOnly ? (
                                                                <Badge tone="blue">{formatTripType(p.flightTripType)}</Badge>
                                                            ) : null}
                                                            {!hotelOnly ? (
                                                                <Badge tone="light">{formatStops(p.flightStops)}</Badge>
                                                            ) : null}
                                                            {boardTypeText ? <Badge tone="light">{boardTypeText}</Badge> : null}
                                                            {paymentPolicyText ? <Badge tone="blue">{paymentPolicyText}</Badge> : null}
                                                        </div>
                                                    </div>

                                                    <div className="min-w-[220px] rounded-2xl border border-emerald-300/20 bg-emerald-500/20 px-4 py-4 text-right">
                                                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                                                            Total price
                                                        </div>
                                                        <div className="mt-2 text-2xl font-bold text-white">
                                                            EUR {fmtMoney(p.totalPrice)} {p.totalCurrency || "EUR"}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mb-4 grid gap-3 md:grid-cols-3">
                                                    <InfoTile
                                                        label="Trip dates"
                                                        value={`${fmtDateDisplay(p.fromDate)} to ${fmtDateDisplay(p.toDate)}`}
                                                    />
                                                    <InfoTile
                                                        label="Guests / Itinerary days"
                                                        value={`${p.adults || 1} guest${Number(p.adults || 1) > 1 ? "s" : ""}${itineraryDayCount ? ` / ${itineraryDayCount} day${itineraryDayCount > 1 ? "s" : ""}` : ""}`}
                                                    />
                                                    <InfoTile
                                                        label="Route"
                                                        value={hotelOnly ? displayValue(p.destinationName || p.destinationCityCode) : flightRouteLabel(p)}
                                                    />
                                                </div>

                                                <div className={`grid gap-4 ${hotelOnly ? "lg:grid-cols-1" : "lg:grid-cols-2"}`}>
                                                    {!hotelOnly ? (
                                                        <div className="rounded-2xl bg-white/10 p-4">
                                                            <div className="mb-3 text-lg font-semibold text-white">Flight</div>

                                                            <div className="space-y-2 text-sm text-white/75">
                                                                <div><b className="text-white">Route:</b> {flightRouteLabel(p)}</div>
                                                                <div><b className="text-white">Airports:</b> {flightAirportRouteLabel(p)}</div>
                                                                <div><b className="text-white">Airline:</b> {displayValue(p.flightAirlineName || p.flightAirlineCode)}</div>
                                                                <div><b className="text-white">Departure:</b> {fmtDateTime(p.flightDepartureAt)}</div>
                                                                <div><b className="text-white">Arrival:</b> {fmtDateTime(p.flightArrivalAt)}</div>
                                                                {p.returnFlightDepartureAt || p.returnFlightArrivalAt ? (
                                                                    <div><b className="text-white">Return:</b> {fmtDateTime(p.returnFlightDepartureAt)} to {fmtDateTime(p.returnFlightArrivalAt)}</div>
                                                                ) : null}
                                                                <div><b className="text-white">Stops:</b> {formatStops(p.flightStops)}</div>
                                                                <div><b className="text-white">Price:</b> EUR {fmtMoney(p.flightPrice)} {p.flightCurrency || "EUR"}</div>
                                                            </div>
                                                        </div>
                                                    ) : null}

                                                    <div className="rounded-2xl bg-white/10 p-4">
                                                        <div className="mb-3 text-lg font-semibold text-white">Hotel</div>

                                                        <div className="space-y-2 text-sm text-white/75">
                                                            <div><b className="text-white">Name:</b> {displayValue(p.hotelName)}</div>
                                                            <div><b className="text-white">Check-in:</b> {fmtDateDisplay(p.hotelCheckInDate || p.fromDate)}</div>
                                                            <div><b className="text-white">Check-out:</b> {fmtDateDisplay(p.hotelCheckOutDate || p.toDate)}</div>
                                                            {boardTypeText ? <div><b className="text-white">Board:</b> {boardTypeText}</div> : null}
                                                            {paymentPolicyText ? <div><b className="text-white">Payment:</b> {paymentPolicyText}</div> : null}
                                                            <div><b className="text-white">Price:</b> EUR {fmtMoney(p.hotelPrice)} {p.hotelCurrency || "EUR"}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-5 flex flex-wrap gap-3">
                                                    <HeroButton onClick={() => setDetailsPlan(p)} type="button">
                                                        View trip summary
                                                    </HeroButton>

                                                    <HeroButton
                                                        primary
                                                        onClick={() => handleGenerateItinerary(p.id)}
                                                        disabled={generatingId === p.id}
                                                        type="button"
                                                    >
                                                        {generatingId === p.id
                                                            ? "Generating AI itinerary..."
                                                            : itinerary
                                                                ? "Regenerate itinerary"
                                                                : "Generate my trip plan"}
                                                    </HeroButton>
                                                </div>

                                                {itinerary?.days?.length > 0 && selectedDay ? (
                                                    <div className="mt-6 rounded-[28px] border border-white/10 bg-white/8 p-4 lg:p-5">
                                                        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                                            <div>
                                                                <h3 className="text-xl font-bold text-white">
                                                                    {displayValue(itinerary.title, "Generated trip itinerary")}
                                                                </h3>
                                                                <div className="mt-1 text-sm text-white/70">
                                                                    Select a day to view its activities and route map.
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-wrap gap-2">
                                                                <Badge tone="light">
                                                                    {itinerary.days.length} day plan
                                                                </Badge>
                                                                {selectedDay.theme ? <Badge tone="blue">Theme: {selectedDay.theme}</Badge> : null}
                                                            </div>
                                                        </div>

                                                        <div className="mb-5 flex flex-wrap gap-3">
                                                            {itinerary.days.map((day, idx) => (
                                                                <button
                                                                    key={`${p.id}-tab-${day.dayNumber}`}
                                                                    className={`flex min-w-[120px] flex-col rounded-2xl border px-4 py-3 text-left transition ${
                                                                        selectedIndex === idx
                                                                            ? "border-emerald-400 bg-emerald-500 text-white shadow-sm"
                                                                            : "border-white/10 bg-white/10 text-white hover:bg-white/15"
                                                                    }`}
                                                                    onClick={() =>
                                                                        setSelectedDayByPlan((prev) => ({
                                                                            ...prev,
                                                                            [p.id]: idx,
                                                                        }))
                                                                    }
                                                                    type="button"
                                                                >
                                                                    <span className="text-sm font-semibold">Day {day.dayNumber}</span>
                                                                    <span className={`text-xs ${selectedIndex === idx ? "text-white/80" : "text-white/55"}`}>
                                                                        {fmtDateDisplay(day.date)}
                                                                    </span>
                                                                </button>
                                                            ))}
                                                        </div>

                                                        <div className="rounded-[28px] border border-white/10 bg-white/10 p-4 lg:p-5">
                                                            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                                                <div>
                                                                    <h4 className="text-xl font-bold text-white">{displayValue(selectedDay.title, "Day plan")}</h4>
                                                                    <div className="mt-1 text-sm text-white/65">
                                                                        {fmtDateDisplay(selectedDay.date)}
                                                                    </div>
                                                                </div>

                                                                <div className="flex flex-wrap gap-2">
                                                                    <Badge tone="light">Day {selectedDay.dayNumber}</Badge>
                                                                    {selectedDay.totalActivityMinutes ? (
                                                                        <Badge tone="blue">Activities: {fmtMinutes(selectedDay.totalActivityMinutes)}</Badge>
                                                                    ) : null}
                                                                    {selectedDay.totalWalkingMinutes ? (
                                                                        <Badge tone="green">Walking: {fmtMinutes(selectedDay.totalWalkingMinutes)}</Badge>
                                                                    ) : null}
                                                                </div>
                                                            </div>

                                                            <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                                                <InfoTile label="Theme" value={selectedDay.theme || "general"} />
                                                                <InfoTile label="Activities" value={selectedDay.activities?.length || 0} />
                                                                <InfoTile label="Activity time" value={fmtMinutes(selectedDay.totalActivityMinutes)} />
                                                                <InfoTile label="Walking" value={fmtMinutes(selectedDay.totalWalkingMinutes)} />
                                                            </div>

                                                            <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
                                                                <div className="space-y-4">

                                                                    {["MORNING", "AFTERNOON", "EVENING", "OTHER"].map((slot) => (
                                                                        <ActivityTimelineSlot
                                                                            key={slot}
                                                                            slot={slot}
                                                                            activities={groupedActivities[slot] || []}
                                                                        />
                                                                    ))}
                                                                </div>

                                                                <div className="xl:sticky xl:top-24">
                                                                    <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl">
                                                                        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/8 px-4 py-3">
                                                                            <div>
                                                                                <div className="text-sm font-bold text-white">Live route preview</div>
                                                                                <div className="text-xs text-white/55">Map stays visible while you read the day plan.</div>
                                                                            </div>
                                                                            <Badge tone="green">Map</Badge>
                                                                        </div>
                                                                        <div className="min-h-[460px]">
                                                                            <TripItineraryMap day={selectedDay} />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>

                                            <div className="flex xl:block">
                                                <HeroButton
                                                    className="border-rose-300/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                                                    onClick={() => handleDelete(p.id)}
                                                    disabled={deletingId === p.id}
                                                    type="button"
                                                >
                                                    {deletingId === p.id ? "Deleting..." : "Delete"}
                                                </HeroButton>
                                            </div>
                                        </div>
                                    </GlassSection>
                                );
                            })}
                        </div>
                    ) : null}
                </div>
            </section>

            <PlanDetailsModal
                plan={detailsPlan}
                onClose={() => setDetailsPlan(null)}
            />
        </div>
    );
}
