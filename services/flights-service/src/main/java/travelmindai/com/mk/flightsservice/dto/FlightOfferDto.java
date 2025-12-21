package travelmindai.com.mk.flightsservice.dto;

public record FlightOfferDto(
        String airlineCode,
        String originIata,
        String destIata,
        String departureAt,
        String arrivalAt,
        double totalPrice,
        String currency,
        int stops
) {}

