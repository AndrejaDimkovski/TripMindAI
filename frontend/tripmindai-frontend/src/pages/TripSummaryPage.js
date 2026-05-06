import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveTripPlan } from "../api/planApi";

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

function isHotelOnly(flow) {
    return flow?.tripMode === "HOTEL_ONLY";
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

function formatDateDisplay(value) {
    if (!value) return "—";

    const v = String(value);

    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        const [yyyy, mm, dd] = v.split("-");
        return `${dd}.${mm}.${yyyy}`;
    }

    try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return v;

        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();

        return `${dd}.${mm}.${yyyy}`;
    } catch {
        return v;
    }
}

function shortTime(value) {
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

function calculateNights(from, to) {
    if (!from || !to) return null;

    const d1 = new Date(from);
    const d2 = new Date(to);

    if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return null;

    const diffMs = d2.getTime() - d1.getTime();
    const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));

    return nights > 0 ? nights : null;
}

function priceAmount(item) {
    const n = Number(
        item?.convertedTotalWithTaxes ??
        item?.convertedTotalPrice ??
        item?.totalWithTaxes ??
        item?.totalPrice ??
        0
    );

    return Number.isFinite(n) ? n : 0;
}

function priceCurrency(item, fallback = "EUR") {
    return item?.convertedCurrency || item?.currency || fallback || "EUR";
}

function getOfferComparePrice(offer) {
    if (!offer) return Number.MAX_VALUE;
    return priceAmount(offer);
}

function formatTripType(value) {
    if (!value) return "—";
    return value === "ROUND_TRIP" ? "Round trip" : "One way";
}

function formatStops(stops) {
    const n = Number(stops || 0);
    if (n <= 0) return "Direct";
    if (n === 1) return "1 stop";
    return `${n} stops`;
}

function formatRefundLabel(offer) {
    if (offer?.refundLabel && String(offer.refundLabel).trim() !== "") {
        return String(offer.refundLabel);
    }

    if (offer?.refundable === true) return "Refundable";
    if (offer?.refundable === false) return "Non-refundable";

    if (offer?.cancellationPolicy && String(offer.cancellationPolicy).trim() !== "") {
        const txt = String(offer.cancellationPolicy).toLowerCase();
        if (txt.includes("free cancellation")) return "Free cancellation";
        if (txt.includes("non-refundable") || txt.includes("non refundable")) return "Non-refundable";
        return "See cancellation policy";
    }

    return "Policy not available";
}

function formatRoomType(value) {
    if (!value || String(value).trim() === "") return "Standard room";
    return String(value);
}

function formatBoardType(value) {
    if (!value || String(value).trim() === "") return null;
    if (String(value).trim().toUpperCase() === "NONE") return null;
    return String(value).replaceAll("_", " ");
}

function formatPaymentPolicy(value) {
    if (!value || String(value).trim() === "") return null;

    const normalized = String(value).trim().toUpperCase();
    if (normalized === "NONE" || normalized === "PAY_AT_PROPERTY") return null;

    return String(value).replaceAll("_", " ");
}

function formatHotelRating(hotel) {
    if (!hotel) return "—";

    if (hotel?.reviewScore && hotel?.reviewScoreWord) {
        return `${hotel.reviewScoreWord} ${hotel.reviewScore}`;
    }

    if (hotel?.reviewScore) {
        return `⭐ ${hotel.reviewScore}`;
    }

    return "—";
}

