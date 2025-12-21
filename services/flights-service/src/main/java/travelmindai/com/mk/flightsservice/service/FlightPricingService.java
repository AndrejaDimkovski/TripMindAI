package travelmindai.com.mk.flightsservice.service;

import com.amadeus.Amadeus;
import com.amadeus.exceptions.ResponseException;
import com.amadeus.resources.FlightOfferSearch;
import com.amadeus.resources.FlightPrice;
import org.springframework.stereotype.Service;

@Service
public class FlightPricingService {

    private final Amadeus amadeus;

    public FlightPricingService(Amadeus amadeus) {
        this.amadeus = amadeus;
    }

    public FlightPrice confirm(FlightOfferSearch offer) throws ResponseException {
        return amadeus.shopping.flightOffersSearch.pricing.post(offer);
    }
}
