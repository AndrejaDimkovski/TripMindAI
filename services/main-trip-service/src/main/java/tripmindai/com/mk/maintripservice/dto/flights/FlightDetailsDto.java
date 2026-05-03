package tripmindai.com.mk.maintripservice.dto.flights;

import java.util.List;

public record FlightDetailsDto(
        String token,
        String tripType,
        double totalPrice,
        String currency,
        String fareName,
        String cabinClass,
        List<FlightSegmentDetailsDto> segments
) {}