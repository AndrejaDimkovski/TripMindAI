package tripmindai.com.mk.flightsservice.dto;

import java.util.List;

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
        List<FlightLegDetailsDto> legs
) {}