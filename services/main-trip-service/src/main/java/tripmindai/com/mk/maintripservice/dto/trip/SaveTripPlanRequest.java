package tripmindai.com.mk.maintripservice.dto.trip;

public record SaveTripPlanRequest(
        String tripMode,

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
        String hotelCheckInDate,
        String hotelCheckOutDate,
        String boardType,
        String paymentPolicy,
        Integer roomQuantity,

        String flightAirlineCode,
        String flightAirlineName,
        String flightOriginIata,
        String flightOriginCity,
        String flightDestIata,
        String flightDestinationCity,
        String flightDepartureAt,
        String flightArrivalAt,
        String returnFlightDepartureAt,
        String returnFlightArrivalAt,
        Integer flightStops,
        String flightTripType,
        Double flightPrice,
        String flightCurrency,

        Double totalPrice,
        String totalCurrency
) {}
