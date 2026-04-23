package tripmindai.com.mk.maintravelservice.dto.trip;

public record SaveTripPlanRequest(
        String origin,
        String destinationCityCode,
        String destinationName,
        String countryName,
        String fromDate,
        String toDate,
        Integer adults,

        String hotelId,
        String hotelName,
        Double hotelPrice,
        String hotelCurrency,

        String flightAirlineCode,
        String flightAirlineName,
        String flightOriginIata,
        String flightOriginCity,
        String flightDestIata,
        String flightDestinationCity,
        String flightDepartureAt,
        String flightArrivalAt,
        Integer flightStops,
        String flightTripType,
        Double flightPrice,
        String flightCurrency,

        Double totalPrice,
        String totalCurrency
) {}
