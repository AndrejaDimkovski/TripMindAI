package tripmindai.com.mk.maintravelservice.dto.flights;

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