function formatHotelLocation(hotel) {
    if (!hotel) return "Location unavailable";

    return [hotel?.address, hotel?.city, hotel?.country].filter(Boolean).join(", ") || "Location unavailable";
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

function PriceHighlight({ label, value, subtext }) {
    return (
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/20 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                {label}
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{value}</div>
            {subtext ? <div className="mt-1 text-sm text-white/75">{subtext}</div> : null}
        </div>
    );
}

export default function TripSummaryPage() {
    const nav = useNavigate();

    const [flow, setFlow] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");

    useEffect(() => {
        const current = readFlowState();

        if (!current?.searchResult) {
            nav(getPlannerRoute(current), { replace: true });
            return;
        }

        if (!isHotelOnly(current) && current?.selectedFlightIndex == null) {
            nav("/plan/flights", { replace: true });
            return;
        }

        if (current?.selectedHotelIndex == null) {
            nav("/plan/hotels", { replace: true });
            return;
        }

        setFlow(current);
    }, [nav]);

    const hotelOnly = isHotelOnly(flow);
    const searchResult = flow?.searchResult || null;

    const search = useMemo(() => {
        return flow?.searchForm || {};
    }, [flow]);

    const geo = useMemo(() => {
        return {
            country: flow?.country?.name || "",
            destination: flow?.destination || null,
        };
    }, [flow]);


    const flights = useMemo(() => searchResult?.flights ?? [], [searchResult]);
    const hotels = useMemo(() => searchResult?.hotels ?? [], [searchResult]);
    const offers = useMemo(() => searchResult?.hotelOffers ?? [], [searchResult]);

    const selectedFlight = useMemo(() => {
        if (!flow || flow.selectedFlightIndex == null) return null;
        return flights[flow.selectedFlightIndex] || null;
    }, [flow, flights]);

    const selectedHotel = useMemo(() => {
        if (!flow || flow.selectedHotelIndex == null) return null;
        return hotels[flow.selectedHotelIndex] || null;
    }, [flow, hotels]);

    const offersByHotelId = useMemo(() => {
        const map = new Map();

        for (const offer of offers) {
            if (!offer?.hotelId) continue;
            if (!map.has(offer.hotelId)) {
                map.set(offer.hotelId, []);
            }
            map.get(offer.hotelId).push(offer);
        }

        for (const [hotelId, hotelOffers] of map.entries()) {
            hotelOffers.sort((a, b) => getOfferComparePrice(a) - getOfferComparePrice(b));
            map.set(hotelId, hotelOffers);
        }

        return map;
    }, [offers]);

    const selectedHotelOffers = useMemo(() => {
        if (!selectedHotel?.hotelId) return [];
        return offersByHotelId.get(selectedHotel.hotelId) || [];
    }, [selectedHotel, offersByHotelId]);

    const selectedHotelOffer = useMemo(() => {
        if (selectedHotelOffers.length > 0) return selectedHotelOffers[0];
        if (!selectedHotel) return null;

        return {
            hotelId: selectedHotel.hotelId || selectedHotel.id || "",
            hotelName: selectedHotel.name || "Selected hotel",
            checkInDate: selectedHotel.checkInDate || search?.from || null,
            checkOutDate: selectedHotel.checkOutDate || search?.to || null,
            totalPrice: selectedHotel.totalPrice || 0,
            currency: selectedHotel.currency || search?.targetCurrency || "EUR",
            roomType: null,
            boardType: search?.boardType || null,
            paymentPolicy: search?.paymentPolicy || null,
            refundable: null,
            refundLabel: null,
            roomQuantity: Number(search?.roomQuantity || 1),
            nights: calculateNights(
                selectedHotel.checkInDate || search?.from || null,
                selectedHotel.checkOutDate || search?.to || null
            ),
            pricePerNight: null,
        };
    }, [selectedHotelOffers, selectedHotel, search]);

    const from = search?.from || selectedHotelOffer?.checkInDate || null;
    const to = search?.to || selectedHotelOffer?.checkOutDate || null;
    const adults = Math.max(1, Number(search?.adults || 1));
    const nights = calculateNights(from, to) || selectedHotelOffer?.nights || null;

    const flightCurrency = priceCurrency(selectedFlight, null);
    const hotelCurrency = priceCurrency(selectedHotelOffer, null);
    const currency = search?.targetCurrency || flightCurrency || hotelCurrency || "EUR";

    const flightPrice = hotelOnly ? 0 : priceAmount(selectedFlight);
    const hotelPrice = priceAmount(selectedHotelOffer);
    const total = hotelOnly ? hotelPrice : flightPrice + hotelPrice;

    const boardTypeText = formatBoardType(selectedHotelOffer?.boardType);
    const paymentPolicyText = formatPaymentPolicy(selectedHotelOffer?.paymentPolicy);

    async function handleSavePlan() {
        try {
            setSaving(true);
            setSaveError("");

            const savePayload = {
                tripMode: hotelOnly ? "HOTEL_ONLY" : "FLIGHT_HOTEL",
                origin: hotelOnly ? null : (search?.origin || selectedFlight?.originIata || ""),
                destinationCityCode: geo?.destination?.cityCode || selectedFlight?.destIata || "",
                destinationName: geo?.destination?.name || "",
                countryName: geo?.country || "",
                fromDate: from,
                toDate: to,
                adults,

                hotelId: selectedHotelOffer?.hotelId || selectedHotel?.hotelId || "",
                hotelName: selectedHotel?.name || selectedHotelOffer?.hotelName || "",
                hotelPrice,
                hotelCurrency: priceCurrency(selectedHotelOffer, currency),
                hotelCheckInDate: selectedHotelOffer?.checkInDate || from || null,
                hotelCheckOutDate: selectedHotelOffer?.checkOutDate || to || null,
                boardType: selectedHotelOffer?.boardType || null,
                paymentPolicy: selectedHotelOffer?.paymentPolicy || null,
                roomQuantity: Number(selectedHotelOffer?.roomQuantity || search?.roomQuantity || 1),

                flightAirlineCode: hotelOnly ? null : (selectedFlight?.airlineCode || ""),
                flightAirlineName: hotelOnly ? null : (selectedFlight?.airlineName || ""),
                flightOriginIata: hotelOnly ? null : (selectedFlight?.originIata || ""),
                flightOriginCity: hotelOnly ? null : (selectedFlight?.originCity || ""),
                flightDestIata: hotelOnly ? null : (selectedFlight?.destIata || ""),
                flightDestinationCity: hotelOnly ? null : (selectedFlight?.destCity || ""),
                flightDepartureAt: hotelOnly ? null : (selectedFlight?.departureAt || ""),
                flightArrivalAt: hotelOnly ? null : (selectedFlight?.arrivalAt || ""),
                returnFlightDepartureAt: hotelOnly ? null : (selectedFlight?.returnDepartureAt || null),
                returnFlightArrivalAt: hotelOnly ? null : (selectedFlight?.returnArrivalAt || null),
                flightStops: hotelOnly ? null : Number(selectedFlight?.stops || 0),
                flightTripType: hotelOnly ? null : (selectedFlight?.tripType || ""),
                flightPrice: hotelOnly ? 0 : flightPrice,
                flightCurrency: hotelOnly ? null : priceCurrency(selectedFlight, currency),

                totalPrice: total,
                totalCurrency: currency,
            };

            await saveTripPlan(savePayload);

            const current = readFlowState() || {};
            const next = {
                ...current,
                savedAt: new Date().toISOString(),
            };

            saveFlowState(next);
            setFlow(next);

            nav("/my-plans", { state: { saved: true } });
        } catch (e) {
            setSaveError(e.message || "Failed to save plan.");
        } finally {
            setSaving(false);
        }
    }

    if (!flow) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0b1620] text-white">
                Loading booking summary...
            </div>
        );
    }

    if ((!hotelOnly && !selectedFlight) || !selectedHotel) {
        return (
            <div className="min-h-screen bg-[#0b1620]">
                <section className="relative min-h-screen overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1800&auto=format&fit=crop')] bg-cover bg-center" />
                    <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(6,13,20,0.95)_0%,rgba(8,18,28,0.84)_34%,rgba(8,18,28,0.56)_70%,rgba(8,18,28,0.42)_100%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_28%)]" />

                    <div className="relative z-10 mx-auto max-w-4xl px-4 py-24 lg:px-6">
                        <GlassSection title="Plan Trip" subtitle="Your booking summary is not ready yet.">
                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                <div className="text-5xl">🧳</div>
                                <p className="mt-4 max-w-xl text-sm leading-7 text-white/75">
                                    Your plan is not fully selected yet. Go back and choose an option.
                                </p>
                                <HeroButton
                                    primary
                                    className="mt-6"
                                    onClick={() => nav("/plan/hotels")}
                                    type="button"
                                >
                                    Back to hotels
                                </HeroButton>
                            </div>
                        </GlassSection>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0b1620]">
            <section className="relative min-h-screen overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1800&auto=format&fit=crop')] bg-cover bg-center" />
                <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(6,13,20,0.95)_0%,rgba(8,18,28,0.84)_34%,rgba(8,18,28,0.56)_70%,rgba(8,18,28,0.42)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_28%)]" />

                <div className="relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-16 pt-24 lg:px-6">
                    <div className="grid items-start gap-8 xl:grid-cols-[1.15fr_0.85fr]">
                        <div className="pt-6 lg:pt-8">
                            <HeroPill>Trip Summary</HeroPill>

                            <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] text-white md:text-5xl xl:text-[3.6rem]">
                                {displayValue(geo?.destination?.name, "Destination")} Trip
                            </h1>

                            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 md:text-base">
                                Review your selected {hotelOnly ? "hotel" : "flight, hotel"} and final trip total before saving the plan.
                            </p>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <Badge tone="green">{displayValue(geo?.destination?.name, "Destination")}</Badge>
                                <Badge tone="blue">{displayValue(geo?.country, "Country")}</Badge>
                                <Badge tone="yellow">{hotelOnly ? "Hotel only" : "Flight + Hotel"}</Badge>
                                <Badge tone="light">{adults} guest{adults > 1 ? "s" : ""}</Badge>
                                {nights ? <Badge tone="yellow">{nights} night{nights > 1 ? "s" : ""}</Badge> : null}
                            </div>

                            <div className="mt-8 flex flex-wrap gap-3">
                                <HeroButton onClick={() => nav("/plan/hotels")} type="button">
                                    ← Back
                                </HeroButton>
                                <HeroButton
                                    primary
                                    onClick={handleSavePlan}
                                    disabled={saving}
                                    type="button"
                                >
                                    {saving ? "Saving your trip..." : "Save Trip Plan"}
                                </HeroButton>
                            </div>
                        </div>

                        <div className="w-full max-w-[520px] justify-self-end">
                            <GlassSection title="Trip total" subtitle="Current selection and total amount">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <InfoTile label="Destination" value={geo?.destination?.name} />
                                    <InfoTile label="Country" value={geo?.country} />
                                    <InfoTile
                                        label="Travel dates"
                                        value={`${formatDateDisplay(from)} → ${formatDateDisplay(to)}`}
                                    />
                                    <InfoTile label="Guests" value={adults} />
                                </div>

                                <div className={`mt-4 grid gap-3 ${hotelOnly ? "sm:grid-cols-1" : "sm:grid-cols-2"}`}>
                                    {!hotelOnly ? (
                                        <InfoTile
                                            label="Flight"
                                            value={`${fmtMoney(flightPrice)} ${priceCurrency(selectedFlight, currency)}`}
                                        />
                                    ) : null}
                                    <InfoTile
                                        label="Hotel"
                                        value={`${fmtMoney(hotelPrice)} ${priceCurrency(selectedHotelOffer, currency)}`}
                                    />
                                </div>

                                <div className="mt-4">
                                    <PriceHighlight
                                        label="Total price"
                                        value={`${fmtMoney(total)} ${currency}`}
                                        subtext={nights ? `${nights} nights stay` : "Complete booking summary"}
                                    />
                                </div>
                            </GlassSection>
                        </div>
                    </div>

                    {saveError ? (
                        <div className="mt-8">
                            <GlassSection title="Error">
                                <div className="text-white/85">⚠️ {saveError}</div>
                            </GlassSection>
                        </div>
                    ) : null}

                    <div className="mt-8 grid gap-6 xl:grid-cols-[1.55fr_0.85fr]">
                        <div className="space-y-6">
                            {!hotelOnly ? (
                                <GlassSection
                                    title="Flight selection"
                                    subtitle={selectedFlight?.airlineName || selectedFlight?.airlineCode || "Airline unavailable"}
                                >
                                    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="flex flex-wrap gap-2">
                                                <Badge tone="green">{formatTripType(selectedFlight?.tripType)}</Badge>
                                                <Badge tone="blue">{formatStops(selectedFlight?.stops)}</Badge>
                                                {selectedFlight?.airlineCode ? (
                                                    <Badge tone="light">{selectedFlight.airlineCode}</Badge>
                                                ) : null}
                                            </div>

                                            <div className="mt-4 text-3xl font-bold text-white">
                                                {displayValue(selectedFlight?.originIata)} → {displayValue(selectedFlight?.destIata)}
                                            </div>

                                            <div className="mt-2 text-sm text-white/70">
                                                {displayValue(selectedFlight?.originCity || search?.origin, "Origin")} →{" "}
                                                {displayValue(selectedFlight?.destCity || geo?.destination?.name, "Destination")}
                                            </div>
                                        </div>

                                        <div className="min-w-[220px]">
                                            <PriceHighlight
                                                label="Flight price"
                                                value={`${fmtMoney(flightPrice)} ${priceCurrency(selectedFlight, currency)}`}
                                                subtext="Selected flight total"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        <InfoTile label="Outbound departure" value={shortTime(selectedFlight?.departureAt)} />
                                        <InfoTile label="Outbound arrival" value={shortTime(selectedFlight?.arrivalAt)} />
                                        <InfoTile label="Trip type" value={formatTripType(selectedFlight?.tripType)} />
                                        <InfoTile label="Stops" value={formatStops(selectedFlight?.stops)} />
                                        <InfoTile
                                            label="Dates"
                                            value={`${formatDateDisplay(from)} → ${formatDateDisplay(to)}`}
                                        />
                                        <InfoTile
                                            label="Guests / Nights"
                                            value={`${adults}${nights ? ` · ${nights} night${nights > 1 ? "s" : ""}` : ""}`}
                                        />
                                        <InfoTile
                                            label="Carrier"
                                            value={selectedFlight?.airlineName || selectedFlight?.airlineCode}
                                        />
                                    </div>

                                    {selectedFlight?.tripType === "ROUND_TRIP" ? (
                                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                                            <InfoTile
                                                label="Outbound ticket"
                                                value={`${shortTime(selectedFlight?.departureAt)} → ${shortTime(selectedFlight?.arrivalAt)}`}
                                            />
                                            <InfoTile
                                                label="Return ticket"
                                                value={
                                                    selectedFlight?.returnDepartureAt || selectedFlight?.returnArrivalAt
                                                        ? `${shortTime(selectedFlight?.returnDepartureAt)} → ${shortTime(selectedFlight?.returnArrivalAt)}`
                                                        : "—"
                                                }
                                            />
                                        </div>
                                    ) : null}
                                </GlassSection>
                            ) : null}

                            <GlassSection
                                title="Hotel selection"
                                subtitle={selectedHotel?.name || selectedHotelOffer?.hotelName || "Selected hotel"}
                            >
                                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge tone="green">{formatRefundLabel(selectedHotelOffer)}</Badge>
                                            {boardTypeText ? <Badge tone="blue">{boardTypeText}</Badge> : null}
                                            <Badge tone="light">{formatRoomType(selectedHotelOffer?.roomType)}</Badge>
                                            {selectedHotel?.reviewScore ? (
                                                <Badge tone="yellow">{formatHotelRating(selectedHotel)}</Badge>
                                            ) : null}
                                        </div>

                                        <div className="mt-4 text-3xl font-bold text-white">
                                            {selectedHotel?.name || selectedHotelOffer?.hotelName || "Selected hotel"}
                                        </div>

                                        <div className="mt-2 text-sm text-white/70">
                                            {formatHotelLocation(selectedHotel)}
                                        </div>

                                        <div className="mt-1 text-sm text-white/70">
                                            Rating: {formatHotelRating(selectedHotel)}
                                        </div>
                                    </div>

                                    <div className="min-w-[220px]">
                                        <PriceHighlight
                                            label="Hotel price"
                                            value={`${fmtMoney(hotelPrice)} ${priceCurrency(selectedHotelOffer, currency)}`}
                                            subtext={
                                                selectedHotelOffer?.pricePerNight
                                                    ? `${fmtMoney(selectedHotelOffer.pricePerNight)} ${priceCurrency(selectedHotelOffer, currency)} / night`
                                                    : "Selected hotel total"
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                    <InfoTile label="Check-in" value={formatDateDisplay(from)} />
                                    <InfoTile label="Check-out" value={formatDateDisplay(to)} />
                                    <InfoTile label="Guests" value={adults} />
                                    <InfoTile label="Nights" value={nights || "—"} />
                                    <InfoTile label="Rating" value={formatHotelRating(selectedHotel)} />
                                    <InfoTile label="Room" value={formatRoomType(selectedHotelOffer?.roomType)} />
                                    {boardTypeText ? <InfoTile label="Board" value={boardTypeText} /> : null}
                                    <InfoTile label="Refund policy" value={formatRefundLabel(selectedHotelOffer)} />
                                    {paymentPolicyText ? (
                                        <InfoTile label="Payment policy" value={paymentPolicyText} />
                                    ) : null}
                                </div>
                            </GlassSection>
                        </div>

                        <aside>
                            <div className="space-y-6 xl:sticky xl:top-24">
                                <GlassSection title="Booking recap" subtitle="Quick overview of your selected plan">
                                    <div className="space-y-3">
                                        <InfoTile label="Destination" value={geo?.destination?.name} />
                                        <InfoTile label="Country" value={geo?.country} />
                                        <InfoTile
                                            label="Travel dates"
                                            value={`${formatDateDisplay(from)} → ${formatDateDisplay(to)}`}
                                        />
                                        {!hotelOnly ? (
                                            <>
                                                <InfoTile
                                                    label="Flight route"
                                                    value={`${displayValue(selectedFlight?.originIata)} → ${displayValue(selectedFlight?.destIata)}`}
                                                />
                                                <InfoTile
                                                    label="Flight schedule"
                                                    value={`${shortTime(selectedFlight?.departureAt)} → ${shortTime(selectedFlight?.arrivalAt)}`}
                                                />
                                                <InfoTile
                                                    label="Return schedule"
                                                    value={
                                                        selectedFlight?.returnDepartureAt || selectedFlight?.returnArrivalAt
                                                            ? `${shortTime(selectedFlight?.returnDepartureAt)} → ${shortTime(selectedFlight?.returnArrivalAt)}`
                                                            : "—"
                                                    }
                                                />
                                            </>
                                        ) : null}
                                        <InfoTile label="Hotel" value={selectedHotel?.name || selectedHotelOffer?.hotelName} />
                                        <InfoTile label="Hotel rating" value={formatHotelRating(selectedHotel)} />
                                        <InfoTile label="Guests / Nights" value={`${adults} · ${nights || "—"}`} />
                                        {boardTypeText ? <InfoTile label="Board" value={boardTypeText} /> : null}
                                        {paymentPolicyText ? <InfoTile label="Payment policy" value={paymentPolicyText} /> : null}
                                    </div>
                                </GlassSection>

                                <GlassSection title="Final total" subtitle="Save the current plan or open your saved trips">
                                    <PriceHighlight
                                        label="Grand total"
                                        value={`${fmtMoney(total)} ${currency}`}
                                        subtext={
                                            hotelOnly
                                                ? `Hotel ${fmtMoney(hotelPrice)} ${priceCurrency(selectedHotelOffer, currency)}`
                                                : `Flight ${fmtMoney(flightPrice)} ${priceCurrency(selectedFlight, currency)} + Hotel ${fmtMoney(hotelPrice)} ${priceCurrency(selectedHotelOffer, currency)}`
                                        }
                                    />

                                    <div className="mt-4 flex flex-col gap-3">
                                        <HeroButton
                                            primary
                                            className="w-full"
                                            onClick={handleSavePlan}
                                            disabled={saving}
                                            type="button"
                                        >
                                            {saving ? "Saving your trip..." : "Save Trip Plan"}
                                        </HeroButton>

                                        <HeroButton
                                            className="w-full"
                                            onClick={() => nav("/my-plans")}
                                            type="button"
                                        >
                                            View My Plans
                                        </HeroButton>
                                    </div>
                                </GlassSection>
                            </div>
                        </aside>
                    </div>
                </div>
            </section>
        </div>
    );
}
