package tripmindai.com.mk.maintripservice.dto.flights;

public record FlightOfferDto(
        String token,
        String airlineCode,
        String airlineName,
        String airlineLogo,
        String originIata,
        String originName,
        String originCity,
        String destIata,
        String destName,
        String destCity,
        String departureAt,
        String arrivalAt,
        String returnDepartureAt,
        String returnArrivalAt,
        double totalPrice,
        String currency,
        int stops,
        String tripType
) {}