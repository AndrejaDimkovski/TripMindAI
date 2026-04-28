import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getHotelFullDetails } from "../api/tripsApi";

function safeStr(v) {
    return v == null || v === "" ? null : String(v);
}

function displayValue(value, fallback = "—") {
    if (value == null) return fallback;
    if (typeof value === "string" && value.trim() === "") return fallback;
    return value;
}

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function buildGoogleMapsUrl({ name, lat, lng }) {
    const q = lat != null && lng != null ? `${lat},${lng}` : name || "";
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function buildBookingUrl({ query, from, to, adults = 2, rooms = 1 }) {
    const params = new URLSearchParams();
    params.set("ss", query || "");
    params.set("group_adults", String(adults));
    params.set("no_rooms", String(rooms));

    const d1 = from ? new Date(from) : null;
    const d2 = to ? new Date(to) : null;

    if (d1 && !Number.isNaN(d1.getTime())) {
        params.set("checkin_year", String(d1.getFullYear()));
        params.set("checkin_month", String(d1.getMonth() + 1));
        params.set("checkin_monthday", String(d1.getDate()));
    }

    if (d2 && !Number.isNaN(d2.getTime())) {
        params.set("checkout_year", String(d2.getFullYear()));
        params.set("checkout_month", String(d2.getMonth() + 1));
        params.set("checkout_monthday", String(d2.getDate()));
    }

    return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

function buildExpediaUrl({ query, from, to, adults = 2, rooms = 1 }) {
    const params = new URLSearchParams();
    params.set("destination", query || "");
    params.set("adults", String(adults));
    params.set("rooms", String(rooms));
    if (from) params.set("startDate", from);
    if (to) params.set("endDate", to);
    return `https://www.expedia.com/Hotel-Search?${params.toString()}`;
}

function buildHotelsDotComUrl({ query, from, to, adults = 2, rooms = 1 }) {
    const params = new URLSearchParams();
    params.set("q-destination", query || "");
    params.set("q-room-0-adults", String(adults));
    params.set("q-rooms", String(rooms));
    if (from) params.set("q-check-in", from);
    if (to) params.set("q-check-out", to);
    return `https://www.hotels.com/Hotel-Search?${params.toString()}`;
}

function formatMoney(v) {
    const n = Number(v || 0);
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
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

function offerComparePrice(offer) {
    if (!offer) return Number.MAX_VALUE;

    const value =
        offer?.convertedTotalWithTaxes ??
        offer?.convertedTotalPrice ??
        offer?.totalWithTaxes ??
        offer?.totalPrice;

    const n = Number(value);
    return Number.isFinite(n) ? n : Number.MAX_VALUE;
}

function inferBoardType(block) {
    if (!block) return null;

    if (Number(block.all_inclusive) === 1) return "ALL_INCLUSIVE";
    if (Number(block.full_board) === 1) return "FULL_BOARD";
    if (Number(block.half_board) === 1) return "HALF_BOARD";
    if (Number(block.breakfast_included) === 1) return "BREAKFAST";

    const mealplan = String(block.mealplan || "").toLowerCase();
    if (mealplan.includes("no meal option")) return "ROOM_ONLY";

    return null;
}

function inferPaymentPolicy(block, paymentFeatures) {
    if (
        Number(block?.pay_in_advance) === 1 ||
        Number(block?.deposit_required) === 1 ||
        block?.paymentterms?.prepayment?.type ||
        paymentFeatures?.prepaymentRequired === true
    ) {
        return "DEPOSIT";
    }

    if (paymentFeatures?.payAtProperty === true) {
        return null;
    }

    return null;
}

function boardTypeLabel(value) {
    if (!value || String(value).trim() === "") return null;

    switch (value) {
        case "ROOM_ONLY":
            return "Room only";
        case "BREAKFAST":
        case "BREAKFAST_INCLUDED":
            return "Breakfast included";
        case "HALF_BOARD":
            return "Half board";
        case "FULL_BOARD":
            return "Full board";
        case "ALL_INCLUSIVE":
            return "All inclusive";
        default:
            return String(value).replaceAll("_", " ");
    }
}

function paymentPolicyLabel(value) {
    if (!value || String(value).trim() === "") return null;

    switch (value) {
        case "DEPOSIT":
        case "PREPAYMENT_REQUIRED":
            return "Prepayment required";
        case "GUARANTEE":
            return "Guarantee";
        case "NONE":
        case "PAY_AT_PROPERTY":
            return null;
        default:
            return String(value).replaceAll("_", " ");
    }
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
        yellow: "bg-amber-100 text-amber-700",
        blue: "bg-blue-100 text-blue-700",
        rose: "bg-rose-100 text-rose-700",
        slate: "bg-slate-100 text-slate-700",
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

function ActionCard({ title, subtitle, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full rounded-2xl bg-white/10 p-4 text-left transition hover:bg-white/15"
        >
            <div className="text-sm font-semibold text-white">{title}</div>
            <div className="mt-1 text-xs leading-5 text-white/65">{subtitle}</div>
        </button>
    );
}

function CheapestOfferCard({
                               offer,
                               bookingFrom,
                               bookingTo,
                               nights,
                               adults,
                               totalText,
                               nightlyText,
                               taxText,
                               derivedBoardType,
                               derivedPaymentPolicy,
                               mealplanText,
                           }) {
    const total = totalText(offer);
    const nightly = nightlyText(offer);
    const taxes = taxText(offer);

    return (
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/20 p-4">
            <div className="flex flex-wrap gap-2">
                <Badge tone="green">Cheapest matching room</Badge>
                {offer?.roomType ? <Badge tone="light">{offer.roomType}</Badge> : null}
                {offer?.roomCategory ? <Badge tone="blue">{offer.roomCategory}</Badge> : null}
                {derivedBoardType ? <Badge tone="light">Board: {derivedBoardType}</Badge> : null}
                {derivedPaymentPolicy ? <Badge tone="yellow">{derivedPaymentPolicy}</Badge> : null}
                {offer?.refundLabel ? (
                    <Badge tone="blue">{offer.refundLabel}</Badge>
                ) : offer?.refundable != null ? (
                    <Badge tone={offer.refundable ? "green" : "yellow"}>
                        {offer.refundable ? "Refundable" : "Non-refundable"}
                    </Badge>
                ) : null}
            </div>

            <div className="mt-4 text-3xl font-bold text-white">{total}</div>

            {nightly ? <div className="mt-1 text-sm text-white/75">{nightly}</div> : null}
            {taxes ? <div className="mt-1 text-sm text-white/75">Taxes: {taxes}</div> : null}

            <div className={`mt-4 grid gap-3 ${derivedBoardType || derivedPaymentPolicy || mealplanText ? "md:grid-cols-2" : ""}`}>
                <InfoTile
                    label="Stay"
                    value={`${formatDateDisplay(offer?.checkInDate || bookingFrom)} → ${formatDateDisplay(offer?.checkOutDate || bookingTo)}`}
                />
                <InfoTile
                    label="Guests / Nights"
                    value={`${offer?.adults || adults} guests${(offer?.nights || nights) ? ` · ${offer?.nights || nights} nights` : ""}`}
                />
                <InfoTile label="Room quantity" value={offer?.roomQuantity || 1} />
                {derivedBoardType ? <InfoTile label="Board type" value={derivedBoardType} /> : null}
                {derivedPaymentPolicy ? <InfoTile label="Payment policy" value={derivedPaymentPolicy} /> : null}
                {mealplanText ? <InfoTile label="Meal plan note" value={mealplanText} /> : null}
            </div>

            {offer?.cancellationPolicy ? (
                <div className="mt-4 rounded-2xl bg-white/10 p-4 text-sm text-white/80">
                    {offer.cancellationPolicy}
                </div>
            ) : null}
        </div>
    );
}

function RoomCard({ room, derivedBoardType, derivedPaymentPolicy, mealplanText }) {
    const photos = safeArray(room?.photos);
    const amenities = safeArray(room?.amenities);

    return (
        <div className="rounded-2xl bg-white/10 p-4">
            <div className="flex flex-wrap gap-2">
                <Badge tone="light">{room?.roomName || "Room"}</Badge>
                {room?.maxAdults != null ? <Badge tone="blue">Adults: {room.maxAdults}</Badge> : null}
                {room?.maxChildren != null ? <Badge tone="blue">Children: {room.maxChildren}</Badge> : null}
                {room?.beds != null ? <Badge tone="light">Beds: {room.beds}</Badge> : null}
                {room?.bedType ? <Badge tone="light">{room.bedType}</Badge> : null}
                {room?.roomSize != null ? (
                    <Badge tone="green">
                        {room.roomSize} {room.roomSizeUnit || "m²"}
                    </Badge>
                ) : null}
                {derivedBoardType ? <Badge tone="light">Board: {derivedBoardType}</Badge> : null}
                {derivedPaymentPolicy ? <Badge tone="yellow">{derivedPaymentPolicy}</Badge> : null}
                {room?.refundable != null ? (
                    <Badge tone={room.refundable ? "green" : "yellow"}>
                        {room.refundable ? "Refundable" : "Non-refundable"}
                    </Badge>
                ) : null}
            </div>

            {(derivedBoardType || derivedPaymentPolicy || mealplanText) ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {derivedBoardType ? <InfoTile label="Board type" value={derivedBoardType} /> : null}
                    {derivedPaymentPolicy ? <InfoTile label="Payment policy" value={derivedPaymentPolicy} /> : null}
                    {mealplanText ? <InfoTile label="Meal plan note" value={mealplanText} /> : null}
                </div>
            ) : null}

            {room?.description ? (
                <p className="mt-4 text-sm leading-7 text-white/80">{room.description}</p>
            ) : null}

            {room?.cancellationPolicy ? (
                <div className="mt-3 rounded-2xl bg-white/10 p-3 text-sm text-white/75">
                    {room.cancellationPolicy}
                </div>
            ) : null}

            {photos.length > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {photos.slice(0, 6).map((img, i) => (
                        <div key={i} className="overflow-hidden rounded-2xl">
                            <img
                                src={img}
                                alt={room?.roomName || `Room ${i + 1}`}
                                className="h-40 w-full object-cover"
                                loading="lazy"
                            />
                        </div>
                    ))}
                </div>
            ) : null}

            {amenities.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                    {amenities.map((a, i) => (
                        <Badge key={`${a}-${i}`} tone="light">
                            {a}
                        </Badge>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

export default function HotelDetailsPage() {
    const nav = useNavigate();
    const { hotelId } = useParams();
    const location = useLocation();

    const stateHotel = location.state?.hotel || null;
    const stateOffer = location.state?.offer || null;
    const stateOffers = useMemo(
        () => (Array.isArray(location.state?.offers) ? location.state.offers : []),
        [location.state?.offers]
    );
    const stateSearch = location.state?.search || null;

    const [loading, setLoading] = useState(false);
    const [details, setDetails] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        (async () => {
            setLoading(true);
            setError("");

            try {
                const checkIn =
                    stateSearch?.from ||
                    stateOffer?.checkInDate ||
                    new Date(Date.now() + 86400000).toISOString().slice(0, 10);

                const checkOut =
                    stateSearch?.to ||
                    stateOffer?.checkOutDate ||
                    new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);

                const adults = Number(stateSearch?.adults || stateOffer?.adults || 1);
                const cityName = stateSearch?.destinationName || "";

                const data = await getHotelFullDetails({
                    hotelId: String(hotelId),
                    checkIn,
                    checkOut,
                    adults,
                    cityName,
                });

                if (!active) return;
                if (!data) throw new Error("Hotel details response was empty.");

                setDetails(data);
            } catch (e) {
                if (!active) return;
                setError(e?.message || "Failed to load hotel details.");
            } finally {
                if (active) setLoading(false);
            }
        })();

        return () => {
            active = false;
        };
    }, [
        hotelId,
        stateSearch?.destinationName,
        stateSearch?.from,
        stateSearch?.to,
        stateSearch?.adults,
        stateOffer?.checkInDate,
        stateOffer?.checkOutDate,
        stateOffer?.adults,
    ]);

    const offers = useMemo(() => {
        const merged = [...stateOffers];
        if (stateOffer && !merged.some((o) => (o?.offerId || null) === (stateOffer?.offerId || null))) {
            merged.push(stateOffer);
        }
        return merged.sort((a, b) => offerComparePrice(a) - offerComparePrice(b));
    }, [stateOffers, stateOffer]);

    const primaryOffer = useMemo(() => (offers.length > 0 ? offers[0] : null), [offers]);

    const basic = details?.basicDetails || null;
    const descriptionInfo = details?.descriptionInfo || null;
    const policies = details?.policies || null;
    const paymentFeatures = details?.paymentFeatures || null;
    const primaryBlock = details?.block?.[0] || null;

    const hotelName = useMemo(
        () => safeStr(stateHotel?.name) || safeStr(basic?.name) || "Hotel details",
        [stateHotel, basic]
    );

    const bestAddress = safeStr(basic?.address) || "—";
    const bestRating = basic?.rating ?? stateHotel?.reviewScore ?? "—";
    const lat = basic?.latitude ?? stateHotel?.latitude ?? null;
    const lng = basic?.longitude ?? stateHotel?.longitude ?? null;
    const desc =
        safeStr(descriptionInfo?.description) ||
        safeStr(basic?.description) ||
        `${hotelName} is available for your selected stay. Detailed hotel description is not available from the provider for this property.`;

    const amenities = safeArray(basic?.amenities).filter(Boolean);
    const hotelPhotos = Array.isArray(details?.photos)
        ? details.photos.map((p) => p?.url).filter(Boolean)
        : Array.isArray(basic?.mediaUrls)
            ? basic.mediaUrls.filter(Boolean)
            : [];

    const roomsData = safeArray(details?.rooms);
    const facilities = safeArray(details?.facilities);

    const adults = Number(stateSearch?.adults || primaryOffer?.adults || 1);
    const roomCount = Number(primaryOffer?.roomQuantity || stateSearch?.roomQuantity || 1);

    const bookingFrom = stateSearch?.from || primaryOffer?.checkInDate || null;
    const bookingTo = stateSearch?.to || primaryOffer?.checkOutDate || null;
    const nights = calculateNights(bookingFrom, bookingTo) || primaryOffer?.nights || null;

    const displayCurrency =
        primaryOffer?.convertedCurrency || primaryOffer?.currency || stateSearch?.targetCurrency || "EUR";

    const bookingQuery = `${hotelName} ${stateSearch?.destinationName || ""}`.trim();

    const bookingUrl = useMemo(
        () =>
            buildBookingUrl({
                query: bookingQuery,
                from: bookingFrom,
                to: bookingTo,
                adults,
                rooms: roomCount,
            }),
        [bookingQuery, bookingFrom, bookingTo, adults, roomCount]
    );

    const expediaUrl = useMemo(
        () =>
            buildExpediaUrl({
                query: bookingQuery,
                from: bookingFrom,
                to: bookingTo,
                adults,
                rooms: roomCount,
            }),
        [bookingQuery, bookingFrom, bookingTo, adults, roomCount]
    );

    const hotelsUrl = useMemo(
        () =>
            buildHotelsDotComUrl({
                query: bookingQuery,
                from: bookingFrom,
                to: bookingTo,
                adults,
                rooms: roomCount,
            }),
        [bookingQuery, bookingFrom, bookingTo, adults, roomCount]
    );

    const mapsUrl = useMemo(
        () => buildGoogleMapsUrl({ name: hotelName, lat, lng }),
        [hotelName, lat, lng]
    );

    const derivedBoardType =
        boardTypeLabel(primaryOffer?.boardType) ||
        boardTypeLabel(roomsData?.[0]?.boardType) ||
        boardTypeLabel(inferBoardType(primaryBlock));

    const derivedPaymentPolicy =
        paymentPolicyLabel(primaryOffer?.paymentPolicy) ||
        paymentPolicyLabel(roomsData?.[0]?.paymentPolicy) ||
        paymentPolicyLabel(inferPaymentPolicy(primaryBlock, paymentFeatures));

    const mealplanText = primaryBlock?.mealplan || null;

    function back() {
        nav(-1);
    }

    function openExternal(url) {
        window.open(url, "_blank", "noopener,noreferrer");
    }

    function totalText(offer) {
        const amount =
            offer?.convertedTotalWithTaxes ??
            offer?.convertedTotalPrice ??
            offer?.totalWithTaxes ??
            offer?.totalPrice ??
            0;

        const currency =
            offer?.convertedCurrency ||
            offer?.currency ||
            stateSearch?.targetCurrency ||
            "EUR";

        return `${formatMoney(amount)} ${currency}`;
    }

    function nightlyText(offer) {
        const amount =
            offer?.convertedPricePerNightWithTaxes ??
            offer?.convertedPricePerNight ??
            offer?.pricePerNightWithTaxes ??
            offer?.pricePerNight;

        if (amount == null) return null;

        const currency =
            offer?.convertedCurrency ||
            offer?.currency ||
            stateSearch?.targetCurrency ||
            "EUR";

        return `${formatMoney(amount)} ${currency} / night`;
    }

    function taxText(offer) {
        const amount = offer?.convertedTaxAmount ?? offer?.taxAmount;
        if (amount == null) return null;

        const currency =
            offer?.convertedCurrency ||
            offer?.currency ||
            stateSearch?.targetCurrency ||
            "EUR";

        return `${formatMoney(amount)} ${currency}`;
    }

    return (
        <div className="min-h-screen bg-[#0b1620]">
            <section className="relative min-h-screen overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1800&auto=format&fit=crop')] bg-cover bg-center" />
                <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(6,13,20,0.95)_0%,rgba(8,18,28,0.84)_34%,rgba(8,18,28,0.56)_70%,rgba(8,18,28,0.42)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_28%)]" />

                <div className="relative z-10 mx-auto max-w-[1500px] px-4 pb-16 pt-24 lg:px-6">
                    <div className="grid items-start gap-8 xl:grid-cols-[1.18fr_0.82fr]">
                        <div className="pt-6 lg:pt-8">
                            <HeroPill>Hotel Details</HeroPill>

                            <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] text-white md:text-5xl xl:text-[3.6rem]">
                                {hotelName}
                            </h1>

                            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 md:text-base">
                                Explore hotel information, policies, facilities, and the cheapest matching room for{" "}
                                {stateSearch?.destinationName || "your selected destination"}.
                            </p>

                            <div className="mt-6 flex flex-wrap gap-2">
                                <Badge tone="light">{stateSearch?.destinationName || "Destination"}</Badge>
                                {bestRating !== "—" ? <Badge tone="yellow">⭐ {bestRating}</Badge> : null}
                                {displayCurrency ? <Badge tone="light">{displayCurrency}</Badge> : null}
                                {descriptionInfo?.accommodationType ? (
                                    <Badge tone="blue">{descriptionInfo.accommodationType}</Badge>
                                ) : null}
                                {derivedBoardType ? <Badge tone="light">{derivedBoardType}</Badge> : null}
                                {derivedPaymentPolicy ? <Badge tone="yellow">{derivedPaymentPolicy}</Badge> : null}
                            </div>

                            <div className="mt-8 flex flex-wrap gap-3">
                                <HeroButton onClick={back}>← Back</HeroButton>
                                <HeroButton primary onClick={() => openExternal(bookingUrl)}>
                                    Open on Booking.com
                                </HeroButton>
                            </div>

                            <div className="mt-8">
                                {hotelPhotos.length > 0 ? (
                                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                        {hotelPhotos.slice(0, 6).map((img, i) => (
                                            <div key={i} className="overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                                                <img
                                                    src={img}
                                                    alt={`Hotel ${i + 1}`}
                                                    className="h-52 w-full object-cover"
                                                    loading="lazy"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : stateHotel?.photoUrl ? (
                                    <div className="max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                                        <img
                                            src={stateHotel.photoUrl}
                                            alt={hotelName}
                                            className="h-64 w-full object-cover"
                                            loading="lazy"
                                        />
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <aside>
                            <GlassPanel className="p-5 text-white lg:p-6">
                                <div className="mb-5">
                                    <div className="text-2xl font-bold text-white">Quick summary</div>
                                    <div className="mt-1 text-sm text-white/70">
                                        Hotel location, travel dates and cheapest room snapshot
                                    </div>
                                </div>

                                <div className="grid gap-3">
                                    <InfoTile label="Address" value={bestAddress} />
                                    <InfoTile
                                        label="Dates"
                                        value={`${formatDateDisplay(bookingFrom)} → ${formatDateDisplay(bookingTo)}`}
                                    />
                                    <InfoTile label="Guests" value={adults} />
                                    <InfoTile label="Rooms" value={roomCount} />
                                    <InfoTile label="Nights" value={nights || "—"} />
                                    {derivedBoardType ? <InfoTile label="Board type" value={derivedBoardType} /> : null}
                                    {derivedPaymentPolicy ? <InfoTile label="Payment policy" value={derivedPaymentPolicy} /> : null}
                                </div>

                                {primaryOffer ? (
                                    <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-500/20 p-4">
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                                            Cheapest matching room
                                        </div>
                                        <div className="mt-2 text-2xl font-bold text-white">
                                            {totalText(primaryOffer)}
                                        </div>
                                        {nightlyText(primaryOffer) ? (
                                            <div className="mt-1 text-sm text-white/75">
                                                {nightlyText(primaryOffer)}
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}

                                <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-500/15 p-4">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                                        Price notice
                                    </div>
                                    <div className="mt-2 text-sm leading-6 text-white/80">
                                        Displayed hotel prices are indicative and may differ from the final provider offer at booking time.
                                    </div>
                                </div>
                            </GlassPanel>
                        </aside>
                    </div>

                    {error ? (
                        <div className="mt-8 rounded-2xl border border-rose-300/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 backdrop-blur">
                            ⚠️ {error}
                        </div>
                    ) : null}

                    {loading ? (
                        <div className="mt-8">
                            <GlassPanel className="p-6 text-white">
                                <div className="text-sm text-white/80">Loading hotel details...</div>
                            </GlassPanel>
                        </div>
                    ) : null}

                    {!loading ? (
                        <div className="mt-8 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
                            <div className="space-y-6">
                                <GlassSection title="About this hotel" subtitle="Description and key information">
                                    <p className="text-sm leading-8 text-white/80">{desc}</p>

                                    {(derivedBoardType || derivedPaymentPolicy || mealplanText) ? (
                                        <div className="mt-5 grid gap-3 md:grid-cols-3">
                                            {derivedBoardType ? <InfoTile label="Board type" value={derivedBoardType} /> : null}
                                            {derivedPaymentPolicy ? <InfoTile label="Payment policy" value={derivedPaymentPolicy} /> : null}
                                            {mealplanText ? <InfoTile label="Meal plan note" value={mealplanText} /> : null}
                                        </div>
                                    ) : null}

                                    {(descriptionInfo?.spokenLanguages || descriptionInfo?.importantInfo) ? (
                                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                                            {descriptionInfo?.spokenLanguages ? (
                                                <InfoTile label="Languages" value={descriptionInfo.spokenLanguages} />
                                            ) : null}
                                            {descriptionInfo?.importantInfo ? (
                                                <InfoTile label="Important info" value={descriptionInfo.importantInfo} />
                                            ) : null}
                                        </div>
                                    ) : null}

                                    {Array.isArray(descriptionInfo?.highlights) && descriptionInfo.highlights.length > 0 ? (
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {descriptionInfo.highlights.map((item, i) => (
                                                <Badge key={`${item}-${i}`} tone="light">
                                                    {item}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : null}
                                </GlassSection>

                                <GlassSection title="Amenities" subtitle="Hotel amenities from main details">
                                    {amenities.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {amenities.map((a, i) => (
                                                <Badge key={`${a}-${i}`} tone="light">
                                                    {a}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl bg-white/10 px-4 py-5 text-sm text-white/70">
                                            Amenities information is not available for this hotel.
                                        </div>
                                    )}
                                </GlassSection>

                                <GlassSection title="Facilities" subtitle="Extended hotel facilities and services">
                                    {facilities.length > 0 ? (
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {facilities.map((f, i) => (
                                                <div key={`${f?.name || "facility"}-${i}`} className="rounded-2xl bg-white/10 p-4">
                                                    <div className="text-sm font-semibold text-white">
                                                        {f?.name || "Facility"}
                                                    </div>
                                                    <div className="mt-1 text-xs text-white/60">
                                                        {f?.category || "General"}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl bg-white/10 px-4 py-5 text-sm text-white/70">
                                            Facility information is not available for this hotel.
                                        </div>
                                    )}
                                </GlassSection>

                                <GlassSection
                                    title="Selected room"
                                    subtitle="Only the cheapest room matching your budget is shown"
                                >
                                    {primaryOffer ? (
                                        <CheapestOfferCard
                                            offer={primaryOffer}
                                            bookingFrom={bookingFrom}
                                            bookingTo={bookingTo}
                                            nights={nights}
                                            adults={adults}
                                            totalText={totalText}
                                            nightlyText={nightlyText}
                                            taxText={taxText}
                                            derivedBoardType={derivedBoardType}
                                            derivedPaymentPolicy={derivedPaymentPolicy}
                                            mealplanText={mealplanText}
                                        />
                                    ) : (
                                        <div className="rounded-2xl bg-white/10 px-4 py-5 text-sm text-white/70">
                                            No matching room offer is available for this hotel.
                                        </div>
                                    )}
                                </GlassSection>

                                <GlassSection title="Room information" subtitle="Room details and room photos">
                                    {roomsData.length > 0 ? (
                                        <div className="space-y-4">
                                            <RoomCard
                                                room={roomsData[0]}
                                                derivedBoardType={derivedBoardType}
                                                derivedPaymentPolicy={derivedPaymentPolicy}
                                                mealplanText={mealplanText}
                                            />
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl bg-white/10 px-4 py-5 text-sm text-white/70">
                                            Room details are not available for this hotel.
                                        </div>
                                    )}
                                </GlassSection>
                            </div>

                            <aside>
                                <div className="space-y-6 xl:sticky xl:top-24">
                                    <GlassSection title="Policies" subtitle="Check-in, cancellation and child / pet rules">
                                        <div className="space-y-3">
                                            <InfoTile
                                                label="Check-in"
                                                value={
                                                    policies
                                                        ? `${policies.checkInFrom || "—"} → ${policies.checkInUntil || "—"}`
                                                        : "—"
                                                }
                                            />
                                            <InfoTile
                                                label="Check-out"
                                                value={
                                                    policies
                                                        ? `${policies.checkOutFrom || "—"} → ${policies.checkOutUntil || "—"}`
                                                        : "—"
                                                }
                                            />
                                            <InfoTile label="Cancellation" value={policies?.cancellationPolicy || primaryBlock?.paymentterms?.cancellation?.description || "—"} />
                                            <InfoTile label="Children" value={policies?.childPolicy || "—"} />
                                            <InfoTile label="Pets" value={policies?.petPolicy || "—"} />
                                        </div>
                                    </GlassSection>

                                    <GlassSection title="Payment features" subtitle="Payment and card support">
                                        <div className="space-y-3">
                                            {derivedPaymentPolicy ? <InfoTile label="Policy summary" value={derivedPaymentPolicy} /> : null}
                                            {derivedBoardType ? <InfoTile label="Board type" value={derivedBoardType} /> : null}
                                            {mealplanText ? <InfoTile label="Meal plan" value={mealplanText} /> : null}
                                            <InfoTile
                                                label="Pay at property"
                                                value={
                                                    paymentFeatures?.payAtProperty == null
                                                        ? "—"
                                                        : paymentFeatures.payAtProperty
                                                            ? "Yes"
                                                            : "No"
                                                }
                                            />
                                            <InfoTile
                                                label="Prepayment required"
                                                value={
                                                    paymentFeatures?.prepaymentRequired == null
                                                        ? Number(primaryBlock?.pay_in_advance) === 1 || Number(primaryBlock?.deposit_required) === 1
                                                            ? "Yes"
                                                            : "No"
                                                        : paymentFeatures.prepaymentRequired
                                                            ? "Yes"
                                                            : "No"
                                                }
                                            />
                                            <InfoTile
                                                label="Free cancellation"
                                                value={
                                                    paymentFeatures?.freeCancellationAvailable == null
                                                        ? Number(primaryBlock?.refundable) === 1
                                                            ? "Yes"
                                                            : "No"
                                                        : paymentFeatures.freeCancellationAvailable
                                                            ? "Yes"
                                                            : "No"
                                                }
                                            />
                                        </div>

                                        {Array.isArray(paymentFeatures?.supportedCards) && paymentFeatures.supportedCards.length > 0 ? (
                                            <div className="mt-4">
                                                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                                                    Supported cards
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {paymentFeatures.supportedCards.map((card, i) => (
                                                        <Badge key={`${card}-${i}`} tone="light">
                                                            {card}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}

                                        {Array.isArray(paymentFeatures?.paymentNotes) && paymentFeatures.paymentNotes.length > 0 ? (
                                            <div className="mt-4 space-y-2">
                                                {paymentFeatures.paymentNotes.map((note, i) => (
                                                    <div key={`${note}-${i}`} className="rounded-2xl bg-white/10 p-3 text-sm text-white/75">
                                                        {note}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : primaryBlock?.paymentterms?.prepayment?.description || primaryBlock?.paymentterms?.cancellation?.description ? (
                                            <div className="mt-4 space-y-2">
                                                {primaryBlock?.paymentterms?.prepayment?.description ? (
                                                    <div className="rounded-2xl bg-white/10 p-3 text-sm text-white/75">
                                                        {primaryBlock.paymentterms.prepayment.description}
                                                    </div>
                                                ) : null}
                                                {primaryBlock?.paymentterms?.cancellation?.description ? (
                                                    <div className="rounded-2xl bg-white/10 p-3 text-sm text-white/75">
                                                        {primaryBlock.paymentterms.cancellation.description}
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </GlassSection>

                                    <GlassSection title="Quick actions" subtitle="Open live hotel searches on external platforms">
                                        <div className="space-y-3">
                                            <ActionCard
                                                title="Booking.com"
                                                subtitle="Check live availability and rates"
                                                onClick={() => openExternal(bookingUrl)}
                                            />
                                            <ActionCard
                                                title="Expedia"
                                                subtitle="Compare availability externally"
                                                onClick={() => openExternal(expediaUrl)}
                                            />
                                            <ActionCard
                                                title="Hotels.com"
                                                subtitle="Search this stay on Hotels.com"
                                                onClick={() => openExternal(hotelsUrl)}
                                            />
                                            <ActionCard
                                                title="Google Maps"
                                                subtitle="Open exact hotel location"
                                                onClick={() => openExternal(mapsUrl)}
                                            />
                                        </div>
                                    </GlassSection>

                                    <GlassSection title="Trip summary" subtitle="Current hotel search configuration">
                                        <div className="space-y-3">
                                            <InfoTile label="Destination" value={stateSearch?.destinationName || "—"} />
                                            <InfoTile
                                                label="Dates"
                                                value={`${formatDateDisplay(bookingFrom)} → ${formatDateDisplay(bookingTo)}`}
                                            />
                                            <InfoTile label="Guests" value={adults} />
                                            <InfoTile label="Rooms" value={roomCount} />
                                            <InfoTile label="Nights" value={nights || "—"} />
                                            <InfoTile label="Currency" value={displayCurrency} />
                                        </div>

                                        {primaryOffer ? (
                                            <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-500/20 p-4">
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                                                    Current best price
                                                </div>
                                                <div className="mt-2 text-2xl font-bold text-white">
                                                    {totalText(primaryOffer)}
                                                </div>
                                            </div>
                                        ) : null}
                                    </GlassSection>
                                </div>
                            </aside>
                        </div>
                    ) : null}
                </div>
            </section>
        </div>
    );
}
