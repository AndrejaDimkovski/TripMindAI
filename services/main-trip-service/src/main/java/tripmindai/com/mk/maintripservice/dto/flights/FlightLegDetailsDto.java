package tripmindai.com.mk.maintripservice.dto.flights;

public record FlightLegDetailsDto(
        String departureAirportCode,
        String departureAirportName,
        String arrivalAirportCode,
        String arrivalAirportName,
        String departureTime,
        String arrivalTime,
        String airlineCode,
        String airlineName,
        String airlineLogo,
        String flightNumber,
        String cabinClass,
        int totalMinutes
) {}