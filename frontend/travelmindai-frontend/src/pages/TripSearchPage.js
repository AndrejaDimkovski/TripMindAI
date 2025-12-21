import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./TripSearchPage.css";

export default function TripSearchPage() {
    const nav = useNavigate();

    const [form, setForm] = useState({
        origin: "SKP",
        destination: "BKK",
        from: "",
        to: "",
        adults: 1,
        cityCode: "BKK", // важно за hotels/offers
    });

    const [activeTab, setActiveTab] = useState("flights"); // flights | offers
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    // ✅ selections
    const [selectedFlightIndex, setSelectedFlightIndex] = useState(null);
    const [selectedOfferIndex, setSelectedOfferIndex] = useState(null);

    const flights = result?.flights || [];
    const offers = result?.hotelOffers || [];

    const selectedFlight = useMemo(
        () => (selectedFlightIndex == null ? null : flights[selectedFlightIndex]),
        [selectedFlightIndex, flights]
    );
    const selectedOffer = useMemo(
        () => (selectedOfferIndex == null ? null : offers[selectedOfferIndex]),
        [selectedOfferIndex, offers]
    );

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((p) => ({ ...p, [name]: value }));
    };

    const searchTrip = async () => {
        setLoading(true);
        setError(null);

        // reset selections on new search
        setSelectedFlightIndex(null);
        setSelectedOfferIndex(null);

        try {
            const cityCode = (form.cityCode || "").trim() || (form.destination || "").trim();

            const queryObj = {
                origin: form.origin,
                destination: form.destination,
                from: form.from,
                adults: String(form.adults || 1),
                cityCode,
            };
            if (form.to && form.to.trim()) queryObj.to = form.to;

            const query = new URLSearchParams(queryObj).toString();

            const res = await fetch(`http://localhost:8080/api/trips/search?${query}`, {
                credentials: "include",
            });

            if (!res.ok) throw new Error("Search failed");

            const data = await res.json();
            setResult(data);

            // default tab preference
            if (data?.flights?.length) setActiveTab("flights");
            else setActiveTab("offers");
        } catch (err) {
            setError(err.message || "Error");
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    const proceedToCheckout = () => {
        if (!selectedFlight || !selectedOffer) return;

        // ✅ DEMO checkout payload (real offers, demo booking)
        const payload = {
            type: "DEMO_TRIP_BOOKING",
            search: {
                origin: form.origin,
                destination: form.destination,
                from: form.from,
                to: form.to || null,
                adults: Number(form.adults || 1),
                cityCode: (form.cityCode || "").trim() || (form.destination || "").trim(),
            },
            selectedFlight,
            selectedHotelOffer: selectedOffer,
            createdAt: new Date().toISOString(),
        };

        nav("/checkout", { state: payload });
    };

    return (
        <div className="tp-page">
            <div className="tp-container">
                <header className="tp-header">
                    <div>
                        <h1 className="tp-title">TravelMindAI</h1>
                        <p className="tp-subtitle">
                            Select 1 flight + 1 hotel offer → proceed to demo reservation
                        </p>
                    </div>

                    <div className="tp-badges">
                        <span className="tp-badge">Flights: {flights.length}</span>
                        <span className="tp-badge">Offers: {offers.length}</span>
                    </div>
                </header>

                {/* SEARCH CARD */}
                <section className="tp-card">
                    <div className="tp-cardHeader">
                        <div className="tp-cardHeaderTitle">Search</div>
                        <div className="tp-cardHeaderHint">Hotel offers need CityCode + dates</div>
                    </div>

                    <div className="tp-cardBody">
                        <div className="tp-formGrid">
                            <div className="tp-field tp-col3">
                                <label className="tp-label">Origin (IATA)</label>
                                <input className="tp-input" name="origin" value={form.origin} onChange={handleChange} />
                            </div>

                            <div className="tp-field tp-col3">
                                <label className="tp-label">Destination (IATA / city)</label>
                                <input className="tp-input" name="destination" value={form.destination} onChange={handleChange} />
                            </div>

                            <div className="tp-field tp-col2">
                                <label className="tp-label">From</label>
                                <input className="tp-input" type="date" name="from" value={form.from} onChange={handleChange} />
                            </div>

                            <div className="tp-field tp-col2">
                                <label className="tp-label">To (optional)</label>
                                <input className="tp-input" type="date" name="to" value={form.to} onChange={handleChange} />
                            </div>

                            <div className="tp-field tp-col1">
                                <label className="tp-label">Adults</label>
                                <input className="tp-input" type="number" min="1" name="adults" value={form.adults} onChange={handleChange} />
                            </div>

                            <div className="tp-field tp-col1">
                                <label className="tp-label">CityCode</label>
                                <input className="tp-input" name="cityCode" value={form.cityCode} onChange={handleChange} />
                            </div>

                            <div className="tp-col1 tp-actions">
                                <button
                                    className="tp-btnPrimary"
                                    onClick={searchTrip}
                                    disabled={loading || !form.origin || !form.destination || !form.from}
                                >
                                    {loading ? "Searching..." : "🔍 Search"}
                                </button>
                            </div>
                        </div>

                        {error && <div className="tp-alert">⚠️ {error}</div>}
                        {loading && <div className="tp-skeleton" />}
                    </div>
                </section>

                {/* RESULTS */}
                <section className="tp-card tp-mt16">
                    <div className="tp-cardHeader">
                        <div className="tp-cardHeaderTitle">Select your trip</div>

                        <div className="tp-tabs">
                            <button className={`tp-tab ${activeTab === "flights" ? "active" : ""}`} onClick={() => setActiveTab("flights")}>
                                ✈️ Flights
                            </button>
                            <button className={`tp-tab ${activeTab === "offers" ? "active" : ""}`} onClick={() => setActiveTab("offers")}>
                                🏨 Hotel Offers
                            </button>
                        </div>
                    </div>

                    <div className="tp-cardBody">
                        {!result && (
                            <div className="tp-empty">
                                No results yet. Search first, then select <b>1 flight</b> and <b>1 hotel offer</b>.
                            </div>
                        )}

                        {result && activeTab === "flights" && (
                            <div className="tp-list">
                                {flights.length === 0 ? (
                                    <div className="tp-empty">No flights found.</div>
                                ) : (
                                    flights.map((f, i) => (
                                        <div
                                            key={i}
                                            className={`tp-item ${selectedFlightIndex === i ? "selected" : ""}`}
                                        >
                                            <div className="tp-itemTop">
                                                <div className="tp-itemTitle">
                                                    {f.originIata} → {f.destIata} <span className="tp-muted">| {f.airlineCode}</span>
                                                </div>
                                                <div className="tp-price">
                                                    💶 {Number(f.totalPrice || 0).toFixed(2)} {f.currency}
                                                </div>
                                            </div>

                                            <div className="tp-meta">
                                                {f.departureAt || "—"} → {f.arrivalAt || "—"} • Stops: <b>{f.stops}</b>
                                            </div>

                                            <div className="tp-actionsRow">
                                                <button className="tp-btnGhost" onClick={() => setSelectedFlightIndex(i)}>
                                                    {selectedFlightIndex === i ? "✅ Selected" : "Select flight"}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {result && activeTab === "offers" && (
                            <div className="tp-list">
                                {offers.length === 0 ? (
                                    <div className="tp-empty">No hotel offers found. Try other dates / cityCode.</div>
                                ) : (
                                    offers.map((o, i) => (
                                        <div
                                            key={i}
                                            className={`tp-item ${selectedOfferIndex === i ? "selected" : ""}`}
                                        >
                                            <div className="tp-itemTop">
                                                <div className="tp-itemTitle">{o.hotelName || "Hotel offer"}</div>
                                                <div className="tp-price">
                                                    💶 {Number(o.totalPrice || 0).toFixed(2)} {o.currency}
                                                </div>
                                            </div>

                                            <div className="tp-meta">
                                                {o.checkInDate} → {o.checkOutDate} • HotelId: <b>{o.hotelId}</b>
                                            </div>

                                            <div className="tp-actionsRow">
                                                <button className="tp-btnGhost" onClick={() => setSelectedOfferIndex(i)}>
                                                    {selectedOfferIndex === i ? "✅ Selected" : "Select hotel offer"}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </section>

                {/* STICKY SUMMARY BAR */}
                {result && (
                    <div className="tp-summaryBar">
                        <div className="tp-summaryLeft">
                            <div className="tp-summaryTitle">Selection</div>
                            <div className="tp-summaryText">
                                Flight:{" "}
                                <b>{selectedFlight ? `${selectedFlight.originIata}→${selectedFlight.destIata} (${selectedFlight.airlineCode})` : "Not selected"}</b>
                                <span className="tp-dot">•</span>
                                Hotel:{" "}
                                <b>{selectedOffer ? `${selectedOffer.hotelName}` : "Not selected"}</b>
                            </div>
                        </div>

                        <button
                            className="tp-btnPrimary tp-summaryBtn"
                            onClick={proceedToCheckout}
                            disabled={!selectedFlight || !selectedOffer}
                            title={!selectedFlight || !selectedOffer ? "Select flight + hotel offer first" : "Go to demo reservation"}
                        >
                            ➜ Continue to Demo Reservation
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
