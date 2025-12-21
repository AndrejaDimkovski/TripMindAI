package travelmindai.com.mk.flightsservice.service;

import com.amadeus.Amadeus;
import com.amadeus.Params;
import com.amadeus.exceptions.ResponseException;
import com.amadeus.resources.FlightOfferSearch;
import org.springframework.stereotype.Service;
import travelmindai.com.mk.flightsservice.dto.FlightOfferDto;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

@Service
public class FlightsSearchService {

    private final Amadeus amadeus;

    public FlightsSearchService(Amadeus amadeus) {
        this.amadeus = amadeus;
    }

    // ❗ НЕ throws ResponseException
    public List<FlightOfferDto> search(String origin, String dest, String from, String to, int adults) {

        origin = origin == null ? "" : origin.trim();
        dest = dest == null ? "" : dest.trim();

        // --- normalize dates ---
        LocalDate dep = parseDateOrTomorrow(from);
        if (dep.isBefore(LocalDate.now())) {
            dep = LocalDate.now().plusDays(1);
        }

        LocalDate ret = null;
        if (to != null && !to.isBlank()) {
            ret = parseDateOrNull(to);
            if (ret != null && !ret.isAfter(dep)) {
                ret = dep.plusDays(1);
            }
        }

        try {
            Params params = Params.with("originLocationCode", origin)
                    .and("destinationLocationCode", dest)
                    .and("departureDate", dep.toString())
                    .and("adults", adults)
                    .and("max", 10);

            if (ret != null) {
                params = params.and("returnDate", ret.toString());
            }

            FlightOfferSearch[] offers =
                    amadeus.shopping.flightOffersSearch.get(params);

            List<FlightOfferDto> out = new ArrayList<>();
            if (offers == null) return out;

            for (FlightOfferSearch offer : offers) {

                String currency = "N/A";
                double totalPrice = 0.0;

                // ✅ getTotal() е String → мора parse
                if (offer.getPrice() != null) {
                    currency = offer.getPrice().getCurrency();
                    String totalStr = String.valueOf(offer.getPrice().getTotal());
                    totalPrice = parseDoubleSafe(totalStr);
                }

                String departureAt = null;
                String arrivalAt = null;
                String airline = "N/A";
                int stops = 0;

                if (offer.getItineraries() != null && offer.getItineraries().length > 0) {
                    var segments = offer.getItineraries()[0].getSegments();
                    if (segments != null && segments.length > 0) {
                        stops = Math.max(0, segments.length - 1);
                        departureAt = segments[0].getDeparture().getAt();
                        arrivalAt = segments[segments.length - 1].getArrival().getAt();
                        airline = segments[0].getCarrierCode();
                    }
                }

                // ✅ ОВА МОРА ДА КОМПАЈЛИРА СО ТВОЕТО DTO
                out.add(new FlightOfferDto(
                        airline,
                        origin,
                        dest,
                        departureAt,
                        arrivalAt,
                        totalPrice,
                        currency,
                        stops
                ));
            }

            return out;

        } catch (ResponseException e) {
            return List.of(); // нема 500
        } catch (Exception e) {
            return List.of();
        }
    }

    private LocalDate parseDateOrTomorrow(String s) {
        try {
            return LocalDate.parse(s);
        } catch (DateTimeParseException e) {
            return LocalDate.now().plusDays(1);
        }
    }

    private LocalDate parseDateOrNull(String s) {
        try {
            return LocalDate.parse(s);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private double parseDoubleSafe(String s) {
        if (s == null) return 0.0;
        try {
            return Double.parseDouble(s.trim().replace(",", ""));
        } catch (Exception e) {
            return 0.0;
        }
    }
}
