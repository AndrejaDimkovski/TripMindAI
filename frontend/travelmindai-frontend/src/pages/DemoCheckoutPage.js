import { useLocation, useNavigate } from "react-router-dom";
import "./DemoCheckoutPage.css";

export default function DemoCheckoutPage() {
    const nav = useNavigate();
    const { state } = useLocation(); // payload from TripSearchPage

    if (!state?.selectedFlight || !state?.selectedHotelOffer) {
        return (
            <div className="dc-page">
                <div className="dc-container">
                    <div className="dc-card">
                        <h2 className="dc-title">Missing selection</h2>
                        <p className="dc-muted">Please select a flight and a hotel offer first.</p>
                        <button className="dc-btn" onClick={() => nav("/trips")}>← Back to Search</button>
                    </div>
                </div>
            </div>
        );
    }

    const flight = state.selectedFlight;
    const offer = state.selectedHotelOffer;
    const search = state.search;

    const confirmDemo = () => {
        alert("✅ DEMO reservation confirmed (no real booking / no payment).");
        nav("/trips");
    };

    return (
        <div className="dc-page">
            <div className="dc-container">
                <div className="dc-header">
                    <h1 className="dc-title">Demo Reservation</h1>
                    <p className="dc-muted">Real offers selected — confirmation is demo only.</p>
                </div>

                <div className="dc-grid">
                    <div className="dc-card">
                        <div className="dc-cardTitle">✈️ Selected flight</div>
                        <div className="dc-row">
                            <span>Route</span>
                            <b>{flight.originIata} → {flight.destIata}</b>
                        </div>
                        <div className="dc-row">
                            <span>Airline</span>
                            <b>{flight.airlineCode}</b>
                        </div>
                        <div className="dc-row">
                            <span>Time</span>
                            <b>{flight.departureAt || "—"} → {flight.arrivalAt || "—"}</b>
                        </div>
                        <div className="dc-row">
                            <span>Stops</span>
                            <b>{flight.stops}</b>
                        </div>
                        <div className="dc-row dc-price">
                            <span>Price</span>
                            <b>💶 {Number(flight.totalPrice || 0).toFixed(2)} {flight.currency}</b>
                        </div>
                    </div>

                    <div className="dc-card">
                        <div className="dc-cardTitle">🏨 Selected hotel offer</div>
                        <div className="dc-row">
                            <span>Hotel</span>
                            <b>{offer.hotelName}</b>
                        </div>
                        <div className="dc-row">
                            <span>Dates</span>
                            <b>{offer.checkInDate} → {offer.checkOutDate}</b>
                        </div>
                        <div className="dc-row">
                            <span>Adults</span>
                            <b>{search?.adults}</b>
                        </div>
                        <div className="dc-row dc-price">
                            <span>Price</span>
                            <b>💶 {Number(offer.totalPrice || 0).toFixed(2)} {offer.currency}</b>
                        </div>
                    </div>
                </div>

                <div className="dc-card dc-mt16">
                    <div className="dc-cardTitle">Payload (demo)</div>
                    <pre className="dc-json">{JSON.stringify(state, null, 2)}</pre>

                    <div className="dc-actions">
                        <button className="dc-btnGhost" onClick={() => nav("/trips")}>← Edit selection</button>
                        <button className="dc-btn" onClick={confirmDemo}>Confirm (Demo)</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
