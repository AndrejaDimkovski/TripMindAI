package tripmindai.com.mk.maintravelservice.dto.flights;

public record FlightSegmentDetailsDto(
        String departureAirportCode,
        String departureAirportName,
        String departureCity,
        String arrivalAirportCode,
        String arrivalAirportName,
        String arrivalCity,
        String departureTime,
        String arrivalTime,
        int totalMinutes,
        java.util.List<FlightLegDetailsDto> legs
) {}