package travelmindai.com.mk.flightsservice.service;

import com.amadeus.Amadeus;
import com.amadeus.exceptions.ResponseException;
import com.amadeus.resources.FlightOrder;
import com.google.gson.JsonObject;
import org.springframework.stereotype.Service;

@Service
public class FlightOrderService {

    private final Amadeus amadeus;

    public FlightOrderService(Amadeus amadeus) {
        this.amadeus = amadeus;
    }

    public FlightOrder createOrder(JsonObject order) throws ResponseException {
        return amadeus.booking.flightOrders.post(order);
    }
}
