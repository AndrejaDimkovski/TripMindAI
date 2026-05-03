package tripmindai.com.mk.maintripservice.dto.trip;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record TripPlanDto(
        Long id,
        String username,
        String tripMode,
        String origin,
        String destinationCityCode,
        String destinationName,
        String countryName,
        LocalDate fromDate,
        LocalDate toDate,
        Integer adults,

        String hotelId,
        String hotelName,
        Double hotelPrice,
        String hotelCurrency,
        LocalDate hotelCheckInDate,
        LocalDate hotelCheckOutDate,
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
        String totalCurrency,
        LocalDateTime createdAt
) {}
