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

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function formatDateDisplay(value) {
    if (!value) return "—";

    try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return String(value);

        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();

        return `${dd}.${mm}.${yyyy}`;
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

function getOfferComparePrice(offer) {
    if (!offer) return Number.MAX_VALUE;

    const v =
        offer?.convertedTotalWithTaxes ??
        offer?.convertedTotalPrice ??
        offer?.totalWithTaxes ??
        offer?.totalPrice;

    const n = Number(v);
    return Number.isFinite(n) ? n : Number.MAX_VALUE;
}

function getPlannerRoute(flow) {
    return flow?.mode === "ai" ? "/plan/ai" : "/plan/manual";
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

function priceCurrency(item, fallbackCurrency = "EUR") {
    return item?.convertedCurrency || item?.currency || fallbackCurrency || "EUR";
}

function priceText(item, fallbackCurrency = "EUR") {
    return `${fmtMoney(priceAmount(item))} ${priceCurrency(item, fallbackCurrency)}`;
}

function nightlyPriceText(item, fallbackCurrency = "EUR") {
    const amount =
        item?.convertedPricePerNightWithTaxes ??
        item?.convertedPricePerNight ??
        item?.pricePerNightWithTaxes ??
        item?.pricePerNight;

    if (amount == null) return null;

    const n = Number(amount);
    if (!Number.isFinite(n)) return null;

    return `${fmtMoney(n)} ${priceCurrency(item, fallbackCurrency)} / night`;
}

function taxText(item, fallbackCurrency = "EUR") {
    const amount = item?.convertedTaxAmount ?? item?.taxAmount;
    if (amount == null) return null;

    const n = Number(amount);
    if (!Number.isFinite(n)) return null;

    return `${fmtMoney(n)} ${priceCurrency(item, fallbackCurrency)}`;
}

function reviewText(hotel) {
    if (hotel?.reviewScore && hotel?.reviewScoreWord) {
        return `${hotel.reviewScoreWord} ${hotel.reviewScore}`;
    }
    if (hotel?.reviewScore) {
        return `⭐ ${hotel.reviewScore}`;
    }
    return null;
}

function refundText(offer) {
    if (offer?.refundLabel) return offer.refundLabel;
    if (offer?.refundable === true) return "Refundable";
    if (offer?.refundable === false) return "Non-refundable";
    return null;
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
                    : "border border-white/20 bg-white/10 text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
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
        rose: "bg-rose-100 text-rose-700",
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

export default function HotelResultsPage() {
    const navigate = useNavigate();

    const [flow, setFlow] = useState(null);
    const [selectedHotelIndex, setSelectedHotelIndex] = useState(null);

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

        const hotels = safeArray(current?.searchResult?.hotels);
        const initialIndex =
            current?.selectedHotelIndex != null &&
            current.selectedHotelIndex >= 0 &&
            current.selectedHotelIndex < hotels.length
                ? current.selectedHotelIndex
                : null;

        setSelectedHotelIndex(initialIndex);
    }, [navigate]);

    const searchResult = flow?.searchResult || null;
    const hotels = useMemo(() => safeArray(searchResult?.hotels), [searchResult]);
    const offers = useMemo(() => safeArray(searchResult?.hotelOffers), [searchResult]);
    const searchForm = flow?.searchForm || {};
    const currency = searchForm?.targetCurrency || "EUR";

    const destinationName = flow?.destination?.name || "Destination";
    const countryName = flow?.country?.name || "";

    const selectedFlight = useMemo(() => {
        if (!flow || flow.selectedFlightIndex == null) return null;
        return searchResult?.flights?.[flow.selectedFlightIndex] || null;
    }, [flow, searchResult]);

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

    const selectedHotel = useMemo(() => {
        if (selectedHotelIndex == null) return null;
        return hotels[selectedHotelIndex] || null;
    }, [hotels, selectedHotelIndex]);

    const selectedHotelOffers = useMemo(() => {
        if (!selectedHotel?.hotelId) return [];
        return offersByHotelId.get(selectedHotel.hotelId) || [];
    }, [selectedHotel, offersByHotelId]);

    const selectedHotelOffer = useMemo(() => {
        return selectedHotelOffers.length > 0 ? selectedHotelOffers[0] : null;
    }, [selectedHotelOffers]);

    const estimatedTotal = useMemo(() => {
        const flightPrice = Number(
            selectedFlight?.convertedTotalWithTaxes ??
            selectedFlight?.convertedTotalPrice ??
            selectedFlight?.totalWithTaxes ??
            selectedFlight?.totalPrice ??
            0
        );

        const hotelPrice = priceAmount(selectedHotelOffer);
        const sum = flightPrice + hotelPrice;

        return Number.isFinite(sum) ? sum : 0;
    }, [selectedFlight, selectedHotelOffer]);

    const nights = calculateNights(searchForm?.from, searchForm?.to);

    function persistSelectedHotel(index) {
        const current = readFlowState() || {};
        const next = {
            ...current,
            selectedHotelIndex: index,
        };
        saveFlowState(next);
        setFlow(next);
    }

    function handleSelectHotel(index) {
        setSelectedHotelIndex(index);
        persistSelectedHotel(index);
    }

    function goBack() {
        navigate("/plan/flights");
    }

    function goHotelDetails(hotel) {
        if (!hotel?.hotelId) return;

        const hotelOffers = offersByHotelId.get(hotel.hotelId) || [];

        navigate(`/hotels/${hotel.hotelId}`, {
            state: {
                hotel,
                offer: hotelOffers[0] || null,
                offers: hotelOffers,
                search: {
                    ...searchForm,
                    cityCode: flow?.destination?.cityCode || null,
                    destinationName: flow?.destination?.name || null,
                    countryName: flow?.country?.name || null,
                    countryCode: flow?.country?.code || null,
                },
            },
        });
    }

    function continueToSummary() {
        if (selectedHotelIndex == null) return;
        persistSelectedHotel(selectedHotelIndex);
        navigate("/plan/summary");
    }

    if (!flow) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0b1620] text-white">
                Loading hotel results...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0b1620]">
            <section className="relative min-h-screen overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1800&auto=format&fit=crop')] bg-cover bg-center" />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,14,20,0.85)_0%,rgba(8,18,28,0.62)_36%,rgba(8,18,28,0.34)_68%,rgba(8,18,28,0.28)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_28%)]" />

                <div className="relative z-10 mx-auto max-w-[1600px] px-4 pb-16 pt-28 lg:px-6">
                    <div className="grid items-start gap-10 lg:grid-cols-[1.02fr_0.98fr]">
                        <div className="pt-6 lg:pt-10">
                            <HeroPill>Hotel Results</HeroPill>

                            <h1 className="mt-8 text-6xl font-extrabold uppercase leading-none text-white md:text-7xl xl:text-[6.2rem]">
                                Choose
                                <br />
                                Hotel
                            </h1>

                            <p className="mt-5 max-w-xl text-sm leading-7 text-white/85 md:text-base">
                                Review available hotels and offers for {destinationName}
                                {countryName ? `, ${countryName}` : ""} and continue to booking summary.
                            </p>

                            <div className="mt-8 flex flex-wrap gap-4">
                                <HeroButton onClick={goBack}>← Back to flights</HeroButton>

                                <HeroButton
                                    primary
                                    onClick={continueToSummary}
                                    disabled={selectedHotelIndex == null}
                                >
                                    Continue to summary
                                </HeroButton>
                            </div>
                        </div>

                        <div className="w-full max-w-[620px] justify-self-end">
                            <GlassPanel className="p-6 text-white">
                                <div className="mb-5">
                                    <div className="text-2xl font-bold text-white">Search summary</div>
                                    <div className="mt-1 text-sm text-white/70">
                                        Route, stay and selected flight overview
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <InfoTile label="Destination" value={destinationName} />
                                    <InfoTile label="Country" value={countryName || "—"} />
                                    <InfoTile
                                        label="Dates"
                                        value={`${formatDateDisplay(searchForm?.from)} → ${formatDateDisplay(searchForm?.to)}`}
                                    />
                                    <InfoTile label="Currency" value={currency} />
                                </div>

                                {selectedHotelOffer ? (
                                    <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-500/20 p-4">
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                                            Estimated total
                                        </div>
                                        <div className="mt-2 text-2xl font-bold text-white">
                                            {fmtMoney(estimatedTotal)} {currency}
                                        </div>
                                    </div>
                                ) : null}
                            </GlassPanel>
                        </div>
                    </div>

                    <div className="mt-10 grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
                        <div className="space-y-5">
                            {hotels.map((hotel, index) => {
                                const hotelOffers = offersByHotelId.get(hotel.hotelId) || [];
                                const cheapest = hotelOffers[0] || null;
                                const isSelected = selectedHotelIndex === index;
                                const review = reviewText(hotel);
                                const nightly = nightlyPriceText(cheapest, currency);
                                const taxes = taxText(cheapest, currency);
                                const refund = refundText(cheapest);

                                return (
                                    <div
                                        key={hotel.hotelId || index}
                                        className={`rounded-[28px] border p-5 transition ${
                                            isSelected
                                                ? "border-emerald-300/30 bg-emerald-500/20 shadow-2xl"
                                                : "border-white/10 bg-white/10 hover:bg-white/15"
                                        }`}
                                    >
                                        <div className="grid gap-5 xl:grid-cols-[260px_1fr]">
                                            <div className="overflow-hidden rounded-2xl bg-white/10">
                                                {hotel?.photoUrl ? (
                                                    <img
                                                        src={hotel.photoUrl}
                                                        alt={hotel?.name || "Hotel"}
                                                        className="h-60 w-full object-cover xl:h-full"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="flex h-60 w-full items-center justify-center text-sm text-white/60">
                                                        No image
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col justify-between">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge tone={isSelected ? "green" : "light"}>
                                                            {isSelected ? "Selected" : "Hotel"}
                                                        </Badge>

                                                        {review ? <Badge tone="blue">{review}</Badge> : null}
                                                        {refund ? <Badge tone="yellow">{refund}</Badge> : null}
                                                        {cheapest?.boardType ? (
                                                            <Badge tone="light">{cheapest.boardType}</Badge>
                                                        ) : null}
                                                    </div>

                                                    <div className="mt-4 text-3xl font-bold text-white">
                                                        {hotel?.name || "Unnamed hotel"}
                                                    </div>

                                                    <div className="mt-2 text-sm text-white/70">
                                                        {[hotel?.address, hotel?.city, hotel?.country].filter(Boolean).join(", ") || "Location unavailable"}
                                                    </div>

                                                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                                        <InfoTile
                                                            label="Offers"
                                                            value={
                                                                hotelOffers.length > 0
                                                                    ? `${hotelOffers.length} available`
                                                                    : "No offers grouped"
                                                            }
                                                        />
                                                        <InfoTile
                                                            label="Stay"
                                                            value={nights ? `${nights} night${nights > 1 ? "s" : ""}` : "—"}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                                    <div>
                                                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                                                            Best price
                                                        </div>
                                                        <div className="mt-2 text-3xl font-bold text-white">
                                                            {priceText(cheapest, currency)}
                                                        </div>
                                                        {nightly ? (
                                                            <div className="mt-1 text-sm text-white/70">{nightly}</div>
                                                        ) : null}
                                                        {taxes ? (
                                                            <div className="mt-1 text-sm text-white/70">Taxes: {taxes}</div>
                                                        ) : null}
                                                    </div>

                                                    <div className="flex flex-wrap gap-3">
                                                        <HeroButton
                                                            type="button"
                                                            onClick={() => handleSelectHotel(index)}
                                                            primary={isSelected}
                                                            className="px-5 py-3 text-sm"
                                                        >
                                                            {isSelected ? "Selected" : "Select"}
                                                        </HeroButton>

                                                        <HeroButton
                                                            type="button"
                                                            onClick={() => goHotelDetails(hotel)}
                                                            className="px-5 py-3 text-sm"
                                                        >
                                                            View details
                                                        </HeroButton>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {hotels.length === 0 ? (
                                <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-6 text-white/75">
                                    No hotels found.
                                </div>
                            ) : null}
                        </div>

                        <aside>
                            <div className="space-y-6 lg:sticky lg:top-24">
                                <GlassPanel className="p-6 text-white">
                                    <div className="mb-5">
                                        <div className="text-xl font-bold text-white">Selected hotel</div>
                                        <div className="mt-1 text-sm text-white/70">
                                            Review the option you picked before continuing
                                        </div>
                                    </div>

                                    {!selectedHotel ? (
                                        <div className="rounded-2xl bg-white/10 p-4 text-white/75">
                                            Select a hotel to continue.
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex flex-wrap gap-2">
                                                <Badge tone="green">Ready</Badge>
                                                {reviewText(selectedHotel) ? (
                                                    <Badge tone="blue">{reviewText(selectedHotel)}</Badge>
                                                ) : null}
                                                {refundText(selectedHotelOffer) ? (
                                                    <Badge tone="yellow">{refundText(selectedHotelOffer)}</Badge>
                                                ) : null}
                                            </div>

                                            <div className="mt-4 space-y-3">
                                                <InfoTile label="Hotel" value={selectedHotel?.name || "—"} />
                                                <InfoTile
                                                    label="Location"
                                                    value={[selectedHotel?.address, selectedHotel?.city, selectedHotel?.country].filter(Boolean).join(", ") || "—"}
                                                />
                                                <InfoTile label="Price" value={priceText(selectedHotelOffer, currency)} />
                                                <InfoTile label="Nightly" value={nightlyPriceText(selectedHotelOffer, currency) || "—"} />
                                                <InfoTile
                                                    label="Dates"
                                                    value={`${formatDateDisplay(searchForm?.from)} → ${formatDateDisplay(searchForm?.to)}`}
                                                />
                                            </div>

                                            <div className="mt-5 flex flex-col gap-3">
                                                <HeroButton onClick={() => goHotelDetails(selectedHotel)}>
                                                    View full details
                                                </HeroButton>

                                                <HeroButton
                                                    primary
                                                    onClick={continueToSummary}
                                                    disabled={selectedHotelIndex == null}
                                                >
                                                    Continue to summary
                                                </HeroButton>
                                            </div>
                                        </>
                                    )}
                                </GlassPanel>
                            </div>
                        </aside>
                    </div>
                </div>
            </section>
        </div>
    );
}
