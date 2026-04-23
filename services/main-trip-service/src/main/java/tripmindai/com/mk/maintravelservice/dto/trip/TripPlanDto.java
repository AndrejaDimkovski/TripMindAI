package tripmindai.com.mk.maintravelservice.dto.trip;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record TripPlanDto(
        Long id,
        String username,
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
        String totalCurrency,
        LocalDateTime createdAt
) {}
